import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";

import {
  getGeneratedImagePreviousBatchBounds,
  measureBatchBounds,
  placeGeneratedImages,
  resolveGeneratedImagePlacementViewport,
  type GeneratedImagePlacementViewport,
  type ImagePlacement,
  type SceneBounds,
} from "./project/imagePlacement";
import { getGenerationReferenceAnchorBounds } from "./selectionReference";
import {
  getSceneOccupiedBounds,
  getViewportCenterFromAppState,
  getViewportZoomValue,
} from "./sceneGeometry";

import type { GenerationRequest } from "../shared/providerTypes";

export interface PendingGenerationPlacementApi {
  getAppState: () => AppState;
  getSceneElementsIncludingDeleted: () => readonly ExcalidrawElement[];
}

export interface PendingGenerationReferenceScene {
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
}

export interface PendingGenerationPlacementResult {
  placements: ImagePlacement[];
  batchBounds: SceneBounds | null;
}

export const buildPendingGenerationPlacements = ({
  api,
  request,
  explicitPlacementViewport,
  referenceScene,
  fallbackReferenceScene,
  lastCanvasPointer,
  previousBatchBounds,
}: {
  api: PendingGenerationPlacementApi;
  request: GenerationRequest;
  explicitPlacementViewport?: GeneratedImagePlacementViewport | null;
  referenceScene?: PendingGenerationReferenceScene | null;
  fallbackReferenceScene?: PendingGenerationReferenceScene | null;
  lastCanvasPointer?: { x: number; y: number } | null;
  previousBatchBounds?: SceneBounds | null;
}): PendingGenerationPlacementResult => {
  const appState = api.getAppState();
  const elements = api.getSceneElementsIncludingDeleted();
  const normalizedExplicitPlacementViewport = explicitPlacementViewport ?? null;
  const placementViewport = resolveGeneratedImagePlacementViewport({
    explicitViewport: normalizedExplicitPlacementViewport,
    appViewport: {
      viewportCenter: getViewportCenterFromAppState(appState),
      viewportSize: {
        width: appState.width,
        height: appState.height,
      },
      zoomValue: getViewportZoomValue(appState),
    },
  });
  const anchorBounds = getGenerationReferenceAnchorBounds(
    request,
    referenceScene ?? fallbackReferenceScene ?? null,
  );
  const anchorPoint = anchorBounds ? null : lastCanvasPointer ?? null;
  const placements = placeGeneratedImages({
    images: Array.from({ length: request.imageCount }, () => ({
      width: request.width,
      height: request.height,
    })),
    anchorBounds,
    anchorPoint,
    occupiedBounds: getSceneOccupiedBounds(elements),
    viewportCenter: placementViewport.viewportCenter,
    viewportSize: placementViewport.viewportSize,
    zoomValue: placementViewport.zoomValue,
    previousBatchBounds: getGeneratedImagePreviousBatchBounds({
      anchorBounds,
      anchorPoint,
      previousBatchBounds,
    }),
  });

  return {
    placements,
    batchBounds: measureBatchBounds(placements),
  };
};
