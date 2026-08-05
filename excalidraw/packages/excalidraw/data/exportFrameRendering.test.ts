import { describe, expect, it } from "vitest";

import { getFrameRenderingForExport } from "./exportFrameRendering";

describe("getFrameRenderingForExport", () => {
  it("hides frame names and outlines while preserving clipping", () => {
    const frameRendering = {
      enabled: true,
      clip: true,
      name: true,
      outline: true,
    };

    expect(getFrameRenderingForExport(frameRendering)).toEqual({
      enabled: true,
      clip: true,
      name: false,
      outline: false,
    });
    expect(frameRendering).toEqual({
      enabled: true,
      clip: true,
      name: true,
      outline: true,
    });
  });

  it("keeps an explicitly disabled frame renderer disabled", () => {
    expect(
      getFrameRenderingForExport({
        enabled: false,
        clip: false,
        name: true,
        outline: true,
      }),
    ).toEqual({
      enabled: false,
      clip: false,
      name: false,
      outline: false,
    });
  });
});
