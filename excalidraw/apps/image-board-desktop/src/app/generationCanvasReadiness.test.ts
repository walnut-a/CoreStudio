import { describe, expect, it } from "vitest";

import { resolveGenerationCanvasReadiness } from "./generationCanvasReadiness";
import { setActiveDesktopLocale } from "./copy";

describe("resolveGenerationCanvasReadiness", () => {
  const api = { id: "api" };
  const project = { projectPath: "/projects/industrial" };

  it("returns the ready api and project when both exist", () => {
    expect(
      resolveGenerationCanvasReadiness({
        api,
        project,
        requireReady: true,
      }),
    ).toEqual({
      status: "ready",
      api,
      project,
    });
  });

  it("skips quietly when the canvas is not ready and readiness is optional", () => {
    expect(
      resolveGenerationCanvasReadiness({
        api: null,
        project,
        requireReady: false,
      }),
    ).toEqual({
      status: "skip",
    });
  });

  it("throws a product error when the canvas is required but not ready", () => {
    expect(() =>
      resolveGenerationCanvasReadiness({
        api,
        project: null,
        requireReady: true,
      }),
    ).toThrow("CoreStudio 画板还没有准备好。");
  });

  it("localizes the required-canvas error", () => {
    setActiveDesktopLocale("en");

    expect(() =>
      resolveGenerationCanvasReadiness({
        api,
        project: null,
        requireReady: true,
      }),
    ).toThrow("The CoreStudio board is not ready yet.");
    setActiveDesktopLocale("zh-CN");
  });
});
