import type { ClipboardData } from "@excalidraw/excalidraw/clipboard";

import type {
  DesktopProjectBundle,
  ImportedImagePayload,
  PersistedImageAssetInput,
} from "../shared/desktopBridgeTypes";
import type { ImageRecordMap } from "../shared/projectTypes";
import { isEmptyClipboardData } from "./clipboardDataState";
import { runCurrentProjectCommandFailureAction } from "./currentProjectApplyController";
import { runProjectImageAssetPersistenceAction } from "./projectImageAssetPersistenceController";

type ProjectImageAssetSceneInserter<InsertionOptions> = (
  files: PersistedImageAssetInput[],
  imageRecords: ImageRecordMap,
  insertionOptions?: InsertionOptions,
) => Promise<void>;

const toImportedImageAssets = (
  images: ImportedImagePayload[],
): PersistedImageAssetInput[] =>
  images.map((image) => ({
    ...image,
    sourceType: "imported",
  }));

export const runProjectImageAssetInsertAction = async <InsertionOptions>({
  project,
  files,
  activeProject,
  persistImageAssets,
  setActiveProject,
  insertAssetsIntoScene,
  insertionOptions,
}: {
  project: DesktopProjectBundle;
  files: PersistedImageAssetInput[];
  activeProject: DesktopProjectBundle | null;
  persistImageAssets: (input: {
    projectPath: string;
    files: PersistedImageAssetInput[];
  }) => Promise<ImageRecordMap>;
  setActiveProject: (project: DesktopProjectBundle) => void;
  insertAssetsIntoScene: ProjectImageAssetSceneInserter<InsertionOptions>;
  insertionOptions?: InsertionOptions;
}): Promise<{
  status: "inserted";
  imageRecords: ImageRecordMap;
}> => {
  const { imageRecords } = await runProjectImageAssetPersistenceAction({
    projectPath: project.projectPath,
    projectImageRecords: project.imageRecords,
    activeProject,
    files,
    persistImageAssets,
    setActiveProject,
  });

  if (insertionOptions === undefined) {
    await insertAssetsIntoScene(files, imageRecords);
  } else {
    await insertAssetsIntoScene(files, imageRecords, insertionOptions);
  }

  return {
    status: "inserted",
    imageRecords,
  };
};

export const runProjectImagesImportAction = async <InsertionOptions>({
  project,
  activeProject,
  importImages,
  persistImageAssets,
  setActiveProject,
  insertAssetsIntoScene,
  insertionOptions,
  formatError,
  setProjectError,
}: {
  project: DesktopProjectBundle | null;
  activeProject: DesktopProjectBundle | null;
  importImages: () => Promise<ImportedImagePayload[]>;
  persistImageAssets: (input: {
    projectPath: string;
    files: PersistedImageAssetInput[];
  }) => Promise<ImageRecordMap>;
  setActiveProject: (project: DesktopProjectBundle) => void;
  insertAssetsIntoScene: ProjectImageAssetSceneInserter<InsertionOptions>;
  insertionOptions?: InsertionOptions;
  formatError: (error: unknown) => string;
  setProjectError: (message: string) => void;
}): Promise<
  | { status: "skipped"; reason: "missing-project" | "empty-selection" }
  | { status: "imported"; importedCount: number }
  | { status: "failed"; error: unknown }
> => {
  if (!project) {
    return { status: "skipped", reason: "missing-project" };
  }

  try {
    const importedImages = await importImages();
    if (!importedImages.length) {
      return { status: "skipped", reason: "empty-selection" };
    }

    const files = toImportedImageAssets(importedImages);
    await runProjectImageAssetInsertAction({
      project,
      files,
      activeProject,
      persistImageAssets,
      setActiveProject,
      insertAssetsIntoScene,
      insertionOptions,
    });

    return {
      status: "imported",
      importedCount: importedImages.length,
    };
  } catch (error) {
    runCurrentProjectCommandFailureAction({
      error,
      formatError,
      setProjectError,
    });
    return {
      status: "failed",
      error,
    };
  }
};

