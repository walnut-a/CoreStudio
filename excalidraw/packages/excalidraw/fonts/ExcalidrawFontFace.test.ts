import { describe, expect, it } from "vitest";

import { ExcalidrawFontFace } from "./ExcalidrawFontFace";

describe("ExcalidrawFontFace", () => {
  it("uses only host-provided asset roots when self-hosting fonts", () => {
    const fontFace = new ExcalidrawFontFace(
      "CoreStudio Test",
      "fonts/test-font.woff2",
    );

    expect(fontFace.urls.map((url) => url.toString())).toEqual([
      new URL(
        "fonts/test-font.woff2",
        window.EXCALIDRAW_ASSET_PATH as string,
      ).toString(),
    ]);
  });
});
