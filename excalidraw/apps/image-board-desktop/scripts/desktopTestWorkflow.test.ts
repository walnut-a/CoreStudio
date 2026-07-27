import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();
const rootPackageJson = JSON.parse(
  fs.readFileSync(path.join(repositoryRoot, "package.json"), "utf8"),
) as { scripts: Record<string, string> };
const desktopPackageJson = JSON.parse(
  fs.readFileSync(
    path.join(repositoryRoot, "apps/image-board-desktop/package.json"),
    "utf8",
  ),
) as { scripts: Record<string, string> };
const workflow = fs.readFileSync(
  path.resolve(repositoryRoot, "../.github/workflows/corestudio-desktop.yml"),
  "utf8",
);
const desktopReadme = fs.readFileSync(
  path.join(repositoryRoot, "apps/image-board-desktop/README.md"),
  "utf8",
);

describe("CoreStudio desktop test workflow", () => {
  it("uses the lifecycle runner for one-shot desktop tests", () => {
    expect(rootPackageJson.scripts["test:desktop"]).toBe(
      "node apps/image-board-desktop/scripts/run-desktop-tests.mjs --mode=run",
    );
    expect(rootPackageJson.scripts["test:desktop"]).not.toContain(
      "vitest apps/image-board-desktop",
    );
  });

  it("provides explicit watch and CI entry points", () => {
    expect(rootPackageJson.scripts["test:desktop:watch"]).toBe(
      "node apps/image-board-desktop/scripts/run-desktop-tests.mjs --mode=watch",
    );
    expect(rootPackageJson.scripts["test:desktop:ci"]).toBe(
      "node apps/image-board-desktop/scripts/run-desktop-tests.mjs --mode=ci",
    );
    expect(desktopPackageJson.scripts.test).toBe(
      "cd ../.. && yarn test:desktop",
    );
  });

  it("keeps the existing CI order while using the CI runner entry", () => {
    expect(workflow).toContain("run: corepack yarn test:desktop:ci");
    expect(workflow.indexOf("- name: Typecheck")).toBeLessThan(
      workflow.indexOf("- name: Desktop tests"),
    );
    expect(workflow.indexOf("- name: Desktop tests")).toBeLessThan(
      workflow.indexOf("- name: Secret scan"),
    );
    expect(workflow.indexOf("- name: Secret scan")).toBeLessThan(
      workflow.indexOf("- name: Build desktop"),
    );
  });

  it("documents the long-running command and cleanup protocol", () => {
    expect(desktopReadme).toContain("session、cell 或 job ID 代表任务仍在运行");
    expect(desktopReadme).toContain("继续轮询原任务");
    expect(desktopReadme).toContain("定向测试优先于全量测试");
    expect(desktopReadme).toContain("取消或放弃任务前");
    expect(desktopReadme).toContain("进程树清理和残留复查");
  });
});
