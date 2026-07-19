import { randomUUID } from "node:crypto";

import { getSceneContentHash } from "../../src/shared/sceneVersion";
import { getProjectImageRecordBoardRepairFileIds } from "../../src/shared/projectRecordIntegrity";
import type {
  ImageAssetRequestRendition,
  ImageRecord,
  ImageRecordMap,
  ProjectManifest,
} from "../../src/shared/projectTypes";
import type {
  ProjectRepairFileDetail,
  RebuildProjectThumbnailsResult,
} from "../../src/shared/desktopBridgeTypes";
import type { LocalImagePayloadOptions } from "../agent/localImagePayload";

type CachedImageAssetRendition = Exclude<
  ImageAssetRequestRendition,
  "original"
>;

interface ThumbnailPayload {
  data: Buffer;
  mimeType: string;
  width: number;
  height: number;
}

export type CreateProjectThumbnail = (input: {
  sourceBuffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
  maxDimension: number;
}) => Promise<ThumbnailPayload | null>;

export interface RebuildProjectThumbnailsOptions {
  createThumbnail?: CreateProjectThumbnail;
  inspectImage?: LocalImagePayloadOptions["inspectImage"];
  readFile?: LocalImagePayloadOptions["readFile"];
  now?: LocalImagePayloadOptions["now"];
}

interface ProjectRepairBundle {
  project: ProjectManifest;
  sceneJson: string;
  imageRecords: ImageRecordMap;
}

interface ProjectRepairDependencies {
  createMaintenanceBackup: (input: {
    projectPath: string;
    reason: string;
  }) => Promise<string>;
  readProjectBundle: (projectPath: string) => Promise<ProjectRepairBundle>;
  repairLegacyGeneratedImageRecordOrigins: (
    imageRecords: ImageRecordMap,
  ) => {
    imageRecords: ImageRecordMap;
    repairedFileIds: string[];
  };
  writeProjectImageRecords: (
    projectPath: string,
    imageRecords: ImageRecordMap,
  ) => Promise<void>;
  touchProjectManifest: (
    projectPath: string,
    project: ProjectManifest,
  ) => Promise<void>;
  writeProjectScene: (input: {
    projectPath: string;
    sceneJson: string;
    expectedSceneHash?: string | null;
  }) => Promise<ProjectManifest | void>;
  getCachedRenditionDimensions: (
    record: ImageRecord,
    rendition: CachedImageAssetRendition,
  ) => { shouldUseThumbnail: boolean };
  readCachedRenditionPayload: (input: {
    projectPath: string;
    fileId: string;
    record: ImageRecord;
    rendition: CachedImageAssetRendition;
  }) => Promise<unknown | null>;
  readFile: (filePath: string) => Promise<Buffer>;
  resolveProjectAssetPath: (projectPath: string, assetPath: string) => string;
  createCachedRenditionPayload: (input: {
    projectPath: string;
    fileId: string;
    record: ImageRecord;
    sourceBuffer: Buffer;
    createThumbnail: CreateProjectThumbnail;
    rendition: CachedImageAssetRendition;
  }) => Promise<unknown | null>;
  createNativeImageThumbnail: CreateProjectThumbnail;
}

interface ProjectRepairSceneElement {
  id?: unknown;
  type?: unknown;
  fileId?: unknown;
  x?: unknown;
  y?: unknown;
  width?: unknown;
  height?: unknown;
  isDeleted?: unknown;
}

const parseProjectScene = (sceneJson: string) => {
  try {
    const scene = JSON.parse(sceneJson) as {
      type?: unknown;
      version?: unknown;
      source?: unknown;
      elements?: ProjectRepairSceneElement[];
      appState?: unknown;
      files?: unknown;
    };
    return {
      parseFailed: false,
      scene,
      elements: Array.isArray(scene.elements) ? scene.elements : [],
    };
  } catch {
    return {
      parseFailed: true,
      scene: null,
      elements: [] as ProjectRepairSceneElement[],
    };
  }
};

