import { describe, expect, it, vi } from "vitest";

import {
  buildGenerateDialogOpenRequest,
  buildGeneratePromptReferenceState,
  buildDefaultGenerationRequest,
  buildGenerationRequestFromSelection,
  buildGenerateRequestChangeState,
  buildGenerateReferenceRemovalRequest,
  buildGenerationSourceChangeState,
  buildGenerationSubmitPlan,
  clearSubmittedPromptRequest,
  createPromptReferencePayload,
  executeGenerationSubmitPlan,
  formatGeneratePromptReferenceLimitMessage,
  filterPromptReferencesForParts,
  getInitialPromptParts,
  getGenerateRequestMaxPromptReferenceCount,
  getPromptReferenceLabel,
  getPromptReferenceThumbnail,
  partsToPlainPrompt,
  prepareGenerationSubmitRequest,
  runGenerateDialogOpenAction,
  runGenerateReferenceCommitAction,
  runGenerateReferenceRemovalAction,
  runGenerateRequestChangeAction,
  runGenerationSourceChangeAction,
  shouldBuildGenerateDialogSelectionReference,
  stripReferenceItemThumbnails,
} from "./generatePromptRequest";
import type {
  CustomProviderModel,
  GenerationPromptReferencePayload,
  GenerationRequest,
  ProviderCapabilities,
} from "../shared/providerTypes";
import { setActiveDesktopLocale } from "./copy";
import type { PublicProviderSettings } from "../shared/desktopBridgeTypes";

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

const createCapabilities = (
  patch: Partial<ProviderCapabilities> = {},
): ProviderCapabilities => ({
  supportsNegativePrompt: false,
  supportsSeed: false,
  supportsImageCount: false,
  supportsReferenceImages: false,
  maxImageCount: 1,
  maxReferenceImageCount: 0,
  sizeControlMode: "aspect-ratio",
  ...patch,
});

