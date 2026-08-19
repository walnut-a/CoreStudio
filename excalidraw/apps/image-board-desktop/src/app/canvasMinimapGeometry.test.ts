import type { NormalizedZoomValue } from "@excalidraw/excalidraw/types";
import { describe, expect, it } from "vitest";

import {
  createCanvasMinimapTransform,
  getCanvasViewportBounds,
  measureEdgeOcclusionOffsets,
  mergeCanvasViewportOffsets,
  minimapPointToScene,
  scenePointToMinimap,
} from "./canvasMinimapGeometry";

describe("canvasMinimapGeometry", () => {
  it("merges internal and host offsets without double-counting a side", () => {
    expect(
      mergeCanvasViewportOffsets(
        { top: 48, right: 24, bottom: 16, left: 20 },
        { right: 300, left: 280 },
      ),
    ).toEqual({ top: 48, right: 300, bottom: 16, left: 280 });
  });

  it("measures only edge-attached host occlusions", () => {
    const canvas = {
      top: 40,
      right: 1100,
      bottom: 840,
      left: 100,
      width: 1000,
      height: 800,
    };

    expect(
      measureEdgeOcclusionOffsets(canvas, {
        left: {
          top: 40,
          right: 340,
          bottom: 840,
          left: 100,
          width: 240,
          height: 800,
        },
        right: {
          top: 40,
          right: 1100,
          bottom: 840,
          left: 850,
          width: 250,
          height: 800,
        },
      }),
    ).toEqual({ top: 0, right: 250, bottom: 0, left: 240 });

    expect(
      measureEdgeOcclusionOffsets(canvas, {
        left: {
          top: 400,
          right: 800,
          bottom: 500,
          left: 400,
          width: 400,
          height: 100,
        },
      }),
    ).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it("derives the usable scene viewport from zoom and offsets", () => {
    expect(
      getCanvasViewportBounds(
        {
          width: 1200,
          height: 800,
          scrollX: -100,
          scrollY: -50,
          zoom: { value: 0.5 as NormalizedZoomValue },
        },
        { top: 40, right: 200, bottom: 20, left: 100 },
      ),
    ).toEqual({ x: 300, y: 130, width: 1800, height: 1480 });
  });

  it("round-trips scene and minimap coordinates", () => {
    const transform = createCanvasMinimapTransform({
      contentBounds: { x: -200, y: -100, width: 1600, height: 900 },
      viewportBounds: { x: 200, y: 100, width: 800, height: 600 },
      mapWidth: 224,
      mapHeight: 144,
      padding: 8,
    });
    const mapPoint = scenePointToMinimap({ x: 720, y: 360 }, transform);

    const scenePoint = minimapPointToScene(mapPoint, transform);
    expect(scenePoint.x).toBeCloseTo(720);
    expect(scenePoint.y).toBeCloseTo(360);
  });
});
