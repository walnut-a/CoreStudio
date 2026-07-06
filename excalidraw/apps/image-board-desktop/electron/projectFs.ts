import fs from "fs/promises";
import { randomUUID } from "node:crypto";
import path from "path";

import {
  PROJECT_FILENAMES,
  PROJECT_FORMAT_VERSION,
  type ImageAssetRendition,
  type ImageAssetRequestRendition,
  type ImageGenerationOrigin,
  type ImagePromptReferenceRecord,
  type ImageRecord,
  type ImageRecordMap,
  type ImageSourceType,
  type ProjectAgentAccess,
  type ProjectManifest,
  type ProjectThumbnailReadMode,
} from "../src/shared/projectTypes";
import type { AgentErrorCode } from "../src/shared/agentBridgeTypes";
import { assertPersistedImageAssetIntegrity } from "../src/shared/projectRecordIntegrity";
import type { CleanProjectCacheResult } from "../src/shared/desktopBridgeTypes";

import type { ProviderId } from "../src/shared/providerTypes";
import { getSceneContentHash } from "../src/shared/sceneVersion";
import {
  readLocalImagePayload,
  type LocalImagePayloadOptions,
} from "./agent/localImagePayload";
import { DESKTOP_APP_VERSION } from "./appVersion";
import {
  buildAcpPromptReferences,
  collectUnwrittenAcpOutputs,
  type UnwrittenAcpOutput,
} from "./acp/acpOutputRecovery";
import { inspectProjectHealth as inspectProjectHealthWithDeps } from "./project/projectHealth";
import {
  readProjectImageRecords as readProjectImageRecordsWithDeps,
  repairLegacyGeneratedImageRecordOrigins,
  writeProjectImageRecords as writeProjectImageRecordsWithDeps,
} from "./project/projectImageRecords";
import {
  rebuildProjectThumbnails as rebuildProjectThumbnailsWithDeps,
  type RebuildProjectThumbnailsOptions,
} from "./project/projectRepair";

const SCENE_BACKUPS_DIR = "scene-backups";
const MAINTENANCE_BACKUPS_DIR = "maintenance-backups";
const THUMBNAILS_DIR = "thumbnails";
const PREVIEWS_DIR = "previews";
export const PROJECT_THUMBNAIL_MAX_DIMENSION = 320;
export const PROJECT_PREVIEW_MAX_DIMENSION = 1280;
const IMAGE_CACHE_RENDITION_CONFIG = {
  thumbnail: {
    directory: THUMBNAILS_DIR,
    maxDimension: PROJECT_THUMBNAIL_MAX_DIMENSION,
  },
  preview: {
    directory: PREVIEWS_DIR,
    maxDimension: PROJECT_PREVIEW_MAX_DIMENSION,
  },
} as const satisfies Record<
  Exclude<ImageAssetRequestRendition, "original">,
  {
    directory: string;
    maxDimension: number;
  }
>;

const createProjectAgentError = (
  code: AgentErrorCode,
  message: string,
  details?: unknown,
) =>
  Object.assign(new Error(message), {
    code,
    ...(details === undefined ? {} : { details }),
  });

const EMPTY_PROJECT_SCENE = JSON.stringify(
  {
    type: "excalidraw",
    version: 2,
    source: "CoreStudio",
    elements: [],
    appState: {},
    files: {},
  },
  null,
  2,
);

