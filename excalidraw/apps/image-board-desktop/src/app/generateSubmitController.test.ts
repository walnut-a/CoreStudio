import { describe, expect, it, vi } from "vitest";

import {
  createGenerationSubmitHandler,
  submitGenerationRequest,
} from "./generateSubmitController";
import type { GenerationRequest } from "../shared/providerTypes";

const createRequest = (
  patch: Partial<GenerationRequest> = {},
): GenerationRequest => ({
  provider: "gemini",
  model: "gemini-2.5-flash-image-preview",
  prompt: "",
  width: 1024,
  height: 1024,
  imageCount: 1,
  ...patch,
});

describe("submitGenerationRequest", () => {
  it("submits confirmed content and discards an unconfirmed reference", async () => {
    const requestRef = {
      current: createRequest({
        prompt: "原始提示词",
        reference: {
          enabled: true,
          elementCount: 1,
          textCount: 0,
        },
      }),
    };
    const onSubmit = vi.fn();
    const clearSubmittedPrompt = vi.fn();
    const discardPendingReference = vi.fn();

    await expect(
      submitGenerationRequest({
        canSubmit: true,
        requestRef,
        customModels: [],
        clearSubmittedPrompt,
        discardPendingReference,
        onSubmit,
      }),
    ).resolves.toBe(true);

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "原始提示词",
        reference: null,
      }),
      false,
    );
    expect(discardPendingReference).toHaveBeenCalledTimes(1);
    expect(clearSubmittedPrompt).toHaveBeenCalledTimes(1);
  });

  it("does not submit when the composer cannot submit", async () => {
    const onSubmit = vi.fn();
    const clearSubmittedPrompt = vi.fn();

    await expect(
      submitGenerationRequest({
        canSubmit: false,
        requestRef: { current: createRequest({ prompt: "不可提交" }) },
        customModels: [],
        clearSubmittedPrompt,
        onSubmit,
      }),
    ).resolves.toBe(false);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(clearSubmittedPrompt).not.toHaveBeenCalled();
  });

  it("creates a fire-and-forget submit handler for composer event wiring", async () => {
    const requestRef = {
      current: createRequest({ prompt: "直接提交" }),
    };
    const onSubmit = vi.fn();
    const clearSubmittedPrompt = vi.fn();
    const submit = createGenerationSubmitHandler({
      canSubmit: true,
      requestRef,
      customModels: [],
      clearSubmittedPrompt,
      onSubmit,
    });

    expect(submit()).toBeUndefined();
    await Promise.resolve();

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "直接提交",
        generationSource: "builtin",
      }),
      false,
    );
    expect(clearSubmittedPrompt).toHaveBeenCalledTimes(1);
  });
});
