import { describe, expect, it, vi } from "vitest";

import { runBuiltinGenerationJobCompletionAction } from "./builtinGenerationCompletionController";

import type {
  DesktopProjectBundle,
  PersistedImageAssetInput,
} from "../shared/desktopBridgeTypes";
import type {
  GenerationRequest,
  GenerationResponse,
} from "../shared/providerTypes";
import type { PendingGenerationJob } from "./generationJobState";
import type { PendingGenerationSlot } from "./generationPlaceholderState";
import type { ProjectImageWritebackHandle } from "./projectImageWritebackController";

const createProject = (): DesktopProjectBundle => ({
  projectPath: "/tmp/corestudio-project",
  project: {
    formatVersion: 1,
    appVersion: "1.1.0",
    name: "工业设计助手",
    createdAt: "2026-07-05T00:00:00.000Z",
    updatedAt: "2026-07-05T00:00:00.000Z",
    sceneFile: "scene.excalidraw.json",
    imageRecordsFile: "image-records.json",
    assetsDir: "assets",
    exportsDir: "exports",
    agentAccess: {
      token: "project-token",
      enabled: true,
    },
  },
  sceneJson: "{}",
  imageRecords: {},
});

const createRequest = (): GenerationRequest => ({
  provider: "zenmux",
  model: "google/gemini-3-pro-image-preview",
  prompt: "生成一台苹果风 CNC",
  width: 1024,
  height: 1024,
  imageCount: 2,
  seed: null,
  reference: null,
});

const createResponse = (): GenerationResponse => ({
  provider: "zenmux",
  model: "google/gemini-3-pro-image-preview",
  seed: 42,
  createdAt: "2026-07-05T00:00:01.000Z",
  images: [
    {
      fileName: "image-1.png",
      mimeType: "image/png",
      dataBase64: "abc",
      width: 1024,
      height: 1024,
    },
  ],
});

const createSlot = (index: number): PendingGenerationSlot => ({
  frameId: `frame-${index}`,
  labelId: `label-${index}`,
  fitReturnedImageSize: false,
});

const createJob = (
  projectPath = "/tmp/corestudio-project",
): PendingGenerationJob => ({
  jobId: "job-1",
  projectPath,
  slots: [createSlot(1), createSlot(2)],
});

