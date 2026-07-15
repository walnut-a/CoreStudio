import { describe, expect, it } from "vitest";

import {
  buildClearGenerationErrorUiState,
  buildGenerationTaskErrorDetails,
  buildGenerationErrorDetails,
  buildGenerationErrorUiState,
  formatUnknownErrorMessage,
  formatGenerationErrorDebugText,
  normalizeDesktopErrorMessage,
  splitRequestPayload,
} from "./generationErrorViewModel";

import type { GenerationRequest } from "../shared/providerTypes";
import { setActiveDesktopLocale } from "./copy";

const createGenerationRequest = (
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

describe("splitRequestPayload", () => {
  it("splits a user-facing message from the attached request payload", () => {
    expect(
      splitRequestPayload(
        'Renderer command failed\n请求载荷：{"model":"gemini"}',
      ),
    ).toEqual({
      message: "Renderer command failed",
      requestPayload: '{"model":"gemini"}',
    });
  });

  it("trims messages without payload markers", () => {
    expect(splitRequestPayload("  plain error  ")).toEqual({
      message: "plain error",
      requestPayload: null,
    });
  });
});

describe("normalizeDesktopErrorMessage", () => {
  it("localizes application-generated guidance while preserving raw details", () => {
    setActiveDesktopLocale("en");
    const raw =
      'ZenMux request failed: positive balance is required\n请求载荷：{"model":"flux"}';

    expect(normalizeDesktopErrorMessage("zenmux", raw)).toBe(
      "Your ZenMux balance is too low. This model requires a positive account balance.",
    );
    const details = buildGenerationErrorDetails(
      createGenerationRequest({ provider: "zenmux" }),
      new Error(raw),
      "Your ZenMux balance is too low.",
    );
    expect(details).toMatchObject({
      normalizedMessage: "Your ZenMux balance is too low.",
      rawMessage: "ZenMux request failed: positive balance is required",
      requestPayload: '{"model":"flux"}',
    });
    setActiveDesktopLocale("zh-CN");
  });

  it("normalizes Gemini invalid key errors even when Electron prefixes the message", () => {
    const error = new Error(
      "Error invoking remote method 'image-board:generate-image': Error: API_KEY_INVALID: API key not valid for generativelanguage.googleapis.com",
    );

    expect(normalizeDesktopErrorMessage("gemini", error)).toBe(
      "Gemini API Key 无效，请在 Google AI Studio 重新生成并保存。",
    );
  });

  it("normalizes ZenMux credit failures", () => {
    expect(
      normalizeDesktopErrorMessage(
        "zenmux",
        "ZenMux request failed: positive balance is required",
      ),
    ).toBe("ZenMux 余额不足，这个模型需要账户里有正余额。");
  });

  it.each([
    ["401 Unauthorized", "OpenAI API Key 无效，请在应用设置中检查后重新保存。"],
    ["403 Forbidden", "OpenAI API Key 无效，请在应用设置中检查后重新保存。"],
    ["fetch failed: ECONNREFUSED", "无法连接到 OpenAI，请检查服务地址和网络。"],
    [
      "404 model_not_found",
      "OpenAI 找不到当前模型，请在应用设置中检查模型 ID。",
    ],
    [
      "400 unsupported parameter: seed",
      "当前模型不支持这些生成参数，请调整尺寸、数量或参考图后重试。",
    ],
  ])("classifies common provider failures: %s", (raw, expected) => {
    expect(normalizeDesktopErrorMessage("openai", raw)).toBe(expected);
  });
});

describe("formatUnknownErrorMessage", () => {
  it("uses Error messages before fallback text", () => {
    expect(formatUnknownErrorMessage(new Error("读取失败"), "默认失败")).toBe(
      "读取失败",
    );
  });

  it("keeps string errors and falls back for empty values", () => {
    expect(formatUnknownErrorMessage("保存失败", "默认失败")).toBe("保存失败");
    expect(formatUnknownErrorMessage("", "默认失败")).toBe("默认失败");
    expect(formatUnknownErrorMessage(null, "默认失败")).toBe("默认失败");
  });
});

describe("generation error details", () => {
  it("keeps sanitized raw message and request payload for debugging", () => {
    const details = buildGenerationErrorDetails(
      createGenerationRequest(),
      new Error(
        'Error invoking remote method \'image-board:generate-image\': Error: COMMAND_FAILED\n请求载荷：{"model":"gemini"}',
      ),
      "生成失败",
    );

    expect(details).toMatchObject({
      provider: "gemini",
      model: "google/gemini-3-pro-image-preview",
      normalizedMessage: "生成失败",
      rawMessage:
        "Error invoking remote method 'image-board:generate-image': Error: COMMAND_FAILED",
      requestPayload: '{"model":"gemini"}',
    });
    expect(new Date(details.occurredAt).getTime()).not.toBeNaN();
  });

  it("builds copyable error details from a failed generation task record", () => {
    expect(
      buildGenerationTaskErrorDetails({
        task: {
          status: "error",
          provider: "zenmux",
          model: "black-forest-labs/flux-kontext-pro",
          startedAt: "2026-07-03T09:30:00.000Z",
          errorMessage: "生成失败",
          rawError: "ZenMux request failed: reject_no_credit",
          stack: "",
        },
        fallbackMessage: "默认失败文案",
      }),
    ).toEqual({
      provider: "zenmux",
      model: "black-forest-labs/flux-kontext-pro",
      occurredAt: "2026-07-03T09:30:00.000Z",
      normalizedMessage: "生成失败",
      rawMessage: "ZenMux request failed: reject_no_credit",
      stack: null,
      requestPayload: null,
    });
  });

  it("does not build task error details for non-error task records", () => {
    expect(
      buildGenerationTaskErrorDetails({
        task: {
          status: "pending",
          provider: "gemini",
          model: "google/gemini-3-pro-image-preview",
          startedAt: "2026-07-03T09:30:00.000Z",
        },
        fallbackMessage: "默认失败文案",
      }),
    ).toBeNull();
  });

  it("formats provider, model, message, raw payload and stack into a copyable debug text", () => {
    const debugText = formatGenerationErrorDebugText({
      provider: "gemini",
      model: "google/gemini-3-pro-image-preview",
      occurredAt: "2026-07-03T08:00:00.000Z",
      normalizedMessage: "生成失败",
      rawMessage: "COMMAND_FAILED",
      requestPayload: '{"model":"gemini"}',
      stack: "stack line",
    });

    expect(debugText).toContain("模型服务：Gemini");
    expect(debugText).toContain("模型：google/gemini-3-pro-image-preview");
    expect(debugText).toContain("当前提示：\n生成失败");
    expect(debugText).toContain('请求载荷：\n{"model":"gemini"}');
    expect(debugText).toContain("调用堆栈：\nstack line");
  });
});

describe("generation error UI state", () => {
  it("builds a closed and uncopied error state from a failed request", () => {
    const error = new Error(
      "ZenMux request failed: positive balance is required",
    );

    expect(
      buildGenerationErrorUiState({
        request: createGenerationRequest({ provider: "zenmux" }),
        error,
        fallbackMessage: "生成失败",
      }),
    ).toMatchObject({
      error: "ZenMux 余额不足，这个模型需要账户里有正余额。",
      detailsOpen: false,
      copied: false,
      details: {
        provider: "zenmux",
        normalizedMessage: "ZenMux 余额不足，这个模型需要账户里有正余额。",
        rawMessage: "ZenMux request failed: positive balance is required",
      },
    });
  });

  it("falls back when the normalized message is empty", () => {
    expect(
      buildGenerationErrorUiState({
        request: createGenerationRequest(),
        error: "",
        fallbackMessage: "默认失败",
      }),
    ).toMatchObject({
      error: "默认失败",
      details: {
        normalizedMessage: "默认失败",
      },
    });
  });

  it("builds a fully cleared error state", () => {
    expect(buildClearGenerationErrorUiState()).toEqual({
      error: null,
      details: null,
      detailsOpen: false,
      copied: false,
    });
  });
});
