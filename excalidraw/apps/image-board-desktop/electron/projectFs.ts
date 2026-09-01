import fs from "fs/promises";
import { randomUUID } from "node:crypto";
import path from "path";

import {
  PROJECT_FILENAMES,
  PROJECT_FORMAT_VERSION,
  type ImageAssetRendition,
  type ImageAssetRequestRendition,
  type ImageRecord,
  type ImageRecordMap,
  type ProjectAgentAccess,
  type ProjectManifest,
  type ProjectThumbnailReadMode,
} from "../src/shared/projectTypes";
import type { AgentErrorCode } from "../src/shared/agentBridgeTypes";
import type {
  CleanProjectCacheResult,
  PersistedImageAssetInput,
} from "../src/shared/desktopBridgeTypes";

import { getSceneContentHash } from "../src/shared/sceneVersion";
import { DESKTOP_APP_VERSION } from "./appVersion";
import { inspectProjectHealth as inspectProjectHealthWithDeps } from "./project/projectHealth";
import {
  readProjectImageRecords as readProjectImageRecordsWithDeps,
  parseProjectImageRecords,
  repairLegacyGeneratedImageRecordOrigins,
  writeProjectImageRecords as writeProjectImageRecordsWithDeps,
} from "./project/projectImageRecords";
import {
  rebuildProjectThumbnails as rebuildProjectThumbnailsWithDeps,
  type CreateProjectThumbnail,
  type RebuildProjectThumbnailsOptions,
} from "./project/projectRepair";
import {
  writeJsonAtomic as writeJson,
  writeTextAtomic,
} from "./project/atomicProjectFile";
import {
  beginProjectImageWriteback,
  commitProjectImageWriteback,
  inspectProjectImageWritebackJournals,
  recoverProjectImageWritebacks,
} from "./project/projectImageWriteback";
import {
  parseProjectManifest,
  parseProjectScene,
} from "./project/projectReadIntegrity";

const SCENE_BACKUPS_DIR = "scene-backups";
const MAINTENANCE_BACKUPS_DIR = "maintenance-backups";
const THUMBNAILS_DIR = "thumbnails";
const PREVIEWS_DIR = "previews";
const projectImageRecordsReadCache = new Map<
  string,
  { signature: string; imageRecords: ImageRecordMap }
>();
const PROJECT_IMAGE_RECORDS_READ_CACHE_LIMIT = 8;

const cacheProjectImageRecords = (
  projectPath: string,
  entry: { signature: string; imageRecords: ImageRecordMap },
) => {
  projectImageRecordsReadCache.delete(projectPath);
  projectImageRecordsReadCache.set(projectPath, entry);
  while (
    projectImageRecordsReadCache.size > PROJECT_IMAGE_RECORDS_READ_CACHE_LIMIT
  ) {
    const oldestProjectPath = projectImageRecordsReadCache.keys().next().value;
    if (!oldestProjectPath) {
      break;
    }
    projectImageRecordsReadCache.delete(oldestProjectPath);
  }
};

const getImageRecordsFileSignature = async (projectPath: string) => {
  const stats = await fs.stat(
    path.join(projectPath, PROJECT_FILENAMES.imageRecords),
    { bigint: true },
  );
  return `${stats.dev}:${stats.ino}:${stats.size}:${stats.mtimeNs}`;
};
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

interface ThumbnailPayload {
  data: Buffer;
  mimeType: string;
  width: number;
  height: number;
}

type CreateThumbnail = CreateProjectThumbnail;

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
    projectId: randomUUID(),
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

const readProjectBundleFiles = async (
  projectPath: string,
  options: { validateScene?: boolean } = {},
) => {
  const [
    projectJson,
    sceneJson,
    imageRecordsJson,
    imageRecordsSignature,
  ] = await Promise.all([
    fs.readFile(path.join(projectPath, PROJECT_FILENAMES.project), "utf8"),
    fs.readFile(path.join(projectPath, PROJECT_FILENAMES.scene), "utf8"),
    fs.readFile(path.join(projectPath, PROJECT_FILENAMES.imageRecords), "utf8"),
    getImageRecordsFileSignature(projectPath),
  ]);
  let manifestValue: unknown;
  try {
    manifestValue = JSON.parse(projectJson);
  } catch (error) {
    throw Object.assign(
      new Error("项目清单 JSON 已损坏，已保留原文件。"),
      {
        code: "PROJECT_MANIFEST_INVALID",
        details: error instanceof Error ? error.message : String(error),
      },
    );
  }
  const { project, changed } = parseProjectManifest({
    value: manifestValue,
    projectPath,
    appVersion: DESKTOP_APP_VERSION,
    createAgentAccess: createProjectAgentAccess,
    createProjectId: randomUUID,
  });
  if (options.validateScene !== false) {
    parseProjectScene(sceneJson);
  }
  let imageRecordsValue: unknown;
  try {
    imageRecordsValue = JSON.parse(imageRecordsJson);
  } catch (error) {
    throw Object.assign(
      new Error("图片索引 JSON 已损坏，已保留原文件。"),
      {
        code: "IMAGE_RECORDS_INVALID",
        details: error instanceof Error ? error.message : String(error),
      },
    );
  }
  const parsedImageRecords = parseProjectImageRecords(
    imageRecordsValue,
  );
  cacheProjectImageRecords(projectPath, {
    signature: imageRecordsSignature,
    imageRecords: parsedImageRecords.imageRecords,
  });
  if (changed) {
    await writeProjectManifest(projectPath, project);
  }
  return {
    project,
    sceneJson,
    imageRecords: parsedImageRecords.imageRecords,
    ...(parsedImageRecords.issues.length
      ? { imageRecordReadIssues: parsedImageRecords.issues }
      : {}),
  };
};

