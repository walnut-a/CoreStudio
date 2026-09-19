import {
  addNativeRecoveryLinks,
  recoverImageRecords,
} from "./project/projectRecovery";
import { captureLayout, mergeExternalLayout } from "./project/projectLayout";
import {
  readProjectDataText,
  writeProjectDataJson,
  readProjectDocument,
  updateProjectDocument,
  recoverProjectSceneCommit,
} from "./project/projectDocument";
import { assertProjectAssetFile } from "./project/projectAssetAccess";
import { inspectExternalImageIntake } from "./project/externalImageIntakeState";
import { withSettledProjectWriteback } from "./project/projectImageWriteback";
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
  type ProjectGenerationModelSelection,
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
import { PROVIDER_IDS } from "../src/shared/providerCatalog";
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
import { writeTextAtomic } from "./project/atomicProjectFile";
import {
  beginProjectImageWriteback,
  commitProjectImageWriteback,
  inspectProjectImageWritebackJournals,
  recoverProjectImageWritebacks,
  updateProjectImageRecordMetadata as updateProjectImageRecordMetadataWithLock,
} from "./project/projectImageWriteback";
import {
  parseProjectManifest,
  parseProjectScene,
} from "./project/projectReadIntegrity";
import {
  resolveProjectAssetPath,
  readRegisteredProjectAsset,
} from "./project/projectAssetAccess";

const writeJson = writeProjectDataJson;

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
  const signatures: string[] = [];
  for (const name of [
    PROJECT_FILENAMES.project,
    PROJECT_FILENAMES.imageRecords,
  ]) {
    try {
      const stats = await fs.stat(path.join(projectPath, name), {
        bigint: true,
      });
      signatures.push(
        `${stats.dev}:${stats.ino}:${stats.size}:${stats.mtimeNs}`,
      );
    } catch (error) {
      if (
        name === PROJECT_FILENAMES.project ||
        (error as NodeJS.ErrnoException).code !== "ENOENT"
      )
        throw error;
    }
  }
  return signatures.join("/");
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
    imageRecordsFile: PROJECT_FILENAMES.project,
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
    writeJsonExclusive(path.join(projectPath, PROJECT_FILENAMES.project), {
      ...project,
      imageRecords: {},
    }),
    fs.writeFile(
      path.join(projectPath, PROJECT_FILENAMES.scene),
      EMPTY_PROJECT_SCENE,
      {
        encoding: "utf8",
        flag: "wx",
      },
    ),
  ]);

  return { projectPath, project };
};

