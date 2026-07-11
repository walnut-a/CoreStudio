import { describe, expect, it, vi } from "vitest";

import {
  createBuiltinGenerationJobCompletionRendererActions,
  runBuiltinGenerationJobCompletionAction,
} from "./builtinGenerationCompletionController";

import type { PendingGenerationJob } from "./generationJobState";
import type { PendingGenerationSlot } from "./generationPlaceholderState";
import type { GenerationRequest, GenerationResponse } from "../shared/providerTypes";
import type {
  DesktopProjectBundle,
  PersistedImageAssetInput,
} from "../shared/desktopBridgeTypes";
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

const createJob = (projectPath = "/tmp/corestudio-project"): PendingGenerationJob => ({
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
    const imageRecords = {
      "file-1": {
        fileId: "file-1",
        assetPath: "assets/file-1.png",
        sourceType: "generated",
        width: 1024,
        height: 1024,
        createdAt: response.createdAt,
        mimeType: "image/png",
      },
    } satisfies DesktopProjectBundle["imageRecords"];
    const commit = vi.fn(async () => undefined);
    const rollback = vi.fn(async () => project.imageRecords);
    const beginGeneratedAssets = vi.fn(
      async ({ files }: { files: PersistedImageAssetInput[] }) => {
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
        } satisfies ProjectImageWritebackHandle;
      },
    );
    const replaceSlot = vi.fn();
    const markSlotFailed = vi.fn();
    const applySceneAutosave = vi.fn();
    const afterSceneCommit = vi.fn();
    const flushPendingAutosave = vi.fn(async () => undefined);
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
      applySceneAutosave,
      afterSceneCommit,
      flushPendingAutosave,
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
    expect(applySceneAutosave).toHaveBeenCalledWith({
      project,
      imageRecords,
      elements,
      appState,
      files,
    });
    expect(afterSceneCommit).toHaveBeenCalledWith({ elements, appState, files });
    expect(flushPendingAutosave).toHaveBeenCalledWith({ strict: true });
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
      applySceneAutosave: vi.fn(),
      afterSceneCommit: vi.fn(),
      flushPendingAutosave: vi.fn(),
    });

    expect(result).toEqual({ kind: "skipped" });
  });

  it("fails before persisting when no restorable canvas snapshot is available", async () => {
    const project = createProject();
    const replaceSlot = vi.fn();
    const applySceneAutosave = vi.fn();
    const afterSceneCommit = vi.fn();
    const flushPendingAutosave = vi.fn(async () => undefined);

    const beginGeneratedAssets = vi.fn();
    await expect(
      runBuiltinGenerationJobCompletionAction({
        job: createJob(project.projectPath),
        request: createRequest(),
        response: createResponse(),
        getActiveProject: () => project,
        beginGeneratedAssets,
        replaceSlot,
        markSlotFailed: vi.fn(),
        getCanvasSnapshot: () => null,
        restoreCanvasSnapshot: vi.fn(),
        applySceneAutosave,
        afterSceneCommit,
        flushPendingAutosave,
      }),
    ).rejects.toThrow("缺少可恢复的画板快照");

    expect(beginGeneratedAssets).not.toHaveBeenCalled();
    expect(replaceSlot).not.toHaveBeenCalled();
    expect(applySceneAutosave).not.toHaveBeenCalled();
    expect(afterSceneCommit).not.toHaveBeenCalled();
    expect(flushPendingAutosave).not.toHaveBeenCalled();
  });

  it("marks every slot failed without opening an empty asset transaction", async () => {
    const project = createProject();
    const before = {
      elements: [{ id: "placeholder" }] as any,
      appState: { zoom: { value: 1 } } as any,
      files: {} as any,
    };
    const beginGeneratedAssets = vi.fn();
    const markSlotFailed = vi.fn();
    const applySceneAutosave = vi.fn();
    const flushPendingAutosave = vi.fn();

    await expect(
      runBuiltinGenerationJobCompletionAction({
        job: createJob(project.projectPath),
        request: createRequest(),
        response: { ...createResponse(), images: [] },
        getActiveProject: () => project,
        beginGeneratedAssets,
        replaceSlot: vi.fn(),
        markSlotFailed,
        getCanvasSnapshot: () => before,
        restoreCanvasSnapshot: vi.fn(),
        applySceneAutosave,
        afterSceneCommit: vi.fn(),
        flushPendingAutosave,
      }),
    ).resolves.toMatchObject({
      kind: "completed",
      replacedCount: 0,
      failedCount: 2,
      sceneCommitted: true,
    });

    expect(beginGeneratedAssets).not.toHaveBeenCalled();
    expect(markSlotFailed).toHaveBeenCalledTimes(2);
    expect(applySceneAutosave).toHaveBeenCalledWith(
      expect.objectContaining({ imageRecords: project.imageRecords }),
    );
    expect(flushPendingAutosave).toHaveBeenCalledWith({ strict: true });
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
        applySceneAutosave: vi.fn(),
        afterSceneCommit: vi.fn(),
        flushPendingAutosave: vi.fn(),
      }),
    ).rejects.toBe(failure);

    expect(restoreCanvasSnapshot).toHaveBeenCalledWith(before);
    expect(rollback).toHaveBeenCalledTimes(1);
    expect(commit).not.toHaveBeenCalled();
  });

  it("restores placeholders and rolls back when strict autosave fails", async () => {
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
          commit: vi.fn(),
          rollback,
        })),
        replaceSlot: vi.fn(() => {
          snapshot = after;
        }),
        markSlotFailed: vi.fn(),
        getCanvasSnapshot: () => snapshot,
        restoreCanvasSnapshot,
        applySceneAutosave: vi.fn(),
        afterSceneCommit: vi.fn(),
        flushPendingAutosave: vi.fn().mockRejectedValue(failure),
      }),
    ).rejects.toBe(failure);

    expect(restoreCanvasSnapshot).toHaveBeenCalledWith(before);
    expect(rollback).toHaveBeenCalledTimes(1);
  });
});

