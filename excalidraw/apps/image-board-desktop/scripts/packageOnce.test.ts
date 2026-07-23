import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { hasReusablePackage } = require("./package-once.cjs") as {
  hasReusablePackage: (options: {
    state: {
      fingerprint: string;
      version: string;
      platform: string;
      arch: string;
      artifacts: string[];
    } | null;
    fingerprint: string;
    version: string;
    platform: string;
    arch: string;
    releaseDir: string;
  }) => boolean;
};

const tempDirs: string[] = [];

const createTempDir = () => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "corestudio-package-once-"),
  );
  tempDirs.push(tempDir);
  return tempDir;
};

afterEach(() => {
  for (const tempDir of tempDirs.splice(0)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

describe("CoreStudio package-once guard", () => {
  it("reuses a completed package for the same source fingerprint", () => {
    const releaseDir = createTempDir();
    fs.writeFileSync(path.join(releaseDir, "CoreStudio.dmg"), "dmg");
    fs.writeFileSync(path.join(releaseDir, "CoreStudio.zip"), "zip");

    expect(
      hasReusablePackage({
        state: {
          fingerprint: "same-source",
          version: "1.2.3",
          platform: "darwin",
          arch: "arm64",
          artifacts: ["CoreStudio.dmg", "CoreStudio.zip"],
        },
        fingerprint: "same-source",
        version: "1.2.3",
        platform: "darwin",
        arch: "arm64",
        releaseDir,
      }),
    ).toBe(true);
  });

  it("packages again when source changes or a recorded artifact is missing", () => {
    const releaseDir = createTempDir();
    fs.writeFileSync(path.join(releaseDir, "CoreStudio.dmg"), "dmg");
    const state = {
      fingerprint: "old-source",
      version: "1.2.3",
      platform: "darwin",
      arch: "arm64",
      artifacts: ["CoreStudio.dmg", "CoreStudio.zip"],
    };

    expect(
      hasReusablePackage({
        state,
        fingerprint: "new-source",
        version: "1.2.3",
        platform: "darwin",
        arch: "arm64",
        releaseDir,
      }),
    ).toBe(false);
    expect(
      hasReusablePackage({
        state: { ...state, fingerprint: "old-source" },
        fingerprint: "old-source",
        version: "1.2.3",
        platform: "darwin",
        arch: "arm64",
        releaseDir,
      }),
    ).toBe(false);
  });
});