describe("runBuiltinGenerationJobCompletionAction", () => {
  it("persists returned images, replaces completed slots, marks missing slots, commits scene, and flushes", async () => {
    const project = createProject();
    const job = createJob(project.projectPath);
    const request = createRequest();
    const response = createResponse();
    const imageRecords: DesktopProjectBundle["imageRecords"] = {
      "file-1": {
        fileId: "file-1",
        assetPath: "assets/file-1.png",
        sourceType: "generated",
        width: 1024,
        height: 1024,
        createdAt: response.createdAt,
        mimeType: "image/png",
      },
    };
    const commit = vi.fn(async () => undefined);
    const rollback = vi.fn(async () => project.imageRecords);
    const beginGeneratedAssets = vi.fn(
      async ({
        files,
      }: {
        files: PersistedImageAssetInput[];
      }): Promise<ProjectImageWritebackHandle> => {
        expect(files).toHaveLength(1);
        expect(files[0]).toMatchObject({
          sourceType: "generated",
          generationOrigin: "corestudio",
          provider: "zenmux",
          model: "google/gemini-3-pro-image-preview",
          prompt: request.prompt,
        });
        return {
          transaction: {
            transactionId: "transaction-1",
            projectPath: project.projectPath,
            fileIds: Object.keys(imageRecords),
            imageRecords,
          },
          imageRecords,
          commit,
          rollback,
        };
      },
    );
    const replaceSlot = vi.fn();
    const markSlotFailed = vi.fn();
    const applySceneRoomUpdate = vi.fn();
    const afterSceneCommit = vi.fn();
    const flushProjectRoom = vi.fn(async () => undefined);
    const elements = [{ id: "frame-1" }] as any;
    const appState = { zoom: { value: 1 } } as any;
    const files = { "file-1": { id: "file-1" } } as any;

    const result = await runBuiltinGenerationJobCompletionAction({
      job,
      request,
      response,
      getActiveProject: () => project,
      beginGeneratedAssets,
      replaceSlot,
      markSlotFailed,
      getCanvasSnapshot: () => ({ elements, appState, files }),
      restoreCanvasSnapshot: vi.fn(),
      applySceneRoomUpdate,
      afterSceneCommit,
      flushProjectRoom,
    });

    expect(result).toEqual({
      kind: "completed",
      replacedCount: 1,
      failedCount: 1,
      sceneCommitted: true,
    });
    expect(beginGeneratedAssets).toHaveBeenCalledWith({
      projectPath: project.projectPath,
      projectImageRecords: project.imageRecords,
      activeProject: project,
      files: expect.any(Array),
    });
    expect(replaceSlot).toHaveBeenCalledWith(
      job.slots[0],
      expect.objectContaining({ fileId: expect.any(String) }),
    );
    expect(markSlotFailed).toHaveBeenCalledWith(
      expect.objectContaining({ slots: [job.slots[1]] }),
      expect.objectContaining({ normalizedMessage: "模型没有返回这张图。" }),
    );
    expect(applySceneRoomUpdate).toHaveBeenCalledWith({
      project,
      imageRecords,
      elements,
      appState,
      files,
    });
    expect(afterSceneCommit).toHaveBeenCalledWith({
      elements,
      appState,
      files,
    });
    expect(flushProjectRoom).toHaveBeenCalledWith({ strict: true });
    expect(commit).toHaveBeenCalledTimes(1);
    expect(rollback).not.toHaveBeenCalled();
  });

  it("skips completion when the active project no longer matches the job", async () => {
    const project = createProject();
    const result = await runBuiltinGenerationJobCompletionAction({
      job: createJob("/tmp/other-project"),
      request: createRequest(),
      response: createResponse(),
      getActiveProject: () => project,
      beginGeneratedAssets: vi.fn(),
      replaceSlot: vi.fn(),
      markSlotFailed: vi.fn(),
      getCanvasSnapshot: vi.fn(),
      restoreCanvasSnapshot: vi.fn(),
      applySceneRoomUpdate: vi.fn(),
      afterSceneCommit: vi.fn(),
      flushProjectRoom: vi.fn(),
    });

    expect(result).toEqual({ kind: "skipped" });
  });

  it("rolls back and retries only surviving slots when deletion races asset persistence", async () => {
    const project = createProject();
    const job = createJob(project.projectPath);
    const request = createRequest();
    const response: GenerationResponse = {
      ...createResponse(),
      images: [
        {
          fileName: "deleted-slot.png",
          mimeType: "image/png",
          dataBase64: "deleted-slot",
          width: 1024,
          height: 1024,
        },
        {
          fileName: "surviving-slot.png",
          mimeType: "image/png",
          dataBase64: "surviving-slot",
          width: 1024,
          height: 1024,
        },
      ],
    };
    const liveSlotIds = new Set(job.slots.map((slot) => slot.frameId));
    const firstRollback = vi.fn(async () => project.imageRecords);
    const secondCommit = vi.fn(async () => undefined);
    const beginGeneratedAssets = vi
      .fn()
      .mockImplementationOnce(
        async ({
          files,
        }: {
          files: PersistedImageAssetInput[];
        }): Promise<ProjectImageWritebackHandle> => {
          expect(files).toHaveLength(2);
          liveSlotIds.delete(job.slots[0].frameId);
          return {
            transaction: {
              transactionId: "transaction-1",
              projectPath: project.projectPath,
              fileIds: files.map((file) => file.fileId),
              imageRecords: {},
            },
            imageRecords: {},
            commit: vi.fn(),
            rollback: firstRollback,
          };
        },
      )
      .mockImplementationOnce(
        async ({
          files,
        }: {
          files: PersistedImageAssetInput[];
        }): Promise<ProjectImageWritebackHandle> => {
          expect(files).toHaveLength(1);
          expect(files[0]).toMatchObject({
            fileName: "surviving-slot.png",
            dataBase64: "surviving-slot",
          });
          return {
            transaction: {
              transactionId: "transaction-2",
              projectPath: project.projectPath,
              fileIds: files.map((file) => file.fileId),
              imageRecords: {},
            },
            imageRecords: {},
            commit: secondCommit,
            rollback: vi.fn(),
          };
        },
      );
    const replaceSlot = vi.fn();
    const snapshot = {
      elements: [{ id: "surviving-slot" }] as any,
      appState: { zoom: { value: 1 } } as any,
      files: {} as any,
    };

    await expect(
      runBuiltinGenerationJobCompletionAction({
        job,
        request,
        response,
        getActiveProject: () => project,
        beginGeneratedAssets,
        isSlotActive: (slot) => liveSlotIds.has(slot.frameId),
        replaceSlot,
        markSlotFailed: vi.fn(),
        getCanvasSnapshot: () => snapshot,
        restoreCanvasSnapshot: vi.fn(),
        applySceneRoomUpdate: vi.fn(),
        afterSceneCommit: vi.fn(),
        flushProjectRoom: vi.fn(),
      }),
    ).resolves.toMatchObject({
      kind: "completed",
      replacedCount: 1,
      failedCount: 0,
    });

    expect(firstRollback).toHaveBeenCalledTimes(1);
    expect(secondCommit).toHaveBeenCalledTimes(1);
    expect(replaceSlot).toHaveBeenCalledTimes(1);
    expect(replaceSlot).toHaveBeenCalledWith(
      job.slots[1],
      expect.objectContaining({ fileName: "surviving-slot.png" }),
    );
  });

  it("restores placeholders and rolls back when slot replacement fails", async () => {
    const project = createProject();
    const before = {
      elements: [{ id: "placeholder" }] as any,
      appState: { zoom: { value: 1 } } as any,
      files: {} as any,
    };
    const failure = new Error("slot replacement failed");
    const rollback = vi.fn(async () => project.imageRecords);
    const commit = vi.fn();
    const restoreCanvasSnapshot = vi.fn();

    await expect(
      runBuiltinGenerationJobCompletionAction({
        job: createJob(project.projectPath),
        request: createRequest(),
        response: createResponse(),
        getActiveProject: () => project,
        beginGeneratedAssets: vi.fn(async () => ({
          transaction: {
            transactionId: "transaction-1",
            projectPath: project.projectPath,
            fileIds: ["file-1"],
            imageRecords: {},
          },
          imageRecords: {},
          commit,
          rollback,
        })),
        replaceSlot: vi.fn(() => {
          throw failure;
        }),
        markSlotFailed: vi.fn(),
        getCanvasSnapshot: () => before,
        restoreCanvasSnapshot,
        applySceneRoomUpdate: vi.fn(),
        afterSceneCommit: vi.fn(),
        flushProjectRoom: vi.fn(),
      }),
    ).rejects.toBe(failure);

    expect(restoreCanvasSnapshot).toHaveBeenCalledWith(before);
    expect(rollback).toHaveBeenCalledTimes(1);
    expect(commit).not.toHaveBeenCalled();
  });

  it("preserves the submitted room state and assets when persistence fails", async () => {
    const project = createProject();
    const before = {
      elements: [{ id: "placeholder" }] as any,
      appState: { zoom: { value: 1 } } as any,
      files: {} as any,
    };
    const after = {
      elements: [{ id: "result" }] as any,
      appState: before.appState,
      files: { "file-1": { id: "file-1" } } as any,
    };
    let snapshot = before;
    const failure = new Error("strict autosave failed");
    const rollback = vi.fn(async () => project.imageRecords);
    const commit = vi.fn(async () => undefined);
    const restoreCanvasSnapshot = vi.fn();

    await expect(
      runBuiltinGenerationJobCompletionAction({
        job: createJob(project.projectPath),
        request: createRequest(),
        response: createResponse(),
        getActiveProject: () => project,
        beginGeneratedAssets: vi.fn(async () => ({
          transaction: {
            transactionId: "transaction-1",
            projectPath: project.projectPath,
            fileIds: ["file-1"],
            imageRecords: {},
          },
          imageRecords: {},
          commit,
          rollback,
        })),
        replaceSlot: vi.fn(() => {
          snapshot = after;
        }),
        markSlotFailed: vi.fn(),
        getCanvasSnapshot: () => snapshot,
        restoreCanvasSnapshot,
        applySceneRoomUpdate: vi.fn(),
        afterSceneCommit: vi.fn(),
        flushProjectRoom: vi.fn().mockRejectedValue(failure),
      }),
    ).rejects.toBe(failure);

    expect(commit).toHaveBeenCalledTimes(1);
    expect(restoreCanvasSnapshot).not.toHaveBeenCalled();
    expect(rollback).not.toHaveBeenCalled();
  });
});