const collectSceneImageFileIds = (elements: readonly ProjectRepairSceneElement[]) =>
  Array.from(
    new Set(
      elements.flatMap((element) =>
        element.type === "image" &&
        element.isDeleted !== true &&
        typeof element.fileId === "string" &&
        element.fileId
          ? [element.fileId]
          : [],
      ),
    ),
  );

const getFiniteNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const getScenePlacementAnchor = (
  elements: readonly ProjectRepairSceneElement[],
) => {
  const bounds = elements.flatMap((element) => {
    if (element.isDeleted === true) {
      return [];
    }
    const x = getFiniteNumber(element.x);
    const y = getFiniteNumber(element.y);
    const width = getFiniteNumber(element.width);
    const height = getFiniteNumber(element.height);
    if (x === null || y === null || width === null || height === null) {
      return [];
    }
    return [
      {
        minY: y,
        maxX: x + Math.max(width, 0),
      },
    ];
  });

  if (!bounds.length) {
    return { x: 0, y: 0 };
  }

  return {
    x: Math.max(...bounds.map((bound) => bound.maxX)) + 120,
    y: Math.min(...bounds.map((bound) => bound.minY)),
  };
};

const getDisplaySize = (record: ImageRecord) => {
  const maxDimension = 320;
  const width = Math.max(record.width || maxDimension, 1);
  const height = Math.max(record.height || maxDimension, 1);
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return {
    width: Math.max(Math.round(width * scale), 40),
    height: Math.max(Math.round(height * scale), 40),
  };
};

const createRestoredImageElement = ({
  record,
  index,
  anchor,
}: {
  record: ImageRecord;
  index: number;
  anchor: { x: number; y: number };
}) => {
  const columns = 3;
  const cellWidth = 380;
  const cellHeight = 380;
  const displaySize = getDisplaySize(record);
  return {
    id: randomUUID(),
    type: "image",
    x: anchor.x + (index % columns) * cellWidth,
    y: anchor.y + Math.floor(index / columns) * cellHeight,
    width: displaySize.width,
    height: displaySize.height,
    angle: 0,
    strokeColor: "transparent",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: Math.floor(Math.random() * 2 ** 31),
    version: 1,
    versionNonce: Math.floor(Math.random() * 2 ** 31),
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    fileId: record.fileId,
    status: "saved",
    scale: [1, 1],
  };
};

const resolveExistingAssetFileIds = async ({
  projectPath,
  imageRecords,
  fileIds,
  deps,
}: {
  projectPath: string;
  imageRecords: ImageRecordMap;
  fileIds: readonly string[];
  deps: Pick<ProjectRepairDependencies, "readFile" | "resolveProjectAssetPath">;
}) => {
  const existingFileIds: string[] = [];
  const missingFileIds: string[] = [];
  for (const fileId of fileIds) {
    const record = imageRecords[fileId];
    if (!record) {
      continue;
    }
    try {
      await deps.readFile(
        deps.resolveProjectAssetPath(projectPath, record.assetPath),
      );
      existingFileIds.push(fileId);
    } catch {
      missingFileIds.push(fileId);
    }
  }
  return { existingFileIds, missingFileIds };
};

