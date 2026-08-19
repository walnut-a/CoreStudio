import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const appRoot = path.resolve(process.cwd(), "apps/image-board-desktop");
const packageJson = JSON.parse(
  fs.readFileSync(path.join(appRoot, "package.json"), "utf8"),
) as {
  scripts: Record<string, string>;
  build: {
    dmg: {
      background?: string;
      backgroundColor?: string;
      window?: {
        width: number;
        height: number;
      };
      contents: Array<{
        x: number;
        y: number;
        type: "file" | "link";
        path?: string;
      }>;
    };
  };
};
const releaseGuide = fs.readFileSync(path.join(appRoot, "RELEASE.md"), "utf8");
const notarizeScript = fs.readFileSync(
  path.join(appRoot, "scripts/notarize-release.cjs"),
  "utf8",
);
const packageOnceScript = fs.readFileSync(
  path.join(appRoot, "scripts/package-once.cjs"),
  "utf8",
);

describe("CoreStudio desktop packaging workflow", () => {
  it("ships a Retina DMG background with a clear drag-to-install instruction", () => {
    const dmg = packageJson.build.dmg;
    const sourcePath = path.join(appRoot, "build/dmg-background.svg");
    const backgroundPath = path.join(appRoot, "build/dmg-background.png");
    const retinaBackgroundPath = path.join(
      appRoot,
      "build/dmg-background@2x.png",
    );
    const readPngSize = (filePath: string) => {
      const contents = fs.readFileSync(filePath);

      return {
        width: contents.readUInt32BE(16),
        height: contents.readUInt32BE(20),
      };
    };

    expect(dmg.background).toBe("build/dmg-background.png");
    expect(dmg.backgroundColor).toBeUndefined();
    expect(dmg.window).toEqual({ width: 640, height: 452 });
    expect(dmg.contents).toEqual([
      { x: 180, y: 220, type: "file" },
      { x: 460, y: 220, type: "link", path: "/Applications" },
    ]);
    const source = fs.readFileSync(sourcePath, "utf8");

    expect(source).toContain("Drag CoreStudio to the Applications folder");
    expect(source).not.toMatch(/[\u3400-\u9fff]/u);
    expect(readPngSize(backgroundPath)).toEqual({ width: 640, height: 452 });
    expect(readPngSize(retinaBackgroundPath)).toEqual({
      width: 1280,
      height: 904,
    });
  });

  it("builds once and asks electron-builder to create only the DMG", () => {
    const packageScript = packageJson.scripts["package:app:raw"];

    expect(packageScript.match(/\byarn build\b/g)).toHaveLength(1);
    expect(packageScript).toContain("electron-builder --mac dmg");
    expect(packageScript).not.toContain("electron-builder &&");
  });

  it("blocks developer paths before packaging and verifies the packaged asar", () => {
    const packageScript = packageJson.scripts["package:app:raw"];
    const buildCheck = "yarn check:bundle-paths --build";
    const releaseCheck = "yarn check:bundle-paths --release";

    expect(packageScript).toContain(buildCheck);
    expect(packageScript).toContain(releaseCheck);
    expect(packageScript.indexOf(buildCheck)).toBeLessThan(
      packageScript.indexOf("electron-builder --mac dmg"),
    );
    expect(packageScript.indexOf(releaseCheck)).toBeGreaterThan(
      packageScript.indexOf("electron-builder --mac dmg"),
    );
    expect(packageScript.indexOf(releaseCheck)).toBeLessThan(
      packageScript.indexOf("yarn notarize:release"),
    );
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

  it("publishes only the notarized DMG", () => {
    expect(notarizeScript).not.toContain('"ditto"');
    expect(notarizeScript).not.toContain("-mac.zip");
    expect(packageOnceScript).not.toContain("`${artifactPrefix}-mac.zip`");
    expect(releaseGuide).toContain("唯一发布安装包是公证后的 DMG");
    expect(releaseGuide).not.toContain("## ZIP 处理");
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
