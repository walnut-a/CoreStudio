import { describe, expect, it, vi } from "vitest";

import {
  copyGenerationErrorDetails,
  copyGenerationTaskErrorDetails,
  createGenerationErrorStateApplier,
  createGenerationErrorRendererActions,
  runGenerationErrorClear,
  runGenerationErrorDisplay,
  runGenerationErrorDetailsCopyAction,
  runGenerationTaskErrorCopyRendererAction,
} from "./generationErrorController";

import type { GenerationRequest } from "../shared/providerTypes";
import type { GenerationErrorDetails } from "./generationErrorViewModel";

const createRequest = (
  patch: Partial<GenerationRequest> = {},
): GenerationRequest => ({
  provider: "gemini",
  model: "google/gemini-3-pro-image-preview",
  prompt: "工业设计渲染图",
  negativePrompt: "",
  aspectRatio: null,
  width: 1024,
  height: 1024,
  seed: null,
  imageCount: 1,
  reference: null,
  ...patch,
});

describe("generation error controller", () => {
  it("builds and applies a display state", () => {
    const applyState = vi.fn();

    const details = runGenerationErrorDisplay({
      request: createRequest({ provider: "zenmux" }),
      error: new Error("ZenMux request failed: positive balance is required"),
      fallbackMessage: "生成失败",
      applyState,
    });

    expect(details.normalizedMessage).toBe(
      "ZenMux 余额不足，这个模型需要账户里有正余额。",
    );
    expect(applyState).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "ZenMux 余额不足，这个模型需要账户里有正余额。",
        detailsOpen: false,
        copied: false,
      }),
    );
  });

  it("uses the controller fallback when no readable error is available", () => {
    const applyState = vi.fn();

    const details = runGenerationErrorDisplay({
      request: createRequest(),
      error: null,
      fallbackMessage: undefined,
      applyState,
    });

    expect(details.normalizedMessage).toBe("生成图片失败。");
    expect(applyState).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "生成图片失败。",
      }),
    );
  });

  it("builds and applies a cleared state", () => {
    const applyState = vi.fn();

    runGenerationErrorClear({ applyState });

    expect(applyState).toHaveBeenCalledWith({
      error: null,
      details: null,
      detailsOpen: false,
      copied: false,
    });
  });

  it("creates a reusable applier for generation error UI state", () => {
    const setError = vi.fn();
    const setDetails = vi.fn();
    const setDetailsOpen = vi.fn();
    const setCopied = vi.fn();
    const details: GenerationErrorDetails = {
      provider: "gemini",
      model: "google/gemini-3-pro-image-preview",
      occurredAt: "2026-07-04T08:00:00.000Z",
      normalizedMessage: "生成失败",
      rawMessage: "COMMAND_FAILED",
      stack: null,
      requestPayload: null,
    };
    const applyState = createGenerationErrorStateApplier({
      setError,
      setDetails,
      setDetailsOpen,
      setCopied,
    });

    applyState({
      error: "生成失败",
      details,
      detailsOpen: true,
      copied: false,
    });

    expect(setError).toHaveBeenCalledWith("生成失败");
    expect(setDetails).toHaveBeenCalledWith(details);
    expect(setDetailsOpen).toHaveBeenCalledWith(true);
    expect(setCopied).toHaveBeenCalledWith(false);
  });

  it("copies current generation error details", async () => {
    const copyText = vi.fn().mockResolvedValue(true);

    await expect(
      copyGenerationErrorDetails({
        details: {
          provider: "gemini",
          model: "google/gemini-3-pro-image-preview",
          occurredAt: "2026-07-04T08:00:00.000Z",
          normalizedMessage: "生成失败",
          rawMessage: "COMMAND_FAILED",
          stack: null,
          requestPayload: null,
        },
        copyText,
      }),
    ).resolves.toBe(true);

    expect(copyText).toHaveBeenCalledWith(
      expect.stringContaining("当前提示：\n生成失败"),
    );
  });

  it("marks generation error details as copied only after a successful copy", async () => {
    const details: GenerationErrorDetails = {
      provider: "gemini",
      model: "google/gemini-3-pro-image-preview",
      occurredAt: "2026-07-04T08:00:00.000Z",
      normalizedMessage: "生成失败",
      rawMessage: "COMMAND_FAILED",
      stack: null,
      requestPayload: null,
    };
    const setCopied = vi.fn();

    await expect(
      runGenerationErrorDetailsCopyAction({
        details,
        copyText: vi.fn().mockResolvedValue(true),
        setCopied,
      }),
    ).resolves.toBe(true);

    expect(setCopied).toHaveBeenCalledWith(true);

    setCopied.mockClear();
    await expect(
      runGenerationErrorDetailsCopyAction({
        details,
        copyText: vi.fn().mockResolvedValue(false),
        setCopied,
      }),
    ).resolves.toBe(false);
    await expect(
      runGenerationErrorDetailsCopyAction({
        details: null,
        copyText: vi.fn().mockResolvedValue(true),
        setCopied,
      }),
    ).resolves.toBe(false);

    expect(setCopied).not.toHaveBeenCalled();
  });

  it("copies failed task error details and ignores non-error tasks", async () => {
    const copyText = vi.fn().mockResolvedValue(true);

    await expect(
      copyGenerationTaskErrorDetails({
        task: {
          status: "pending",
          provider: "gemini",
          model: "google/gemini-3-pro-image-preview",
          startedAt: "2026-07-04T08:00:00.000Z",
        },
        fallbackMessage: "生成失败",
        copyText,
      }),
    ).resolves.toBe(false);

    await expect(
      copyGenerationTaskErrorDetails({
        task: {
          status: "error",
          provider: "gemini",
          model: "google/gemini-3-pro-image-preview",
          startedAt: "2026-07-04T08:00:00.000Z",
          errorMessage: "生成失败",
          rawError: "COMMAND_FAILED",
        },
        fallbackMessage: "生成失败",
        copyText,
      }),
    ).resolves.toBe(true);

    expect(copyText).toHaveBeenCalledTimes(1);
    expect(copyText).toHaveBeenCalledWith(
      expect.stringContaining("原始报错：\nCOMMAND_FAILED"),
    );
  });

  it("uses the controller fallback when copying failed task error details", async () => {
    const copyText = vi.fn().mockResolvedValue(true);

    await expect(
      copyGenerationTaskErrorDetails({
        task: {
          status: "error",
          provider: "gemini",
          model: "google/gemini-3-pro-image-preview",
          startedAt: "2026-07-04T08:00:00.000Z",
        },
        fallbackMessage: undefined,
        copyText,
      }),
    ).resolves.toBe(true);

    expect(copyText).toHaveBeenCalledWith(
      expect.stringContaining("当前提示：\n生成图片失败。"),
    );
  });

  it("reads the selected task through a getter when copying task error details", async () => {
    const copyText = vi.fn().mockResolvedValue(true);
    const getTask = vi.fn(() => ({
      status: "error" as const,
      provider: "gemini" as const,
      model: "google/gemini-3-pro-image-preview",
      startedAt: "2026-07-04T08:00:00.000Z",
      errorMessage: "生成失败",
      rawError: "COMMAND_FAILED",
    }));

    await expect(
      runGenerationTaskErrorCopyRendererAction({
        getTask,
        fallbackMessage: "生成失败",
        copyText,
      }),
    ).resolves.toBe(true);

    expect(getTask).toHaveBeenCalledTimes(1);
    expect(copyText).toHaveBeenCalledWith(
      expect.stringContaining("原始报错：\nCOMMAND_FAILED"),
    );
  });

  it("creates renderer actions for displaying, clearing, and copying generation errors", async () => {
    const details: GenerationErrorDetails = {
      provider: "gemini",
      model: "google/gemini-3-pro-image-preview",
      occurredAt: "2026-07-04T08:00:00.000Z",
      normalizedMessage: "生成失败",
      rawMessage: "COMMAND_FAILED",
      stack: null,
      requestPayload: null,
    };
    const getDetails = vi.fn(() => details);
    const setDetailsCopied = vi.fn();
    const getTask = vi.fn(() => ({
      status: "error" as const,
      provider: "gemini" as const,
      model: "google/gemini-3-pro-image-preview",
      startedAt: "2026-07-04T08:00:00.000Z",
      errorMessage: "任务失败",
      rawError: "TASK_FAILED",
    }));
    const applyState = vi.fn();
    const copyText = vi.fn().mockResolvedValue(true);

    const actions = createGenerationErrorRendererActions({
      applyState,
      getDetails,
      setDetailsCopied,
      getTask,
      fallbackMessage: "生成失败",
      copyText,
    });

    const displayedDetails = actions.display(
      createRequest({ provider: "zenmux" }),
      new Error("ZenMux request failed: positive balance is required"),
    );
    actions.clear();
    await expect(actions.copyDetails()).resolves.toBe(true);
    await expect(actions.copyTaskError()).resolves.toBe(true);

    expect(displayedDetails.normalizedMessage).toBe(
      "ZenMux 余额不足，这个模型需要账户里有正余额。",
    );
    expect(applyState).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "ZenMux 余额不足，这个模型需要账户里有正余额。",
      }),
    );
    expect(applyState).toHaveBeenCalledWith({
      error: null,
      details: null,
      detailsOpen: false,
      copied: false,
    });
    expect(getDetails).toHaveBeenCalledTimes(1);
    expect(setDetailsCopied).toHaveBeenCalledWith(true);
    expect(getTask).toHaveBeenCalledTimes(1);
    expect(copyText).toHaveBeenCalledTimes(2);
  });
});