const providerSettings: PublicProviderSettings = {
  gemini: {
    defaultModel: "gemini-2.5-flash-image",
    isConfigured: false,
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
  zenmux: {
    defaultModel: "google/gemini-3-pro-image-preview",
    isConfigured: false,
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
  fal: {
    defaultModel: "fal-ai/nano-banana-2",
    isConfigured: true,
    lastStatus: "success",
    lastCheckedAt: null,
    lastError: null,
  },
  jimeng: {
    defaultModel: "doubao-seedream-5-0-lite-260128",
    isConfigured: true,
    lastStatus: "success",
    lastCheckedAt: null,
    lastError: null,
  },
  openai: {
    defaultModel: "gpt-image-1.5",
    isConfigured: false,
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
  openrouter: {
    defaultModel: "google/gemini-3.1-flash-image-preview",
    isConfigured: false,
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
};

describe("generatePromptRequest", () => {
  it("derives initial prompt parts from existing parts or plain prompt", () => {
    expect(
      getInitialPromptParts(
        createRequest({
          prompt: "fallback",
          promptParts: [{ type: "text", text: "existing" }],
        }),
      ),
    ).toEqual([{ type: "text", text: "existing" }]);

    expect(
      getInitialPromptParts(createRequest({ prompt: "fallback" })),
    ).toEqual([{ type: "text", text: "fallback" }]);
  });

  it("builds a normalized empty generation request from a selected provider model", () => {
    expect(
      buildGenerationRequestFromSelection(
        {
          provider: "zenmux",
          model: "google/gemini-3-pro-image-preview",
        },
        null,
      ),
    ).toMatchObject({
      provider: "zenmux",
      model: "google/gemini-3-pro-image-preview",
      prompt: "",
      width: 1024,
      height: 1024,
      imageCount: 1,
      reference: null,
    });
  });

  it("builds the default generation request from remembered or configured model selection", () => {
    expect(
      buildDefaultGenerationRequest(providerSettings, {
        provider: "fal",
        model: "fal-ai/nano-banana-2",
      }),
    ).toMatchObject({
      provider: "fal",
      model: "fal-ai/nano-banana-2",
      prompt: "",
      width: 1024,
      height: 1024,
      imageCount: 1,
      reference: null,
    });

    expect(buildDefaultGenerationRequest(providerSettings, null)).toMatchObject(
      {
        provider: "fal",
        model: "fal-ai/nano-banana-2",
      },
    );
  });

  it("keeps plain prompt text and filters unreferenced prompt references", () => {
    const references: GenerationPromptReferencePayload[] = [
      {
        id: "keep",
        label: "图片",
        enabled: true,
        elementCount: 1,
        textCount: 0,
      },
      {
        id: "drop",
        label: "图片",
        enabled: true,
        elementCount: 1,
        textCount: 0,
      },
    ];
    const parts = [
      { type: "text" as const, text: "before " },
      { type: "reference" as const, referenceId: "keep" },
      { type: "text" as const, text: " after" },
    ];

    expect(partsToPlainPrompt(parts)).toBe("before  after");
    expect(filterPromptReferencesForParts(references, parts)).toEqual([
      references[0],
    ]);
  });

  it("builds prompt reference metadata from an inline image or selected item", () => {
    expect(
      createPromptReferencePayload(
        {
          enabled: true,
          elementCount: 1,
          textCount: 0,
          items: [{ id: "image-1", index: 1, kind: "image", label: "图片 1" }],
          image: {
            mimeType: "image/png",
            dataBase64: "abc",
          },
        },
        "ref-fixed",
      ),
    ).toMatchObject({
      id: "ref-fixed",
      label: "图片",
      thumbnailDataUrl: "data:image/png;base64,abc",
    });

    expect(
      getPromptReferenceThumbnail({
        enabled: true,
        elementCount: 1,
        textCount: 0,
        items: [
          {
            id: "image-1",
            index: 1,
            kind: "image",
            label: "图片 1",
            thumbnailDataUrl: "data:image/jpeg;base64,thumb",
          },
        ],
      }),
    ).toBe("data:image/jpeg;base64,thumb");
  });

  it("localizes generated prompt reference labels", () => {
    setActiveDesktopLocale("en");

    expect(
      getPromptReferenceLabel({
        enabled: true,
        elementCount: 1,
        textCount: 0,
        items: [{ id: "image-1", index: 1, kind: "image", label: "原始标签" }],
      }),
    ).toBe("Image");
    expect(
      getPromptReferenceLabel({
        enabled: true,
        elementCount: 2,
        textCount: 1,
        items: [],
      }),
    ).toBe("Annotated image");
    setActiveDesktopLocale("zh-CN");
  });

  it("derives max prompt reference count from the current model capabilities", () => {
    const customModels: CustomProviderModel[] = [
      {
        id: "custom-reference-model",
        capabilityTemplate: "image-editing-aspect-ratio",
        capabilities: createCapabilities({
          supportsReferenceImages: true,
          maxReferenceImageCount: 5,
        }),
      },
      {
        id: "custom-text-model",
        capabilityTemplate: "text-to-image-aspect-ratio",
        capabilities: createCapabilities({
          supportsReferenceImages: false,
          maxReferenceImageCount: 9,
        }),
      },
    ];

    expect(
      getGenerateRequestMaxPromptReferenceCount({
        request: createRequest({
          provider: "zenmux",
          model: "custom-reference-model",
        }),
        customModels,
      }),
    ).toBe(5);

    expect(
      getGenerateRequestMaxPromptReferenceCount({
        request: createRequest({
          provider: "zenmux",
          model: "custom-text-model",
        }),
        customModels,
      }),
    ).toBe(0);
  });

  it("removes heavy thumbnails before submitting a request", () => {
    const stripped = stripReferenceItemThumbnails(
      createRequest({
        reference: {
          enabled: true,
          elementCount: 1,
          textCount: 0,
          items: [
            {
              id: "image-1",
              index: 1,
              kind: "image",
              label: "图片 1",
              thumbnailDataUrl: "data:image/png;base64,legacy",
            },
          ],
        },
        promptReferences: [
          {
            id: "ref-1",
            label: "图片",
            enabled: true,
            elementCount: 1,
            textCount: 0,
            thumbnailDataUrl: "data:image/png;base64,prompt",
            items: [
              {
                id: "image-1",
                index: 1,
                kind: "image",
                label: "图片 1",
                thumbnailDataUrl: "data:image/png;base64,item",
              },
            ],
          },
        ],
      }),
    );

    expect(stripped.reference?.items?.[0]).not.toHaveProperty(
      "thumbnailDataUrl",
    );
    expect(stripped.promptReferences?.[0]).not.toHaveProperty(
      "thumbnailDataUrl",
    );
    expect(stripped.promptReferences?.[0]?.items?.[0]).not.toHaveProperty(
      "thumbnailDataUrl",
    );
  });

  it("prepares a submit request with normalized source and inline references only", () => {
    const prepared = prepareGenerationSubmitRequest({
      request: createRequest({
        generationSource: "builtin",
        reference: {
          enabled: true,
          elementCount: 1,
          textCount: 0,
          items: [
            {
              id: "legacy-image",
              index: 1,
              kind: "image",
              label: "图片 1",
              thumbnailDataUrl: "data:image/png;base64,legacy",
            },
          ],
        },
        promptReferences: [
          {
            id: "ref-1",
            label: "图片",
            enabled: true,
            elementCount: 1,
            textCount: 0,
            thumbnailDataUrl: "data:image/png;base64,prompt",
          },
        ],
      }),
      generationSource: "agent",
      customModels: [],
    });

    expect(prepared.generationSource).toBe("agent");
    expect(prepared.reference).toBeNull();
    expect(prepared.promptReferences?.[0]).not.toHaveProperty(
      "thumbnailDataUrl",
    );
  });

  it("skips reopening the current selection reference after the user removed it", () => {
    expect(
      shouldBuildGenerateDialogSelectionReference({
        selectionReferenceSignature: "image-1",
        removedSelectionReferenceSignature: "image-1",
      }),
    ).toBe(false);
    expect(
      shouldBuildGenerateDialogSelectionReference({
        selectionReferenceSignature: "image-1",
        removedSelectionReferenceSignature: null,
      }),
    ).toBe(true);
    expect(
      shouldBuildGenerateDialogSelectionReference({
        selectionReferenceSignature: null,
        removedSelectionReferenceSignature: "image-1",
      }),
    ).toBe(true);
  });

  it("builds the request used when opening the generate dialog", () => {
    const reference = {
      enabled: true,
      elementCount: 1,
      textCount: 0,
      items: [
        {
          id: "image-1",
          index: 1,
          kind: "image" as const,
          label: "图片 1",
        },
      ],
    };

    expect(
      buildGenerateDialogOpenRequest({
        currentRequest: createRequest({
          prompt: "旧 prompt",
          reference: null,
        }),
        nextRequest: {
          prompt: "新 prompt",
        },
        reference,
        customModels: [],
      }),
    ).toMatchObject({
      prompt: "新 prompt",
      reference: {
        items: reference.items,
      },
    });
  });

  it("opens the generate dialog by clearing stale removed references and applying the selected reference", async () => {
    const reference = {
      enabled: true,
      elementCount: 1,
      textCount: 0,
      items: [
        {
          id: "image-1",
          index: 1,
          kind: "image" as const,
          label: "图片 1",
        },
      ],
    };
    const setRemovedSelectionReferenceSignature = vi.fn();
    const readSelectionReference = vi.fn(async () => reference);
    const clearGenerationError = vi.fn();
    const updateGenerateRequest = vi.fn();
    const focusGenerateInput = vi.fn();

    const result = await runGenerateDialogOpenAction({
      selectionReferenceSignature: "current-selection",
      removedSelectionReferenceSignature: "old-selection",
      setRemovedSelectionReferenceSignature,
      nextRequest: {
        prompt: "打开后带入 prompt",
      },
      providerSettings,
      readSelectionReference,
      clearGenerationError,
      updateGenerateRequest,
      focusGenerateInput,
    });

    expect(result).toMatchObject({
      shouldBuildReference: true,
      removedSelectionReferenceSignature: null,
    });
    expect(setRemovedSelectionReferenceSignature).toHaveBeenCalledWith(null);
    expect(readSelectionReference).toHaveBeenCalledTimes(1);
    expect(clearGenerationError).toHaveBeenCalledTimes(1);
    expect(focusGenerateInput).toHaveBeenCalledTimes(1);

    const updater = updateGenerateRequest.mock.calls[0]?.[0] as (
      current: GenerationRequest,
    ) => GenerationRequest;
    expect(
      updater(
        createRequest({
          prompt: "旧 prompt",
          reference: null,
        }),
      ),
    ).toMatchObject({
      prompt: "打开后带入 prompt",
      reference: {
        items: reference.items,
      },
    });
  });

  it("opens the generate dialog without rebuilding a reference the user just removed", async () => {
    const setRemovedSelectionReferenceSignature = vi.fn();
    const readSelectionReference = vi.fn();
    const clearGenerationError = vi.fn();
    const updateGenerateRequest = vi.fn();
    const focusGenerateInput = vi.fn();

    const result = await runGenerateDialogOpenAction({
      selectionReferenceSignature: "same-selection",
      removedSelectionReferenceSignature: "same-selection",
      setRemovedSelectionReferenceSignature,
      providerSettings,
      readSelectionReference,
      clearGenerationError,
      updateGenerateRequest,
      focusGenerateInput,
    });

    expect(result).toMatchObject({
      shouldBuildReference: false,
      reference: null,
      removedSelectionReferenceSignature: "same-selection",
    });
    expect(setRemovedSelectionReferenceSignature).not.toHaveBeenCalled();
    expect(readSelectionReference).not.toHaveBeenCalled();

    const updater = updateGenerateRequest.mock.calls[0]?.[0] as (
      current: GenerationRequest,
    ) => GenerationRequest;
    expect(
      updater(
        createRequest({
          prompt: "保留原 prompt",
          reference: {
            enabled: true,
            elementCount: 1,
            textCount: 0,
          },
        }),
      ),
    ).toMatchObject({
      prompt: "保留原 prompt",
      reference: null,
    });
  });

  it("builds the request used when removing the pending reference", () => {
    expect(
      buildGenerateReferenceRemovalRequest({
        currentRequest: createRequest({
          prompt: "保留提示词",
          promptParts: [{ type: "text", text: "保留提示词" }],
          promptReferences: [
            {
              id: "inline-ref-1",
              label: "图片",
              enabled: true,
              elementCount: 1,
              textCount: 0,
            },
          ],
          reference: {
            enabled: true,
            elementCount: 1,
            textCount: 0,
          },
        }),
        customModels: [],
      }),
    ).toMatchObject({
      prompt: "保留提示词",
      promptParts: [{ type: "text", text: "保留提示词" }],
      promptReferences: [
        {
          id: "inline-ref-1",
          label: "图片",
        },
      ],
      reference: null,
    });
  });

  it("removes the pending reference through the owner action", () => {
    const setRemovedSelectionReferenceSignature = vi.fn();
    const updateGenerateRequest = vi.fn();

    const state = runGenerateReferenceRemovalAction({
      selectionReferenceSignature: "selected-image-signature",
      customModels: [],
      setRemovedSelectionReferenceSignature,
      updateGenerateRequest,
    });

    expect(state).toEqual({
      removedSelectionReferenceSignature: "selected-image-signature",
    });
    expect(setRemovedSelectionReferenceSignature).toHaveBeenCalledWith(
      "selected-image-signature",
    );
    expect(updateGenerateRequest).toHaveBeenCalledTimes(1);

    const updater = updateGenerateRequest.mock.calls[0]?.[0] as (
      current: GenerationRequest,
    ) => GenerationRequest;
    expect(
      updater(
        createRequest({
          prompt: "保留提示词",
          promptParts: [{ type: "text", text: "保留提示词" }],
          promptReferences: [
            {
              id: "inline-ref-1",
              label: "图片",
              enabled: true,
              elementCount: 1,
              textCount: 0,
            },
          ],
          reference: {
            enabled: true,
            elementCount: 1,
            textCount: 0,
          },
        }),
      ),
    ).toMatchObject({
      prompt: "保留提示词",
      promptParts: [{ type: "text", text: "保留提示词" }],
      promptReferences: [
        {
          id: "inline-ref-1",
          label: "图片",
        },
      ],
      reference: null,
    });
  });

  it("commits the pending reference after loading original image files", async () => {
    const calls: string[] = [];
    const sourceScene = { id: "thumbnail-scene" };
    const originalScene = { id: "original-scene" };
    const reference = {
      enabled: true,
      elementCount: 1,
      textCount: 0,
      image: {
        mimeType: "image/png",
        dataBase64: "original-image",
      },
    };
    const loadOriginalScene = vi.fn(async (scene: typeof sourceScene) => {
      calls.push("load-original");
      expect(scene).toBe(sourceScene);
      return originalScene;
    });
    const readSelectionReference = vi.fn(
      async (scene: typeof originalScene) => {
        calls.push("read-reference");
        expect(scene).toBe(originalScene);
        return reference;
      },
    );

    await expect(
      runGenerateReferenceCommitAction({
        sourceScene,
        loadOriginalScene,
        readSelectionReference,
      }),
    ).resolves.toBe(reference);

    expect(calls).toEqual(["load-original", "read-reference"]);
  });

  it("builds state updates for generation request changes", () => {
    expect(
      buildGenerateRequestChangeState({
        request: createRequest({
          generationSource: "builtin",
          prompt: "新的直接输入",
        }),
        customModels: [],
      }),
    ).toMatchObject({
      generationSource: "builtin",
      showDirectGenerationRecords: true,
      request: {
        generationSource: "builtin",
        prompt: "新的直接输入",
      },
    });

    expect(
      buildGenerateRequestChangeState({
        request: createRequest({
          prompt: "没有切换模式",
        }),
        customModels: [],
      }),
    ).toMatchObject({
      generationSource: null,
      showDirectGenerationRecords: false,
      request: {
        prompt: "没有切换模式",
      },
    });
  });

  it("builds state updates for generation source changes", () => {
    expect(
      buildGenerationSourceChangeState({
        source: "builtin",
        currentRequest: createRequest({
          generationSource: "agent",
          prompt: "保留提示词",
        }),
      }),
    ).toMatchObject({
      generationSource: "builtin",
      showDirectGenerationRecords: true,
      request: {
        generationSource: "builtin",
        prompt: "保留提示词",
      },
    });

    expect(
      buildGenerationSourceChangeState({
        source: "agent",
        currentRequest: createRequest({
          generationSource: "builtin",
          prompt: "保留提示词",
        }),
      }),
    ).toMatchObject({
      generationSource: "agent",
      showDirectGenerationRecords: false,
      request: {
        generationSource: "agent",
        prompt: "保留提示词",
      },
    });
  });

  it("applies generation request changes through the owner action", () => {
    const setGenerationSource = vi.fn();
    const showDirectGenerationRecords = vi.fn();
    const setGenerateRequest = vi.fn();

    const state = runGenerateRequestChangeAction({
      request: createRequest({
        generationSource: "builtin",
        prompt: "切回直接输入",
      }),
      customModels: [],
      setGenerationSource,
      showDirectGenerationRecords,
      setGenerateRequest,
    });

    expect(state).toMatchObject({
      generationSource: "builtin",
      showDirectGenerationRecords: true,
      request: {
        generationSource: "builtin",
        prompt: "切回直接输入",
      },
    });
    expect(setGenerationSource).toHaveBeenCalledWith("builtin");
    expect(showDirectGenerationRecords).toHaveBeenCalledTimes(1);
    expect(setGenerateRequest).toHaveBeenCalledWith(state.request);
  });

  it("applies generation source changes with a request updater", () => {
    const setGenerationSource = vi.fn();
    const showDirectGenerationRecords = vi.fn();
    const updateGenerateRequest = vi.fn();

    const state = runGenerationSourceChangeAction({
      source: "agent",
      currentRequest: createRequest({
        generationSource: "builtin",
        prompt: "当前闭包里的提示词",
      }),
      setGenerationSource,
      showDirectGenerationRecords,
      updateGenerateRequest,
    });

    expect(state).toMatchObject({
      generationSource: "agent",
      showDirectGenerationRecords: false,
    });
    expect(setGenerationSource).toHaveBeenCalledWith("agent");
    expect(showDirectGenerationRecords).not.toHaveBeenCalled();
    expect(updateGenerateRequest).toHaveBeenCalledTimes(1);

    const updater = updateGenerateRequest.mock.calls[0]?.[0] as (
      current: GenerationRequest,
    ) => GenerationRequest;
    expect(
      updater(
        createRequest({
          generationSource: "builtin",
          prompt: "最新 state 里的提示词",
        }),
      ),
    ).toMatchObject({
      generationSource: "agent",
      prompt: "最新 state 里的提示词",
    });
  });

  it("clears prompt fields after submit without changing the selected reference", () => {
    const request = createRequest({
      prompt: "保留参考图再清空提示词",
      promptParts: [{ type: "text", text: "保留参考图再清空提示词" }],
      promptReferences: [
        {
          id: "ref-1",
          label: "图片",
          enabled: true,
          elementCount: 1,
          textCount: 0,
        },
      ],
      reference: {
        enabled: true,
        elementCount: 1,
        textCount: 0,
      },
    });

    expect(clearSubmittedPromptRequest(request)).toMatchObject({
      prompt: "",
      promptParts: [],
      promptReferences: [],
      reference: request.reference,
    });
  });

  it("derives built-in prompt reference state and limit reasons", () => {
    const pendingReference = {
      enabled: true,
      elementCount: 1,
      textCount: 0,
      items: [
        {
          id: "image-1",
          index: 1,
          kind: "image" as const,
          label: "图片 1",
        },
      ],
    };

    expect(
      buildGeneratePromptReferenceState({
        request: createRequest({
          prompt: "",
          reference: pendingReference,
          promptReferences: [
            {
              id: "existing",
              label: "图片",
              enabled: true,
              elementCount: 1,
              textCount: 0,
            },
          ],
        }),
        generationSource: "builtin",
        maxPromptReferenceCount: 2,
      }),
    ).toMatchObject({
      promptReferenceCount: 1,
      hasPendingReference: true,
      hasUsablePendingReference: true,
      referenceLimitExceeded: false,
      referenceLimitReached: false,
      referenceLimitReason: null,
      pendingReference,
      hasInlineReferenceVisuals: true,
      hasSubmitContent: false,
    });

    expect(
      buildGeneratePromptReferenceState({
        request: createRequest({
          promptReferences: [
            {
              id: "a",
              label: "图片",
              enabled: true,
              elementCount: 1,
              textCount: 0,
            },
            {
              id: "b",
              label: "图片",
              enabled: true,
              elementCount: 1,
              textCount: 0,
            },
          ],
        }),
        generationSource: "builtin",
        maxPromptReferenceCount: 1,
      }),
    ).toMatchObject({
      referenceLimitExceeded: true,
      referenceLimitReason: "exceeded",
      pendingReference: null,
      hasSubmitContent: false,
    });

    expect(
      buildGeneratePromptReferenceState({
        request: createRequest({
          reference: pendingReference,
        }),
        generationSource: "builtin",
        maxPromptReferenceCount: 0,
      }),
    ).toMatchObject({
      hasUsablePendingReference: false,
      referenceLimitReason: "unsupported",
      pendingReference: null,
      hasSubmitContent: false,
    });
  });

  it("does not treat a pending visual reference as an ACP instruction", () => {
    const pendingReference = {
      enabled: true,
      elementCount: 1,
      textCount: 0,
    };

    expect(
      buildGeneratePromptReferenceState({
        request: createRequest({
          prompt: "",
          reference: pendingReference,
        }),
        generationSource: "agent",
        maxPromptReferenceCount: 0,
      }),
    ).toMatchObject({
      hasPendingReference: true,
      hasUsablePendingReference: false,
      referenceLimitReason: null,
      pendingReference: null,
      hasInlineReferenceVisuals: false,
      hasSubmitContent: false,
    });
  });

  it("formats prompt reference limit messages from limit reasons", () => {
    const messages = {
      exceeded: "最多 {count} 张参考图。",
      unsupportedWithInlineReferences: "当前模型不支持已插入的参考图。",
      unsupported: "当前模型不支持参考图。",
      reached: "最多可插入 {count} 张参考图。",
    };

    expect(
      formatGeneratePromptReferenceLimitMessage({
        reason: "exceeded",
        maxPromptReferenceCount: 3,
        messages,
      }),
    ).toBe("最多 3 张参考图。");

    expect(
      formatGeneratePromptReferenceLimitMessage({
        reason: "unsupported-with-inline-references",
        maxPromptReferenceCount: 0,
        messages,
      }),
    ).toBe("当前模型不支持已插入的参考图。");

    expect(
      formatGeneratePromptReferenceLimitMessage({
        reason: "unsupported",
        maxPromptReferenceCount: 0,
        messages,
      }),
    ).toBe("当前模型不支持参考图。");

    expect(
      formatGeneratePromptReferenceLimitMessage({
        reason: "reached",
        maxPromptReferenceCount: 2,
        messages,
      }),
    ).toBe("最多可插入 2 张参考图。");

    expect(
      formatGeneratePromptReferenceLimitMessage({
        reason: null,
        maxPromptReferenceCount: 2,
        messages,
      }),
    ).toBeNull();
  });

  it("builds submit plans for prompt composer modes without leaking UI branching", () => {
    expect(
      buildGenerationSubmitPlan({
        isPromptComposerMode: false,
        canSubmit: true,
        generationSource: "builtin",
        hasPendingReferenceToCommit: false,
      }),
    ).toEqual({
      kind: "blocked",
      reason: "non-prompt-composer",
    });

    expect(
      buildGenerationSubmitPlan({
        isPromptComposerMode: true,
        canSubmit: false,
        generationSource: "builtin",
        hasPendingReferenceToCommit: false,
      }),
    ).toEqual({
      kind: "blocked",
      reason: "cannot-submit",
    });

    expect(
      buildGenerationSubmitPlan({
        isPromptComposerMode: true,
        canSubmit: true,
        generationSource: "agent",
        hasPendingReferenceToCommit: true,
      }),
    ).toEqual({ kind: "submit" });

    expect(
      buildGenerationSubmitPlan({
        isPromptComposerMode: true,
        canSubmit: true,
        generationSource: "builtin",
        hasPendingReferenceToCommit: true,
      }),
    ).toEqual({
      kind: "blocked",
      reason: "pending-reference-unconfirmed",
    });
  });

  it("executes only accepted submit plans", async () => {
    const submitPreparedRequest = vi.fn(() => {
      return undefined;
    });

    await expect(
      executeGenerationSubmitPlan({
        plan: { kind: "submit" },
        submitPreparedRequest,
      }),
    ).resolves.toBe(true);

    expect(submitPreparedRequest).toHaveBeenCalledTimes(1);

    await expect(
      executeGenerationSubmitPlan({
        plan: { kind: "blocked", reason: "cannot-submit" },
        submitPreparedRequest,
      }),
    ).resolves.toBe(false);

    expect(submitPreparedRequest).toHaveBeenCalledTimes(1);
  });
});