const createProjectAgentAccess = (): ProjectAgentAccess => ({
  token: randomUUID(),
  enabled: true,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeProjectAgentAccess = (
  value: unknown,
): { access: ProjectAgentAccess; changed: boolean } => {
  if (!isRecord(value)) {
    return {
      access: createProjectAgentAccess(),
      changed: true,
    };
  }

  const token =
    typeof value.token === "string" && value.token.trim()
      ? value.token
      : randomUUID();
  return {
    access: {
      token,
      enabled: true,
    },
    changed: token !== value.token || value.enabled !== true,
  };
};

const normalizeProjectManifest = (
  project: ProjectManifest,
): { project: ProjectManifest; changed: boolean } => {
  const { access, changed } = normalizeProjectAgentAccess(
    (project as Partial<ProjectManifest>).agentAccess,
  );
  if (!changed) {
    return {
      project,
      changed: false,
    };
  }

  return {
    project: {
      ...project,
      agentAccess: access,
    },
    changed: true,
  };
};

const assertPersistImageAssetInput = (file: PersistImageAssetInput) => {
  assertPersistedImageAssetIntegrity(file);
};

interface PersistImageAssetInput {
  fileId: string;
  dataBase64: string;
  mimeType: string;
  width: number;
  height: number;
  sourceType: ImageSourceType;
  generationOrigin?: ImageGenerationOrigin;
  provider?: ProviderId;
  model?: string;
  prompt?: string;
  negativePrompt?: string;
  seed?: number | null;
  generationTaskId?: string | null;
  generationThreadId?: string | null;
  createdAt: string;
  parentFileId?: string | null;
  promptReferences?: ImagePromptReferenceRecord[];
}

interface ThumbnailPayload {
  data: Buffer;
  mimeType: string;
  width: number;
  height: number;
}

type CreateThumbnail = (input: {
  sourceBuffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
  maxDimension: number;
}) => Promise<ThumbnailPayload | null>;

interface ReadProjectAssetPayloadsOptions {
  createThumbnail?: CreateThumbnail;
}

const safeProjectFolderName = (name: string) =>
  name.trim().replace(/[\\/:*?"<>|]/g, "-");

const safeAssetFileNameSegment = (value: string) => {
  const safeValue = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+$/, "");

  return safeValue || randomUUID();
};

const extensionFromMimeType = (mimeType: string) => {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/svg+xml":
      return "svg";
    default:
      return "bin";
  }
};

const writeJson = async (filePath: string, value: unknown) => {
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
};

const writeJsonExclusive = async (filePath: string, value: unknown) => {
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), {
    encoding: "utf8",
    flag: "wx",
  });
};

const isNodeError = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error && "code" in error;

const ensureProjectDirectoryAvailable = async (projectPath: string) => {
  try {
    const entries = await fs.readdir(projectPath);
    if (entries.length > 0) {
      throw new Error(
        "目标项目文件夹已经存在且不为空，请选择一个空文件夹或新项目名称。",
      );
    }
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      await fs.mkdir(projectPath, { recursive: true });
      return;
    }
    throw error;
  }
};

const assertPathInsideDirectory = ({
  directory,
  targetPath,
  errorMessage,
}: {
  directory: string;
  targetPath: string;
  errorMessage: string;
}) => {
  const resolvedDirectory = path.resolve(directory);
  const resolvedTarget = path.resolve(targetPath);
  const directoryPrefix = `${resolvedDirectory}${path.sep}`;

  if (
    resolvedTarget !== resolvedDirectory &&
    !resolvedTarget.startsWith(directoryPrefix)
  ) {
    throw new Error(errorMessage);
  }

  return resolvedTarget;
};

const resolveProjectAssetPath = (projectPath: string, assetPath: string) =>
  assertPathInsideDirectory({
    directory: path.join(projectPath, PROJECT_FILENAMES.assetsDir),
    targetPath: path.join(projectPath, assetPath),
    errorMessage: "图片资源路径不在项目 assets 文件夹内。",
  });

const resolveProjectCachePath = (projectPath: string, cachePath: string) =>
  assertPathInsideDirectory({
    directory: path.join(projectPath, PROJECT_FILENAMES.cacheDir),
    targetPath: path.join(projectPath, cachePath),
    errorMessage: "缓存资源路径不在项目 cache 文件夹内。",
  });

