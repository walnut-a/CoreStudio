import { describe, expect, it } from "vitest";

import type { GenerationRequest } from "../shared/providerTypes";
import {
  applyGenerationTaskMapWithPendingSlotsState,
  applyGenerationTaskMapWithFailedSlotsState,
  applyGenerationTaskMapWithoutSlotState,
  buildEmptyGenerationTaskMap,
  buildFailedGenerationTaskRecord,
  buildGenerationTaskMapWithFailedSlots,
  buildGenerationTaskMapWithPendingSlots,
  buildGenerationTaskMapWithoutSlot,
  buildPendingGenerationTaskRecord,
  type GenerationTaskRecord,
} from "./generationTaskState";

const createRequest = (
  overrides: Partial<GenerationRequest> = {},
): GenerationRequest => ({
  provider: "zenmux",
  model: "google/gemini-2.5-flash-image",
  prompt: "原始 prompt",
  negativePrompt: "不要多余按钮",
  aspectRatio: null,
  width: 1536,
  height: 1024,
  seed: 42,
  imageCount: 1,
  ...overrides,
});

describe("buildPendingGenerationTaskRecord", () => {
  it("stores request metadata and the inline-reference prompt text", () => {
    const task = buildPendingGenerationTaskRecord({
      request: createRequest({
        promptParts: [
          { type: "text", text: "基于 " },
          { type: "reference", referenceId: "ref-1" },
          { type: "text", text: " 优化" },
        ],
        promptReferences: [
          {
            id: "ref-1",
            label: "图片",
            enabled: true,
            elementCount: 1,
            textCount: 0,
            image: {
              mimeType: "image/png",
              dataBase64: "abc",
            },
          },
        ],
      }),
      startedAt: "2026-07-04T08:00:00.000Z",
    });

    expect(task).toEqual({
      status: "pending",
      provider: "zenmux",
      model: "google/gemini-2.5-flash-image",
      prompt: "基于 参考图 1 优化",
      negativePrompt: "不要多余按钮",
      aspectRatio: null,
      seed: 42,
      width: 1536,
      height: 1024,
      startedAt: "2026-07-04T08:00:00.000Z",
    });
  });
});

describe("buildFailedGenerationTaskRecord", () => {
  it("adds normalized error details while preserving request metadata", () => {
    const pendingTask = buildPendingGenerationTaskRecord({
      request: createRequest(),
      startedAt: "2026-07-04T08:00:00.000Z",
    });

    const failedTask = buildFailedGenerationTaskRecord({
      task: pendingTask,
      fallbackMessage: "生成失败",
      errorDetails: {
        normalizedMessage: "额度不足",
        rawMessage: "raw quota exceeded",
        stack: "stacktrace",
      },
    });

    expect(failedTask).toEqual({
      ...pendingTask,
      status: "error",
      errorMessage: "额度不足",
      rawError: "raw quota exceeded",
      stack: "stacktrace",
    });
  });

  it("uses the fallback message when no normalized error is available", () => {
    const pendingTask = buildPendingGenerationTaskRecord({
      request: createRequest(),
      startedAt: "2026-07-04T08:00:00.000Z",
    });

    expect(
      buildFailedGenerationTaskRecord({
        task: pendingTask,
        fallbackMessage: "生成失败",
      }),
    ).toMatchObject({
      status: "error",
      errorMessage: "生成失败",
      rawError: "生成失败",
      stack: null,
    });
  });

  it("uses the owner fallback message when none is supplied", () => {
    const pendingTask = buildPendingGenerationTaskRecord({
      request: createRequest(),
      startedAt: "2026-07-04T08:00:00.000Z",
    });

    expect(
      buildFailedGenerationTaskRecord({
        task: pendingTask,
        fallbackMessage: undefined,
      }),
    ).toMatchObject({
      status: "error",
      errorMessage: "生成图片失败。",
      rawError: "生成图片失败。",
      stack: null,
    });
  });
});