const restoreImageRecordsToScene = async ({
  projectPath,
  sceneJson,
  imageRecords,
  deps,
}: {
  projectPath: string;
  sceneJson: string;
  imageRecords: ImageRecordMap;
  deps: Pick<
    ProjectRepairDependencies,
    "readFile" | "resolveProjectAssetPath" | "writeProjectScene"
  >;
}) => {
  const parsed = parseProjectScene(sceneJson);
  if (parsed.parseFailed || !parsed.scene) {
    return {
      restoredFileIds: [] as string[],
      failedFileIds: getProjectImageRecordBoardRepairFileIds({
        imageRecords,
        sceneImageFileIds: [],
      }),
      failedReason: "scene-parse-failed" as const,
      sceneJson: null as string | null,
    };
  }

  const sceneImageFileIds = collectSceneImageFileIds(parsed.elements);
  const candidateFileIds = getProjectImageRecordBoardRepairFileIds({
    imageRecords,
    sceneImageFileIds,
  });
  const { existingFileIds, missingFileIds } = await resolveExistingAssetFileIds({
    projectPath,
    imageRecords,
    fileIds: candidateFileIds,
    deps,
  });

  if (!existingFileIds.length) {
    return {
      restoredFileIds: [] as string[],
      failedFileIds: missingFileIds,
      failedReason: "asset-missing" as const,
      sceneJson: null as string | null,
    };
  }

  const anchor = getScenePlacementAnchor(parsed.elements);
  const restoredElements = existingFileIds.flatMap((fileId, index) => {
    const record = imageRecords[fileId];
    return record
      ? [
          createRestoredImageElement({
            record,
            index,
            anchor,
          }),
        ]
      : [];
  });
  const nextScene = {
    ...parsed.scene,
    type: typeof parsed.scene.type === "string" ? parsed.scene.type : "excalidraw",
    version: typeof parsed.scene.version === "number" ? parsed.scene.version : 2,
    source:
      typeof parsed.scene.source === "string" ? parsed.scene.source : "CoreStudio",
    elements: [...parsed.elements, ...restoredElements],
    appState:
      parsed.scene.appState &&
      typeof parsed.scene.appState === "object" &&
      !Array.isArray(parsed.scene.appState)
        ? parsed.scene.appState
        : {},
    files:
      parsed.scene.files &&
      typeof parsed.scene.files === "object" &&
      !Array.isArray(parsed.scene.files)
        ? parsed.scene.files
        : {},
  };

  const nextSceneJson = JSON.stringify(nextScene, null, 2);
  await deps.writeProjectScene({
    projectPath,
    sceneJson: nextSceneJson,
    expectedSceneHash: getSceneContentHash(sceneJson),
  });

  return {
    restoredFileIds: existingFileIds,
    failedFileIds: missingFileIds,
    failedReason: "asset-missing" as const,
    sceneJson: nextSceneJson,
  };
};

