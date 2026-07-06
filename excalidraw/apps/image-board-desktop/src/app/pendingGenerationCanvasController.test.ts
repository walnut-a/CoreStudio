import { describe, expect, it, vi } from "vitest";

import { CaptureUpdateAction } from "@excalidraw/element";

import {
  createPendingGenerationCanvasRendererActions,
  runPendingGenerationFailureCanvasAction,
  runPendingGenerationPlaceholderInsertCanvasAction,
  runPendingGenerationSlotReplacementCanvasAction,
} from "./pendingGenerationCanvasController";

import {
  buildPendingGenerationJob,
  type PendingGenerationJob,
} from "./generationJobState";
import {
  buildPendingGenerationPlaceholders,
  type PendingGenerationSlot,
} from "./generationPlaceholderState";
import {
  buildGenerationTaskMapWithPendingSlots,
  type GenerationTaskRecord,
} from "./generationTaskState";

import type { PersistedImageAssetInput } from "../shared/desktopBridgeTypes";
import type { GenerationRequest } from "../shared/providerTypes";
import type { AppState } from "@excalidraw/excalidraw/types";

const createRequest = (): GenerationRequest => ({
  provider: "zenmux",
  model: "google/gemini-3-pro-image-preview",
  prompt: "生成一台苹果风 CNC",
  width: 1024,
  height: 1024,
  imageCount: 1,
  seed: null,
  reference: null,
});

const createPendingPlaceholders = () =>
  buildPendingGenerationPlaceholders({
    request: createRequest(),
    placements: [{ x: 10, y: 20, width: 320, height: 240 }],
    createGroupId: (index) => `slot-group-${index}`,
  });

const createJob = (slot: PendingGenerationSlot): PendingGenerationJob =>
  buildPendingGenerationJob({
    jobId: "job-1",
    projectPath: "/tmp/corestudio-project",
    slots: [slot],
  });

const createGenerationTasks = (slots: readonly PendingGenerationSlot[]) =>
  buildGenerationTaskMapWithPendingSlots({
    generationTasks: new Map<string, GenerationTaskRecord>(),
    slots,
    request: createRequest(),
    startedAt: "2026-07-05T00:00:00.000Z",
  });

const createAsset = (): PersistedImageAssetInput => ({
  fileId: "generated-file",
  mimeType: "image/png",
  dataBase64: "abc123",
  width: 1024,
  height: 1024,
  sourceType: "generated",
  createdAt: "2026-07-05T00:00:01.000Z",
});