const buildProjectManifest = (name: string): ProjectManifest => {
  const timestamp = new Date().toISOString();
  return {
    formatVersion: PROJECT_FORMAT_VERSION,
    appVersion: DESKTOP_APP_VERSION,
    name,
    createdAt: timestamp,
    updatedAt: timestamp,
    sceneFile: PROJECT_FILENAMES.scene,
    imageRecordsFile: PROJECT_FILENAMES.imageRecords,
    assetsDir: PROJECT_FILENAMES.assetsDir,
    exportsDir: PROJECT_FILENAMES.exportsDir,
    agentAccess: createProjectAgentAccess(),
  };
};

export const createProjectStructure = async (
  parentDirectory: string,
  name: string,
) => {
  const projectPath = path.join(parentDirectory, safeProjectFolderName(name));
  await ensureProjectDirectoryAvailable(projectPath);
  await fs.mkdir(path.join(projectPath, PROJECT_FILENAMES.assetsDir), {
    recursive: true,
  });
  await fs.mkdir(path.join(projectPath, PROJECT_FILENAMES.cacheDir), {
    recursive: true,
  });
  await fs.mkdir(path.join(projectPath, PROJECT_FILENAMES.exportsDir), {
    recursive: true,
  });

  const project = buildProjectManifest(name);

  await Promise.all([
    writeJsonExclusive(
      path.join(projectPath, PROJECT_FILENAMES.project),
      project,
    ),
    fs.writeFile(
      path.join(projectPath, PROJECT_FILENAMES.scene),
      EMPTY_PROJECT_SCENE,
      {
        encoding: "utf8",
        flag: "wx",
      },
    ),
    writeJsonExclusive(
      path.join(projectPath, PROJECT_FILENAMES.imageRecords),
      {},
    ),
  ]);

  return { projectPath, project };
};

export const readProjectBundle = async (projectPath: string) => {
  const [projectJson, sceneJson, imageRecordsJson] = await Promise.all([
    fs.readFile(path.join(projectPath, PROJECT_FILENAMES.project), "utf8"),
    fs.readFile(path.join(projectPath, PROJECT_FILENAMES.scene), "utf8"),
    fs.readFile(path.join(projectPath, PROJECT_FILENAMES.imageRecords), "utf8"),
  ]);
  const { project, changed } = normalizeProjectManifest(
    JSON.parse(projectJson) as ProjectManifest,
  );
  if (changed) {
    await writeProjectManifest(projectPath, project);
  }

  return {
    project,
    sceneJson,
    imageRecords: JSON.parse(imageRecordsJson) as ImageRecordMap,
  };
};

const readProjectImageRecords = (projectPath: string) =>
  readProjectImageRecordsWithDeps(projectPath, {
    readText: (filePath) => fs.readFile(filePath, "utf8"),
  });

const writeProjectImageRecords = async (
  projectPath: string,
  imageRecords: ImageRecordMap,
) => {
  await writeProjectImageRecordsWithDeps(projectPath, imageRecords, {
    writeJson,
  });
};

const writeProjectManifest = async (
  projectPath: string,
  project: ProjectManifest,
) => {
  await writeJson(path.join(projectPath, PROJECT_FILENAMES.project), project);
};

const touchProjectManifest = async (
  projectPath: string,
  project: ProjectManifest,
) => {
  await writeProjectManifest(projectPath, {
    ...project,
    updatedAt: new Date().toISOString(),
  });
};

export const updateProjectAgentAccess = async (
  projectPath: string,
  agentAccess: ProjectAgentAccess,
) => {
  const bundle = await readProjectBundle(projectPath);
  const { access } = normalizeProjectAgentAccess(agentAccess);
  const nextProject: ProjectManifest = {
    ...bundle.project,
    agentAccess: access,
    updatedAt: new Date().toISOString(),
  };
  await writeProjectManifest(projectPath, nextProject);
  return nextProject;
};

const analyzeSceneJson = (sceneJson: string) => {
  try {
    const scene = JSON.parse(sceneJson) as { elements?: unknown[] };
    return {
      elementCount: Array.isArray(scene.elements) ? scene.elements.length : 0,
      parseFailed: false,
    };
  } catch {
    return {
      elementCount: 0,
      parseFailed: true,
    };
  }
};

