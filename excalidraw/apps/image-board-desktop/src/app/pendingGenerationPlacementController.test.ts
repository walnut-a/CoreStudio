import { describe, expect, it, vi } from "vitest";

import { buildPendingGenerationPlacements } from "./pendingGenerationPlacementController";

import type { AppState } from "@excalidraw/excalidraw/types";
import type { GenerationRequest } from "../shared/providerTypes";

const createRequest = (
  referenceEnabled = false,
): GenerationRequest => ({
  provider: "zenmux",
  model: "google/gemini-3-pro-image-preview",
  prompt: "生成一台苹果风 CNC",
  width: 100,
  height: 100,
  imageCount: 1,
  seed: null,
  reference: referenceEnabled
    ? {
        enabled: true,
        elementCount: 0,
        textCount: 0,
        items: [],
      }
    : null,
});

const createAppState = (selectedElementIds: Record<string, true> = {}) =>
  ({
    width: 1000,
    height: 800,
    scrollX: 0,
    scrollY: 0,
    zoom: { value: 1 },
    selectedElementIds,
    selectedGroupIds: {},
    viewBackgroundColor: "#ffffff",
  }) as unknown as AppState;

describe("buildPendingGenerationPlacements", () => {
  it("uses the last canvas pointer as the placement anchor when there is no reference anchor", () => {
    const resolveWorkspaceBounds = vi.fn(() => null);

    const result = buildPendingGenerationPlacements({
      api: {
        getAppState: () => createAppState(),
        getSceneElementsIncludingDeleted: () => [],
      },
      request: createRequest(),
      referenceScene: null,
      fallbackReferenceScene: null,
      lastCanvasPointer: { x: 200, y: 300 },
      previousBatchBounds: { x: 20, y: 30, width: 100, height: 100 },
      explicitPlacementViewport: null,
      resolveWorkspaceBounds,
    });

    expect(result.placements).toEqual([
      {
        x: 150,
        y: 250,
        width: 100,
        height: 100,
      },
    ]);
    expect(result.batchBounds).toEqual({
      x: 150,
      y: 250,
      width: 100,
      height: 100,
    });
    expect(resolveWorkspaceBounds).toHaveBeenCalledWith(
      expect.objectContaining({
        explicitPlacementViewport: null,
        placementViewport: expect.objectContaining({
          viewportCenter: { x: 500, y: 400 },
          viewportSize: { width: 1000, height: 800 },
          zoomValue: 1,
        }),
      }),
    );
  });

  it("uses selected reference bounds instead of the canvas pointer when reference is enabled", () => {
    const result = buildPendingGenerationPlacements({
      api: {
        getAppState: () => createAppState(),
        getSceneElementsIncludingDeleted: () => [
          {
            id: "reference-rect",
            type: "rectangle",
            isDeleted: false,
            x: 10,
            y: 20,
            width: 100,
            height: 100,
            angle: 0,
            groupIds: [],
          },
        ] as any,
      },
      request: createRequest(true),
      referenceScene: {
        elements: [
          {
            id: "reference-rect",
            type: "rectangle",
            isDeleted: false,
            x: 10,
            y: 20,
            width: 100,
            height: 100,
            angle: 0,
            groupIds: [],
          },
        ] as any,
        appState: createAppState({ "reference-rect": true }),
        files: {},
      },
      fallbackReferenceScene: null,
      lastCanvasPointer: { x: 900, y: 900 },
      previousBatchBounds: { x: 20, y: 30, width: 100, height: 100 },
      explicitPlacementViewport: null,
      resolveWorkspaceBounds: () => null,
    });

    expect(result.placements).toEqual([
      {
        x: 174,
        y: 20,
        width: 100,
        height: 100,
      },
    ]);
    expect(result.batchBounds).toEqual({
      x: 174,
      y: 20,
      width: 100,
      height: 100,
    });
  });
});
