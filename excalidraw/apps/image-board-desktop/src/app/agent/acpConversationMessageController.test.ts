import { describe, expect, it, vi } from "vitest";

import {
  createAcpConversationMessageRendererActions,
  runAcpConversationMessageRendererAction,
  runAcpConversationMessageSubmit,
} from "./acpConversationMessageController";

import type {
  GenerationReferencePayload,
  GenerationRequest,
} from "../../shared/providerTypes";

const createRequest = (
  patch: Partial<GenerationRequest> = {},
): GenerationRequest => ({
  generationSource: "builtin",
  provider: "gemini",
  model: "gemini-2.5-flash-image-preview",
  prompt: "上一轮 prompt",
  width: 1024,
  height: 1024,
  imageCount: 1,
  reference: null,
  promptParts: [{ type: "text", text: "上一轮 prompt" }],
  promptReferences: [],
  ...patch,
});

const createReference = (): GenerationReferencePayload => ({
  enabled: true,
  elementCount: 1,
  textCount: 0,
  items: [
    {
      id: "image-element",
      index: 1,
      kind: "image",
      label: "图片",
      fileId: "image-file",
    },
  ],
});

describe("runAcpConversationMessageSubmit", () => {
  it("builds the current selection reference and submits an ACP follow-up request", async () => {
    const reference = createReference();
    const buildSelectionReference = vi.fn().mockResolvedValue(reference);
    const submitGenerationRequest = vi.fn().mockResolvedValue(undefined);

    await runAcpConversationMessageSubmit({
      message: "继续优化",
      currentRequest: createRequest(),
      customModels: [],
      selectionReferenceSignature: "image-element",
      removedSelectionReferenceSignature: null,
      buildSelectionReference,
      submitGenerationRequest,
    });

    expect(buildSelectionReference).toHaveBeenCalledTimes(1);
    expect(submitGenerationRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        generationSource: "agent",
        prompt: "继续优化",
        promptParts: [],
        promptReferences: [],
        reference: expect.objectContaining({
          items: reference.items,
        }),
      }),
    );
  });

  it("keeps an explicitly removed selection reference out of the follow-up request", async () => {
    const buildSelectionReference = vi.fn();
    const submitGenerationRequest = vi.fn().mockResolvedValue(undefined);

    await runAcpConversationMessageSubmit({
      message: "只根据上下文继续",
      currentRequest: createRequest({ reference: createReference() }),
      customModels: [],
      selectionReferenceSignature: "image-element",
      removedSelectionReferenceSignature: "image-element",
      buildSelectionReference,
      submitGenerationRequest,
    });

    expect(buildSelectionReference).not.toHaveBeenCalled();
    expect(submitGenerationRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        generationSource: "agent",
        prompt: "只根据上下文继续",
        reference: null,
      }),
    );
  });
});

describe("runAcpConversationMessageRendererAction", () => {
  const createScene = () =>
    ({
      elements: [
        {
          id: "image-element",
          type: "image",
          fileId: "image-file",
          isDeleted: false,
          groupIds: [],
        },
      ],
      appState: {
        selectedElementIds: {
          "image-element": true,
        },
        selectedGroupIds: {},
        viewBackgroundColor: "#ffffff",
      },
      files: {
        "image-file": {
          dataURL: "data:image/png;base64,abc",
        },
      },
    }) as any;

  it("derives the selection reference and provider models from renderer state", async () => {
    const submitGenerationRequest = vi.fn().mockResolvedValue(undefined);
    let scene: ReturnType<typeof createScene> = {
      elements: [],
      appState: {
        selectedElementIds: {},
        selectedGroupIds: {},
        viewBackgroundColor: "#ffffff",
      },
      files: {},
    };
    let imageRecords: any = null;

    scene = createScene();
    imageRecords = {
      "image-file": {
        fileId: "image-file",
        assetPath: "assets/image-file.png",
        sourceType: "generated",
        provider: "gemini",
        model: "gemini-2.5-flash-image-preview",
        prompt: "参考图",
        width: 1024,
        height: 1024,
        mimeType: "image/png",
        createdAt: "2026-07-05T00:00:00.000Z",
      },
    };
    await runAcpConversationMessageRendererAction({
      message: "继续优化",
      currentRequest: createRequest({
        provider: "openrouter",
        model: "custom-image-agent",
      }),
      providerSettings: {
        openrouter: {
          isConfigured: true,
          defaultModel: "custom-image-agent",
          customModels: [
            {
              id: "custom-image-agent",
              capabilityTemplate: "image-editing-aspect-ratio",
            },
          ],
        },
      } as any,
      getScene: () => scene,
      getImageRecords: () => imageRecords,
      removedSelectionReferenceSignature: null,
      submitGenerationRequest,
    });

    expect(submitGenerationRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        generationSource: "agent",
        provider: "openrouter",
        model: "custom-image-agent",
        prompt: "继续优化",
        reference: expect.objectContaining({
          items: [
            expect.objectContaining({
              id: "image-element",
              fileId: "image-file",
              thumbnailDataUrl: "data:image/png;base64,abc",
            }),
          ],
        }),
      }),
    );
  });

  it("does not rebuild the current selection when it was explicitly removed", async () => {
    const submitGenerationRequest = vi.fn().mockResolvedValue(undefined);

    await runAcpConversationMessageRendererAction({
      message: "只按上下文继续",
      currentRequest: createRequest({ reference: createReference() }),
      providerSettings: null,
      getScene: createScene,
      getImageRecords: () => null,
      removedSelectionReferenceSignature: "image-element",
      submitGenerationRequest,
    });

    expect(submitGenerationRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "只按上下文继续",
        reference: null,
      }),
    );
  });
});

describe("createAcpConversationMessageRendererActions", () => {
  const createScene = () =>
    ({
      elements: [
        {
          id: "image-element",
          type: "image",
          fileId: "image-file",
          isDeleted: false,
          groupIds: [],
        },
      ],
      appState: {
        selectedElementIds: {
          "image-element": true,
        },
        selectedGroupIds: {},
        viewBackgroundColor: "#ffffff",
      },
      files: {
        "image-file": {
          dataURL: "data:image/png;base64,abc",
        },
      },
    }) as any;

  it("creates a submit action that reads current request and removed selection state", async () => {
    const submitGenerationRequest = vi.fn().mockResolvedValue(undefined);
    let request = createRequest();
    let removedSelectionReferenceSignature: string | null = "image-element";
    const actions = createAcpConversationMessageRendererActions({
      getCurrentRequest: () => request,
      getProviderSettings: () => null,
      getScene: createScene,
      getImageRecords: () => null,
      getRemovedSelectionReferenceSignature: () =>
        removedSelectionReferenceSignature,
      submitGenerationRequest,
    });

    request = createRequest({
      provider: "openai",
      model: "gpt-image-1.5",
      reference: createReference(),
    });
    removedSelectionReferenceSignature = "image-element";
    await actions.submitMessage("只按上下文继续");

    expect(submitGenerationRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        generationSource: "agent",
        provider: "openai",
        model: "gpt-image-1.5",
        prompt: "只按上下文继续",
        reference: null,
      }),
    );
  });
});