const backupSceneBeforeEmptyOverwrite = async ({
  projectPath,
  currentSceneJson,
}: {
  projectPath: string;
  currentSceneJson: string;
}) => {
  const backupsDir = path.join(
    projectPath,
    PROJECT_FILENAMES.exportsDir,
    SCENE_BACKUPS_DIR,
  );
  const backupPath = path.join(
    backupsDir,
    `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}.json`,
  );
  await fs.mkdir(backupsDir, { recursive: true });
  await fs.writeFile(backupPath, currentSceneJson, "utf8");
  return backupPath;
};

const createMaintenanceBackup = async ({
  projectPath,
  reason,
}: {
  projectPath: string;
  reason: string;
}) => {
  const backupRoot = path.join(
    projectPath,
    PROJECT_FILENAMES.exportsDir,
    MAINTENANCE_BACKUPS_DIR,
  );
  const backupPath = path.join(
    backupRoot,
    `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}`,
  );
  await fs.mkdir(backupPath, { recursive: true });

  const files = [
    PROJECT_FILENAMES.project,
    PROJECT_FILENAMES.scene,
    PROJECT_FILENAMES.imageRecords,
  ];
  const copiedFiles: string[] = [];

  for (const fileName of files) {
    try {
      await fs.copyFile(
        path.join(projectPath, fileName),
        path.join(backupPath, fileName),
      );
      copiedFiles.push(fileName);
    } catch {
      // 维护备份尽量收集已有元数据；缺失文件会在健康检查里报告。
    }
  }

  await writeJson(path.join(backupPath, "maintenance-backup.json"), {
    reason,
    createdAt: new Date().toISOString(),
    files: copiedFiles,
  });

  return backupPath;
};

export const writeProjectScene = async ({
  projectPath,
  sceneJson,
  expectedSceneHash,
}: {
  projectPath: string;
  sceneJson: string;
  expectedSceneHash?: string | null;
}) => {
  const bundle = await readProjectBundle(projectPath);
  const currentScene = analyzeSceneJson(bundle.sceneJson);
  const nextScene = analyzeSceneJson(sceneJson);
  const currentSceneHash = getSceneContentHash(bundle.sceneJson);
  const nextSceneHash = getSceneContentHash(sceneJson);

  if (nextScene.parseFailed) {
    throw new Error("新的画板数据无法解析，已停止保存。");
  }

  if (
    expectedSceneHash &&
    currentSceneHash !== expectedSceneHash &&
    currentSceneHash !== nextSceneHash
  ) {
    throw createProjectAgentError(
      "STALE_PROJECT_SNAPSHOT",
      "画板文件已经被其他会话更新，已停止保存旧快照。请重新打开项目后再继续。",
      {
        expectedSceneHash,
        currentSceneHash,
      },
    );
  }

  if (currentScene.parseFailed && nextScene.elementCount === 0) {
    throw new Error("当前画板文件无法解析，为避免被空内容覆盖，已停止保存。");
  }

  if (currentScene.elementCount > 0 && nextScene.elementCount === 0) {
    const backupPath = await backupSceneBeforeEmptyOverwrite({
      projectPath,
      currentSceneJson: bundle.sceneJson,
    });
    throw new Error(
      `检测到非空画板即将被空画板覆盖，已停止保存。当前文件备份在：${backupPath}`,
    );
  }

  await fs.writeFile(
    path.join(projectPath, PROJECT_FILENAMES.scene),
    sceneJson,
    "utf8",
  );
  const nextProject: ProjectManifest = {
    ...bundle.project,
    updatedAt: new Date().toISOString(),
  };
  await writeProjectManifest(projectPath, nextProject);
  return nextProject;
};

type CachedImageAssetRendition = Exclude<ImageAssetRequestRendition, "original">;

const getCachedRenditionConfig = (rendition: CachedImageAssetRendition) =>
  IMAGE_CACHE_RENDITION_CONFIG[rendition];

