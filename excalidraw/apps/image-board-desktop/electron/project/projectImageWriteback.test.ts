import fs from "fs/promises";
import os from "os";
import path from "path";

import { afterEach, describe, expect, it } from "vitest";

import {
  beginProjectImageWriteback,
  commitProjectImageWriteback,
  getProjectImageWritebackJournalPath,
  recoverProjectImageWritebacks,
  rollbackProjectImageWriteback,
} from "./projectImageWriteback";

import {
  PROJECT_FILENAMES,
  type ImageRecord,
  type ImageRecordMap,
  type ProjectManifest,
} from "../../src/shared/projectTypes";
import type { PersistedImageAssetInput } from "../../src/shared/desktopBridgeTypes";

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
  it("writes a journal before publishing asset records", async () => {
    const projectPath = await createProjectFixture();
    const transaction = await beginProjectImageWriteback({
      projectPath,
      files: [createAssetInput("file-new")],
    });

    const journalPath = getProjectImageWritebackJournalPath(
      projectPath,
      transaction.transactionId,
    );
    const journalSource = await fs.readFile(journalPath, "utf8");
    const imageRecords = await readJson<ImageRecordMap>(
      path.join(projectPath, PROJECT_FILENAMES.imageRecords),
    );

    expect(JSON.parse(journalSource)).toEqual(
      expect.objectContaining({
        schemaVersion: 1,
        transactionId: transaction.transactionId,
        previousRecords: { "file-new": null },
        nextRecords: { "file-new": imageRecords["file-new"] },
      }),
    );
    expect(journalSource).not.toContain(
      createAssetInput("file-new").dataBase64,
    );
    await expect(
      fs.readFile(
        path.join(projectPath, imageRecords["file-new"].assetPath),
        "utf8",
      ),
    ).resolves.toBe("asset:file-new");
  });

  it("isolates a malformed journal while recovering other transactions", async () => {
    const projectPath = await createProjectFixture();
    const transaction = await beginProjectImageWriteback({
      projectPath,
      files: [createAssetInput("file-valid-pending")],
    });
    const malformedJournalPath = getProjectImageWritebackJournalPath(
      projectPath,
      "malformed-journal",
    );
    await writeJson(malformedJournalPath, {
      schemaVersion: 1,
      transactionId: "different-id",
      nextRecords: {},
    });

    await expect(recoverProjectImageWritebacks(projectPath)).resolves.toEqual({
      committed: [],
      rolledBack: [transaction.transactionId],
      invalidJournals: [
        expect.objectContaining({
          transactionId: "malformed-journal",
          code: "WRITEBACK_JOURNAL_INVALID",
        }),
      ],
    });
    await expect(fs.readFile(malformedJournalPath, "utf8")).resolves.toContain(
      '"different-id"',
    );
  });

  it("preserves an invalid journal while allowing a new writeback", async () => {
    const projectPath = await createProjectFixture();
    const malformedJournalPath = getProjectImageWritebackJournalPath(
      projectPath,
      "malformed-journal",
    );
    await fs.mkdir(path.dirname(malformedJournalPath), { recursive: true });
    await fs.writeFile(malformedJournalPath, "{broken", "utf8");

    const transaction = await beginProjectImageWriteback({
      projectPath,
      files: [createAssetInput("file-new")],
    });
    await commitProjectImageWriteback({
      projectPath,
      transactionId: transaction.transactionId,
    });

    expect(transaction.imageRecords["file-new"]).toBeDefined();
    await expect(fs.readFile(malformedJournalPath, "utf8")).resolves.toBe(
      "{broken",
    );
  });

  it("reports an unsafe journal filename without resolving paths from its contents", async () => {
    const projectPath = await createProjectFixture();
    const journalDirectory = path.join(
      projectPath,
      PROJECT_FILENAMES.cacheDir,
      "image-writebacks",
    );
    await fs.mkdir(journalDirectory, { recursive: true });
    const unsafeJournalPath = path.join(journalDirectory, "bad.name.json");
    await fs.writeFile(unsafeJournalPath, "{}", "utf8");

    await expect(recoverProjectImageWritebacks(projectPath)).resolves.toEqual({
      committed: [],
      rolledBack: [],
      invalidJournals: [
        expect.objectContaining({
          transactionId: "bad.name",
          code: "WRITEBACK_JOURNAL_INVALID",
        }),
      ],
    });
    await expect(fs.readFile(unsafeJournalPath, "utf8")).resolves.toBe("{}");
  });

  it("does not start a writeback from invalid image-records data", async () => {
    const projectPath = await createProjectFixture();
    const imageRecordsPath = path.join(
      projectPath,
      PROJECT_FILENAMES.imageRecords,
    );
    await fs.writeFile(imageRecordsPath, "null", "utf8");

    await expect(
      beginProjectImageWriteback({
        projectPath,
        files: [createAssetInput("file-new")],
      }),
    ).rejects.toMatchObject({ code: "IMAGE_RECORDS_INVALID" });
    await expect(fs.readFile(imageRecordsPath, "utf8")).resolves.toBe("null");
  });

  it("preserves an unrelated quarantined record while writing a new image", async () => {
    const quarantinedRecord = {
      ...createRecord("file-quarantined", {
        sourceType: "generated",
      }),
      generationOrigin: "manual",
      prompt: "保留这条无法识别来源的原始记录",
    };
    const projectPath = await createProjectFixture({
      "file-quarantined": quarantinedRecord,
    } as unknown as ImageRecordMap);

    const transaction = await beginProjectImageWriteback({
      projectPath,
      files: [createAssetInput("file-new")],
    });
    await commitProjectImageWriteback({
      projectPath,
      transactionId: transaction.transactionId,
    });

    expect(transaction.imageRecords).not.toHaveProperty("file-quarantined");
    expect(transaction.imageRecords["file-new"]).toBeDefined();
    await expect(
      readJson<Record<string, unknown>>(
        path.join(projectPath, PROJECT_FILENAMES.imageRecords),
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        "file-quarantined": quarantinedRecord,
        "file-new": expect.objectContaining({ fileId: "file-new" }),
      }),
    );
  });

  it("preserves an unrelated quarantined record while rolling back a new image", async () => {
    const quarantinedRecord = {
      ...createRecord("file-quarantined", {
        sourceType: "generated",
      }),
      generationOrigin: "manual",
    };
    const projectPath = await createProjectFixture({
      "file-quarantined": quarantinedRecord,
    } as unknown as ImageRecordMap);

    const transaction = await beginProjectImageWriteback({
      projectPath,
      files: [createAssetInput("file-new")],
    });
    const restored = await rollbackProjectImageWriteback({
      projectPath,
      transactionId: transaction.transactionId,
    });

    expect(restored).not.toHaveProperty("file-quarantined");
    expect(restored).not.toHaveProperty("file-new");
    await expect(
      readJson<Record<string, unknown>>(
        path.join(projectPath, PROJECT_FILENAMES.imageRecords),
      ),
    ).resolves.toEqual({
      "file-quarantined": quarantinedRecord,
    });
  });

  it("does not overwrite a quarantined record with the same file id", async () => {
    const quarantinedRecord = {
      ...createRecord("file-conflict", {
        sourceType: "generated",
      }),
      generationOrigin: "manual",
    };
    const projectPath = await createProjectFixture({
      "file-conflict": quarantinedRecord,
    } as unknown as ImageRecordMap);

    await expect(
      beginProjectImageWriteback({
        projectPath,
        files: [createAssetInput("file-conflict")],
      }),
    ).rejects.toMatchObject({
      code: "IMAGE_RECORDS_INVALID",
      details: { fileIds: ["file-conflict"] },
    });
    await expect(
      readJson<Record<string, unknown>>(
        path.join(projectPath, PROJECT_FILENAMES.imageRecords),
      ),
    ).resolves.toEqual({
      "file-conflict": quarantinedRecord,
    });
  });

  it("normalizes repairable legacy records while starting a new writeback", async () => {
    const legacyGeneratedRecord = createRecord("file-legacy", {
      sourceType: "generated",
      prompt: "legacy prompt",
    });
    const projectPath = await createProjectFixture({
      "file-legacy": legacyGeneratedRecord,
    });

    const transaction = await beginProjectImageWriteback({
      projectPath,
      files: [createAssetInput("file-new")],
    });

    expect(transaction.imageRecords["file-legacy"]).toEqual(
      expect.objectContaining({ generationOrigin: "corestudio" }),
    );
  });

  it("preserves a journal when the project manifest becomes invalid before commit", async () => {
    const projectPath = await createProjectFixture();
    const transaction = await beginProjectImageWriteback({
      projectPath,
      files: [createAssetInput("file-new")],
    });
    const manifestPath = path.join(projectPath, PROJECT_FILENAMES.project);
    await fs.writeFile(manifestPath, "null", "utf8");

    await expect(
      commitProjectImageWriteback({
        projectPath,
        transactionId: transaction.transactionId,
      }),
    ).rejects.toMatchObject({ code: "PROJECT_MANIFEST_INVALID" });
    await expect(fs.readFile(manifestPath, "utf8")).resolves.toBe("null");
    await expect(
      fs.access(
        getProjectImageWritebackJournalPath(
          projectPath,
          transaction.transactionId,
        ),
      ),
    ).resolves.toBeUndefined();
  });

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

  it("commits a recovered transaction when the scene references every file id", async () => {
    const projectPath = await createProjectFixture();
    const transaction = await beginProjectImageWriteback({
      projectPath,
      files: [createAssetInput("file-a"), createAssetInput("file-b")],
    });
    await writeJson(path.join(projectPath, PROJECT_FILENAMES.scene), {
      type: "excalidraw",
      elements: [
        { id: "a", type: "image", fileId: "file-a", isDeleted: false },
        { id: "b", type: "image", fileId: "file-b", isDeleted: false },
      ],
      appState: {},
      files: {},
    });

    await expect(recoverProjectImageWritebacks(projectPath)).resolves.toEqual({
      committed: [transaction.transactionId],
      rolledBack: [],
    });
    await expect(
      fs.stat(
        getProjectImageWritebackJournalPath(
          projectPath,
          transaction.transactionId,
        ),
      ),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rolls back a recovered transaction when the scene references none of its file ids", async () => {
    const projectPath = await createProjectFixture();
    const transaction = await beginProjectImageWriteback({
      projectPath,
      files: [createAssetInput("file-orphan")],
    });
    const assetPath = transaction.imageRecords["file-orphan"].assetPath;

    await expect(recoverProjectImageWritebacks(projectPath)).resolves.toEqual({
      committed: [],
      rolledBack: [transaction.transactionId],
    });
    await expect(
      readJson<ImageRecordMap>(
        path.join(projectPath, PROJECT_FILENAMES.imageRecords),
      ),
    ).resolves.toEqual({});
    await expect(
      fs.stat(path.join(projectPath, assetPath)),
    ).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("keeps a mixed transaction pending instead of guessing", async () => {
    const projectPath = await createProjectFixture();
    const transaction = await beginProjectImageWriteback({
      projectPath,
      files: [
        createAssetInput("file-present"),
        createAssetInput("file-missing"),
      ],
    });
    await writeJson(path.join(projectPath, PROJECT_FILENAMES.scene), {
      type: "excalidraw",
      elements: [
        {
          id: "present",
          type: "image",
          fileId: "file-present",
          isDeleted: false,
        },
      ],
      appState: {},
      files: {},
    });

    await expect(
      recoverProjectImageWritebacks(projectPath),
    ).rejects.toMatchObject({
      code: "WRITEBACK_CONFLICT",
    });
    await expect(
      fs.stat(
        getProjectImageWritebackJournalPath(
          projectPath,
          transaction.transactionId,
        ),
      ),
    ).resolves.toBeDefined();
    await expect(
      readJson<ImageRecordMap>(
        path.join(projectPath, PROJECT_FILENAMES.imageRecords),
      ),
    ).resolves.toEqual(transaction.imageRecords);
  });
});