export const rebuildProjectThumbnails = async (
  {
    projectPath,
    fileIds,
    force = false,
    createBackup = false,
  }: {
    projectPath: string;
    fileIds: string[];
    force?: boolean;
    createBackup?: boolean;
  },
  options: RebuildProjectThumbnailsOptions = {},
  deps: ProjectRepairDependencies,
): Promise<RebuildProjectThumbnailsResult> => {
  const backupPath = createBackup
    ? await deps.createMaintenanceBackup({
        projectPath,
        reason: "rebuild-project-thumbnails",
      })
    : null;
  const bundle = await deps.readProjectBundle(projectPath);
  let imageRecords = bundle.imageRecords;
  const repairedGenerationRecordFileIds: string[] = [];
  const restoredBoardFileIds: string[] = [];
  let restoredSceneJson: string | null = null;
  const generatedFileIds: string[] = [];
  const skippedFileIds: string[] = [];
  const failedFileIds: string[] = [];
  const skippedDetails: ProjectRepairFileDetail[] = [];
  const failedDetails: ProjectRepairFileDetail[] = [];
  if (createBackup) {
    const repairResult =
      deps.repairLegacyGeneratedImageRecordOrigins(imageRecords);
    if (repairResult.repairedFileIds.length) {
      imageRecords = repairResult.imageRecords;
      repairedGenerationRecordFileIds.push(...repairResult.repairedFileIds);
      await deps.writeProjectImageRecords(projectPath, imageRecords);
      await deps.touchProjectManifest(projectPath, bundle.project);
    }

    try {
      const sceneRepair = await restoreImageRecordsToScene({
        projectPath,
        sceneJson: bundle.sceneJson,
        imageRecords,
        deps,
      });
      restoredBoardFileIds.push(...sceneRepair.restoredFileIds);
      if (sceneRepair.sceneJson) {
        restoredSceneJson = sceneRepair.sceneJson;
      }
      for (const fileId of sceneRepair.failedFileIds) {
        failedDetails.push({
          fileId,
          reason: "board-restore-failed",
          message:
            sceneRepair.failedReason === "scene-parse-failed"
              ? "画板数据无法解析，无法把这张图片补回画板。"
              : "原始图片文件不可读取，无法把这张图片补回画板。",
        });
      }
    } catch {
      const parsed = parseProjectScene(bundle.sceneJson);
      const sceneImageFileIds = parsed.parseFailed
        ? []
        : collectSceneImageFileIds(parsed.elements);
      const candidateFileIds = getProjectImageRecordBoardRepairFileIds({
        imageRecords,
        sceneImageFileIds,
      });
      for (const fileId of candidateFileIds) {
        failedDetails.push({
          fileId,
          reason: "board-restore-failed",
          message: "画板写入失败，无法把这张图片补回画板。",
        });
      }
    }
  }

  for (const fileId of Array.from(new Set(fileIds))) {
    const record = imageRecords[fileId];
    if (!record) {
      failedFileIds.push(fileId);
      failedDetails.push({
        fileId,
        reason: "record-missing",
        message: "项目图片索引记录不存在，无法修复这张图片。",
      });
      continue;
    }

    const dimensions = deps.getCachedRenditionDimensions(record, "thumbnail");
    if (!dimensions.shouldUseThumbnail) {
      skippedFileIds.push(fileId);
      skippedDetails.push({
        fileId,
        reason: "thumbnail-not-needed",
        message: "图片尺寸较小，不需要生成额外显示缓存。",
      });
      continue;
    }

    try {
      if (!force) {
        const cachedThumbnailPayload = await deps.readCachedRenditionPayload({
          projectPath,
          fileId,
          record,
          rendition: "thumbnail",
        });
        if (cachedThumbnailPayload) {
          skippedFileIds.push(fileId);
          skippedDetails.push({
            fileId,
            reason: "thumbnail-cache-exists",
            message: "图片显示缓存已经存在，无需重复生成。",
          });
          continue;
        }
      }

      const sourceBuffer = await deps.readFile(
        deps.resolveProjectAssetPath(projectPath, record.assetPath),
      );
      const thumbnailPayload = await deps.createCachedRenditionPayload({
        projectPath,
        fileId,
        record,
        sourceBuffer,
        rendition: "thumbnail",
        createThumbnail:
          options.createThumbnail ?? deps.createNativeImageThumbnail,
      });

      if (thumbnailPayload) {
        generatedFileIds.push(fileId);
      } else {
        failedFileIds.push(fileId);
        failedDetails.push({
          fileId,
          reason: "thumbnail-rebuild-failed",
          message: "图片显示缓存生成失败，请确认原图文件可读取。",
        });
      }
    } catch {
      failedFileIds.push(fileId);
      failedDetails.push({
        fileId,
        reason: "thumbnail-rebuild-failed",
        message: "图片显示缓存生成失败，请确认原图文件可读取。",
      });
    }
  }

  const result: RebuildProjectThumbnailsResult = {
    generatedFileIds,
    skippedFileIds,
    failedFileIds,
    repairedGenerationRecordFileIds,
    backupPath,
  };

  if (restoredBoardFileIds.length) {
    result.restoredBoardFileIds = restoredBoardFileIds;
    if (restoredSceneJson) {
      result.restoredSceneJson = restoredSceneJson;
    }
  }

  if (skippedDetails.length) {
    result.skippedDetails = skippedDetails;
  }

  if (failedDetails.length) {
    result.failedDetails = failedDetails;
  }

  return result;
};