const getCachedRenditionDimensions = (
  record: ImageRecord,
  rendition: CachedImageAssetRendition,
) => {
  const { maxDimension } = getCachedRenditionConfig(rendition);
  const largestDimension = Math.max(record.width, record.height);
  if (!Number.isFinite(largestDimension) || largestDimension <= 0) {
    return {
      width: record.width,
      height: record.height,
      shouldUseThumbnail: false,
    };
  }

  const scale = Math.min(1, maxDimension / largestDimension);
  return {
    width: Math.max(1, Math.round(record.width * scale)),
    height: Math.max(1, Math.round(record.height * scale)),
    shouldUseThumbnail: scale < 1,
  };
};

const getCachedRenditionCachePath = (
  record: ImageRecord,
  rendition: CachedImageAssetRendition,
) => {
  const { directory, maxDimension } = getCachedRenditionConfig(rendition);
  return path.posix.join(
    PROJECT_FILENAMES.cacheDir,
    directory,
    `${safeAssetFileNameSegment(record.fileId)}-${record.width}x${
      record.height
    }-${maxDimension}.png`,
  );
};

const createNativeImageThumbnail: CreateThumbnail = async ({
  sourceBuffer,
  width,
  height,
  maxDimension,
}) => {
  const { nativeImage } = await import("electron");
  const sourceImage = nativeImage.createFromBuffer(sourceBuffer);
  if (sourceImage.isEmpty()) {
    return null;
  }

  const sourceSize = sourceImage.getSize();
  const sourceWidth = sourceSize.width || width;
  const sourceHeight = sourceSize.height || height;
  const largestDimension = Math.max(sourceWidth, sourceHeight);
  if (!Number.isFinite(largestDimension) || largestDimension <= maxDimension) {
    return null;
  }

  const scale = maxDimension / largestDimension;
  const thumbnailWidth = Math.max(1, Math.round(sourceWidth * scale));
  const thumbnailHeight = Math.max(1, Math.round(sourceHeight * scale));
  const thumbnail = sourceImage.resize({
    width: thumbnailWidth,
    height: thumbnailHeight,
    quality: "best",
  });

  return {
    data: thumbnail.toPNG(),
    mimeType: "image/png",
    width: thumbnailWidth,
    height: thumbnailHeight,
  };
};

const buildAssetPayload = ({
  fileId,
  record,
  fileBuffer,
  width,
  height,
  mimeType,
  rendition,
}: {
  fileId: string;
  record: ImageRecord;
  fileBuffer: Buffer;
  width: number;
  height: number;
  mimeType: string;
  rendition: ImageAssetRendition;
}) => ({
  fileId,
  mimeType,
  width,
  height,
  createdAt: record.createdAt,
  dataBase64: fileBuffer.toString("base64"),
  rendition,
});

const buildMissingThumbnailPlaceholderPayload = ({
  fileId,
  record,
}: {
  fileId: string;
  record: ImageRecord;
}) => {
  const dimensions = getCachedRenditionDimensions(record, "thumbnail");
  const width = dimensions.width;
  const height = dimensions.height;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="thumbnail pending"><defs><pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M0 0h32v32H0z" fill="#fafaff"/><path d="M0 0h16v16H0zM16 16h16v16H16z" fill="#f1f1f8"/></pattern></defs><rect width="100%" height="100%" fill="url(#grid)" opacity="0.58"/><rect x="1" y="1" width="${Math.max(
    1,
    width - 2,
  )}" height="${Math.max(
    1,
    height - 2,
  )}" fill="none" stroke="#d8d8e6" stroke-width="2" stroke-dasharray="10 8" opacity="0.65"/></svg>`;

  return {
    fileId,
    mimeType: "image/svg+xml",
    width,
    height,
    createdAt: record.createdAt,
    dataBase64: Buffer.from(svg, "utf8").toString("base64"),
    rendition: "placeholder" as const,
  };
};

