import { describe, expect, it, vi } from "vitest";

import { runBuiltinGenerationRendererAction } from "./builtinGenerationRendererController";

import type { DesktopProjectBundle } from "../shared/desktopBridgeTypes";
import type {
  GenerationRequest,
  GenerationResponse,
} from "../shared/providerTypes";
import type { GenerationErrorDetails } from "./generationErrorViewModel";
import type { PendingGenerationJob } from "./generationJobState";

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

  it("finishes a successful response with the latest partially dismissed job", async () => {
    const request = createRequest();
    const project = createProject();
    const job: PendingGenerationJob = {
      jobId: "job-1",
      projectPath: project.projectPath,
      slots: [
        {
          frameId: "placeholder-1",
          labelId: "label-1",
          fitReturnedImageSize: false,
        },
        {
          frameId: "placeholder-2",
          labelId: "label-2",
          fitReturnedImageSize: false,
        },
      ],
    };
    let resolveGeneration: (response: GenerationResponse) => void = () =>
      undefined;
    let pendingJobs = new Map<string, PendingGenerationJob>();
    const finishPendingJob = vi.fn();

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
      setGenerateRequest: vi.fn(),
      insertPlaceholders: vi.fn(() => job),
      getGenerationJobs: () => pendingJobs,
      applyRegistryState: (state) => {
        pendingJobs = state.pendingJobs;
        return state;
      },
      generateImages: vi.fn(
        () =>
          new Promise<GenerationResponse>((resolve) => {
            resolveGeneration = resolve;
          }),
      ),
      finishPendingJob,
      markPendingGenerationFailed: vi.fn(),
      showGenerationError: vi.fn(),
      loadProviderState: vi.fn(),
    });

    const latestJob: PendingGenerationJob = {
      ...job,
      dismissedSlotIds: [job.slots[0].frameId],
    };
    pendingJobs = new Map([[job.jobId, latestJob]]);
    resolveGeneration(createResponse());
    await result.completion;

    expect(finishPendingJob).toHaveBeenCalledWith(
      latestJob,
      expect.objectContaining({ prompt: request.prompt }),
      createResponse(),
    );
  });
});
