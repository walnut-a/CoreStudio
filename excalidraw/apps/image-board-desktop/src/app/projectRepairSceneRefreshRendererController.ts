import { CaptureUpdateAction } from "@excalidraw/element";
import type { ExcalidrawElement } from "@excalidraw/element/types";
import type {
  AppState,
  BinaryFileData,
  BinaryFiles,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";

import type {
  DesktopProjectBundle,
  ProjectAssetPayload,
} from "../shared/desktopBridgeTypes";
import type {
  ImageAssetRequestRendition,
  ImageRecordMap,
  ProjectThumbnailReadMode,
} from "../shared/projectTypes";

import { buildExcalidrawBinaryFilesFromProjectAssets } from "./canvasImageAssetState";
import {
  createProjectRepairSceneRefreshRendererActions,
  type ProjectRepairSceneRefreshRendererActions,
} from "./project/projectMaintenanceActionsController";
import { deserializeSceneFromProject } from "./project/sceneSerialization";

export interface DesktopProjectRepairSceneRefreshAssetReadInput {
  projectPath: string;
  fileIds: string[];
  rendition?: ImageAssetRequestRendition;
  thumbnailMode?: ProjectThumbnailReadMode;
}

export interface DesktopProjectRepairSceneSnapshot {
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
}

export const createDesktopProjectRepairSceneRefreshRendererActions = ({
  getActiveProject,
  getCurrentFiles,
  getFallbackCreatedAt,
  readProjectAssets,
  getEditorApi,
  queueFiles,
  setLatestScene,
  updateSceneImageFileIds,
  scheduleVisibleImageRenditionLoad,
  updateWorkspaceOverlay,
  updateCurrentProject,
  updateSelectedInspector,
}: {
  getActiveProject: () => DesktopProjectBundle | null | undefined;
  getCurrentFiles: () => BinaryFiles;
  getFallbackCreatedAt: () => number;
  readProjectAssets: (
    input: DesktopProjectRepairSceneRefreshAssetReadInput,
  ) => Promise<ProjectAssetPayload[]>;
  getEditorApi: () =>
    | Pick<
        ExcalidrawImperativeAPI,
        "getAppState" | "replaceFiles" | "updateScene"
      >
    | null
    | undefined;
  queueFiles: (files: BinaryFileData[]) => void;
  setLatestScene: (scene: DesktopProjectRepairSceneSnapshot) => void;
  updateSceneImageFileIds: (
    elements: readonly ExcalidrawElement[],
  ) => void;
  scheduleVisibleImageRenditionLoad: (
    scene: DesktopProjectRepairSceneSnapshot,
  ) => void;
  updateWorkspaceOverlay: (
    elements: readonly ExcalidrawElement[],
    appState: AppState,
  ) => void;
  updateCurrentProject: (project: DesktopProjectBundle) => void;
  updateSelectedInspector: (input: {
    elements: readonly ExcalidrawElement[];
    appState: AppState;
    imageRecords: ImageRecordMap;
  }) => void;
}): ProjectRepairSceneRefreshRendererActions<DesktopProjectBundle> =>
  createProjectRepairSceneRefreshRendererActions<
    DesktopProjectBundle,
    readonly ExcalidrawElement[],
    AppState,
    BinaryFiles
  >({
    getActiveProject,
    getCurrentFiles,
    getFallbackCreatedAt,
    deserializeScene: async (sceneJson) => {
      const restored = await deserializeSceneFromProject(sceneJson);
      const currentAppState = getEditorApi()?.getAppState();
      const restoredAppState = restored.appState as AppState;
      return {
        elements: restored.elements || [],
        appState: currentAppState
          ? {
              ...restoredAppState,
              scrollX: currentAppState.scrollX,
              scrollY: currentAppState.scrollY,
              zoom: currentAppState.zoom,
              width: currentAppState.width,
              height: currentAppState.height,
              offsetTop: currentAppState.offsetTop,
              offsetLeft: currentAppState.offsetLeft,
            }
          : restoredAppState,
      };
    },
    readThumbnailAssets: ({ project, fileIds }) =>
      readProjectAssets({
        projectPath: project.projectPath,
        fileIds,
        rendition: "thumbnail",
        thumbnailMode: "read-through",
      }),
    buildFiles: ({ assets, imageRecords, fallbackCreatedAt }) =>
      buildExcalidrawBinaryFilesFromProjectAssets({
        assets,
        imageRecords,
        fallbackCreatedAt,
      }),
    applyCanvasScene: ({ elements, appState, files }) => {
      const api = getEditorApi();
      const filesToAdd = Object.values(files) as BinaryFileData[];
      if (api) {
        if (filesToAdd.length) {
          api.replaceFiles(filesToAdd);
        }
        api.updateScene({
          elements,
          appState,
          captureUpdate: CaptureUpdateAction.NEVER,
        });
        return;
      }

      queueFiles(filesToAdd);
    },
    setLatestScene,
    updateSceneImageFileIds,
    scheduleVisibleImageRenditionLoad,
    updateWorkspaceOverlay,
    updateCurrentProject,
    updateSelectedInspector,
  });