describe("runPendingGenerationFailureCanvasAction", () => {
  it("marks matching pending generation placeholders as failed on the canvas", () => {
    const { slots, placeholderElements } = createPendingPlaceholders();
    const job = createJob(slots[0]);
    const generationTasks = createGenerationTasks(slots);
    const setGenerationTasks = vi.fn();
    const updateScene = vi.fn();

    const result = runPendingGenerationFailureCanvasAction({
      api: {
        getSceneElementsIncludingDeleted: () => placeholderElements,
        updateScene,
      },
      job,
      project: { projectPath: "/tmp/corestudio-project" },
      generationTasks,
      errorDetails: {
        normalizedMessage: "生成失败",
        rawMessage: "provider failed",
        stack: null,
      },
      setGenerationTasks,
    });

    expect(result.kind).toBe("updated");
    expect(setGenerationTasks).toHaveBeenCalledWith(expect.any(Map));
    const nextTasks = setGenerationTasks.mock.calls[0][0] as Map<
      string,
      GenerationTaskRecord
    >;
    expect(nextTasks.get(slots[0].frameId)).toMatchObject({
      status: "error",
      errorMessage: "生成失败",
      rawError: "provider failed",
    });
    expect(updateScene).toHaveBeenCalledWith({
      elements: expect.any(Array),
      appState: {
        selectedElementIds: {
          [slots[0].frameId]: true,
        },
      },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
  });

  it("skips failure updates when the active project no longer matches the job", () => {
    const { slots, placeholderElements } = createPendingPlaceholders();
    const updateScene = vi.fn();
    const setGenerationTasks = vi.fn();

    const result = runPendingGenerationFailureCanvasAction({
      api: {
        getSceneElementsIncludingDeleted: () => placeholderElements,
        updateScene,
      },
      job: createJob(slots[0]),
      project: { projectPath: "/tmp/other-project" },
      generationTasks: createGenerationTasks(slots),
      setGenerationTasks,
    });

    expect(result.kind).toBe("skipped");
    expect(updateScene).not.toHaveBeenCalled();
    expect(setGenerationTasks).not.toHaveBeenCalled();
  });
});

describe("runPendingGenerationPlaceholderInsertCanvasAction", () => {
  it("inserts generation placeholders, tracks pending tasks, focuses the new frame, and returns a job", () => {
    const request = createRequest();
    const setGenerationTasks = vi.fn();
    const updateScene = vi.fn();
    const scrollToContent = vi.fn();

    const result = runPendingGenerationPlaceholderInsertCanvasAction({
      api: {
        getSceneElementsIncludingDeleted: () => [],
        updateScene,
        scrollToContent,
      },
      project: { projectPath: "/tmp/corestudio-project" },
      request,
      placements: [{ x: 10, y: 20, width: 320, height: 240 }],
      startedAt: "2026-07-05T00:00:00.000Z",
      generationTasks: new Map<string, GenerationTaskRecord>(),
      setGenerationTasks,
      createGroupId: (index) => `slot-group-${index}`,
      createJobId: () => "job-1",
    });

    if (result.kind !== "inserted") {
      throw new Error("Expected pending generation placeholders to be inserted.");
    }

    expect(result.job).toMatchObject({
      jobId: "job-1",
      projectPath: "/tmp/corestudio-project",
      slots: [
        {
          frameId: expect.any(String),
          labelId: expect.any(String),
          fitReturnedImageSize: false,
        },
      ],
    });
    expect(setGenerationTasks).toHaveBeenCalledWith(expect.any(Map));
    const nextTasks = setGenerationTasks.mock.calls[0][0] as Map<
      string,
      GenerationTaskRecord
    >;
    expect(nextTasks.get(result.job.slots[0].frameId)).toMatchObject({
      status: "pending",
      prompt: request.prompt,
      provider: request.provider,
    });
    expect(nextTasks.get(result.job.slots[0].labelId)).toMatchObject({
      status: "pending",
      prompt: request.prompt,
      provider: request.provider,
    });
    expect(updateScene).toHaveBeenCalledWith({
      elements: expect.arrayContaining([
        expect.objectContaining({ id: result.job.slots[0].frameId }),
        expect.objectContaining({ id: result.job.slots[0].labelId }),
      ]),
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
    expect(scrollToContent).toHaveBeenCalledWith(
      [expect.objectContaining({ id: result.job.slots[0].frameId })],
      {
        animate: true,
        fitToContent: true,
      },
    );
  });

  it("skips placeholder insertion when the active project is unavailable", () => {
    const updateScene = vi.fn();
    const setGenerationTasks = vi.fn();

    const result = runPendingGenerationPlaceholderInsertCanvasAction({
      api: {
        getSceneElementsIncludingDeleted: () => [],
        updateScene,
        scrollToContent: vi.fn(),
      },
      project: null,
      request: createRequest(),
      placements: [{ x: 10, y: 20, width: 320, height: 240 }],
      startedAt: "2026-07-05T00:00:00.000Z",
      generationTasks: new Map<string, GenerationTaskRecord>(),
      setGenerationTasks,
      createJobId: () => "job-1",
    });

    expect(result.kind).toBe("skipped");
    expect(updateScene).not.toHaveBeenCalled();
    expect(setGenerationTasks).not.toHaveBeenCalled();
  });
});

describe("createPendingGenerationCanvasRendererActions", () => {
  it("creates an insert action that guards the active project, resolves placement, and records the latest batch bounds", () => {
    const request = createRequest();
    const appState = {
      width: 1280,
      height: 720,
      scrollX: 0,
      scrollY: 0,
      zoom: { value: 1 },
    } as AppState;
    const generationTasks = new Map<string, GenerationTaskRecord>();
    const setGenerationTasks = vi.fn();
    const updateScene = vi.fn();
    const scrollToContent = vi.fn();
    const assertActiveProject = vi.fn();
    const setPreviousBatchBounds = vi.fn();
    const updateWorkspaceOverlay = vi.fn(() => null);
    const api = {
      getAppState: () => appState,
      getSceneElementsIncludingDeleted: () => [],
      addFiles: vi.fn(),
      updateScene,
      scrollToContent,
    };

    const actions = createPendingGenerationCanvasRendererActions({
      getEditorApi: () => api,
      getActiveProject: () => ({ projectPath: "/tmp/corestudio-project" }),
      assertActiveProject,
      getFallbackReferenceScene: () => null,
      getLastCanvasPointer: () => ({ x: 40, y: 50 }),
      getPreviousBatchBounds: () => null,
      setPreviousBatchBounds,
      updateWorkspaceOverlay,
      getGenerationTasks: () => generationTasks,
      setGenerationTasks,
      createJobId: () => "job-1",
    });

    const job = actions.insertPlaceholders(
      request,
      "2026-07-05T00:00:00.000Z",
      {
        expectedProjectPath: "/tmp/corestudio-project",
      },
    );

    expect(job).toMatchObject({
      jobId: "job-1",
      projectPath: "/tmp/corestudio-project",
    });
    expect(assertActiveProject).toHaveBeenCalledTimes(2);
    expect(assertActiveProject).toHaveBeenCalledWith("/tmp/corestudio-project");
    expect(updateWorkspaceOverlay).toHaveBeenCalledWith([], appState);
    expect(setPreviousBatchBounds).toHaveBeenCalledWith(
      expect.objectContaining({
        x: expect.any(Number),
        y: expect.any(Number),
        width: expect.any(Number),
        height: expect.any(Number),
      }),
    );
    expect(setGenerationTasks).toHaveBeenCalledWith(expect.any(Map));
    expect(updateScene).toHaveBeenCalled();
    expect(scrollToContent).toHaveBeenCalled();
  });

  it("creates a failure action that reads current canvas and task state from the renderer", () => {
    const { slots, placeholderElements } = createPendingPlaceholders();
    const job = createJob(slots[0]);
    const generationTasks = createGenerationTasks(slots);
    const setGenerationTasks = vi.fn();
    const updateScene = vi.fn();

    const actions = createPendingGenerationCanvasRendererActions({
      getEditorApi: () => ({
        getSceneElementsIncludingDeleted: () => placeholderElements,
        updateScene,
        getAppState: () => ({ selectedElementIds: {} }) as AppState,
        addFiles: vi.fn(),
        scrollToContent: vi.fn(),
      }),
      getActiveProject: () => ({ projectPath: "/tmp/corestudio-project" }),
      assertActiveProject: vi.fn(),
      getFallbackReferenceScene: () => null,
      getLastCanvasPointer: () => null,
      getPreviousBatchBounds: () => null,
      setPreviousBatchBounds: vi.fn(),
      updateWorkspaceOverlay: vi.fn(() => null),
      getGenerationTasks: () => generationTasks,
      setGenerationTasks,
    });

    const result = actions.markFailed(job, {
      normalizedMessage: "生成失败",
      rawMessage: "provider failed",
      stack: null,
    });

    expect(result.kind).toBe("updated");
    expect(updateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      }),
    );
    const nextTasks = setGenerationTasks.mock.calls[0][0] as Map<
      string,
      GenerationTaskRecord
    >;
    expect(nextTasks.get(slots[0].frameId)).toMatchObject({
      status: "error",
      errorMessage: "生成失败",
    });
  });

  it("creates a replacement action that reads the editor api and clears slot tasks", () => {
    const { slots, placeholderElements } = createPendingPlaceholders();
    const generationTasks = createGenerationTasks(slots);
    const setGenerationTasks = vi.fn();
    const addFiles = vi.fn();
    const updateScene = vi.fn();

    const actions = createPendingGenerationCanvasRendererActions({
      getEditorApi: () => ({
        getSceneElementsIncludingDeleted: () => placeholderElements,
        getAppState: () => ({
          selectedElementIds: {
            [slots[0].frameId]: true,
          },
        }) as AppState,
        addFiles,
        updateScene,
        scrollToContent: vi.fn(),
      }),
      getActiveProject: () => ({ projectPath: "/tmp/corestudio-project" }),
      assertActiveProject: vi.fn(),
      getFallbackReferenceScene: () => null,
      getLastCanvasPointer: () => null,
      getPreviousBatchBounds: () => null,
      setPreviousBatchBounds: vi.fn(),
      updateWorkspaceOverlay: vi.fn(() => null),
      getGenerationTasks: () => generationTasks,
      setGenerationTasks,
    });

    const result = actions.replaceSlot(slots[0], createAsset());

    expect(result.kind).toBe("replaced");
    expect(addFiles).toHaveBeenCalled();
    expect(updateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      }),
    );
    const nextTasks = setGenerationTasks.mock.calls[0][0] as Map<
      string,
      GenerationTaskRecord
    >;
    expect(nextTasks.has(slots[0].frameId)).toBe(false);
    expect(nextTasks.has(slots[0].labelId)).toBe(false);
  });
});

