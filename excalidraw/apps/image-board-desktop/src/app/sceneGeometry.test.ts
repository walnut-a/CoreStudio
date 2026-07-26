import { newFrameElement } from "@excalidraw/element";
import type { NormalizedZoomValue } from "@excalidraw/excalidraw/types";
import { describe, expect, it } from "vitest";

import {
  getElementsSceneBounds,
  getSceneOccupiedBounds,
  getViewportCenterFromAppState,
  getViewportZoomValue,
} from "./sceneGeometry";

describe("sceneGeometry", () => {
  it("returns combined scene bounds for a group of elements", () => {
    const leftFrame = newFrameElement({
      x: 100,
      y: 80,
      width: 400,
      height: 300,
    });
    const rightFrame = newFrameElement({
      x: 700,
      y: 600,
      width: 120,
      height: 90,
    });

    expect(getElementsSceneBounds([leftFrame, rightFrame])).toEqual({
      x: 100,
      y: 80,
      width: 720,
      height: 610,
    });
    expect(getElementsSceneBounds([])).toBeNull();
  });

  it("returns occupied bounds for visible elements with valid geometry only", () => {
    const visibleFrame = newFrameElement({
      x: 100,
      y: 80,
      width: 400,
      height: 300,
    });
    const deletedFrame = {
      ...newFrameElement({
        x: -1000,
        y: -1000,
        width: 300,
        height: 200,
      }),
      isDeleted: true,
    };

    expect(
      getSceneOccupiedBounds([
        visibleFrame,
        deletedFrame,
        { isDeleted: false } as never,
      ]),
    ).toEqual([
      {
        x: 100,
        y: 80,
        width: 400,
        height: 300,
      },
    ]);
  });

  it("derives viewport center and normalizes invalid zoom values", () => {
    expect(
      getViewportCenterFromAppState({
        width: 1000,
        height: 800,
        scrollX: -200,
        scrollY: -100,
        zoom: { value: 0.5 as NormalizedZoomValue },
      }),
    ).toEqual({ x: 1200, y: 900 });

    expect(
      getViewportZoomValue({
        zoom: { value: 0.75 as NormalizedZoomValue },
      }),
    ).toBe(0.75);
    expect(
      getViewportZoomValue({
        zoom: { value: Number.NaN as NormalizedZoomValue },
      }),
    ).toBe(1);
  });
});
