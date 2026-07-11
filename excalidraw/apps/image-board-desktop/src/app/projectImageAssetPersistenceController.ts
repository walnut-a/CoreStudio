import type {
  DesktopProjectBundle,
  PersistedImageAssetInput,
} from "../shared/desktopBridgeTypes";
import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { BinaryFiles } from "@excalidraw/excalidraw/types";
import type { ImageRecordMap } from "../shared/projectTypes";
import { buildUnknownCanvasImageAssetInputs } from "./canvasImageAssetState";
import { applyPersistedProjectImageRecordsState } from "./imageRecordState";

export {
  beginProjectImageWritebackAction,
  rollbackProjectImageWritebackAfterFailure,
} from "./projectImageWritebackController";
export type { ProjectImageWritebackHandle } from "./projectImageWritebackController";

export const runProjectImageAssetPersistenceAction = async ({
  projectPath,
  projectImageRecords,
  activeProject,
  files,
  persistImageAssets,
  setActiveProject,
}: {
  projectPath: string;
  projectImageRecords: ImageRecordMap;
  activeProject: DesktopProjectBundle | null;
  files: PersistedImageAssetInput[];
  persistImageAssets: (input: {
    projectPath: string;
    files: PersistedImageAssetInput[];
  }) => Promise<ImageRecordMap>;
  setActiveProject: (project: DesktopProjectBundle) => void;
}): Promise<{
  status: "persisted";
  persistedRecords: ImageRecordMap;
  imageRecords: ImageRecordMap;
}> => {
  const persistedRecords = await persistImageAssets({
    projectPath,
    files,
  });
  const { imageRecords } = applyPersistedProjectImageRecordsState({
    projectPath,
    projectImageRecords,
    activeProject,
    persistedRecords,
    setActiveProject,
  });

  return {
    status: "persisted",
    persistedRecords,
    imageRecords,
  };
};

export const runUnknownCanvasImageAssetPersistenceAction = async ({
  project,
  activeProject,
  elements,
  files,
  persistImageAssets,
  setActiveProject,
}: {
  project: DesktopProjectBundle;
  activeProject: DesktopProjectBundle | null;
  elements: readonly ExcalidrawElement[];
  files: BinaryFiles;
  persistImageAssets: (input: {
    projectPath: string;
    files: PersistedImageAssetInput[];
  }) => Promise<ImageRecordMap>;
  setActiveProject: (project: DesktopProjectBundle) => void;
}): Promise<ImageRecordMap> => {
  const unknownAssets = buildUnknownCanvasImageAssetInputs({
    imageRecords: project.imageRecords,
    elements,
    files,
  });

  if (!unknownAssets.length) {
    return project.imageRecords;
  }

  const persistedImageRecordsState =
    await runProjectImageAssetPersistenceAction({
      projectPath: project.projectPath,
      projectImageRecords: project.imageRecords,
      activeProject,
      files: unknownAssets,
      persistImageAssets,
      setActiveProject,
    });

  return persistedImageRecordsState.imageRecords;
};

export interface ProjectImageAssetPersistenceRendererActionsInput {
  getActiveProject: () => DesktopProjectBundle | null;
  persistImageAssets: (input: {
    projectPath: string;
    files: PersistedImageAssetInput[];
  }) => Promise<ImageRecordMap>;
  setActiveProject: (project: DesktopProjectBundle) => void;
}

export const createProjectImageAssetPersistenceRendererActions = ({
  getActiveProject,
  persistImageAssets,
  setActiveProject,
}: ProjectImageAssetPersistenceRendererActionsInput) => ({
  persistProjectImageAssets: (input: {
    projectPath: string;
    projectImageRecords: ImageRecordMap;
    activeProject: DesktopProjectBundle | null;
    files: PersistedImageAssetInput[];
  }) =>
    runProjectImageAssetPersistenceAction({
      ...input,
      persistImageAssets,
      setActiveProject,
    }),
  persistUnknownCanvasImages: (
    project: DesktopProjectBundle,
    elements: readonly ExcalidrawElement[],
    files: BinaryFiles,
  ) =>
    runUnknownCanvasImageAssetPersistenceAction({
      project,
      activeProject: getActiveProject(),
      elements,
      files,
      persistImageAssets,
      setActiveProject,
    }),
});
