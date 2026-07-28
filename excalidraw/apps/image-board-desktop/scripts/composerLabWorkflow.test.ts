import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const desktopRoot = resolve(process.cwd(), "apps/image-board-desktop");

const readDesktopFile = (relativePath: string) =>
  readFileSync(resolve(desktopRoot, relativePath), "utf8");

describe("Composer Lab workflow", () => {
  it("provides a renderer-only development command", () => {
    const packageJson = JSON.parse(readDesktopFile("package.json"));

    expect(packageJson.scripts["dev:composer"]).toContain("vite");
    expect(packageJson.scripts["dev:composer"]).toContain(
      "--open /composer-lab.html",
    );
    expect(packageJson.scripts["dev:composer"]).not.toContain("electron");
  });

  it("uses a dedicated development HTML entry and the production composer", () => {
    const html = readDesktopFile("composer-lab.html");
    const mainSource = readDesktopFile("src/composerLabMain.tsx");
    const labSource = readDesktopFile("src/app/dev/ComposerLabApp.tsx");
    const appCss = readDesktopFile("src/app/App.css");

    expect(html).toContain("/src/composerLabMain.tsx");
    expect(html).not.toContain("/src/main.tsx");
    expect(mainSource).toContain("GenerateImageDialog.css");
    expect(mainSource).toContain("App.css");
    expect(appCss).toContain('@import "./styles/designTokens.css"');
    expect(labSource).toContain("GenerateDialogComposerSection");
    expect(labSource).not.toContain("<InlinePromptEditor ");
  });

  it("keeps the Lab out of the packaged renderer entry", () => {
    const viteConfig = readDesktopFile("vite.config.mts");
    const productionHtml = readDesktopFile("index.html");

    expect(productionHtml).not.toContain("composerLabMain");
    expect(viteConfig).not.toContain("composer-lab.html");
  });
});
