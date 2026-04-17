import fs from "fs/promises";
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
  await fs.mkdir(projectPath, { recursive: true });
  await fs.mkdir(path.join(projectPath, PROJECT_FILENAMES.assetsDir), {
    recursive: true,
  });
  await fs.mkdir(path.join(projectPath, PROJECT_FILENAMES.exportsDir), {
    recursive: true,
  });

  const project = buildProjectManifest(name);

  await Promise.all([
    writeJson(path.join(projectPath, PROJECT_FILENAMES.project), project),
    fs.writeFile(
      path.join(projectPath, PROJECT_FILENAMES.scene),
      EMPTY_PROJECT_SCENE,
      "utf8",
    ),
    writeJson(path.join(projectPath, PROJECT_FILENAMES.imageRecords), {}),
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

export const writeProjectScene = async ({
  projectPath,
  sceneJson,
}: {
  projectPath: string;
  sceneJson: string;
}) => {
  const bundle = await readProjectBundle(projectPath);
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
      const fileBuffer = await fs.readFile(path.join(projectPath, record.assetPath));
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
    const assetFileName = `${file.createdAt.replace(/[:.]/g, "-")}_${file.fileId}.${extensionFromMimeType(file.mimeType)}`;
    const relativeAssetPath = path.posix.join(
      PROJECT_FILENAMES.assetsDir,
      assetFileName,
    );
    await fs.writeFile(
      path.join(projectPath, relativeAssetPath),
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