describe("runPendingGenerationSlotReplacementCanvasAction", () => {
  it("replaces a pending slot with the generated image and clears the slot task", () => {
    const { slots, placeholderElements } = createPendingPlaceholders();
    const asset = createAsset();
    const generationTasks = createGenerationTasks(slots);
    const setGenerationTasks = vi.fn();
    const addFiles = vi.fn();
    const updateScene = vi.fn();

    const result = runPendingGenerationSlotReplacementCanvasAction({
      api: {
        getSceneElementsIncludingDeleted: () => placeholderElements,
        getAppState: () => ({
          selectedElementIds: {
            [slots[0].frameId]: true,
          },
        }),
        addFiles,
        updateScene,
      },
      slot: slots[0],
      asset,
      generationTasks,
      setGenerationTasks,
      fallbackCreatedAt: 1783209600000,
    });

    if (result.kind !== "replaced") {
      throw new Error("Expected pending generation slot to be replaced.");
    }
    expect(addFiles).toHaveBeenCalledWith([
      expect.objectContaining({
        id: asset.fileId,
        dataURL: expect.stringContaining(asset.dataBase64),
      }),
    ]);
    expect(updateScene).toHaveBeenCalledWith({
      elements: expect.any(Array),
      appState: {
        selectedElementIds: {
          [result.imageElement.id]: true,
        },
      },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
    expect(setGenerationTasks).toHaveBeenCalledWith(expect.any(Map));
    const nextTasks = setGenerationTasks.mock.calls[0][0] as Map<
      string,
      GenerationTaskRecord
    >;
    expect(nextTasks.has(slots[0].frameId)).toBe(false);
    expect(nextTasks.has(slots[0].labelId)).toBe(false);
  });

  it("skips replacement when the pending frame is no longer on the canvas", () => {
    const { slots } = createPendingPlaceholders();
    const addFiles = vi.fn();
    const updateScene = vi.fn();
    const setGenerationTasks = vi.fn();

    const result = runPendingGenerationSlotReplacementCanvasAction({
      api: {
        getSceneElementsIncludingDeleted: () => [],
        getAppState: () => ({ selectedElementIds: {} }),
        addFiles,
        updateScene,
      },
      slot: slots[0],
      asset: createAsset(),
      generationTasks: createGenerationTasks(slots),
      setGenerationTasks,
    });

    expect(result.kind).toBe("skipped");
    expect(addFiles).not.toHaveBeenCalled();
    expect(updateScene).not.toHaveBeenCalled();
    expect(setGenerationTasks).not.toHaveBeenCalled();
  });
});
