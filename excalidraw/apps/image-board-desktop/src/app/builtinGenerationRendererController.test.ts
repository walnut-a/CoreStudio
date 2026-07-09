import { describe, expect, it, vi } from "vitest";

import {
  runBuiltinGenerationCancelRendererAction,
  runBuiltinGenerationRendererAction,
} from "./builtinGenerationRendererController";

import type {
  PendingGenerationJob,
  PendingGenerationJobRegistryState,
} from "./generationJobState";
import type { GenerationErrorDetails } from "./generationErrorViewModel";
import type {
  GenerationRequest,
  GenerationResponse,
} from "../shared/providerTypes";
import type { DesktopProjectBundle } from "../shared/desktopBridgeTypes";

const createRequest = (): GenerationRequest => ({
  provider: "zenmux",
  model: "google/gemini-3-pro-image-preview",
  prompt: "做一台更简洁的桌面 CNC",
  width: 1024,
  height: 1024,
  imageCount: 1,
  seed: null,
  reference: null,
});

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

const createResponse = (): GenerationResponse => ({
  provider: "zenmux",
  model: "google/gemini-3-pro-image-preview",
  seed: null,
  createdAt: "2026-07-05T00:00:01.000Z",
  images: [
    {
      fileName: "image.png",
      mimeType: "image/png",
      dataBase64: "abc",
      width: 1024,
      height: 1024,
    },
  ],
});

const createErrorDetails = (): GenerationErrorDetails => ({
  normalizedMessage: "生成失败",
  rawMessage: "生成失败",
  stack: null,
  provider: "zenmux",
  model: "google/gemini-3-pro-image-preview",
  occurredAt: "2026-07-05T00:00:02.000Z",
  requestPayload: null,
});