const readCachedRenditionPayload = async ({
  projectPath,
  fileId,
  record,
  rendition,
}: {
  projectPath: string;
  fileId: string;
  record: ImageRecord;
  rendition: CachedImageAssetRendition;
}) => {
  const dimensions = getCachedRenditionDimensions(record, rendition);
  if (!dimensions.shouldUseThumbnail) {
    return null;
  }

  const cachePath = getCachedRenditionCachePath(record, rendition);
  const resolvedCachePath = resolveProjectCachePath(projectPath, cachePath);
  try {
    const cachedRendition = await fs.readFile(resolvedCachePath);
    return buildAssetPayload({
      fileId,
      record,
      fileBuffer: cachedRendition,
      width: dimensions.width,
      height: dimensions.height,
      mimeType: "image/png",
      rendition,
    });
  } catch {
    return null;
  }
};

const createCachedRenditionPayload = async ({
  projectPath,
  fileId,
  record,
  sourceBuffer,
  createThumbnail,
  rendition,
}: {
  projectPath: string;
  fileId: string;
  record: ImageRecord;
  sourceBuffer: Buffer;
  createThumbnail: CreateThumbnail;
  rendition: CachedImageAssetRendition;
}) => {
  const dimensions = getCachedRenditionDimensions(record, rendition);
  if (!dimensions.shouldUseThumbnail) {
    return null;
  }

  const cachePath = getCachedRenditionCachePath(record, rendition);
  const resolvedCachePath = resolveProjectCachePath(
    projectPath,
    cachePath,
  );
  const { maxDimension } = getCachedRenditionConfig(rendition);
  const thumbnail = await createThumbnail({
    sourceBuffer,
    mimeType: record.mimeType,
    width: record.width,
    height: record.height,
    maxDimension,
  });

  if (!thumbnail) {
    return null;
  }

  await fs.mkdir(path.dirname(resolvedCachePath), { recursive: true });
  await fs.writeFile(resolvedCachePath, thumbnail.data);

  return buildAssetPayload({
    fileId,
    record,
    fileBuffer: thumbnail.data,
    width: thumbnail.width,
    height: thumbnail.height,
    mimeType: thumbnail.mimeType,
    rendition,
  });
};

const pathExists = async (targetPath: string) => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const createNativeImageInspector = async (): Promise<
  NonNullable<LocalImagePayloadOptions["inspectImage"]>
> => {
  const { nativeImage } = await import("electron");
  return ({ buffer, mimeType }) => {
    const image = nativeImage.createFromBuffer(buffer);
    if (image.isEmpty()) {
      throw new Error("无法读取 ACP 生成图片尺寸。");
    }
    const size = image.getSize();
    return {
      width: size.width || 1024,
      height: size.height || 1024,
      mimeType,
    };
  };
};

const importUnwrittenAcpOutput = async (
  projectPath: string,
  output: UnwrittenAcpOutput,
  options: RebuildProjectThumbnailsOptions,
) => {
  const payload = await readLocalImagePayload(output.outputPath, {
    ...(options.readFile ? { readFile: options.readFile } : {}),
    inspectImage: options.inspectImage ?? (await createNativeImageInspector()),
    ...(options.now ? { now: options.now } : {}),
    randomId: () => output.fileId,
  });
  const imageRecords = await persistImageAssets({
    projectPath,
    files: [
      {
        ...payload,
        sourceType: "generated",
        generationOrigin: "acp-agent",
        generationTaskId: output.taskId,
        generationThreadId: output.threadId ?? null,
        prompt: output.prompt,
        promptReferences: buildAcpPromptReferences(output),
      },
    ],
  });

  return imageRecords[output.fileId];
};

const cachedRenditionExists = async ({
  projectPath,
  record,
  rendition,
}: {
  projectPath: string;
  record: ImageRecord;
  rendition: CachedImageAssetRendition;
}) => {
  const dimensions = getCachedRenditionDimensions(record, rendition);
  if (!dimensions.shouldUseThumbnail) {
    return true;
  }

  try {
    return await pathExists(
      resolveProjectCachePath(
        projectPath,
        getCachedRenditionCachePath(record, rendition),
      ),
    );
  } catch {
    return false;
  }
};

