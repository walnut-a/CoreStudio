import { describe, expect, it, vi } from "vitest";

import {
  createGenerationSubmitHandler,
  shouldCommitGenerationPendingReference,
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
  it("only commits pending references when a commit handler is available", () => {
    expect(
      shouldCommitGenerationPendingReference({
        request: createRequest({
          reference: {
            enabled: true,
            elementCount: 1,
            textCount: 0,
          },
        }),
        canCommitPendingReference: true,
      }),
    ).toBe(true);

    expect(
      shouldCommitGenerationPendingReference({
        request: createRequest({
          reference: {
            enabled: true,
            elementCount: 1,
            textCount: 0,
          },
        }),
        canCommitPendingReference: false,
      }),
    ).toBe(false);

    expect(
      shouldCommitGenerationPendingReference({
        request: createRequest({
          reference: {
            enabled: false,
            elementCount: 1,
            textCount: 0,
          },
        }),
        canCommitPendingReference: true,
      }),
    ).toBe(false);
  });

  it("commits pending references before submitting the latest built-in request", async () => {
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
    const calls: string[] = [];
    const onSubmit = vi.fn(() => {
      calls.push("submit");
    });
    const clearSubmittedPrompt = vi.fn(() => {
      calls.push("clear");
    });
    const commitPendingReference = vi.fn(async () => {
      calls.push("commit");
      requestRef.current = createRequest({
        prompt: "提交前已写入 inline reference",
        promptParts: [
          { type: "text", text: "提交前已写入 inline reference" },
          { type: "reference", referenceId: "ref-1" },
        ],
        promptReferences: [
          {
            id: "ref-1",
            label: "图片",
            enabled: true,
            elementCount: 1,
            textCount: 0,
          },
        ],
        reference: null,
      });
    });

    await expect(
      submitGenerationRequest({
        isPromptComposerMode: true,
        canSubmit: true,
        generationSource: "builtin",
        requestRef,
        customModels: [],
        canCommitPendingReference: true,
        commitPendingReference,
        clearSubmittedPrompt,
        onSubmit,
      }),
    ).resolves.toBe(true);

    expect(calls).toEqual(["commit", "submit", "clear"]);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        generationSource: "builtin",
        prompt: "提交前已写入 inline reference",
        reference: null,
        promptReferences: [
          expect.objectContaining({
            id: "ref-1",
          }),
        ],
      }),
      false,
    );
  });

  it("submits ACP Agent requests without committing pending visual references", async () => {
    const requestRef = {
      current: createRequest({
        prompt: "交给 ACP Agent",
        reference: {
          enabled: true,
          elementCount: 1,
          textCount: 0,
        },
      }),
    };
    const commitPendingReference = vi.fn();
    const onSubmit = vi.fn();
    const clearSubmittedPrompt = vi.fn();

    await expect(
      submitGenerationRequest({
        isPromptComposerMode: true,
        canSubmit: true,
        generationSource: "agent",
        requestRef,
        customModels: [],
        canCommitPendingReference: true,
        commitPendingReference,
        clearSubmittedPrompt,
        onSubmit,
      }),
    ).resolves.toBe(true);

    expect(commitPendingReference).not.toHaveBeenCalled();
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        generationSource: "agent",
        prompt: "交给 ACP Agent",
      }),
      false,
    );
    expect(clearSubmittedPrompt).toHaveBeenCalledTimes(1);
  });

  it("does not submit when the composer cannot submit", async () => {
    const onSubmit = vi.fn();
    const clearSubmittedPrompt = vi.fn();

    await expect(
      submitGenerationRequest({
        isPromptComposerMode: true,
        canSubmit: false,
        generationSource: "builtin",
        requestRef: { current: createRequest({ prompt: "不可提交" }) },
        customModels: [],
        canCommitPendingReference: true,
        commitPendingReference: vi.fn(),
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
    const commitPendingReference = vi.fn();
    const submit = createGenerationSubmitHandler({
      isPromptComposerMode: true,
      canSubmit: true,
      generationSource: "builtin",
      requestRef,
      customModels: [],
      canCommitPendingReference: false,
      commitPendingReference,
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
    expect(commitPendingReference).not.toHaveBeenCalled();
  });
});
