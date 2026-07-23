import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const appRoot = path.resolve(
  process.cwd(),
  "apps/image-board-desktop",
);
const packageJson = JSON.parse(
  fs.readFileSync(path.join(appRoot, "package.json"), "utf8"),
) as {
  scripts: Record<string, string>;
};
const releaseGuide = fs.readFileSync(
  path.join(appRoot, "RELEASE.md"),
  "utf8",
);
const notarizeScript = fs.readFileSync(
  path.join(appRoot, "scripts/notarize-release.cjs"),
  "utf8",
);
const packageOnceScript = fs.readFileSync(
  path.join(appRoot, "scripts/package-once.cjs"),
  "utf8",
);

describe("CoreStudio desktop packaging workflow", () => {
  it("builds once and asks electron-builder to create only the DMG", () => {
    const packageScript = packageJson.scripts["package:app:raw"];

    expect(packageScript.match(/\byarn build\b/g)).toHaveLength(1);
    expect(packageScript).toContain("electron-builder --mac dmg");
    expect(packageScript).not.toContain("electron-builder &&");
  });

  it("routes formal packaging through the duplicate-run guard", () => {
    expect(packageJson.scripts["package:app"]).toBe(
      "node scripts/package-once.cjs",
    );
    expect(packageOnceScript).toContain("package:app:raw");
    expect(packageOnceScript).toContain("CORESTUDIO_FORCE_PACKAGE");
  });

  it("does not expose directory packaging as a normal packaging command", () => {
    expect(packageJson.scripts["package:dir"]).toBeUndefined();
    expect(packageJson.scripts["package:dir:diagnostic"]).toContain(
      "electron-builder --dir",
    );
  });

  it("creates the final ZIP once, after stapling the app", () => {
    const appStaple = notarizeScript.indexOf(
      'runCommand("xcrun", ["stapler", "staple", appPath])',
    );
    const zipCompression = notarizeScript.indexOf('"ditto"');

    expect(notarizeScript.match(/"ditto"/g)).toHaveLength(1);
    expect(appStaple).toBeGreaterThan(-1);
    expect(zipCompression).toBeGreaterThan(appStaple);
  });

  it("documents one release packaging command without a pre-build step", () => {
    expect(releaseGuide).toContain(
      'CSC_KEYCHAIN="$HOME/Library/Keychains/mylogin.keychain-db" corepack yarn package:desktop',
    );
    expect(releaseGuide).toContain(
      "正式发布不要在这个命令前额外运行 `build:desktop`",
    );
  });
});