const collectFilesRecursively = async (directory: string) => {
  const files: string[] = [];
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await collectFilesRecursively(entryPath)));
      } else if (entry.isFile()) {
        files.push(entryPath);
      }
    }
  } catch {
    return files;
  }
  return files;
};

const getExpectedCachePaths = (projectPath: string, imageRecords: ImageRecordMap) => {
  const expectedPaths = new Set<string>();

  for (const record of Object.values(imageRecords)) {
    for (const rendition of ["thumbnail", "preview"] as const) {
      expectedPaths.add(
        resolveProjectCachePath(
          projectPath,
          getCachedRenditionCachePath(record, rendition),
        ),
      );
    }
  }

  return expectedPaths;
};

export const cleanProjectCache = async ({
  projectPath,
}: {
  projectPath: string;
}): Promise<CleanProjectCacheResult> => {
  const imageRecords = await readProjectImageRecords(projectPath);
  const expectedCachePaths = getExpectedCachePaths(projectPath, imageRecords);
  const cacheRoots = [THUMBNAILS_DIR, PREVIEWS_DIR].map((directory) =>
    path.join(projectPath, PROJECT_FILENAMES.cacheDir, directory),
  );
  const cacheFiles = (
    await Promise.all(cacheRoots.map((directory) => collectFilesRecursively(directory)))
  ).flat();
  let removedFileCount = 0;
  let removedBytes = 0;
  let skippedFileCount = 0;

  for (const cacheFile of cacheFiles) {
    const resolvedCacheFile = resolveProjectCachePath(
      projectPath,
      path.relative(projectPath, cacheFile),
    );
    if (expectedCachePaths.has(resolvedCacheFile)) {
      skippedFileCount += 1;
      continue;
    }

    try {
      const stat = await fs.stat(resolvedCacheFile);
      await fs.unlink(resolvedCacheFile);
      removedFileCount += 1;
      removedBytes += stat.size;
    } catch {
      skippedFileCount += 1;
    }
  }

  return {
    removedFileCount,
    removedBytes,
    skippedFileCount,
  };
};

export const inspectProjectHealth = (input: {
  projectPath: string;
  agentRunsBaseDir?: string;
}) =>
  inspectProjectHealthWithDeps(input, {
    readProjectBundle,
    listProjectAssetPaths: async (projectPath) => {
      const assetFiles = await collectFilesRecursively(
        path.join(projectPath, PROJECT_FILENAMES.assetsDir),
      );
      return assetFiles.map((assetFile) =>
        path.relative(projectPath, assetFile).split(path.sep).join(path.posix.sep),
      );
    },
    resolveProjectAssetPath,
    pathExists,
    cachedRenditionExists,
    collectUnwrittenAcpOutputs,
  });

export const readProjectAssetPayloads = async (
  {
    projectPath,
    fileIds,
    rendition = "original",
    thumbnailMode = "read-through",
  }: {
    projectPath: string;
    fileIds: string[];
    rendition?: ImageAssetRequestRendition;
    thumbnailMode?: ProjectThumbnailReadMode;
  },
  options: ReadProjectAssetPayloadsOptions = {},
) => {
  const imageRecords = await readProjectImageRecords(projectPath);
  const payloads = await Promise.all(
    fileIds.map(async (fileId) => {
      const record = imageRecords[fileId];
      if (!record) {
        return null;
      }

      if (rendition !== "original") {
        try {
          const cachedRenditionPayload = await readCachedRenditionPayload({
            projectPath,
            fileId,
            record,
            rendition,
          });

          if (cachedRenditionPayload) {
            return cachedRenditionPayload;
          }
        } catch {
          // 显示资源是性能缓存，读取失败不能影响项目打开。
        }

        const dimensions = getCachedRenditionDimensions(record, rendition);
        if (thumbnailMode === "cache-only" && dimensions.shouldUseThumbnail) {
          return buildMissingThumbnailPlaceholderPayload({ fileId, record });
        }
      }

      const assetPath = resolveProjectAssetPath(projectPath, record.assetPath);
      let fileBuffer: Buffer;
      try {
        fileBuffer = await fs.readFile(assetPath);
      } catch {
        return null;
      }

      if (rendition !== "original") {
        try {
          const renditionPayload = await createCachedRenditionPayload({
            projectPath,
            fileId,
            record,
            sourceBuffer: fileBuffer,
            rendition,
            createThumbnail:
              options.createThumbnail ?? createNativeImageThumbnail,
          });

          if (renditionPayload) {
            return renditionPayload;
          }
        } catch {
          // 显示资源是性能缓存，生成失败不能影响项目打开。
        }
      }

      return {
        fileId,
        mimeType: record.mimeType,
        width: record.width,
        height: record.height,
        createdAt: record.createdAt,
        dataBase64: fileBuffer.toString("base64"),
        rendition: "original" as const,
      };
    }),
  );

  return payloads.filter(Boolean);
};

