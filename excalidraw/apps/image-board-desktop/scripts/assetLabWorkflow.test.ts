import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const desktopRoot = resolve(process.cwd(), "apps/image-board-desktop");

const readDesktopFile = (relativePath: string) =>
  readFileSync(resolve(desktopRoot, relativePath), "utf8");

describe("Asset Lab workflow", () => {
  it("provides a renderer-only development command", () => {
    const packageJson = JSON.parse(readDesktopFile("package.json"));

    expect(packageJson.scripts["dev:assets"]).toContain("vite");
    expect(packageJson.scripts["dev:assets"]).toContain(
      "--open /asset-lab.html",
    );
    expect(packageJson.scripts["dev:assets"]).not.toContain("electron");
  });

  it("uses a dedicated development entry with production asset components", () => {
    const html = readDesktopFile("asset-lab.html");
    const mainSource = readDesktopFile("src/assetLabMain.tsx");
    const labSource = readDesktopFile("src/app/dev/AssetLabApp.tsx");

    expect(html).toContain("/src/assetLabMain.tsx");
    expect(html).not.toContain("/src/main.tsx");
    expect(mainSource).toContain('import "./app/App.css"');
    expect(labSource).toContain("ImageAssetSidebar");
    expect(labSource).toContain("InspectorSidebar");
  });

  it("keeps the Lab out of the packaged renderer entry", () => {
    const viteConfig = readDesktopFile("vite.config.mts");
    const productionHtml = readDesktopFile("index.html");

    expect(productionHtml).not.toContain("assetLabMain");
    expect(viteConfig).not.toContain("asset-lab.html");
  });
});
