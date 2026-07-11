import { describe, expect, it, vi } from "vitest";

import {
  beginProjectImageWritebackAction,
  rollbackProjectImageWritebackAfterFailure,
} from "./projectImageWritebackController";

import type {
  DesktopBridgeApi,
  DesktopProjectBundle,
} from "../shared/desktopBridgeTypes";
import type {
  ImageRecord,
  ImageRecordMap,
  ProjectImageWritebackTransaction,
} from "../shared/projectTypes";

const createRecord = (fileId: string): ImageRecord => ({
  fileId,
  assetPath: `assets/${fileId}.png`,
  sourceType: "imported",
  width: 512,
  height: 512,
  createdAt: "2026-07-11T04:00:00.000Z",
  mimeType: "image/png",
});

const createProject = (
  imageRecords: ImageRecordMap = {},
): DesktopProjectBundle => ({
  projectPath: "/projects/current",
  project: {
    formatVersion: 1,
    appVersion: "test",
    name: "Writeback",
    createdAt: "2026-07-11T04:00:00.000Z",
    updatedAt: "2026-07-11T04:00:00.000Z",
    sceneFile: "scene.excalidraw.json",
    imageRecordsFile: "image-records.json",
    assetsDir: "assets",
    exportsDir: "exports",
    agentAccess: { token: "project-token", enabled: true },
  },
  sceneJson: "{}",
  imageRecords,
});

const createTransaction = (
  imageRecords: ImageRecordMap,
): ProjectImageWritebackTransaction => ({
  transactionId: "transaction-1",
  projectPath: "/projects/current",
  fileIds: ["file-new"],
  imageRecords,
});

const createBridge = ({
  transaction,
  restoredRecords = {},
}: {
  transaction: ProjectImageWritebackTransaction;
  restoredRecords?: ImageRecordMap;
}) => ({
  beginImageWriteback: vi.fn().mockResolvedValue(transaction),
  commitImageWriteback: vi.fn().mockResolvedValue(undefined),
  rollbackImageWriteback: vi.fn().mockResolvedValue(restoredRecords),
});

const begin = async ({
  bridge,
  activeProject = createProject({ "file-old": createRecord("file-old") }),
  setActiveProject = vi.fn(),
}: {
  bridge: Pick<
    DesktopBridgeApi,
    "beginImageWriteback" | "commitImageWriteback" | "rollbackImageWriteback"
  >;
  activeProject?: DesktopProjectBundle;
  setActiveProject?: (project: DesktopProjectBundle) => void;
}) => ({
  handle: await beginProjectImageWritebackAction({
    projectPath: activeProject.projectPath,
    projectImageRecords: activeProject.imageRecords,
    activeProject,
    files: [
      {
        fileId: "file-new",
        dataBase64: "payload",
        mimeType: "image/png",
        width: 512,
        height: 512,
        sourceType: "imported",
        createdAt: "2026-07-11T04:30:00.000Z",
      },
    ],
    bridge,
    setActiveProject,
  }),
  setActiveProject,
});

describe("projectImageWritebackController", () => {
  it("merges transaction records into the active project after begin", async () => {
    const imageRecords = {
      "file-old": createRecord("file-old"),
      "file-new": createRecord("file-new"),
    };
    const bridge = createBridge({
      transaction: createTransaction(imageRecords),
    });
    const { handle, setActiveProject } = await begin({ bridge });

    expect(handle.imageRecords).toEqual(imageRecords);
    expect(setActiveProject).toHaveBeenCalledWith(
      expect.objectContaining({ imageRecords }),
    );
  });

  it("commits a pending transaction only once", async () => {
    const transaction = createTransaction({
      "file-new": createRecord("file-new"),
    });
    const bridge = createBridge({ transaction });
    const { handle } = await begin({ bridge });

    await handle.commit();
    await handle.commit();

    expect(bridge.commitImageWriteback).toHaveBeenCalledTimes(1);
    expect(bridge.commitImageWriteback).toHaveBeenCalledWith({
      projectPath: transaction.projectPath,
      transactionId: transaction.transactionId,
    });
  });

  it("rolls back once and restores active project records", async () => {
    const restoredRecords = { "file-old": createRecord("file-old") };
    const bridge = createBridge({
      transaction: createTransaction({
        ...restoredRecords,
        "file-new": createRecord("file-new"),
      }),
      restoredRecords,
    });
    const setActiveProject = vi.fn();
    const { handle } = await begin({ bridge, setActiveProject });
    setActiveProject.mockClear();

    await expect(handle.rollback()).resolves.toEqual(restoredRecords);
    await expect(handle.rollback()).resolves.toEqual(restoredRecords);

    expect(bridge.rollbackImageWriteback).toHaveBeenCalledTimes(1);
    expect(setActiveProject).toHaveBeenCalledTimes(1);
    expect(setActiveProject).toHaveBeenCalledWith(
      expect.objectContaining({ imageRecords: restoredRecords }),
    );
  });

  it("forbids rollback after commit", async () => {
    const bridge = createBridge({
      transaction: createTransaction({ "file-new": createRecord("file-new") }),
    });
    const { handle } = await begin({ bridge });

    await handle.commit();

    await expect(handle.rollback()).rejects.toThrow(
      "已经提交的图片写回事务不能回滚",
    );
    expect(bridge.rollbackImageWriteback).not.toHaveBeenCalled();
  });

  it("preserves both the original failure and rollback failure", async () => {
    const originalError = new Error("scene insertion failed");
    const rollbackError = new Error("disk rollback failed");
    const writeback = {
      transaction: createTransaction({}),
      imageRecords: {},
      commit: vi.fn(),
      rollback: vi.fn().mockRejectedValue(rollbackError),
    };

    await expect(
      rollbackProjectImageWritebackAfterFailure(writeback, originalError),
    ).rejects.toMatchObject({
      cause: originalError,
      rollbackError,
    });
  });
});