export const rebuildProjectThumbnails = async (
  {
    projectPath,
    fileIds,
    force = false,
    createBackup = false,
    agentRunsBaseDir,
  }: {
    projectPath: string;
    fileIds: string[];
    force?: boolean;
    createBackup?: boolean;
    agentRunsBaseDir?: string;
  },
  options: RebuildProjectThumbnailsOptions = {},
) =>
  rebuildProjectThumbnailsWithDeps(
    {
      projectPath,
      fileIds,
      force,
      createBackup,
      agentRunsBaseDir,
    },
    options,
    {
      createMaintenanceBackup,
      readProjectBundle,
      repairLegacyGeneratedImageRecordOrigins,
      writeProjectImageRecords,
      touchProjectManifest,
      writeProjectScene,
      collectUnwrittenAcpOutputs,
      importUnwrittenAcpOutput,
      getCachedRenditionDimensions,
      readCachedRenditionPayload,
      readFile: fs.readFile,
      resolveProjectAssetPath,
      createCachedRenditionPayload,
      createNativeImageThumbnail,
    },
  );

export const persistImageAssets = async ({
  projectPath,
  files,
}: {
  projectPath: string;
  files: PersistImageAssetInput[];
}) => {
  const bundle = await readProjectBundle(projectPath);
  const nextImageRecords: ImageRecordMap = { ...bundle.imageRecords };

  for (const file of files) {
    assertPersistImageAssetInput(file);
    const assetFileName = `${file.createdAt.replace(
      /[:.]/g,
      "-",
    )}_${safeAssetFileNameSegment(file.fileId)}.${extensionFromMimeType(
      file.mimeType,
    )}`;
    const relativeAssetPath = path.posix.join(
      PROJECT_FILENAMES.assetsDir,
      assetFileName,
    );
    const assetPath = resolveProjectAssetPath(projectPath, relativeAssetPath);
    await fs.writeFile(assetPath, Buffer.from(file.dataBase64, "base64"));

    const record: ImageRecord = {
      fileId: file.fileId,
      assetPath: relativeAssetPath,
      sourceType: file.sourceType,
      generationOrigin: file.generationOrigin,
      provider: file.provider,
      model: file.model,
      prompt: file.prompt,
      negativePrompt: file.negativePrompt,
      seed: file.seed ?? null,
      generationTaskId: file.generationTaskId ?? null,
      generationThreadId: file.generationThreadId ?? null,
      width: file.width,
      height: file.height,
      createdAt: file.createdAt,
      mimeType: file.mimeType,
      parentFileId: file.parentFileId ?? null,
      promptReferences: file.promptReferences,
    };
    nextImageRecords[file.fileId] = record;
  }

  await writeJson(
    path.join(projectPath, PROJECT_FILENAMES.imageRecords),
    nextImageRecords,
  );

  const nextProject: ProjectManifest = {
    ...bundle.project,
    updatedAt: new Date().toISOString(),
  };
  await writeProjectManifest(projectPath, nextProject);

  return nextImageRecords;
};
