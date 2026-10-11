import fs from "fs/promises";
import os from "os";
import path from "path";

import { afterEach, describe, expect, it } from "vitest";

import {
  beginProjectImageWriteback,
  getProjectImageWritebackJournalPath,
  rollbackProjectImageWriteback,
} from "./projectImageWriteback";

import type { PersistedImageAssetInput } from "../../src/shared/desktopBridgeTypes";
import {
  PROJECT_FILENAMES,
  type ImageRecord,
  type ImageRecordMap,
  type ProjectManifest,
} from "../../src/shared/projectTypes";

const tempDirectories: string[] = [];

const createRecord = (
  fileId: string,
  patch: Partial<ImageRecord> = {},
): ImageRecord => ({
  fileId,
  assetPath: `assets/${fileId}-existing.png`,
  sourceType: "imported",
  width: 320,
  height: 240,
  createdAt: "2026-07-11T00:00:00.000Z",
  mimeType: "image/png",
  ...patch,
});

const createAssetInput = (
  fileId: string,
  content = `asset:${fileId}`,
): PersistedImageAssetInput => ({
  fileId,
  dataBase64: Buffer.from(content).toString("base64"),
  mimeType: "image/png",
  width: 640,
  height: 480,
  sourceType: "imported",
  createdAt: "2026-07-11T01:02:03.000Z",
});

const readJson = async <T>(filePath: string) =>
  JSON.parse(await fs.readFile(filePath, "utf8")) as T;

const writeJson = (filePath: string, value: unknown) =>
  fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");

const createProjectFixture = async (imageRecords: ImageRecordMap = {}) => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "corestudio-writeback-"),
  );
  tempDirectories.push(root);
  const projectPath = path.join(root, "Project");
  await Promise.all([
    fs.mkdir(path.join(projectPath, PROJECT_FILENAMES.assetsDir), {
      recursive: true,
    }),
    fs.mkdir(path.join(projectPath, PROJECT_FILENAMES.cacheDir), {
      recursive: true,
    }),
    fs.mkdir(path.join(projectPath, PROJECT_FILENAMES.exportsDir), {
      recursive: true,
    }),
  ]);

  const timestamp = "2026-07-11T00:00:00.000Z";
  const project: ProjectManifest = {
    formatVersion: 1,
    appVersion: "test",
    name: "Writeback Fixture",
    createdAt: timestamp,
    updatedAt: timestamp,
    sceneFile: PROJECT_FILENAMES.scene,
    imageRecordsFile: PROJECT_FILENAMES.imageRecords,
    assetsDir: PROJECT_FILENAMES.assetsDir,
    exportsDir: PROJECT_FILENAMES.exportsDir,
    agentAccess: { token: "fixture-token", enabled: true },
  };

  await Promise.all([
    writeJson(path.join(projectPath, PROJECT_FILENAMES.project), project),
    writeJson(
      path.join(projectPath, PROJECT_FILENAMES.imageRecords),
      imageRecords,
    ),
    writeJson(path.join(projectPath, PROJECT_FILENAMES.scene), {
      type: "excalidraw",
      version: 2,
      source: "CoreStudio",
      elements: [],
      appState: {},
      files: {},
    }),
    ...Object.values(imageRecords).map((record) =>
      fs.writeFile(
        path.join(projectPath, record.assetPath),
        `existing:${record.fileId}`,
      ),
    ),
  ]);

  return projectPath;
};

afterEach(async () => {
  await Promise.all(
    tempDirectories
      .splice(0)
      .map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

describe("projectImageWriteback", () => {
  it("rolls back only records and assets owned by the transaction", async () => {
    const oldRecord = createRecord("file-replaced");
    const untouchedRecord = createRecord("file-untouched");
    const projectPath = await createProjectFixture({
      "file-replaced": oldRecord,
      "file-untouched": untouchedRecord,
    });
    const transaction = await beginProjectImageWriteback({
      projectPath,
      files: [createAssetInput("file-replaced", "replacement")],
    });
    const replacementPath = transaction.imageRecords["file-replaced"].assetPath;

    const restored = await rollbackProjectImageWriteback({
      projectPath,
      transactionId: transaction.transactionId,
    });

    expect(restored).toEqual({
      "file-replaced": oldRecord,
      "file-untouched": untouchedRecord,
    });
    await expect(
      fs.stat(path.join(projectPath, replacementPath)),
    ).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(
      fs.readFile(path.join(projectPath, oldRecord.assetPath), "utf8"),
    ).resolves.toBe("existing:file-replaced");
  });

  it("does not overwrite a newer record with the same file id", async () => {
    const projectPath = await createProjectFixture();
    const transaction = await beginProjectImageWriteback({
      projectPath,
      files: [createAssetInput("file-conflict")],
    });
    const newerRecord = createRecord("file-conflict", {
      assetPath: "assets/file-conflict-newer.png",
      createdAt: "2026-07-11T02:00:00.000Z",
    });
    await fs.writeFile(path.join(projectPath, newerRecord.assetPath), "newer");
    await writeJson(path.join(projectPath, PROJECT_FILENAMES.imageRecords), {
      "file-conflict": newerRecord,
    });

    await expect(
      rollbackProjectImageWriteback({
        projectPath,
        transactionId: transaction.transactionId,
      }),
    ).rejects.toMatchObject({ code: "WRITEBACK_CONFLICT" });

    await expect(
      readJson<ImageRecordMap>(
        path.join(projectPath, PROJECT_FILENAMES.imageRecords),
      ),
    ).resolves.toEqual({ "file-conflict": newerRecord });
    await expect(
      fs.stat(
        getProjectImageWritebackJournalPath(
          projectPath,
          transaction.transactionId,
        ),
      ),
    ).resolves.toBeDefined();
  });
});
