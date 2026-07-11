import type {
  AppState,
  BinaryFiles,
  ExcalidrawInitialDataState,
} from "@excalidraw/excalidraw/types";

import type {
  DesktopProjectBundle,
  ProjectAssetPayload,
} from "../shared/desktopBridgeTypes";
import type {
  ImageAssetRequestRendition,
  ProjectThumbnailReadMode,
} from "../shared/projectTypes";

import { collectAgentImageFileIds } from "./agent/agentCommandHandlers";
import { buildExcalidrawBinaryFilesFromProjectAssets } from "./canvasImageAssetState";
import { readInitialProjectImageRenditionAssets } from "./imageRenditionLoadPlan";
import {
  buildProjectMissingThumbnailFileIds,
  buildProjectThumbnailMaintenanceFromMissingFileIds,
  type ProjectThumbnailMaintenanceResult,
} from "./project/projectMaintenanceController";
import { deserializeSceneFromProject } from "./project/sceneSerialization";

export interface ProjectBundleOpenAssetReadInput {
  projectPath: string;
  fileIds: string[];
  rendition: ImageAssetRequestRendition;
  thumbnailMode?: ProjectThumbnailReadMode;
}

export interface ProjectBundleOpenLatestScene {
  elements: NonNullable<ExcalidrawInitialDataState["elements"]>;
  appState: AppState;
  files: BinaryFiles;
}

export interface ProjectBundleOpenData {
  assets: ProjectAssetPayload[];
  missingThumbnailFileIds: string[];
  thumbnailMaintenance: ProjectThumbnailMaintenanceResult;
  initialData: ExcalidrawInitialDataState;
  latestScene: ProjectBundleOpenLatestScene;
}

export const prepareProjectBundleOpenData = async ({
  project,
  devicePixelRatio,
  fallbackCreatedAt,
  readProjectAssets,
}: {
  project: DesktopProjectBundle;
  devicePixelRatio: number;
  fallbackCreatedAt: number;
  readProjectAssets: (
    input: ProjectBundleOpenAssetReadInput,
  ) => Promise<ProjectAssetPayload[]>;
}): Promise<ProjectBundleOpenData> => {
  const restored = await deserializeSceneFromProject(project.sceneJson);
  const restoredElements = restored.elements || [];
  const restoredAppState = restored.appState as AppState;
  const fileIds = collectAgentImageFileIds(restoredElements);
  const thumbnailAssets = project.safeMode
    ? []
    : await readProjectAssets({
        projectPath: project.projectPath,
        fileIds,
        rendition: "thumbnail",
        thumbnailMode: "cache-only",
      });
  const visibleRenditionAssets = project.safeMode
    ? []
    : await readInitialProjectImageRenditionAssets({
        project,
        scene: {
          elements: restoredElements,
          appState: restoredAppState,
        },
        devicePixelRatio,
        readProjectAssets: ({ projectPath, fileIds, rendition }) =>
          readProjectAssets({
            projectPath,
            fileIds,
            rendition,
          }),
      });

  const assets = [...thumbnailAssets, ...visibleRenditionAssets];
  const files = buildExcalidrawBinaryFilesFromProjectAssets({
    assets,
    imageRecords: project.imageRecords,
    fallbackCreatedAt,
  });
  const missingThumbnailFileIds =
    buildProjectMissingThumbnailFileIds(thumbnailAssets);
  const initialData: ExcalidrawInitialDataState = {
    elements: restored.elements,
    appState: restored.appState,
    files,
  };
  const latestScene = {
    elements: restoredElements,
    appState: restoredAppState,
    files,
  };

  return {
    assets,
    missingThumbnailFileIds,
    thumbnailMaintenance: buildProjectThumbnailMaintenanceFromMissingFileIds(
      missingThumbnailFileIds,
    ),
    initialData,
    latestScene,
  };
};