const readProjectBundleFiles = async (
  projectPath: string,
  options: { validateScene?: boolean } = {},
) => {
  const [projectJson, sceneJson, imageRecordsJson, imageRecordsSignature] =
    await Promise.all([
      readProjectDataText(path.join(projectPath, PROJECT_FILENAMES.project)),
      fs.readFile(path.join(projectPath, PROJECT_FILENAMES.scene), "utf8"),
      readProjectDataText(
        path.join(projectPath, PROJECT_FILENAMES.imageRecords),
      ),
      getImageRecordsFileSignature(projectPath),
    ]);
  let manifestValue: unknown;
  try {
    manifestValue = JSON.parse(projectJson);
  } catch (error) {
    throw Object.assign(new Error("项目清单 JSON 已损坏，已保留原文件。"), {
      code: "PROJECT_MANIFEST_INVALID",
      details: error instanceof Error ? error.message : String(error),
    });
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
    throw Object.assign(new Error("图片索引 JSON 已损坏，已保留原文件。"), {
      code: "IMAGE_RECORDS_INVALID",
      details: error instanceof Error ? error.message : String(error),
    });
  }
  const parsedImageRecords = parseProjectImageRecords(imageRecordsValue);
  if (project.formatVersion === 2 && options.validateScene !== false) {
    const scene = JSON.parse(sceneJson);
    const missing = (scene.elements ?? []).some(
      (e: Record<string, any>) =>
        e.type === "image" &&
        typeof e.fileId === "string" &&
        !parsedImageRecords.imageRecords[e.fileId],
    );
    if (missing) {
      const recovered = await recoverImageRecords(
        projectPath,
        scene,
        imageRecordsValue,
      );
      parsedImageRecords.imageRecords = recovered.records;
    }
  }
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
    manifestValue = JSON.parse(await readProjectDataText(projectFile));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw Object.assign(new Error("项目清单 JSON 已损坏，已保留原文件。"), {
        code: "PROJECT_MANIFEST_INVALID",
        details: error.message,
      });
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
  let sceneCommitIssue: string | undefined;
  try {
    await recoverProjectSceneCommit(projectPath);
  } catch (error) {
    sceneCommitIssue = error instanceof Error ? error.message : String(error);
  }
  let initialBundle: Awaited<ReturnType<typeof readProjectBundleFiles>>;
  try {
    initialBundle = await readProjectBundleFiles(projectPath);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (
      ![
        "ENOENT",
        "PROJECT_MANIFEST_INVALID",
        "IMAGE_RECORDS_INVALID",
        "PROJECT_SCENE_INVALID",
        "PROJECT_FORMAT_UNSUPPORTED",
      ].includes(code ?? "")
    )
      throw error;
    if (code === "PROJECT_SCENE_INVALID" || code === "ENOENT") {
      try {
        const { document } = await readProjectDocument(projectPath);
        if (document.formatVersion !== 2 || !document.projectId) throw error;
        const elements = Object.entries(
          document.layout?.elements ?? {},
        ).flatMap(([id, raw]) => {
          if (
            !isRecord(raw) ||
            typeof raw.fileId !== "string" ||
            !["x", "y", "width", "height", "angle"].every(
              (k) => typeof raw[k] === "number" && Number.isFinite(raw[k]),
            )
          )
            return [];
          return [
            {
              ...raw,
              id,
              type: "image",
              version: 1,
              versionNonce: 1,
              status: "saved",
              scale: [1, 1],
              isDeleted: raw.isDeleted === true,
            },
          ];
        });
        const sceneJson = JSON.stringify({
          type: "excalidraw",
          version: 2,
          source: "CoreStudio",
          elements,
          appState: {},
          files: {},
          corestudioProject: {
            projectId: document.projectId,
            name: document.name,
          },
        });
        const project = parseProjectManifest({
          value: JSON.parse(
            await readProjectDataText(
              path.join(projectPath, PROJECT_FILENAMES.project),
            ),
          ),
          projectPath,
          appVersion: DESKTOP_APP_VERSION,
          createAgentAccess: createProjectAgentAccess,
          createProjectId: randomUUID,
        }).project;
        return {
          project,
          sceneJson,
          imageRecords: parseProjectImageRecords(document.imageRecords)
            .imageRecords,
          imageRecordReadIssues: [
            {
              code: "invalid-record-field" as const,
              fileId: "scene.excalidraw.json",
              message:
                "原生画布不可读取，当前根据整理结果恢复图片；其他画布内容尚未恢复，原文件已保留，保存暂停。",
              repairable: false,
            },
          ],
        };
      } catch {
        if (code === "PROJECT_SCENE_INVALID") throw error;
      }
    }
    const sceneJson = await fs.readFile(
      path.join(projectPath, PROJECT_FILENAMES.scene),
      "utf8",
    );
    const scene = parseProjectScene(sceneJson) as Record<string, any>;
    const identity = scene.corestudioProject;
    if (!identity?.projectId) throw error;
    const project = {
      ...buildProjectManifest(identity.name ?? path.basename(projectPath)),
      projectId: identity.projectId,
      agentAccess: { token: "", enabled: false },
    };
    const recovered = await recoverImageRecords(projectPath, scene);
    return {
      project,
      sceneJson,
      imageRecords: recovered.records,
      imageRecordReadIssues: [
        {
          code: "invalid-record-field" as const,
          fileId: "project.json",
          message:
            "项目数据不可读取，当前根据原图与原生画布恢复显示；原文件已保留，保存暂停。",
          repairable: false,
        },
      ],
    };
  }
  const recovery = await recoverProjectImageWritebacks(projectPath);
  const withRecoveryIssues = <
    T extends Awaited<ReturnType<typeof readProjectBundleFiles>>,
  >(
    bundle: T,
  ) => ({
    ...bundle,
    ...(sceneCommitIssue
      ? {
          imageRecordReadIssues: [
            ...(bundle.imageRecordReadIssues ?? []),
            {
              code: "invalid-record-field" as const,
              fileId: "cache/scene-commit.json",
              message: sceneCommitIssue,
              repairable: false,
            },
          ],
        }
      : {}),
    ...(recovery.invalidJournals?.length
      ? { writebackJournalReadIssues: recovery.invalidJournals }
      : {}),
  });
  if (recovery.committed.length || recovery.rolledBack.length) {
    return withRecoveryIssues(await readProjectBundleFiles(projectPath));
  }
  return withRecoveryIssues(initialBundle);
};

