import fs from "fs/promises";
import { randomUUID } from "node:crypto";
import path from "path";

import type { PersistedImageAssetInput } from "../../src/shared/desktopBridgeTypes";
import {
  PROJECT_FILENAMES,
  type ImageRecord,
  type ImageRecordMap,
  type ProjectImageWritebackJournal,
  type ProjectImageWritebackTransaction,
  type ProjectManifest,
} from "../../src/shared/projectTypes";
import { assertPersistedImageAssetIntegrity } from "../../src/shared/projectRecordIntegrity";
import { writeBufferAtomic, writeJsonAtomic } from "./atomicProjectFile";

const WRITEBACK_DIRECTORY = "image-writebacks";
const projectWritebackLocks = new Map<string, Promise<void>>();

const createWritebackConflict = (message: string, details?: unknown) =>
  Object.assign(new Error(message), {
    code: "WRITEBACK_CONFLICT" as const,
    ...(details === undefined ? {} : { details }),
  });

const withProjectWritebackLock = async <T>(
  projectPath: string,
  operation: () => Promise<T>,
): Promise<T> => {
  const key = path.resolve(projectPath);
  const previous = projectWritebackLocks.get(key) ?? Promise.resolve();
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const queued = previous.then(() => gate);
  projectWritebackLocks.set(key, queued);

  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (projectWritebackLocks.get(key) === queued) {
      projectWritebackLocks.delete(key);
    }
  }
};

const isNodeError = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error && "code" in error;

const readJson = async <T>(filePath: string): Promise<T> =>
  JSON.parse(await fs.readFile(filePath, "utf8")) as T;

const getWritebackDirectoryPath = (projectPath: string) =>
  path.join(projectPath, PROJECT_FILENAMES.cacheDir, WRITEBACK_DIRECTORY);

const assertSafeTransactionId = (transactionId: string) => {
  if (!/^[a-zA-Z0-9_-]+$/.test(transactionId)) {
    throw new Error("图片写回事务 ID 格式不正确。");
  }
};

export const getProjectImageWritebackJournalPath = (
  projectPath: string,
  transactionId: string,
) => {
  assertSafeTransactionId(transactionId);
  return path.join(
    getWritebackDirectoryPath(projectPath),
    `${transactionId}.json`,
  );
};

const getImageRecordsPath = (projectPath: string) =>
  path.join(projectPath, PROJECT_FILENAMES.imageRecords);

const getProjectManifestPath = (projectPath: string) =>
  path.join(projectPath, PROJECT_FILENAMES.project);

const resolveAssetPath = (projectPath: string, relativeAssetPath: string) => {
  const assetDirectory = path.resolve(projectPath, PROJECT_FILENAMES.assetsDir);
  const resolved = path.resolve(projectPath, relativeAssetPath);
  if (!resolved.startsWith(`${assetDirectory}${path.sep}`)) {
    throw new Error("图片写回事务包含项目 assets 目录之外的路径。");
  }
  return resolved;
};

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

