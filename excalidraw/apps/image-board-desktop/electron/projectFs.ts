import fs from "fs/promises";
import { randomUUID } from "node:crypto";
import path from "path";

import {
  PROJECT_FILENAMES,
  PROJECT_FORMAT_VERSION,
  type ImageRecord,
  type ImageRecordMap,
  type ImageSourceType,
  type ProjectManifest,
} from "../src/shared/projectTypes";
import type { ProviderId } from "../src/shared/providerTypes";

const APP_VERSION = "0.1.0";
const SCENE_BACKUPS_DIR = "scene-backups";
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

interface PersistImageAssetInput {
  fileId: string;
  dataBase64: string;
  mimeType: string;
  width: number;
  height: number;
  sourceType: ImageSourceType;
  provider?: ProviderId;
  model?: string;
  prompt?: string;
  negativePrompt?: string;
  seed?: number | null;
  createdAt: string;
  parentFileId?: string | null;
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

const buildProjectManifest = (name: string): ProjectManifest => {
  const timestamp = new Date().toISOString();
  return {
    formatVersion: PROJECT_FORMAT_VERSION,
    appVersion: APP_VERSION,
    name,
    createdAt: timestamp,
    updatedAt: timestamp,
    sceneFile: PROJECT_FILENAMES.scene,
    imageRecordsFile: PROJECT_FILENAMES.imageRecords,
    assetsDir: PROJECT_FILENAMES.assetsDir,
    exportsDir: PROJECT_FILENAMES.exportsDir,
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
  await fs.mkdir(path.join(projectPath, PROJECT_FILENAMES.exportsDir), {
    recursive: true,
  });

  const project = buildProjectManifest(name);

  await Promise.all([
    writeJsonExclusive(path.join(projectPath, PROJECT_FILENAMES.project), project),
    fs.writeFile(
      path.join(projectPath, PROJECT_FILENAMES.scene),
      EMPTY_PROJECT_SCENE,
      {
        encoding: "utf8",
        flag: "wx",
      },
    ),
    writeJsonExclusive(path.join(projectPath, PROJECT_FILENAMES.imageRecords), {}),
  ]);

  return { projectPath, project };
};

export const readProjectBundle = async (projectPath: string) => {
  const [projectJson, sceneJson, imageRecordsJson] = await Promise.all([
    fs.readFile(path.join(projectPath, PROJECT_FILENAMES.project), "utf8"),
    fs.readFile(path.join(projectPath, PROJECT_FILENAMES.scene), "utf8"),
    fs.readFile(
      path.join(projectPath, PROJECT_FILENAMES.imageRecords),
      "utf8",
    ),
  ]);

  return {
    project: JSON.parse(projectJson) as ProjectManifest,
    sceneJson,
    imageRecords: JSON.parse(imageRecordsJson) as ImageRecordMap,
  };
};

const writeProjectManifest = async (
  projectPath: string,
  project: ProjectManifest,
) => {
  await writeJson(path.join(projectPath, PROJECT_FILENAMES.project), project);
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

export const writeProjectScene = async ({
  projectPath,
  sceneJson,
}: {
  projectPath: string;
  sceneJson: string;
}) => {
  const bundle = await readProjectBundle(projectPath);
  const currentScene = analyzeSceneJson(bundle.sceneJson);
  const nextScene = analyzeSceneJson(sceneJson);

  if (nextScene.parseFailed) {
    throw new Error("新的画板数据无法解析，已停止保存。");
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
  await writeProjectManifest(projectPath, {
    ...bundle.project,
    updatedAt: new Date().toISOString(),
  });
};

export const readProjectAssetPayloads = async ({
  projectPath,
  fileIds,
}: {
  projectPath: string;
  fileIds: string[];
}) => {
  const bundle = await readProjectBundle(projectPath);
  const payloads = await Promise.all(
    fileIds.map(async (fileId) => {
      const record = bundle.imageRecords[fileId];
      if (!record) {
        return null;
      }
      const fileBuffer = await fs.readFile(
        resolveProjectAssetPath(projectPath, record.assetPath),
      );
      return {
        fileId,
        mimeType: record.mimeType,
        width: record.width,
        height: record.height,
        createdAt: record.createdAt,
        dataBase64: fileBuffer.toString("base64"),
      };
    }),
  );

  return payloads.filter(Boolean);
};

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
    const assetFileName = `${file.createdAt.replace(/[:.]/g, "-")}_${safeAssetFileNameSegment(file.fileId)}.${extensionFromMimeType(file.mimeType)}`;
    const relativeAssetPath = path.posix.join(
      PROJECT_FILENAMES.assetsDir,
      assetFileName,
    );
    const assetPath = resolveProjectAssetPath(projectPath, relativeAssetPath);
    await fs.writeFile(
      assetPath,
      Buffer.from(file.dataBase64, "base64"),
    );

    const record: ImageRecord = {
      fileId: file.fileId,
      assetPath: relativeAssetPath,
      sourceType: file.sourceType,
      provider: file.provider,
      model: file.model,
      prompt: file.prompt,
      negativePrompt: file.negativePrompt,
      seed: file.seed ?? null,
      width: file.width,
      height: file.height,
      createdAt: file.createdAt,
      mimeType: file.mimeType,
      parentFileId: file.parentFileId ?? null,
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
