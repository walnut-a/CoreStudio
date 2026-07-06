import type {
  BinaryFileData,
  BinaryFiles,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";

import type {
  DesktopProjectBundle,
  ProjectAssetPayload,
} from "../shared/desktopBridgeTypes";

import { buildExcalidrawBinaryFilesFromProjectAssets } from "./canvasImageAssetState";
import { applyProjectMaintenanceAssetSceneState } from "./project/projectMaintenanceActionsController";

export interface DesktopProjectAssetSceneSnapshot {
  files: BinaryFiles;
}

export interface CreateDesktopProjectAssetSceneApplyRendererActionInput<
  TScene extends DesktopProjectAssetSceneSnapshot,
> {
  getActiveProject: () => DesktopProjectBundle | null | undefined;
  getLatestScene: () => TScene | null;
  getFallbackCreatedAt: () => number;
  getEditorApi: () =>
    | Pick<ExcalidrawImperativeAPI, "replaceFiles">
    | null
    | undefined;
  queueFiles: (files: BinaryFileData[]) => void;
  setLatestScene: (scene: TScene | null) => void;
}

export const createDesktopProjectAssetSceneApplyRendererAction =
  <TScene extends DesktopProjectAssetSceneSnapshot>({
    getActiveProject,
    getLatestScene,
    getFallbackCreatedAt,
    getEditorApi,
    queueFiles,
    setLatestScene,
  }: CreateDesktopProjectAssetSceneApplyRendererActionInput<TScene>) =>
  (
    project: DesktopProjectBundle,
    assets: readonly ProjectAssetPayload[],
  ): boolean =>
    applyProjectMaintenanceAssetSceneState({
      activeProject: getActiveProject(),
      projectPath: project.projectPath,
      assetCount: assets.length,
      scene: getLatestScene(),
      buildFiles: (activeProject) =>
        buildExcalidrawBinaryFilesFromProjectAssets({
          assets,
          imageRecords: activeProject.imageRecords,
          fallbackCreatedAt: getFallbackCreatedAt(),
        }),
      applyFilesToCanvas: (filesToAdd) => {
        const files = filesToAdd as BinaryFileData[];
        const editorApi = getEditorApi();
        if (editorApi) {
          editorApi.replaceFiles(files);
          return;
        }
        queueFiles(files);
      },
      setLatestScene,
    });