export const readProjectManifestSnapshot = async (
  projectPath: string,
): Promise<ProjectManifest> => {
  const projectFile = path.join(projectPath, PROJECT_FILENAMES.project);
  let manifestValue: unknown;
  try {
    manifestValue = JSON.parse(await fs.readFile(projectFile, "utf8"));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw Object.assign(
        new Error("项目清单 JSON 已损坏，已保留原文件。"),
        { code: "PROJECT_MANIFEST_INVALID", details: error.message },
      );
    }
    throw error;
  }
  return parseProjectManifest({
    value: manifestValue,
    projectPath,
    appVersion: DESKTOP_APP_VERSION,
    createAgentAccess: createProjectAgentAccess,
    createProjectId: randomUUID,
  }).project;
};

export const readProjectBundle = async (projectPath: string) => {
  const initialBundle = await readProjectBundleFiles(projectPath);
  const recovery = await recoverProjectImageWritebacks(projectPath);
  const withRecoveryIssues = <T extends Awaited<
    ReturnType<typeof readProjectBundleFiles>
  >>(bundle: T) => ({
    ...bundle,
    ...(recovery.invalidJournals?.length
      ? { writebackJournalReadIssues: recovery.invalidJournals }
      : {}),
  });
  if (recovery.committed.length || recovery.rolledBack.length) {
    return withRecoveryIssues(await readProjectBundleFiles(projectPath));
  }
  return withRecoveryIssues(initialBundle);
};

const readProjectImageRecords = async (projectPath: string) => {
  const signature = await getImageRecordsFileSignature(projectPath);
  const cached = projectImageRecordsReadCache.get(projectPath);
  if (cached?.signature === signature) {
    cacheProjectImageRecords(projectPath, cached);
    return cached.imageRecords;
  }
  const parsed = await readProjectImageRecordsWithDeps(projectPath, {
    readText: (filePath) => fs.readFile(filePath, "utf8"),
  });
  cacheProjectImageRecords(projectPath, {
    signature,
    imageRecords: parsed,
  });
  return parsed;
};

const readRawProjectImageRecords = async (projectPath: string) =>
  JSON.parse(
    await fs.readFile(
      path.join(projectPath, PROJECT_FILENAMES.imageRecords),
      "utf8",
    ),
  ) as ImageRecordMap;

const writeProjectImageRecords = async (
  projectPath: string,
  imageRecords: ImageRecordMap,
) => {
  await writeProjectImageRecordsWithDeps(projectPath, imageRecords, {
    writeJson,
  });
  projectImageRecordsReadCache.delete(projectPath);
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
  const bundle = await readProjectBundleFiles(projectPath);
  const { access } = normalizeProjectAgentAccess(agentAccess);
  const nextProject: ProjectManifest = {
    ...bundle.project,
    agentAccess: access,
    updatedAt: new Date().toISOString(),
  };
  await writeProjectManifest(projectPath, nextProject);
  return nextProject;
};