describe("generation task map helpers", () => {
  const slotA = {
    frameId: "frame-a",
    labelId: "label-a",
  };
  const slotB = {
    frameId: "frame-b",
    labelId: "label-b",
  };

  it("maps every placeholder frame and label to a pending task", () => {
    const existingTask = buildPendingGenerationTaskRecord({
      request: createRequest({ prompt: "旧任务" }),
      startedAt: "2026-07-04T07:00:00.000Z",
    });
    const currentTasks = new Map([["other-frame", existingTask]]);

    const nextTasks = buildGenerationTaskMapWithPendingSlots({
      generationTasks: currentTasks,
      slots: [slotA, slotB],
      request: createRequest({ prompt: "新任务" }),
      startedAt: "2026-07-04T08:00:00.000Z",
    });

    expect(nextTasks).not.toBe(currentTasks);
    expect(currentTasks.has(slotA.frameId)).toBe(false);
    expect(nextTasks.get("other-frame")).toBe(existingTask);
    expect(nextTasks.get(slotA.frameId)).toEqual(
      expect.objectContaining({
        status: "pending",
        prompt: "新任务",
        startedAt: "2026-07-04T08:00:00.000Z",
      }),
    );
    expect(nextTasks.get(slotA.labelId)).toBe(nextTasks.get(slotA.frameId));
    expect(nextTasks.get(slotB.frameId)).not.toBe(nextTasks.get(slotA.frameId));
    expect(nextTasks.get(slotB.labelId)).toBe(nextTasks.get(slotB.frameId));
  });

  it("applies pending slot task state through the owner setter", () => {
    const existingTask = buildPendingGenerationTaskRecord({
      request: createRequest({ prompt: "旧任务" }),
      startedAt: "2026-07-04T07:00:00.000Z",
    });
    const currentTasks = new Map([["other-frame", existingTask]]);
    let appliedTasks: Map<string, GenerationTaskRecord> | null = null;

    const nextTasks = applyGenerationTaskMapWithPendingSlotsState({
      generationTasks: currentTasks,
      slots: [slotA],
      request: createRequest({ prompt: "新任务" }),
      startedAt: "2026-07-04T08:00:00.000Z",
      setGenerationTasks: (generationTasks) => {
        appliedTasks = generationTasks;
      },
    });

    expect(nextTasks).not.toBe(currentTasks);
    expect(appliedTasks).toBe(nextTasks);
    expect(nextTasks.get("other-frame")).toBe(existingTask);
    expect(nextTasks.get(slotA.frameId)).toEqual(
      expect.objectContaining({
        status: "pending",
        prompt: "新任务",
        startedAt: "2026-07-04T08:00:00.000Z",
      }),
    );
    expect(nextTasks.get(slotA.labelId)).toBe(nextTasks.get(slotA.frameId));
  });

  it("marks placeholder frame and label tasks as failed from either existing id", () => {
    const taskA = buildPendingGenerationTaskRecord({
      request: createRequest({ prompt: "任务 A" }),
      startedAt: "2026-07-04T08:00:00.000Z",
    });
    const taskB = buildPendingGenerationTaskRecord({
      request: createRequest({ prompt: "任务 B" }),
      startedAt: "2026-07-04T08:01:00.000Z",
    });
    const currentTasks = new Map([
      [slotA.frameId, taskA],
      [slotB.labelId, taskB],
    ]);

    const nextTasks = buildGenerationTaskMapWithFailedSlots({
      generationTasks: currentTasks,
      slots: [
        slotA,
        slotB,
        {
          frameId: "frame-without-task",
          labelId: "label-without-task",
        },
      ],
      fallbackMessage: "生成失败",
      errorDetails: {
        normalizedMessage: "网络错误",
        rawMessage: "raw network error",
      },
    });

    expect(nextTasks).not.toBe(currentTasks);
    expect(currentTasks.get(slotA.frameId)).toBe(taskA);
    expect(nextTasks.get(slotA.frameId)).toEqual(
      expect.objectContaining({
        status: "error",
        prompt: "任务 A",
        errorMessage: "网络错误",
        rawError: "raw network error",
      }),
    );
    expect(nextTasks.get(slotA.labelId)).toBe(nextTasks.get(slotA.frameId));
    expect(nextTasks.get(slotB.frameId)).toEqual(
      expect.objectContaining({
        status: "error",
        prompt: "任务 B",
      }),
    );
    expect(nextTasks.get(slotB.labelId)).toBe(nextTasks.get(slotB.frameId));
    expect(nextTasks.has("frame-without-task")).toBe(false);
    expect(nextTasks.has("label-without-task")).toBe(false);
  });

  it("uses the owner fallback message when marking failed slots", () => {
    const task = buildPendingGenerationTaskRecord({
      request: createRequest({ prompt: "任务 A" }),
      startedAt: "2026-07-04T08:00:00.000Z",
    });
    const currentTasks = new Map([[slotA.frameId, task]]);

    const nextTasks = buildGenerationTaskMapWithFailedSlots({
      generationTasks: currentTasks,
      slots: [slotA],
      fallbackMessage: undefined,
    });

    expect(nextTasks.get(slotA.frameId)).toEqual(
      expect.objectContaining({
        status: "error",
        errorMessage: "生成图片失败。",
        rawError: "生成图片失败。",
      }),
    );
  });

  it("applies failed slot task state through the owner setter", () => {
    const task = buildPendingGenerationTaskRecord({
      request: createRequest({ prompt: "任务 A" }),
      startedAt: "2026-07-04T08:00:00.000Z",
    });
    const currentTasks = new Map([
      [slotA.frameId, task],
      [slotA.labelId, task],
    ]);
    let appliedTasks: Map<string, GenerationTaskRecord> | null = null;

    const nextTasks = applyGenerationTaskMapWithFailedSlotsState({
      generationTasks: currentTasks,
      slots: [slotA],
      errorDetails: {
        normalizedMessage: "服务超时",
        rawMessage: "raw timeout",
      },
      setGenerationTasks: (generationTasks) => {
        appliedTasks = generationTasks;
      },
    });

    expect(nextTasks).not.toBe(currentTasks);
    expect(appliedTasks).toBe(nextTasks);
    expect(nextTasks.get(slotA.frameId)).toEqual(
      expect.objectContaining({
        status: "error",
        prompt: "任务 A",
        errorMessage: "服务超时",
        rawError: "raw timeout",
      }),
    );
    expect(nextTasks.get(slotA.labelId)).toBe(nextTasks.get(slotA.frameId));
  });

  it("removes both placeholder ids when a slot is replaced", () => {
    const task = buildPendingGenerationTaskRecord({
      request: createRequest(),
      startedAt: "2026-07-04T08:00:00.000Z",
    });
    const currentTasks = new Map([
      [slotA.frameId, task],
      [slotA.labelId, task],
      ["other-frame", task],
    ]);

    const nextTasks = buildGenerationTaskMapWithoutSlot({
      generationTasks: currentTasks,
      slot: slotA,
    });

    expect(nextTasks).not.toBe(currentTasks);
    expect(currentTasks.has(slotA.frameId)).toBe(true);
    expect(nextTasks.has(slotA.frameId)).toBe(false);
    expect(nextTasks.has(slotA.labelId)).toBe(false);
    expect(nextTasks.get("other-frame")).toBe(task);
  });

  it("applies replaced slot cleanup through the owner setter", () => {
    const task = buildPendingGenerationTaskRecord({
      request: createRequest(),
      startedAt: "2026-07-04T08:00:00.000Z",
    });
    const currentTasks = new Map([
      [slotA.frameId, task],
      [slotA.labelId, task],
      ["other-frame", task],
    ]);
    let appliedTasks: Map<string, GenerationTaskRecord> | null = null;

    const nextTasks = applyGenerationTaskMapWithoutSlotState({
      generationTasks: currentTasks,
      slot: slotA,
      setGenerationTasks: (generationTasks) => {
        appliedTasks = generationTasks;
      },
    });

    expect(nextTasks).not.toBe(currentTasks);
    expect(appliedTasks).toBe(nextTasks);
    expect(nextTasks.has(slotA.frameId)).toBe(false);
    expect(nextTasks.has(slotA.labelId)).toBe(false);
    expect(nextTasks.get("other-frame")).toBe(task);
  });

  it("resets tasks immutably when a project view is cleared", () => {
    const task = buildPendingGenerationTaskRecord({
      request: createRequest(),
      startedAt: "2026-07-04T08:00:00.000Z",
    });
    const currentTasks = new Map([[slotA.frameId, task]]);

    const resetTasks = buildEmptyGenerationTaskMap();

    expect(resetTasks).not.toBe(currentTasks);
    expect(currentTasks.has(slotA.frameId)).toBe(true);
    expect(resetTasks.size).toBe(0);
  });
});
