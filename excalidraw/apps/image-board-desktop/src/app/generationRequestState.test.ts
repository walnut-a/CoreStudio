import { describe, expect, it, vi } from "vitest";

import {
  applyBuiltinGenerationExecutionPlanState,
  applyBuiltinGenerationSubmittedRequestState,
  buildBuiltinGenerationPreparedRequest,
  buildBuiltinGenerationReferencePlan,
  buildBuiltinGenerationSubmittedRequest,
  buildGenerationExecutionPlan,
  buildGenerationErrorDisplayRequest,
  prepareBuiltinGenerationRequestAction,
  syncSelectionReferenceIntoRequest,
} from "./generationRequestState";
import type { GenerationRequest } from "../shared/providerTypes";
import { setActiveDesktopLocale } from "./copy";

const createRequest = (): GenerationRequest => ({
  provider: "zenmux",
  model: "google/gemini-3-pro-image-preview",
  prompt: "优化刀盘结构",
  width: 1024,
  height: 1024,
  imageCount: 1,
  seed: null,
  reference: {
    enabled: true,
    elementCount: 1,
    textCount: 0,
    items: [
      {
        id: "image-1",
        index: 1,
        kind: "image",
        label: "图片",
      },
    ],
  },
});

describe("generationRequestState", () => {
  it("keeps the same request object when the selection summary is unchanged", () => {
    const request = createRequest();

    const next = syncSelectionReferenceIntoRequest(request, {
      enabled: true,
      elementCount: 1,
      textCount: 0,
      items: [
        {
          id: "image-1",
          index: 1,
          kind: "image",
          label: "图片",
        },
      ],
    });

    expect(next).toBe(request);
  });

  it("updates the request when the selection summary changes", () => {
    const request = createRequest();

    const next = syncSelectionReferenceIntoRequest(request, {
      enabled: true,
      elementCount: 2,
      textCount: 1,
      textNotes: ["保留整体比例"],
      items: [
        {
          id: "text-1",
          index: 1,
          kind: "text",
          label: "文本：保留整体比例",
        },
        {
          id: "image-1",
          index: 2,
          kind: "image",
          label: "图片",
        },
      ],
    });

    expect(next).not.toBe(request);
    expect(next.reference).toEqual({
      enabled: true,
      elementCount: 2,
      textCount: 1,
      textNotes: ["保留整体比例"],
      items: [
        {
          id: "text-1",
          index: 1,
          kind: "text",
          label: "文本：保留整体比例",
        },
        {
          id: "image-1",
          index: 2,
          kind: "image",
          label: "图片",
        },
      ],
    });
  });

  it("updates the request when reference item details change", () => {
    const request = createRequest();

    const next = syncSelectionReferenceIntoRequest(request, {
      enabled: true,
      elementCount: 1,
      textCount: 0,
      items: [
        {
          id: "image-2",
          index: 1,
          kind: "image",
          label: "图片",
        },
      ],
    });

    expect(next).not.toBe(request);
    expect(next.reference?.items?.[0]?.id).toBe("image-2");
  });

  it("automatically enables a newly synced selection reference", () => {
    const request: GenerationRequest = {
      ...createRequest(),
      reference: {
        enabled: false,
        elementCount: 1,
        textCount: 0,
      },
    };

    const next = syncSelectionReferenceIntoRequest(request, {
      enabled: true,
      elementCount: 3,
      textCount: 0,
    });

    expect(next.reference?.enabled).toBe(true);
    expect(next.reference?.elementCount).toBe(3);
  });

  it("routes ACP Agent requests to the external agent task path", () => {
    expect(
      buildGenerationExecutionPlan({
        ...createRequest(),
        generationSource: "agent",
      }),
    ).toEqual({
      kind: "start-acp-agent-task",
    });
  });

  it("routes builtin and legacy requests to CoreStudio generation records", () => {
    expect(
      buildGenerationExecutionPlan({
        ...createRequest(),
        generationSource: "builtin",
      }),
    ).toEqual({
      kind: "start-builtin-generation",
      generationSource: "builtin",
      showDirectGenerationRecords: true,
    });

    expect(buildGenerationExecutionPlan(createRequest())).toEqual({
      kind: "start-builtin-generation",
      generationSource: "builtin",
      showDirectGenerationRecords: true,
    });
  });

  it("applies builtin generation execution state through the owner action", () => {
    const setGenerationSource = vi.fn();
    const showDirectGenerationRecords = vi.fn();
    const state = applyBuiltinGenerationExecutionPlanState({
      plan: {
        kind: "start-builtin-generation",
        generationSource: "builtin",
        showDirectGenerationRecords: true,
      },
      setGenerationSource,
      showDirectGenerationRecords,
    });

    expect(state).toEqual({
      generationSource: "builtin",
      showDirectGenerationRecords: true,
    });
    expect(setGenerationSource).toHaveBeenCalledWith("builtin");
    expect(showDirectGenerationRecords).toHaveBeenCalledTimes(1);
  });

  it("clears the submitted prompt after starting a builtin generation while preserving request context", () => {
    const request: GenerationRequest = {
      ...createRequest(),
      prompt: "做一台更像苹果产品的桌面 CNC",
      promptParts: [
        {
          type: "text",
          text: "做一台更像苹果产品的桌面 CNC",
        },
        {
          type: "reference",
          referenceId: "ref-1",
        },
      ],
      promptReferences: [
        {
          id: "ref-1",
          label: "参考图",
          thumbnailDataUrl: "data:image/png;base64,thumb",
          enabled: true,
          elementCount: 1,
          textCount: 0,
        },
      ],
      generationSource: "builtin",
    };

    const next = buildBuiltinGenerationSubmittedRequest(request);

    expect(next).toEqual({
      ...request,
      prompt: "",
      promptParts: [],
      promptReferences: [],
    });
  });

  it("applies the submitted builtin generation request through the owner action", () => {
    const request: GenerationRequest = {
      ...createRequest(),
      prompt: "做一台更像苹果产品的桌面 CNC",
      promptParts: [
        {
          type: "text",
          text: "做一台更像苹果产品的桌面 CNC",
        },
      ],
      generationSource: "builtin",
    };
    const setGenerateRequest = vi.fn();

    const state = applyBuiltinGenerationSubmittedRequestState({
      request,
      setGenerateRequest,
    });

    expect(state).toEqual({
      ...request,
      prompt: "",
      promptParts: [],
      promptReferences: [],
    });
    expect(setGenerateRequest).toHaveBeenCalledWith(state);
  });

  it("prepares builtin generation requests without requiring a live selection reference when reference is disabled", () => {
    const request: GenerationRequest = {
      ...createRequest(),
      reference: {
        enabled: false,
        elementCount: 1,
        textCount: 0,
      },
    };

    expect(
      buildBuiltinGenerationPreparedRequest({
        request,
        selectionReference: null,
      }),
    ).toEqual(request);
  });

  it("requires an image payload when preparing an enabled selection reference", () => {
    expect(() =>
      buildBuiltinGenerationPreparedRequest({
        request: createRequest(),
        selectionReference: {
          enabled: true,
          elementCount: 1,
          textCount: 0,
          items: [
            {
              id: "shape-1",
              index: 1,
              kind: "shape",
              label: "矩形",
            },
          ],
        },
      }),
    ).toThrow("当前没有可用的选区参考，请重新选中元素后再试。");
  });

  it("localizes the missing selection reference error", () => {
    setActiveDesktopLocale("en");

    expect(() =>
      buildBuiltinGenerationPreparedRequest({
        request: createRequest(),
        selectionReference: {
          enabled: true,
          elementCount: 1,
          textCount: 0,
          items: [],
        },
      }),
    ).toThrow(
      "No usable selection reference is available. Select the elements again and retry.",
    );
    setActiveDesktopLocale("zh-CN");
  });

  it("merges the live image reference into the normalized builtin generation request", () => {
    const selectionReference = {
      enabled: false,
      elementCount: 2,
      textCount: 1,
      textNotes: ["保留圆角"],
      items: [
        {
          id: "image-1",
          index: 1,
          kind: "image" as const,
          label: "图片",
          fileId: "file-1",
        },
      ],
      image: {
        mimeType: "image/png",
        dataBase64: "original-image",
      },
    };

    expect(
      buildBuiltinGenerationPreparedRequest({
        request: createRequest(),
        selectionReference,
      }).reference,
    ).toEqual({
      ...selectionReference,
      enabled: true,
    });
  });

  it("requests a live selection reference only when builtin generation reference is enabled", () => {
    expect(
      buildBuiltinGenerationReferencePlan({
        request: createRequest(),
      }),
    ).toEqual({
      kind: "load-selection-reference",
    });

    expect(
      buildBuiltinGenerationReferencePlan({
        request: {
          ...createRequest(),
          reference: {
            enabled: false,
            elementCount: 1,
            textCount: 0,
          },
        },
      }),
    ).toEqual({
      kind: "skip-selection-reference",
    });

    expect(
      buildBuiltinGenerationReferencePlan({
        request: {
          ...createRequest(),
          reference: null,
        },
      }),
    ).toEqual({
      kind: "skip-selection-reference",
    });
  });

  it("prepares builtin generation without loading original images when reference is disabled", async () => {
    const request: GenerationRequest = {
      ...createRequest(),
      reference: {
        enabled: false,
        elementCount: 1,
        textCount: 0,
      },
    };
    const loadOriginalScene = vi.fn();
    const readSelectionReference = vi.fn();
    const assertProjectActive = vi.fn();

    await expect(
      prepareBuiltinGenerationRequestAction({
        request,
        sourceScene: { id: "current-scene" },
        loadOriginalScene,
        readSelectionReference,
        assertProjectActive,
      }),
    ).resolves.toEqual(request);

    expect(loadOriginalScene).not.toHaveBeenCalled();
    expect(readSelectionReference).not.toHaveBeenCalled();
    expect(assertProjectActive).not.toHaveBeenCalled();
  });

  it("loads original images before preparing an enabled builtin selection reference", async () => {
    const calls: string[] = [];
    const sourceScene = { id: "thumbnail-scene" };
    const originalScene = { id: "original-scene" };
    const selectionReference = {
      enabled: false,
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
        return selectionReference;
      },
    );
    const assertProjectActive = vi.fn(() => {
      calls.push("assert-active");
    });

    await expect(
      prepareBuiltinGenerationRequestAction({
        request: createRequest(),
        sourceScene,
        loadOriginalScene,
        readSelectionReference,
        assertProjectActive,
      }),
    ).resolves.toMatchObject({
      reference: {
        ...selectionReference,
        enabled: true,
      },
    });

    expect(calls).toEqual([
      "load-original",
      "assert-active",
      "read-reference",
      "assert-active",
    ]);
  });

  it("normalizes the request used for builtin generation error display", () => {
    const request: GenerationRequest = {
      ...createRequest(),
      imageCount: 9,
      reference: {
        enabled: true,
        elementCount: 1,
        textCount: 0,
      },
    };

    const displayRequest = buildGenerationErrorDisplayRequest({
      request,
    });

    expect(displayRequest.imageCount).toBe(1);
  });
});
