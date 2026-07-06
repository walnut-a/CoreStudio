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
    const persistGeneratedAssets = vi.fn(
      async ({ files }: { files: PersistedImageAssetInput[] }) => {
        expect(files).toHaveLength(1);
        expect(files[0]).toMatchObject({
          sourceType: "generated",
          generationOrigin: "corestudio",
          provider: "zenmux",
          model: "google/gemini-3-pro-image-preview",
          prompt: request.prompt,
        });
        return imageRecords;
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
      persistGeneratedAssets,
      replaceSlot,
      markSlotFailed,
      getCanvasSnapshot: () => ({ elements, appState, files }),
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
    expect(persistGeneratedAssets).toHaveBeenCalledWith({
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
  });

  it("skips completion when the active project no longer matches the job", async () => {
    const project = createProject();
    const result = await runBuiltinGenerationJobCompletionAction({
      job: createJob("/tmp/other-project"),
      request: createRequest(),
      response: createResponse(),
      getActiveProject: () => project,
      persistGeneratedAssets: vi.fn(),
      replaceSlot: vi.fn(),
      markSlotFailed: vi.fn(),
      getCanvasSnapshot: vi.fn(),
      applySceneAutosave: vi.fn(),
      afterSceneCommit: vi.fn(),
      flushPendingAutosave: vi.fn(),
    });

    expect(result).toEqual({ kind: "skipped" });
  });

  it("still persists and flushes when no canvas snapshot is available", async () => {
    const project = createProject();
    const replaceSlot = vi.fn();
    const applySceneAutosave = vi.fn();
    const afterSceneCommit = vi.fn();
    const flushPendingAutosave = vi.fn(async () => undefined);

    const result = await runBuiltinGenerationJobCompletionAction({
      job: createJob(project.projectPath),
      request: createRequest(),
      response: createResponse(),
      getActiveProject: () => project,
      persistGeneratedAssets: vi.fn(async () => ({})),
      replaceSlot,
      markSlotFailed: vi.fn(),
      getCanvasSnapshot: () => null,
      applySceneAutosave,
      afterSceneCommit,
      flushPendingAutosave,
    });

    expect(result.kind).toBe("completed");
    expect(replaceSlot).toHaveBeenCalledTimes(1);
    expect(applySceneAutosave).not.toHaveBeenCalled();
    expect(afterSceneCommit).not.toHaveBeenCalled();
    expect(flushPendingAutosave).toHaveBeenCalledWith({ strict: true });
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
    const persistProjectImageAssets = vi.fn(async () => ({ imageRecords }));
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
      persistProjectImageAssets,
      replaceSlot,
      markSlotFailed,
      getCanvasSnapshot: () => ({ elements, appState, files }),
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
    expect(persistProjectImageAssets).toHaveBeenCalledWith({
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
  });
});
