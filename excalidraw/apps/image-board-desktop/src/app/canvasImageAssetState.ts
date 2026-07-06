import type { ExcalidrawElement } from "@excalidraw/element/types";
import type {
  BinaryFileData,
  BinaryFiles,
} from "@excalidraw/excalidraw/types";

import type {
  PersistedImageAssetInput,
  ProjectAssetPayload,
} from "../shared/desktopBridgeTypes";
import type { ImageRecordMap } from "../shared/projectTypes";
import { extractBase64DataUrlPayload } from "./dataUrlState";

const parseCreatedAt = (...values: readonly (string | null | undefined)[]) => {
  for (const value of values) {
    if (!value) {
      continue;
    }
    const parsed = Date.parse(value);
    if (parsed) {
      return parsed;
    }
  }
  return null;
};

export const buildUnknownCanvasImageAssetInputs = ({
  imageRecords,
  elements,
  files,
}: {
  imageRecords: ImageRecordMap;
  elements: readonly ExcalidrawElement[];
  files: BinaryFiles;
}): PersistedImageAssetInput[] =>
  elements.flatMap((element) => {
    if (
      element.isDeleted ||
      element.type !== "image" ||
      !element.fileId ||
      imageRecords[element.fileId] ||
      !files[element.fileId]
    ) {
      return [];
    }

    const file = files[element.fileId];
    return [
      {
        fileId: element.fileId,
        dataBase64: extractBase64DataUrlPayload(file.dataURL),
        mimeType: file.mimeType,
        width: element.width,
        height: element.height,
        sourceType: "imported",
        createdAt: new Date(file.created).toISOString(),
      },
    ];
  });

export const buildExcalidrawBinaryFilesFromImageAssets = ({
  assets,
  fallbackCreatedAt,
}: {
  assets: readonly PersistedImageAssetInput[];
  fallbackCreatedAt: number;
}): BinaryFileData[] =>
  assets.map((asset) => ({
    id: asset.fileId as BinaryFileData["id"],
    mimeType: asset.mimeType as BinaryFileData["mimeType"],
    dataURL:
      `data:${asset.mimeType};base64,${asset.dataBase64}` as BinaryFileData["dataURL"],
    created: parseCreatedAt(asset.createdAt) ?? fallbackCreatedAt,
  }));

export const buildExcalidrawBinaryFilesFromProjectAssets = ({
  assets,
  imageRecords,
  fallbackCreatedAt,
}: {
  assets: readonly ProjectAssetPayload[];
  imageRecords: ImageRecordMap;
  fallbackCreatedAt: number;
}): BinaryFiles =>
  assets.reduce((files, asset) => {
    const fileId = asset.fileId as BinaryFileData["id"];
    files[fileId] = {
      id: fileId,
      mimeType: asset.mimeType as BinaryFileData["mimeType"],
      dataURL:
        `data:${asset.mimeType};base64,${asset.dataBase64}` as BinaryFileData["dataURL"],
      created:
        parseCreatedAt(imageRecords[asset.fileId]?.createdAt, asset.createdAt) ??
        fallbackCreatedAt,
    };
    return files;
  }, {} as BinaryFiles);

export const buildQueuedExcalidrawBinaryFiles = ({
  current,
  next,
}: {
  current: readonly BinaryFileData[];
  next: readonly BinaryFileData[];
}): BinaryFileData[] => {
  if (!next.length) {
    return [...current];
  }
  const pendingById = new Map(current.map((file) => [file.id, file]));
  next.forEach((file) => pendingById.set(file.id, file));
  return Array.from(pendingById.values());
};

export interface ApplyQueuedExcalidrawBinaryFilesInput {
  current: readonly BinaryFileData[];
  next: readonly BinaryFileData[];
  setQueuedFiles: (files: BinaryFileData[]) => void;
}

export const applyQueuedExcalidrawBinaryFiles = ({
  current,
  next,
  setQueuedFiles,
}: ApplyQueuedExcalidrawBinaryFilesInput): BinaryFileData[] => {
  const files = buildQueuedExcalidrawBinaryFiles({ current, next });
  setQueuedFiles(files);
  return files;
};

