import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { evaluateDesktopBundleBudget } from "./desktopBundleBudget.mts";

const temporaryDirectories: string[] = [];

const createDist = (chunks: Record<string, number>) => {
  const distDir = fs.mkdtempSync(path.join(os.tmpdir(), "bundle-budget-"));
  const assetsDir = path.join(distDir, "assets");
  fs.mkdirSync(assetsDir);
  temporaryDirectories.push(distDir);

  for (const [filename, bytes] of Object.entries(chunks)) {
    fs.writeFileSync(path.join(assetsDir, filename), Buffer.alloc(bytes));
  }

  return distDir;
};

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("evaluateDesktopBundleBudget", () => {
  it("accepts reviewed chunks at or below their byte budgets", () => {
    const distDir = createDist({
      "excalidraw-core-hash.js": 10,
      "index-hash.js": 8,
    });

    expect(
      evaluateDesktopBundleBudget({
        distDir,
        budgets: { "excalidraw-core": 10, index: 8 },
      }),
    ).toEqual([]);
  });

  it("reports every chunk that exceeds its reviewed budget", () => {
    const distDir = createDist({
      "excalidraw-core-hash.js": 11,
      "index-hash.js": 9,
    });

    expect(
      evaluateDesktopBundleBudget({
        distDir,
        budgets: { "excalidraw-core": 10, index: 8 },
      }),
    ).toEqual([
      {
        chunk: "excalidraw-core-hash.js",
        actualBytes: 11,
        allowedBytes: 10,
      },
      {
        chunk: "index-hash.js",
        actualBytes: 9,
        allowedBytes: 8,
      },
    ]);
  });

  it("fails clearly when build output or a required chunk is missing", () => {
    expect(() =>
      evaluateDesktopBundleBudget({
        distDir: "/missing/corestudio-dist",
        budgets: { index: 8 },
      }),
    ).toThrow("桌面 bundle 目录不存在");

    const distDir = createDist({ "unreviewed-hash.js": 4 });
    expect(() =>
      evaluateDesktopBundleBudget({
        distDir,
        budgets: { index: 8 },
      }),
    ).toThrow("缺少预算对应的 chunk: index");
  });
});
