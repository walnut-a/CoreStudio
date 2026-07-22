import { CaptureUpdateAction } from "@excalidraw/element";

import type { ExcalidrawElement } from "@excalidraw/element/types";
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";

import type {
  DesktopProjectBundle,
  PersistedImageAssetInput,
} from "../shared/desktopBridgeTypes";
import type { ImageRecordMap } from "../shared/projectTypes";
import { applyProjectImageRecordsAutosaveSnapshotState } from "./autosaveProjectState";
import { buildExcalidrawBinaryFilesFromImageAssets } from "./canvasImageAssetState";
import { resolveGenerationCanvasReadiness } from "./generationCanvasReadiness";
import { buildGeneratedImageSceneUpdate } from "./generationSceneElements";
import {
  getGeneratedImagePreviousBatchBounds,
  measureBatchBounds,
  placeGeneratedImages,
  resolveGeneratedImagePlacementViewport,
  type GeneratedImagePlacementViewport,
  type SceneBounds,
} from "./project/imagePlacement";
import {
  ENABLE_WORKSPACE_BOUNDS,
  getSceneOccupiedBounds,
  getViewportCenterFromAppState,
  getWorkspaceBounds,
} from "./workspaceBounds";

export interface GeneratedImageSceneInsertOptions {
  anchorPoint?: { x: number; y: number } | null;
  expectedProjectPath?: string;
  placementViewport?: GeneratedImagePlacementViewport | null;
  requireReady?: boolean;
}

export type GeneratedImageSceneInsertEditorApi = Pick<
  ExcalidrawImperativeAPI,
  | "getAppState"
  | "getSceneElementsIncludingDeleted"
  | "addFiles"
  | "updateScene"
  | "getFiles"
>;

export interface GeneratedImageSceneInsertRendererActionsInput {
  getEditorApi: () => GeneratedImageSceneInsertEditorApi | null | undefined;
  getActiveProject: () => DesktopProjectBundle | null | undefined;
  assertActiveProject: (expectedProjectPath?: string) => void;
  getSavedSceneHash: () => string | null;
  getPreviousBatchBounds: () => SceneBounds | null;
  setPreviousBatchBounds: (bounds: SceneBounds | null) => void;
  updateWorkspaceOverlay: (
    elements: readonly ExcalidrawElement[],
    appState: AppState,
  ) => SceneBounds | null;
  setActiveProject: (project: DesktopProjectBundle) => void;
  setPendingSnapshot: (snapshot: {
    project: DesktopProjectBundle;
    elements: readonly ExcalidrawElement[];
    appState: AppState;
    files: BinaryFiles;
    expectedSceneHash: string | null;
  }) => void;
  flushPendingAutosave: (options?: { strict?: boolean }) => Promise<unknown>;
  getFallbackCreatedAt: () => number;
}

export const runGeneratedImageSceneInsertRendererAction = async ({
  assets,
  imageRecords,
  options = {},
  getEditorApi,
  getActiveProject,
  assertActiveProject,
  getSavedSceneHash,
  getPreviousBatchBounds,
  setPreviousBatchBounds,
  updateWorkspaceOverlay,
  setActiveProject,
  setPendingSnapshot,
  flushPendingAutosave,
  getFallbackCreatedAt,
}: GeneratedImageSceneInsertRendererActionsInput & {
  assets: readonly PersistedImageAssetInput[];
  imageRecords: ImageRecordMap;
  options?: GeneratedImageSceneInsertOptions;
}): Promise<void> => {
  assertActiveProject(options.expectedProjectPath);
  const initialReadiness = resolveGenerationCanvasReadiness({
    api: getEditorApi(),
    project: getActiveProject(),
    requireReady: options.requireReady,
  });
  if (initialReadiness.status === "skip") {
    return;
  }

  const { api } = initialReadiness;
  const appState = api.getAppState();
  const elements = api.getSceneElementsIncludingDeleted();
  const explicitPlacementViewport = options.placementViewport ?? null;
  const placementViewport = resolveGeneratedImagePlacementViewport({
    explicitViewport: explicitPlacementViewport,
    appViewport: {
      viewportCenter: getViewportCenterFromAppState(appState),
      viewportSize: {
        width: appState.width,
        height: appState.height,
      },
      zoomValue: appState.zoom.value,
    },
  });
  const workspaceBounds = explicitPlacementViewport
    ? ENABLE_WORKSPACE_BOUNDS
      ? getWorkspaceBounds(elements, {
          viewportCenter: placementViewport.viewportCenter,
        })
      : null
    : updateWorkspaceOverlay(elements, appState);
  const anchorPoint = options.anchorPoint ?? null;
  const placements = placeGeneratedImages({
    images: assets.map((asset) => ({
      width: asset.width,
      height: asset.height,
    })),
    anchorPoint,
    viewportCenter: placementViewport.viewportCenter,
    viewportSize: placementViewport.viewportSize,
    zoomValue: placementViewport.zoomValue,
    previousBatchBounds: getGeneratedImagePreviousBatchBounds({
      anchorPoint,
      previousBatchBounds: getPreviousBatchBounds(),
    }),
    occupiedBounds: getSceneOccupiedBounds(elements),
    workspaceBounds,
  });

  const filesToAdd = buildExcalidrawBinaryFilesFromImageAssets({
    assets,
    fallbackCreatedAt: getFallbackCreatedAt(),
  });

  assertActiveProject(options.expectedProjectPath);
  const activeReadiness = resolveGenerationCanvasReadiness({
    api: getEditorApi(),
    project: getActiveProject(),
    requireReady: options.requireReady,
  });
  if (activeReadiness.status === "skip") {
    return;
  }

  const { api: activeApi, project: activeProject } = activeReadiness;
  activeApi.addFiles(filesToAdd);
  const sceneUpdate = buildGeneratedImageSceneUpdate({
    existingElements: activeApi.getSceneElementsIncludingDeleted(),
    appState: activeApi.getAppState(),
    assets,
    placements,
  });
  activeApi.updateScene({
    elements: sceneUpdate.elements,
    appState: {
      selectedElementIds: sceneUpdate.selectedElementIds,
    },
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });

  setPreviousBatchBounds(measureBatchBounds(placements));
  applyProjectImageRecordsAutosaveSnapshotState({
    project: activeProject,
    imageRecords,
    elements: sceneUpdate.elements,
    appState: sceneUpdate.appState,
    files: activeApi.getFiles(),
    expectedSceneHash: getSavedSceneHash(),
    setProject: setActiveProject,
    setPendingSnapshot,
  });
  await flushPendingAutosave({ strict: Boolean(options.requireReady) });
};

export const createGeneratedImageSceneInsertRendererActions = (
  input: GeneratedImageSceneInsertRendererActionsInput,
) => ({
  insertAssets: (
    assets: readonly PersistedImageAssetInput[],
    imageRecords: ImageRecordMap,
    options?: GeneratedImageSceneInsertOptions,
  ) =>
    runGeneratedImageSceneInsertRendererAction({
      ...input,
      assets,
      imageRecords,
      options,
    }),
});