export const buildEmptyQueuedExcalidrawBinaryFiles = (): BinaryFileData[] =>
  [];

export interface ApplyEmptyQueuedExcalidrawBinaryFilesInput {
  setQueuedFiles: (files: BinaryFileData[]) => void;
}

export const applyEmptyQueuedExcalidrawBinaryFiles = ({
  setQueuedFiles,
}: ApplyEmptyQueuedExcalidrawBinaryFilesInput): BinaryFileData[] => {
  const files = buildEmptyQueuedExcalidrawBinaryFiles();
  setQueuedFiles(files);
  return files;
};

export const buildExcalidrawBinaryFilesFlushPlan = ({
  queued,
  canvasReady,
}: {
  queued: readonly BinaryFileData[];
  canvasReady: boolean;
}):
  | {
      action: "skip";
      nextQueue: readonly BinaryFileData[];
      filesToAdd: readonly BinaryFileData[];
    }
  | {
      action: "replace-files";
      nextQueue: readonly BinaryFileData[];
      filesToAdd: readonly BinaryFileData[];
    } => {
  if (!canvasReady || !queued.length) {
    return {
      action: "skip",
      nextQueue: queued,
      filesToAdd: [],
    };
  }
  return {
    action: "replace-files",
    nextQueue: [],
    filesToAdd: queued,
  };
};

export interface FlushQueuedExcalidrawBinaryFilesToCanvasInput {
  queued: readonly BinaryFileData[];
  replaceFiles:
    | ((files: BinaryFileData[]) => void)
    | null
    | undefined;
  setQueuedFiles: (files: BinaryFileData[]) => void;
}

export const flushQueuedExcalidrawBinaryFilesToCanvas = ({
  queued,
  replaceFiles,
  setQueuedFiles,
}: FlushQueuedExcalidrawBinaryFilesToCanvasInput): ReturnType<
  typeof buildExcalidrawBinaryFilesFlushPlan
> => {
  const plan = buildExcalidrawBinaryFilesFlushPlan({
    queued,
    canvasReady: Boolean(replaceFiles),
  });
  if (plan.action === "skip") {
    return plan;
  }

  const nextQueue = [...plan.nextQueue];
  const filesToAdd = [...plan.filesToAdd];
  setQueuedFiles(nextQueue);
  replaceFiles?.(filesToAdd);

  return {
    action: "replace-files",
    nextQueue,
    filesToAdd,
  };
};

export interface QueuedExcalidrawBinaryFilesRendererActionsInput {
  getQueuedFiles: () => readonly BinaryFileData[];
  setQueuedFiles: (files: BinaryFileData[]) => void;
  getReplaceFiles: () =>
    | ((files: BinaryFileData[]) => void)
    | null
    | undefined;
}

export interface QueuedExcalidrawBinaryFilesRendererActions {
  reset: () => BinaryFileData[];
  queue: (filesToAdd: readonly BinaryFileData[]) => BinaryFileData[];
  flush: () => ReturnType<typeof flushQueuedExcalidrawBinaryFilesToCanvas>;
}

export const createQueuedExcalidrawBinaryFilesRendererActions = ({
  getQueuedFiles,
  setQueuedFiles,
  getReplaceFiles,
}: QueuedExcalidrawBinaryFilesRendererActionsInput): QueuedExcalidrawBinaryFilesRendererActions => ({
  reset: () =>
    applyEmptyQueuedExcalidrawBinaryFiles({
      setQueuedFiles,
    }),
  queue: (filesToAdd) =>
    applyQueuedExcalidrawBinaryFiles({
      current: getQueuedFiles(),
      next: filesToAdd,
      setQueuedFiles,
    }),
  flush: () =>
    flushQueuedExcalidrawBinaryFilesToCanvas({
      queued: getQueuedFiles(),
      replaceFiles: getReplaceFiles(),
      setQueuedFiles,
    }),
});
