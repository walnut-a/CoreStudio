import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it } from "vitest";

const desktopRoot = path.resolve(__dirname, "..");

describe("Excalidraw asset bootstrap", () => {
  it("configures a local asset root before the renderer entry loads", () => {
    const indexHtml = fs.readFileSync(
      path.join(desktopRoot, "index.html"),
      "utf8",
    );
    const bootstrapScript = fs.readFileSync(
      path.join(desktopRoot, "src", "excalidrawAssets.ts"),
      "utf8",
    );

    const bootstrapIndex = indexHtml.indexOf(
      '<script type="module" src="/src/excalidrawAssets.ts"></script>',
    );
    const rendererIndex = indexHtml.indexOf(
      '<script type="module" src="/src/main.tsx"></script>',
    );

    expect(bootstrapIndex).toBeGreaterThan(-1);
    expect(bootstrapIndex).toBeLessThan(rendererIndex);

    const window = {
      location: {
        href: "http://127.0.0.1:5174/projects/demo",
      },
      EXCALIDRAW_ASSET_PATH: undefined as string | undefined,
    };

    vm.runInNewContext(bootstrapScript, { URL, window });

    expect(window.EXCALIDRAW_ASSET_PATH).toBe("http://127.0.0.1:5174/projects/");
  });
});