export const ensureProjectStableBoardId = async (
  projectPath: string,
  createStableBoardId: () => string = randomUUID,
) => {
  const bundle = await readProjectBundleFiles(projectPath);
  if (bundle.project.stableBoardId) {
    return {
      project: bundle.project,
      stableBoardId: bundle.project.stableBoardId,
    };
  }
  const stableBoardId = createStableBoardId();
  if (!stableBoardId.trim()) {
    throw new Error("Stable Agent Board id must not be empty.");
  }
  const project: ProjectManifest = {
    ...bundle.project,
    stableBoardId,
    updatedAt: new Date().toISOString(),
  };
  await writeProjectManifest(projectPath, project);
  return { project, stableBoardId };
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

const projectSceneMutationQueues = new Map<string, Promise<void>>();

const runProjectSceneMutation = async <T>(
  projectPath: string,
  mutate: () => Promise<T>,
): Promise<T> => {
  const previous =
    projectSceneMutationQueues.get(projectPath) ?? Promise.resolve();
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const queued = previous.catch(() => undefined).then(() => gate);
  projectSceneMutationQueues.set(projectPath, queued);
  await previous.catch(() => undefined);
  try {
    return await mutate();
  } finally {
    release();
    if (projectSceneMutationQueues.get(projectPath) === queued) {
      projectSceneMutationQueues.delete(projectPath);
    }
  }
};

const writeProjectSceneUnlocked = async ({
  projectPath,
  sceneJson,
  expectedSceneHash,
}: {
  projectPath: string;
  sceneJson: string;
  expectedSceneHash?: string | null;
}) => {
  const bundle = await readProjectBundleFiles(projectPath, {
    validateScene: false,
  });
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
      "PROJECT_STORAGE_DIVERGED",
      "磁盘内容与当前项目房间不一致，已停止持久化。请检查项目文件的外部修改。",
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

  await writeTextAtomic(
    path.join(projectPath, PROJECT_FILENAMES.scene),
    sceneJson,
  );
  const nextProject: ProjectManifest = {
    ...bundle.project,
    updatedAt: new Date().toISOString(),
  };
  await writeProjectManifest(projectPath, nextProject);
  return nextProject;
};

export const writeProjectScene = async (
  input: Parameters<typeof writeProjectSceneUnlocked>[0],
) =>
  runProjectSceneMutation(input.projectPath, () =>
    writeProjectSceneUnlocked(input),
  );

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

interface NativeThumbnailImage {
  isEmpty(): boolean;
  getSize(): { width: number; height: number };
  resize(options: {
    width: number;
    height: number;
    quality: "best";
  }): NativeThumbnailImage;
  toPNG(): Buffer;
}

interface NativeThumbnailAdapter {
  createFromBuffer(buffer: Buffer): NativeThumbnailImage;
  createThumbnailFromPath?: (
    sourcePath: string,
    size: { width: number; height: number },
  ) => Promise<NativeThumbnailImage>;
}

const getThumbnailTargetSize = ({
  width,
  height,
  maxDimension,
}: Pick<
  Parameters<CreateThumbnail>[0],
  "width" | "height" | "maxDimension"
>) => {
  const largestDimension = Math.max(width, height);
  if (!Number.isFinite(largestDimension) || largestDimension <= 0) {
    return null;
  }
  const scale = Math.min(1, maxDimension / largestDimension);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

export const createNativeImageThumbnailWithAdapter = async (
  input: Parameters<CreateThumbnail>[0],
  nativeImage: NativeThumbnailAdapter,
): Promise<ThumbnailPayload | null> => {
  let sourceImage = nativeImage.createFromBuffer(input.sourceBuffer);
  if (sourceImage.isEmpty()) {
    const targetSize = getThumbnailTargetSize(input);
    if (
      !input.sourcePath ||
      !targetSize ||
      typeof nativeImage.createThumbnailFromPath !== "function"
    ) {
      return null;
    }
    try {
      sourceImage = await nativeImage.createThumbnailFromPath(
        input.sourcePath,
        targetSize,
      );
    } catch {
      return null;
    }
    if (sourceImage.isEmpty()) {
      return null;
    }
  }

  const sourceSize = sourceImage.getSize();
  const sourceWidth = sourceSize.width || input.width;
  const sourceHeight = sourceSize.height || input.height;
  const targetSize = getThumbnailTargetSize({
    width: sourceWidth,
    height: sourceHeight,
    maxDimension: input.maxDimension,
  });
  if (!targetSize) {
    return null;
  }

  const thumbnail =
    targetSize.width === sourceWidth && targetSize.height === sourceHeight
      ? sourceImage
      : sourceImage.resize({
          ...targetSize,
          quality: "best",
        });
  if (thumbnail.isEmpty()) {
    return null;
  }
  const data = thumbnail.toPNG();
  if (!data.length) {
    return null;
  }

  return {
    data,
    mimeType: "image/png",
    width: targetSize.width,
    height: targetSize.height,
  };
};

const createNativeImageThumbnail: CreateThumbnail = async (input) => {
  const { nativeImage } = await import("electron");
  return createNativeImageThumbnailWithAdapter(input, nativeImage);
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
    sourcePath: resolveProjectAssetPath(projectPath, record.assetPath),
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

export const inspectProjectHealth = (input: { projectPath: string }) =>
  inspectProjectHealthWithDeps(input, {
    readProjectBundle: async (projectPath) => {
      const [bundle, writebackJournalReadIssues] = await Promise.all([
        readProjectBundleFiles(projectPath, { validateScene: false }),
        inspectProjectImageWritebackJournals(projectPath),
      ]);
      return {
        ...bundle,
        ...(writebackJournalReadIssues.length
          ? { writebackJournalReadIssues }
          : {}),
      };
    },
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
  }: {
    projectPath: string;
    fileIds: string[];
    force?: boolean;
    createBackup?: boolean;
  },
  options: RebuildProjectThumbnailsOptions = {},
) =>
  rebuildProjectThumbnailsWithDeps(
    {
      projectPath,
      fileIds,
      force,
      createBackup,
    },
    options,
    {
      createMaintenanceBackup,
      readProjectBundle: readProjectBundleFiles,
      readRawProjectImageRecords,
      repairLegacyGeneratedImageRecordOrigins,
      writeProjectImageRecords,
      touchProjectManifest,
      writeProjectScene: options.writeProjectScene ?? writeProjectScene,
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
  files: PersistedImageAssetInput[];
}) => {
  const transaction = await beginProjectImageWriteback({ projectPath, files });
  await commitProjectImageWriteback({
    projectPath,
    transactionId: transaction.transactionId,
  });
  return transaction.imageRecords;
};