describe("runBuiltinGenerationRendererAction", () => {
  it("starts a builtin generation job and removes it after success", async () => {
    const request = createRequest();
    const project = createProject();
    const job = {
      jobId: "job-1",
      projectPath: project.projectPath,
      slots: [],
    };
    let pendingJobs = new Map();
    const appliedRegistryStates: PendingGenerationJobRegistryState[] = [];
    const setGenerationSource = vi.fn();
    const showDirectGenerationRecords = vi.fn();
    const setGenerateRequest = vi.fn();
    const insertPlaceholders = vi.fn(() => job);
    const generateImages = vi.fn(async () => createResponse());
    const finishPendingJob = vi.fn(async () => undefined);
    const markPendingGenerationFailed = vi.fn();
    const showGenerationError = vi.fn();
    const loadProviderState = vi.fn(async () => undefined);

    const result = await runBuiltinGenerationRendererAction({
      request,
      project,
      providerSettings: null,
      sourceScene: null,
      referenceScene: null,
      expectedProjectPath: project.projectPath,
      placementViewport: null,
      startupGenerateFailedMessage: "生成失败",
      loadOriginalScene: async (scene) => scene,
      assertProjectActive: vi.fn(),
      setGenerationSource,
      showDirectGenerationRecords,
      setGenerateRequest,
      insertPlaceholders,
      getGenerationJobs: () => pendingJobs,
      applyRegistryState: (state) => {
        pendingJobs = state.pendingJobs;
        appliedRegistryStates.push(state);
        return state;
      },
      generateImages,
      finishPendingJob,
      markPendingGenerationFailed,
      showGenerationError,
      loadProviderState,
    });

    expect(result.kind).toBe("started");
    expect(setGenerationSource).toHaveBeenCalledWith("builtin");
    expect(showDirectGenerationRecords).toHaveBeenCalledTimes(1);
    expect(insertPlaceholders).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: request.prompt }),
      expect.any(String),
      {
        expectedProjectPath: project.projectPath,
        placementViewport: null,
        referenceScene: null,
        requireReady: true,
      },
    );
    expect(setGenerateRequest).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: "" }),
    );
    expect(generateImages).toHaveBeenCalledWith({
      projectPath: project.projectPath,
      generationJobId: job.jobId,
      request: expect.objectContaining({ prompt: request.prompt }),
    });

    await result.completion;

    expect(finishPendingJob).toHaveBeenCalledWith(
      job,
      expect.objectContaining({ prompt: request.prompt }),
      createResponse(),
    );
    expect(markPendingGenerationFailed).not.toHaveBeenCalled();
    expect(showGenerationError).not.toHaveBeenCalled();
    expect(loadProviderState).toHaveBeenCalledTimes(1);
    expect(appliedRegistryStates.map((state) => state.pendingCount)).toEqual([
      1, 0,
    ]);
  });

  it("marks the pending job failed when generation throws", async () => {
    const request = createRequest();
    const project = createProject();
    const job = {
      jobId: "job-1",
      projectPath: project.projectPath,
      slots: [],
    };
    const generationError = new Error("provider failed");
    const errorDetails = createErrorDetails();
    let pendingJobs = new Map();
    const insertPlaceholders = vi.fn(() => job);
    const showGenerationError = vi.fn(() => errorDetails);
    const markPendingGenerationFailed = vi.fn();
    const loadProviderState = vi.fn(async () => undefined);

    const result = await runBuiltinGenerationRendererAction({
      request,
      project,
      providerSettings: null,
      sourceScene: null,
      referenceScene: null,
      expectedProjectPath: project.projectPath,
      placementViewport: null,
      startupGenerateFailedMessage: "生成失败",
      loadOriginalScene: async (scene) => scene,
      assertProjectActive: vi.fn(),
      setGenerationSource: vi.fn(),
      showDirectGenerationRecords: vi.fn(),
      setGenerateRequest: vi.fn(),
      insertPlaceholders,
      getGenerationJobs: () => pendingJobs,
      applyRegistryState: (state) => {
        pendingJobs = state.pendingJobs;
        return state;
      },
      generateImages: vi.fn(async () => {
        throw generationError;
      }),
      finishPendingJob: vi.fn(),
      markPendingGenerationFailed,
      showGenerationError,
      loadProviderState,
    });

    await result.completion;

    expect(showGenerationError).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: request.prompt }),
      generationError,
    );
    expect(markPendingGenerationFailed).toHaveBeenCalledWith(
      job,
      errorDetails,
    );
    expect(loadProviderState).toHaveBeenCalledTimes(1);
    expect(pendingJobs.size).toBe(0);
  });

  it("ignores async generation errors after the pending job was cancelled", async () => {
    const request = createRequest();
    const project = createProject();
    const job = {
      jobId: "job-1",
      projectPath: project.projectPath,
      slots: [],
    };
    let pendingJobs = new Map();
    let rejectGeneration: (error: unknown) => void = () => undefined;
    const showGenerationError = vi.fn(() => createErrorDetails());
    const markPendingGenerationFailed = vi.fn();

    const result = await runBuiltinGenerationRendererAction({
      request,
      project,
      providerSettings: null,
      sourceScene: null,
      referenceScene: null,
      expectedProjectPath: project.projectPath,
      placementViewport: null,
      startupGenerateFailedMessage: "生成失败",
      loadOriginalScene: async (scene) => scene,
      assertProjectActive: vi.fn(),
      setGenerationSource: vi.fn(),
      showDirectGenerationRecords: vi.fn(),
      setGenerateRequest: vi.fn(),
      insertPlaceholders: vi.fn(() => job),
      getGenerationJobs: () => pendingJobs,
      applyRegistryState: (state) => {
        pendingJobs = state.pendingJobs;
        return state;
      },
      generateImages: vi.fn(
        () =>
          new Promise<GenerationResponse>((_resolve, reject) => {
            rejectGeneration = reject;
          }),
      ),
      finishPendingJob: vi.fn(),
      markPendingGenerationFailed,
      showGenerationError,
      loadProviderState: vi.fn(),
    });

    pendingJobs = new Map();
    rejectGeneration(new Error("用户已取消生成任务。"));
    await result.completion;

    expect(showGenerationError).not.toHaveBeenCalled();
    expect(markPendingGenerationFailed).not.toHaveBeenCalled();
  });

  it("cancels active builtin jobs, marks their slots cancelled, and clears the registry", async () => {
    const job: PendingGenerationJob = {
      jobId: "job-1",
      projectPath: "/tmp/corestudio-project",
      slots: [],
    };
    let pendingJobs = new Map<string, PendingGenerationJob>([
      [job.jobId, job],
    ]);
    const markPendingGenerationFailed = vi.fn();
    const cancelGenerateImages = vi.fn(async () => undefined);

    await expect(
      runBuiltinGenerationCancelRendererAction({
        getGenerationJobs: () => pendingJobs,
        applyRegistryState: (state) => {
          pendingJobs = state.pendingJobs;
          return state;
        },
        cancelGenerateImages,
        markPendingGenerationFailed,
      }),
    ).resolves.toEqual({ cancelledCount: 1 });

    expect(cancelGenerateImages).toHaveBeenCalledWith(job.jobId);
    expect(markPendingGenerationFailed).toHaveBeenCalledWith(job, {
      normalizedMessage: "已取消",
      rawMessage: "用户已取消生成任务。",
      stack: null,
    });
    expect(pendingJobs.size).toBe(0);
  });

  it("throws before registry changes when placeholders cannot be inserted", async () => {
    const request = createRequest();
    const project = createProject();
    const applyRegistryState = vi.fn(
      (state: PendingGenerationJobRegistryState) => state,
    );

    await expect(
      runBuiltinGenerationRendererAction({
        request,
        project,
        providerSettings: null,
        sourceScene: null,
        referenceScene: null,
        expectedProjectPath: project.projectPath,
        placementViewport: null,
        startupGenerateFailedMessage: "生成失败",
        loadOriginalScene: async (scene) => scene,
        assertProjectActive: vi.fn(),
        setGenerationSource: vi.fn(),
        showDirectGenerationRecords: vi.fn(),
        setGenerateRequest: vi.fn(),
        insertPlaceholders: vi.fn(() => null),
        getGenerationJobs: () => new Map(),
        applyRegistryState,
        generateImages: vi.fn(),
        finishPendingJob: vi.fn(),
        markPendingGenerationFailed: vi.fn(),
        showGenerationError: vi.fn(),
        loadProviderState: vi.fn(),
      }),
    ).rejects.toThrow("生成失败");

    expect(applyRegistryState).not.toHaveBeenCalled();
  });
});
