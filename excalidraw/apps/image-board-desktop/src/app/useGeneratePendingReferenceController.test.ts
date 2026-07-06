import { describe, expect, it, vi } from "vitest";

import {
  commitPendingPromptReference,
  getPendingPromptReferenceMaxCount,
} from "./useGeneratePendingReferenceController";
import type {
  CustomProviderModel,
  GenerationPromptPart,
  GenerationPromptReferencePayload,
  GenerationRequest,
} from "../shared/providerTypes";

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

const createCommitHarness = ({
  request = createRequest({
    reference: {
      enabled: true,
      elementCount: 1,
      textCount: 0,
    },
  }),
  references = [],
  promptEditorParts = [],
  insertReference,
}: {
  request?: GenerationRequest;
  references?: GenerationPromptReferencePayload[];
  promptEditorParts?: GenerationPromptPart[];
  insertReference?: (referenceId: string) => GenerationPromptPart[];
} = {}) => {
  const requestRef = { current: request };
  const promptReferencesRef = { current: references };
  const committingReferenceRef = { current: false };
  const setPromptReferences = vi.fn(
    (nextReferences: readonly GenerationPromptReferencePayload[]) => {
      promptReferencesRef.current = [...nextReferences];
    },
  );
  const updateRequest = vi.fn(
    (updater: (current: GenerationRequest) => GenerationRequest) => {
      requestRef.current = updater(requestRef.current);
      return requestRef.current;
    },
  );

  return {
    requestRef,
    promptReferencesRef,
    committingReferenceRef,
    promptEditorRef: {
      current: insertReference ? { insertReference } : null,
    },
    promptEditorParts,
    setPromptReferences,
    updateRequest,
  };
};

describe("commitPendingPromptReference", () => {
  it("resolves the inline reference limit from the latest request and custom models", () => {
    const requestRef = {
      current: createRequest({
        model: "custom-reference-model",
      }),
    };
    const customModels: CustomProviderModel[] = [
      {
        id: "custom-reference-model",
        capabilityTemplate: "image-editing-aspect-ratio",
        capabilities: {
          supportsNegativePrompt: false,
          supportsSeed: false,
          supportsImageCount: false,
          supportsReferenceImages: true,
          maxImageCount: 1,
          maxReferenceImageCount: 6,
          sizeControlMode: "aspect-ratio",
        },
      },
    ];

    expect(
      getPendingPromptReferenceMaxCount({
        requestRef,
        getCustomModelsForProvider: (provider) =>
          provider === "gemini" ? customModels : [],
      }),
    ).toBe(6);

    requestRef.current = createRequest({
      provider: "openai",
      model: "custom-reference-model",
    });

    expect(
      getPendingPromptReferenceMaxCount({
        requestRef,
        getCustomModelsForProvider: (provider) =>
          provider === "gemini" ? customModels : [],
      }),
    ).toBe(0);
  });

  it("commits a pending reference into inline prompt parts", async () => {
    const insertReference = vi.fn((referenceId: string) => [
      { type: "text" as const, text: "参考 " },
      { type: "reference" as const, referenceId },
    ]);
    const harness = createCommitHarness({ insertReference });
    const onReferenceCommit = vi.fn(async () => ({
      enabled: true,
      elementCount: 1,
      textCount: 0,
      items: [{ id: "image-1", index: 1, kind: "image" as const, label: "图 1" }],
      image: {
        mimeType: "image/png",
        dataBase64: "abc",
      },
    }));
    const onReferenceRemove = vi.fn();

    const committed = await commitPendingPromptReference({
      ...harness,
      getMaxPromptReferenceCount: () => 4,
      onReferenceCommit,
      onReferenceRemove,
    });

    expect(committed).toBe(true);
    expect(onReferenceCommit).toHaveBeenCalledTimes(1);
    expect(insertReference).toHaveBeenCalledTimes(1);
    expect(onReferenceRemove).toHaveBeenCalledTimes(1);
    const promptReference = harness.promptReferencesRef.current[0];
    expect(promptReference).toMatchObject({
      label: "图片",
      thumbnailDataUrl: "data:image/png;base64,abc",
    });
    expect(harness.requestRef.current).toMatchObject({
      reference: null,
      prompt: "参考 ",
      promptReferences: [promptReference],
      promptParts: [
        { type: "text", text: "参考 " },
        { type: "reference", referenceId: promptReference.id },
      ],
    });
    expect(harness.committingReferenceRef.current).toBe(false);
  });

  it("falls back to appending a reference part when the editor is not ready", async () => {
    const harness = createCommitHarness({
      promptEditorParts: [{ type: "text", text: "已有 " }],
    });

    await commitPendingPromptReference({
      ...harness,
      getMaxPromptReferenceCount: () => 4,
      onReferenceCommit: async () => ({
        enabled: true,
        elementCount: 1,
        textCount: 0,
        image: {
          mimeType: "image/png",
          dataBase64: "abc",
        },
      }),
    });

    const promptReference = harness.promptReferencesRef.current[0];
    expect(harness.requestRef.current.promptParts).toEqual([
      { type: "text", text: "已有 " },
      { type: "reference", referenceId: promptReference.id },
    ]);
  });

  it("does nothing when there is no enabled pending reference", async () => {
    const harness = createCommitHarness({
      request: createRequest({ reference: null }),
    });
    const onReferenceCommit = vi.fn();

    const committed = await commitPendingPromptReference({
      ...harness,
      getMaxPromptReferenceCount: () => 4,
      onReferenceCommit,
    });

    expect(committed).toBe(false);
    expect(onReferenceCommit).not.toHaveBeenCalled();
    expect(harness.updateRequest).not.toHaveBeenCalled();
  });

  it("does nothing when the inline reference limit has been reached", async () => {
    const existingReference: GenerationPromptReferencePayload = {
      id: "existing",
      label: "图片",
      enabled: true,
      elementCount: 1,
      textCount: 0,
    };
    const harness = createCommitHarness({
      references: [existingReference],
    });
    const onReferenceCommit = vi.fn();

    const committed = await commitPendingPromptReference({
      ...harness,
      getMaxPromptReferenceCount: () => 1,
      onReferenceCommit,
    });

    expect(committed).toBe(false);
    expect(onReferenceCommit).not.toHaveBeenCalled();
    expect(harness.updateRequest).not.toHaveBeenCalled();
  });
});
