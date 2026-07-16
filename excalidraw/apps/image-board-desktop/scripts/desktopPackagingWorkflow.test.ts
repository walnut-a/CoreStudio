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

describe("CoreStudio desktop packaging workflow", () => {
  it("builds once and asks electron-builder to create only the DMG", () => {
    const packageScript = packageJson.scripts["package:app"];

    expect(packageScript.match(/\byarn build\b/g)).toHaveLength(1);
    expect(packageScript).toContain("electron-builder --mac dmg");
    expect(packageScript).not.toContain("electron-builder &&");
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