describe("createBuiltinGenerationJobCompletionRendererActions", () => {
  it("creates renderer action for pending generation job completion", async () => {
    const project = createProject();
    const job = createJob(project.projectPath);
    const request = createRequest();
    const response = createResponse();
    const imageRecords = {
      "file-1": {
        fileId: "file-1",
        assetPath: "assets/file-1.png",
        sourceType: "generated",
        width: 1024,
        height: 1024,
        createdAt: response.createdAt,
        mimeType: "image/png",
      },
    } satisfies DesktopProjectBundle["imageRecords"];
    const elements = [{ id: "frame-1" }] as any;
    const appState = { zoom: { value: 1 } } as any;
    const files = { "file-1": { id: "file-1" } } as any;
    const commit = vi.fn(async () => undefined);
    const beginProjectImageWriteback = vi.fn(async () => ({
      transaction: {
        transactionId: "transaction-1",
        projectPath: project.projectPath,
        fileIds: Object.keys(imageRecords),
        imageRecords,
      },
      imageRecords,
      commit,
      rollback: vi.fn(),
    }));
    const replaceSlot = vi.fn();
    const markSlotFailed = vi.fn();
    const setScene = vi.fn();
    const setPendingSnapshot = vi.fn();
    const updateSceneImageFileIds = vi.fn();
    const scheduleVisibleImageRenditionLoad = vi.fn();
    const updateWorkspaceOverlay = vi.fn();
    const flushPendingAutosave = vi.fn(async () => undefined);

    const actions = createBuiltinGenerationJobCompletionRendererActions({
      getActiveProject: () => project,
      beginProjectImageWriteback,
      replaceSlot,
      markSlotFailed,
      getCanvasSnapshot: () => ({ elements, appState, files }),
      restoreCanvasSnapshot: vi.fn(),
      getSavedSceneHash: () => "scene-hash",
      setScene,
      setPendingSnapshot,
      updateSceneImageFileIds,
      scheduleVisibleImageRenditionLoad,
      updateWorkspaceOverlay,
      flushPendingAutosave,
    });

    const result = await actions.finishPendingJob(job, request, response);

    expect(result).toEqual({
      kind: "completed",
      replacedCount: 1,
      failedCount: 1,
      sceneCommitted: true,
    });
    expect(beginProjectImageWriteback).toHaveBeenCalledWith({
      projectPath: project.projectPath,
      projectImageRecords: project.imageRecords,
      activeProject: project,
      files: expect.any(Array),
    });
    expect(replaceSlot).toHaveBeenCalledWith(
      job.slots[0],
      expect.objectContaining({ sourceType: "generated" }),
    );
    expect(markSlotFailed).toHaveBeenCalledWith(
      expect.objectContaining({ slots: [job.slots[1]] }),
      expect.objectContaining({ normalizedMessage: "模型没有返回这张图。" }),
    );
    expect(setScene).toHaveBeenCalledWith({
      elements,
      appState,
      files,
    });
    expect(setPendingSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        project: expect.objectContaining({
          projectPath: project.projectPath,
          imageRecords,
        }),
        elements,
        appState,
        files,
        expectedSceneHash: "scene-hash",
      }),
    );
    expect(updateSceneImageFileIds).toHaveBeenCalledWith(elements);
    expect(scheduleVisibleImageRenditionLoad).toHaveBeenCalledWith({
      elements,
      appState,
      files,
    });
    expect(updateWorkspaceOverlay).toHaveBeenCalledWith(elements, appState);
    expect(flushPendingAutosave).toHaveBeenCalledWith({ strict: true });
    expect(commit).toHaveBeenCalledTimes(1);
  });
});