export const readProjectImageRecords = async (projectPath: string) => {
  let signature: string;
  try {
    signature = await getImageRecordsFileSignature(projectPath);
  } catch (error) {
    if (
      ["ENOENT", "PROJECT_MANIFEST_INVALID", "IMAGE_RECORDS_INVALID"].includes(
        (error as { code?: string }).code ?? "",
      )
    )
      return (await readProjectBundle(projectPath)).imageRecords;
    throw error;
  }
  const cached = projectImageRecordsReadCache.get(projectPath);
  if (cached?.signature === signature) {
    cacheProjectImageRecords(projectPath, cached);
    return cached.imageRecords;
  }
  let parsed: ImageRecordMap;
  try {
    parsed = await readProjectImageRecordsWithDeps(projectPath, {
      readText: readProjectDataText,
    });
  } catch (error) {
    if (
      ["ENOENT", "PROJECT_MANIFEST_INVALID", "IMAGE_RECORDS_INVALID"].includes(
        (error as { code?: string }).code ?? "",
      )
    )
      return (await readProjectBundle(projectPath)).imageRecords;
    throw error;
  }
  cacheProjectImageRecords(projectPath, {
    signature,
    imageRecords: parsed,
  });
  return parsed;
};

const readRawProjectImageRecords = async (projectPath: string) =>
  JSON.parse(
    await readProjectDataText(
      path.join(projectPath, PROJECT_FILENAMES.imageRecords),
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

export const updateProjectGenerationModelSelection = async (
  projectPath: string,
  generationModelSelection: ProjectGenerationModelSelection,
) => {
  if (
    !PROVIDER_IDS.includes(generationModelSelection.provider) ||
    !generationModelSelection.model.trim()
  ) {
    throw new Error("项目的生图模型偏好无效。");
  }
  return runProjectSceneMutation(projectPath, async () => {
    const project = await readProjectManifestSnapshot(projectPath);
    const nextProject: ProjectManifest = {
      ...project,
      generationModelSelection,
      updatedAt: new Date().toISOString(),
    };
    await writeProjectManifest(projectPath, nextProject);
    return nextProject;
  });
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
    PROJECT_FILENAMES.imageIntake,
  ];
  const copiedFiles: string[] = [];

  for (const fileName of files) {
    try {
      await fs.copyFile(
        path.join(projectPath, fileName),
        path.join(backupPath, fileName),
      );
      copiedFiles.push(fileName);
    } catch (error) {
      // 缺失文件可跳过；读写失败必须停止，不能在没有备份时覆盖损坏原件。
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
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
  expectedProjectId,
}: {
  projectPath: string;
  sceneJson: string;
  expectedSceneHash?: string | null;
  expectedProjectId?: string;
}) => {
  const bundle = await readProjectBundleFiles(projectPath, {
    validateScene: false,
  });
  if (expectedProjectId && bundle.project.projectId !== expectedProjectId)
    throw createProjectAgentError(
      "PROJECT_STORAGE_DIVERGED",
      "项目身份已在外部改变，已停止保存，请重新定位项目。",
    );
  const currentScene = analyzeSceneJson(bundle.sceneJson);
  const nextScene = analyzeSceneJson(sceneJson);
  const currentSceneHash = getSceneContentHash(bundle.sceneJson);
  if (bundle.project.formatVersion === 2) {
    sceneJson = JSON.stringify(
      addNativeRecoveryLinks(
        JSON.parse(sceneJson),
        bundle.project,
        bundle.imageRecords,
      ),
      null,
      2,
    );
  }
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

  const nextProject: ProjectManifest = {
    ...bundle.project,
    updatedAt: new Date().toISOString(),
  };
  if (bundle.project.formatVersion === 2) {
    await updateProjectDocument(
      projectPath,
      async (doc) => {
        const before = JSON.parse(bundle.sceneJson),
          next = JSON.parse(sceneJson);
        if (
          doc.layout?.sceneHash &&
          doc.layout.sceneHash !== currentSceneHash
        ) {
          throw createProjectAgentError(
            "PROJECT_STORAGE_DIVERGED",
            "整理信息与原生画布的基线不一致，保存已暂停。",
          );
        }
        const merged = mergeExternalLayout(
          before.elements,
          next.elements,
          doc.layout,
        );
        if (
          merged.elements.some(
            (element, index) => element !== next.elements[index],
          )
        ) {
          throw createProjectAgentError(
            "PROJECT_STORAGE_DIVERGED",
            "发现外部排布修改，等待同步后再保存。",
          );
        }
        const scenePath = path.join(projectPath, PROJECT_FILENAMES.scene);
        if ((await fs.readFile(scenePath, "utf8")) !== bundle.sceneJson)
          throw createProjectAgentError(
            "PROJECT_STORAGE_DIVERGED",
            "原生画布已在外部修改。",
          );
        doc.layout = {
          ...captureLayout(next.elements, doc.layout),
          sceneHash: nextSceneHash,
        };
        doc.updatedAt = nextProject.updatedAt;
      },
      { before: bundle.sceneJson, after: sceneJson },
    );
  } else {
    await writeTextAtomic(
      path.join(projectPath, PROJECT_FILENAMES.scene),
      sceneJson,
    );
    await writeProjectManifest(projectPath, nextProject);
  }
  return { ...nextProject, sceneHash: nextSceneHash };
};

export const writeProjectScene = async (
  input: Parameters<typeof writeProjectSceneUnlocked>[0],
) =>
  runProjectSceneMutation(input.projectPath, () =>
    writeProjectSceneUnlocked(input),
  );

type CachedImageAssetRendition = Exclude<
  ImageAssetRequestRendition,
  "original"
>;

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

export const createCachedRenditionPayload = async ({
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
  const resolvedCachePath = resolveProjectCachePath(projectPath, cachePath);
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

const getExpectedCachePaths = (
  projectPath: string,
  imageRecords: ImageRecordMap,
) => {
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
    await Promise.all(
      cacheRoots.map((directory) => collectFilesRecursively(directory)),
    )
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
    inspectIntake: inspectExternalImageIntake,
    validateOriginal: async (projectPath, record) => {
      if (record.contentHash)
        await readRegisteredProjectAsset(projectPath, record);
      else await assertProjectAssetFile(projectPath, record.assetPath);
    },
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
        path
          .relative(projectPath, assetFile)
          .split(path.sep)
          .join(path.posix.sep),
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

      // Invalid index paths are contract errors, not missing display caches.
      resolveProjectAssetPath(projectPath, record.assetPath);
      let verifiedOriginal: Buffer | undefined;
      if (record.contentHash) {
        try {
          verifiedOriginal = await readRegisteredProjectAsset(
            projectPath,
            record,
          );
        } catch {
          return null;
        }
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
        if (
          !record.contentHash &&
          thumbnailMode === "cache-only" &&
          dimensions.shouldUseThumbnail
        ) {
          return buildMissingThumbnailPlaceholderPayload({ fileId, record });
        }
      }

      let fileBuffer: Buffer;
      try {
        fileBuffer =
          verifiedOriginal ??
          (await readRegisteredProjectAsset(projectPath, record));
      } catch {
        return null;
      }

      // Intake originals were validated by the isolated decoder. Until its
      // cache is ready, return the real image rather than a Quick Look file icon.
      if (rendition !== "original" && !record.contentHash) {
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
  withSettledProjectWriteback(projectPath, async () => {
    if (createBackup) {
      const projectFile = path.join(projectPath, PROJECT_FILENAMES.project),
        sceneFile = path.join(projectPath, PROJECT_FILENAMES.scene);
      const beforeProject = await fs
        .readFile(projectFile, "utf8")
        .catch((error) => {
          if (error.code !== "ENOENT") throw error;
          return null;
        });
      const beforeScene = await fs
        .readFile(sceneFile, "utf8")
        .catch((error) => {
          if (error.code !== "ENOENT") throw error;
          return null;
        });
      try {
        const bundle = await readProjectBundleFiles(projectPath);
        if (bundle.project.formatVersion === 2) {
          const raw = await readRawProjectImageRecords(projectPath);
          const missing = Object.keys(bundle.imageRecords).filter(
            (id) => !raw[id],
          );
          if (missing.length) {
            await createMaintenanceBackup({
              projectPath,
              reason: "recover-image-records",
            });
            await updateProjectDocument(projectPath, (doc) => {
              doc.imageRecords = {
                ...doc.imageRecords,
                ...Object.fromEntries(
                  missing.map((id) => [id, bundle.imageRecords[id]]),
                ),
              };
            });
          }
        }
      } catch (error) {
        if (
          ![
            "ENOENT",
            "PROJECT_MANIFEST_INVALID",
            "IMAGE_RECORDS_INVALID",
            "PROJECT_SCENE_INVALID",
          ].includes((error as { code?: string }).code ?? "")
        )
          throw error;
        const recovered = await readProjectBundle(projectPath);
        if (!recovered.project.projectId) throw error;
        await createMaintenanceBackup({
          projectPath,
          reason: "recover-project-document",
        });
        const currentProject = await fs
          .readFile(projectFile, "utf8")
          .catch((error) => {
            if (error.code !== "ENOENT") throw error;
            return null;
          });
        const currentScene = await fs
          .readFile(sceneFile, "utf8")
          .catch((error) => {
            if (error.code !== "ENOENT") throw error;
            return null;
          });
        if (currentProject !== beforeProject || currentScene !== beforeScene)
          throw new Error("修复期间项目已在外部修改，已停止替换。");
        const native = JSON.parse(recovered.sceneJson);
        let originalDocument: Record<string, any> = {};
        try {
          const parsed = JSON.parse(beforeProject ?? "{}");
          if (isRecord(parsed)) originalDocument = parsed;
        } catch {
          /* The damaged original has been preserved in the backup. */
        }
        const repaired = {
          ...originalDocument,
          ...recovered.project,
          agentAccess: recovered.project.agentAccess?.enabled
            ? recovered.project.agentAccess
            : createProjectAgentAccess(),
          imageRecords: {
            ...originalDocument.imageRecords,
            ...recovered.imageRecords,
          },
          layout: {
            ...captureLayout(native.elements, originalDocument.layout),
            sceneHash: getSceneContentHash(recovered.sceneJson),
          },
        };
        if (beforeScene !== recovered.sceneJson)
          await writeTextAtomic(sceneFile, recovered.sceneJson);
        await writeTextAtomic(projectFile, JSON.stringify(repaired, null, 2));
      }
    }
    return rebuildProjectThumbnailsWithDeps(
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
        readOriginal: readRegisteredProjectAsset,
        resolveProjectAssetPath,
        createCachedRenditionPayload,
        createNativeImageThumbnail,
      },
    );
  });

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

export const updateProjectImageRecordMetadata = async (input: {
  projectPath: string;
  fileId: string;
  displayName: string | null;
}) => {
  const imageRecords = await updateProjectImageRecordMetadataWithLock(input);
  projectImageRecordsReadCache.delete(input.projectPath);
  return imageRecords;
};