export const runDesktopClipboardImagePasteAction = async <InsertionOptions>({
  data,
  project,
  activeProject,
  readClipboardImage,
  persistImageAssets,
  setActiveProject,
  insertAssetsIntoScene,
  insertionOptions,
  formatError,
  setProjectError,
}: {
  data: ClipboardData;
  project: DesktopProjectBundle | null;
  activeProject: DesktopProjectBundle | null;
  readClipboardImage?: () => Promise<ImportedImagePayload | null>;
  persistImageAssets: (input: {
    projectPath: string;
    files: PersistedImageAssetInput[];
  }) => Promise<ImageRecordMap>;
  setActiveProject: (project: DesktopProjectBundle) => void;
  insertAssetsIntoScene: ProjectImageAssetSceneInserter<InsertionOptions>;
  insertionOptions?: InsertionOptions;
  formatError: (error: unknown) => string;
  setProjectError: (message: string) => void;
}): Promise<
  | {
      status: "skipped";
      reason:
        | "clipboard-has-data"
        | "missing-project"
        | "unsupported-clipboard-image"
        | "empty-clipboard-image";
      shouldContinuePaste: true;
    }
  | { status: "pasted"; shouldContinuePaste: false }
  | { status: "failed"; error: unknown; shouldContinuePaste: false }
> => {
  if (!isEmptyClipboardData(data)) {
    return {
      status: "skipped",
      reason: "clipboard-has-data",
      shouldContinuePaste: true,
    };
  }

  if (!project) {
    return {
      status: "skipped",
      reason: "missing-project",
      shouldContinuePaste: true,
    };
  }

  if (!readClipboardImage) {
    return {
      status: "skipped",
      reason: "unsupported-clipboard-image",
      shouldContinuePaste: true,
    };
  }

  try {
    const clipboardImage = await readClipboardImage();
    if (!clipboardImage) {
      return {
        status: "skipped",
        reason: "empty-clipboard-image",
        shouldContinuePaste: true,
      };
    }

    await runProjectImageAssetInsertAction({
      project,
      files: toImportedImageAssets([clipboardImage]),
      activeProject,
      persistImageAssets,
      setActiveProject,
      insertAssetsIntoScene,
      insertionOptions,
    });

    return {
      status: "pasted",
      shouldContinuePaste: false,
    };
  } catch (error) {
    runCurrentProjectCommandFailureAction({
      error,
      formatError,
      setProjectError,
    });
    return {
      status: "failed",
      error,
      shouldContinuePaste: false,
    };
  }
};

export interface ProjectImageImportRendererActionsInput<InsertionOptions> {
  getProject: () => DesktopProjectBundle | null;
  getActiveProject: () => DesktopProjectBundle | null;
  importImages: () => Promise<ImportedImagePayload[]>;
  readClipboardImage?: () => Promise<ImportedImagePayload | null>;
  persistImageAssets: (input: {
    projectPath: string;
    files: PersistedImageAssetInput[];
  }) => Promise<ImageRecordMap>;
  setActiveProject: (project: DesktopProjectBundle) => void;
  insertAssetsIntoScene: ProjectImageAssetSceneInserter<InsertionOptions>;
  getClipboardInsertionOptions?: () => InsertionOptions | undefined;
  formatError: (error: unknown) => string;
  setProjectError: (message: string) => void;
}

export const createProjectImageImportRendererActions = <InsertionOptions>({
  getProject,
  getActiveProject,
  importImages,
  readClipboardImage,
  persistImageAssets,
  setActiveProject,
  insertAssetsIntoScene,
  getClipboardInsertionOptions,
  formatError,
  setProjectError,
}: ProjectImageImportRendererActionsInput<InsertionOptions>) => ({
  importImages: () =>
    runProjectImagesImportAction({
      project: getProject(),
      activeProject: getActiveProject(),
      importImages,
      persistImageAssets,
      setActiveProject,
      insertAssetsIntoScene,
      formatError,
      setProjectError,
    }),
  pasteClipboardImage: async (data: ClipboardData) => {
    const result = await runDesktopClipboardImagePasteAction({
      data,
      project: getProject(),
      activeProject: getActiveProject(),
      readClipboardImage,
      persistImageAssets,
      setActiveProject,
      insertAssetsIntoScene,
      insertionOptions: getClipboardInsertionOptions?.(),
      formatError,
      setProjectError,
    });

    return result.shouldContinuePaste;
  },
});