const createImageRecord = (
  file: PersistedImageAssetInput,
  transactionId: string,
): ImageRecord => {
  const assetFileName = `${file.createdAt.replace(
    /[:.]/g,
    "-",
  )}_${safeAssetFileNameSegment(
    file.fileId,
  )}_${transactionId}.${extensionFromMimeType(file.mimeType)}`;

  return {
    fileId: file.fileId,
    assetPath: path.posix.join(PROJECT_FILENAMES.assetsDir, assetFileName),
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
};

const readJournal = (projectPath: string, transactionId: string) =>
  readJson<ProjectImageWritebackJournal>(
    getProjectImageWritebackJournalPath(projectPath, transactionId),
  );

const listJournals = async (projectPath: string) => {
  const directory = getWritebackDirectoryPath(projectPath);
  let entries: string[];
  try {
    entries = await fs.readdir(directory);
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  return Promise.all(
    entries
      .filter((entry) => entry.endsWith(".json"))
      .sort()
      .map((entry) => readJournal(projectPath, entry.slice(0, -5))),
  );
};

const recordsMatch = (
  current: ImageRecord | undefined,
  expected: ImageRecord | null,
) =>
  expected === null
    ? current === undefined
    : current?.assetPath === expected.assetPath;

const touchProjectManifest = async (projectPath: string) => {
  const manifest = await readJson<ProjectManifest>(
    getProjectManifestPath(projectPath),
  );
  await writeJsonAtomic(getProjectManifestPath(projectPath), {
    ...manifest,
    updatedAt: new Date().toISOString(),
  });
};

export const beginProjectImageWriteback = async ({
  projectPath,
  files,
}: {
  projectPath: string;
  files: PersistedImageAssetInput[];
}): Promise<ProjectImageWritebackTransaction> =>
  withProjectWritebackLock(projectPath, async () => {
    if (files.length === 0) {
      throw new Error("图片写回事务至少需要一张图片。");
    }

    const fileIds = files.map((file) => file.fileId);
    if (new Set(fileIds).size !== fileIds.length) {
      throw new Error("同一图片写回事务不能包含重复的 fileId。");
    }
    files.forEach(assertPersistedImageAssetIntegrity);

    const pendingJournals = await listJournals(projectPath);
    const conflictingTransaction = pendingJournals.find((journal) =>
      Object.keys(journal.nextRecords).some((fileId) =>
        fileIds.includes(fileId),
      ),
    );
    if (conflictingTransaction) {
      throw createWritebackConflict("相同图片仍有未完成的写回事务。", {
        transactionId: conflictingTransaction.transactionId,
        fileIds,
      });
    }

    const currentRecords = await readJson<ImageRecordMap>(
      getImageRecordsPath(projectPath),
    );
    const transactionId = randomUUID();
    const previousRecords: Record<string, ImageRecord | null> = {};
    const nextRecords: ImageRecordMap = {};

    for (const file of files) {
      previousRecords[file.fileId] = currentRecords[file.fileId] ?? null;
      nextRecords[file.fileId] = createImageRecord(file, transactionId);
    }

    const journal: ProjectImageWritebackJournal = {
      schemaVersion: 1,
      transactionId,
      createdAt: new Date().toISOString(),
      previousRecords,
      nextRecords,
    };
    await writeJsonAtomic(
      getProjectImageWritebackJournalPath(projectPath, transactionId),
      journal,
    );

    for (const file of files) {
      const record = nextRecords[file.fileId];
      await writeBufferAtomic(
        resolveAssetPath(projectPath, record.assetPath),
        Buffer.from(file.dataBase64, "base64"),
      );
    }

    const imageRecords = { ...currentRecords, ...nextRecords };
    await writeJsonAtomic(getImageRecordsPath(projectPath), imageRecords);
    await touchProjectManifest(projectPath);

    return {
      transactionId,
      projectPath,
      fileIds,
      imageRecords,
    };
  });

export const commitProjectImageWriteback = async ({
  projectPath,
  transactionId,
}: {
  projectPath: string;
  transactionId: string;
}) =>
  withProjectWritebackLock(projectPath, async () => {
    const journal = await readJournal(projectPath, transactionId);
    const currentRecords = await readJson<ImageRecordMap>(
      getImageRecordsPath(projectPath),
    );
    const conflictingFileIds = Object.entries(journal.nextRecords)
      .filter(
        ([fileId, expected]) => !recordsMatch(currentRecords[fileId], expected),
      )
      .map(([fileId]) => fileId);
    if (conflictingFileIds.length > 0) {
      throw createWritebackConflict(
        "图片记录已被后续写入更新，无法提交旧事务。",
        {
          transactionId,
          fileIds: conflictingFileIds,
        },
      );
    }
    await fs.unlink(
      getProjectImageWritebackJournalPath(projectPath, transactionId),
    );
  });

export const rollbackProjectImageWriteback = async ({
  projectPath,
  transactionId,
}: {
  projectPath: string;
  transactionId: string;
}): Promise<ImageRecordMap> =>
  withProjectWritebackLock(projectPath, async () => {
    const journal = await readJournal(projectPath, transactionId);
    const currentRecords = await readJson<ImageRecordMap>(
      getImageRecordsPath(projectPath),
    );
    const conflictingFileIds = Object.keys(journal.nextRecords).filter(
      (fileId) => {
        const current = currentRecords[fileId];
        return (
          !recordsMatch(current, journal.nextRecords[fileId]) &&
          !recordsMatch(current, journal.previousRecords[fileId] ?? null)
        );
      },
    );
    if (conflictingFileIds.length > 0) {
      throw createWritebackConflict(
        "图片记录已被后续写入更新，已保留事务日志并停止回滚。",
        { transactionId, fileIds: conflictingFileIds },
      );
    }

    const restoredRecords = { ...currentRecords };
    for (const fileId of Object.keys(journal.nextRecords)) {
      const previous = journal.previousRecords[fileId] ?? null;
      if (previous) {
        restoredRecords[fileId] = previous;
      } else {
        delete restoredRecords[fileId];
      }
    }
    await writeJsonAtomic(getImageRecordsPath(projectPath), restoredRecords);

    for (const record of Object.values(journal.nextRecords)) {
      await fs
        .unlink(resolveAssetPath(projectPath, record.assetPath))
        .catch((error: unknown) => {
          if (!isNodeError(error) || error.code !== "ENOENT") {
            throw error;
          }
        });
    }
    await fs.unlink(
      getProjectImageWritebackJournalPath(projectPath, transactionId),
    );
    await touchProjectManifest(projectPath);
    return restoredRecords;
  });

const collectSceneImageFileIds = (sceneJson: string) => {
  const scene = JSON.parse(sceneJson) as { elements?: unknown[] };
  const fileIds = new Set<string>();
  for (const element of scene.elements ?? []) {
    if (
      typeof element === "object" &&
      element !== null &&
      (element as { type?: unknown }).type === "image" &&
      (element as { isDeleted?: unknown }).isDeleted !== true &&
      typeof (element as { fileId?: unknown }).fileId === "string"
    ) {
      fileIds.add((element as { fileId: string }).fileId);
    }
  }
  return fileIds;
};

export const recoverProjectImageWritebacks = async (projectPath: string) => {
  const journals = await listJournals(projectPath);
  if (journals.length === 0) {
    return { committed: [], rolledBack: [] };
  }

  const sceneFileIds = collectSceneImageFileIds(
    await fs.readFile(path.join(projectPath, PROJECT_FILENAMES.scene), "utf8"),
  );
  const committed: string[] = [];
  const rolledBack: string[] = [];

  for (const journal of journals) {
    const fileIds = Object.keys(journal.nextRecords);
    const referencedCount = fileIds.filter((fileId) =>
      sceneFileIds.has(fileId),
    ).length;
    if (referencedCount === fileIds.length) {
      await commitProjectImageWriteback({
        projectPath,
        transactionId: journal.transactionId,
      });
      committed.push(journal.transactionId);
      continue;
    }
    if (referencedCount === 0) {
      await rollbackProjectImageWriteback({
        projectPath,
        transactionId: journal.transactionId,
      });
      rolledBack.push(journal.transactionId);
      continue;
    }
    throw createWritebackConflict(
      "图片写回事务只部分出现在画板中，已保留日志等待人工处理。",
      { transactionId: journal.transactionId, fileIds },
    );
  }

  return { committed, rolledBack };
};
