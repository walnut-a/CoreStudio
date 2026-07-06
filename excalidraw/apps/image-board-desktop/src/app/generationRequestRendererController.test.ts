import type { AppState } from "@excalidraw/excalidraw/types";

import { describe, expect, it, vi } from "vitest";

import {
  buildGenerationErrorDisplayRendererRequest,
  createGenerationRequestRendererActions,
  prepareBuiltinGenerationRequestRendererAction,
  runGenerateRequestChangeRendererAction,
  runGenerationSourceChangeRendererAction,
} from "./generationRequestRendererController";

import type { PublicProviderSettings } from "../shared/desktopBridgeTypes";
import type { GenerationRequest } from "../shared/providerTypes";
import type { ImageRecordMap } from "../shared/projectTypes";

type ControllerScene = NonNullable<
  Parameters<typeof prepareBuiltinGenerationRequestRendererAction>[0]["sourceScene"]
>;
type ControllerSceneInput =
  Parameters<typeof prepareBuiltinGenerationRequestRendererAction>[0]["sourceScene"];

const baseAppState = {
  selectedElementIds: {
    "image-1": true,
  },
  selectedGroupIds: {},
  viewBackgroundColor: "#ffffff",
} as unknown as AppState;

const createRequest = (): GenerationRequest => ({
  provider: "zenmux",
  model: "custom-gpt-image",
  prompt: "把桌面 CNC 做得更简洁",
  width: 1024,
  height: 1024,
  imageCount: 1,
  seed: null,
  reference: {
    enabled: true,
    elementCount: 1,
    textCount: 0,
  },
});

describe("prepareBuiltinGenerationRequestRendererAction", () => {
  it("applies generation request changes with provider custom models", () => {
    const request: GenerationRequest = {
      ...createRequest(),
      generationSource: "builtin",
      model: "custom-seeded-model",
      imageCount: 9,
      seed: 42,
    };
    const providerSettings = {
      zenmux: {
        isConfigured: true,
        customModels: [
          {
            id: "custom-seeded-model",
            label: "自定义多图模型",
            capabilityTemplate: "seeded-exact",
          },
        ],
      },
    } as unknown as PublicProviderSettings;
    const setGenerationSource = vi.fn();
    const showDirectGenerationRecords = vi.fn();
    const setGenerateRequest = vi.fn();

    const state = runGenerateRequestChangeRendererAction({
      request,
      providerSettings,
      setGenerationSource,
      showDirectGenerationRecords,
      setGenerateRequest,
    });

    expect(state).toMatchObject({
      generationSource: "builtin",
      showDirectGenerationRecords: true,
      request: {
        model: "custom-seeded-model",
        imageCount: 4,
        seed: 42,
      },
    });
    expect(setGenerationSource).toHaveBeenCalledWith("builtin");
    expect(showDirectGenerationRecords).toHaveBeenCalledTimes(1);
    expect(setGenerateRequest).toHaveBeenCalledWith(state.request);
  });

  it("normalizes generation error display requests with provider custom models", () => {
    const request: GenerationRequest = {
      ...createRequest(),
      model: "custom-seeded-model",
      imageCount: 9,
      seed: 42,
    };
    const providerSettings = {
      zenmux: {
        isConfigured: true,
        customModels: [
          {
            id: "custom-seeded-model",
            label: "自定义多图模型",
            capabilityTemplate: "seeded-exact",
          },
        ],
      },
    } as unknown as PublicProviderSettings;

    expect(
      buildGenerationErrorDisplayRendererRequest({
        request,
        providerSettings,
      }),
    ).toMatchObject({
      model: "custom-seeded-model",
      imageCount: 4,
      seed: 42,
    });
  });

  it("applies generation source changes through a request updater", () => {
    const setGenerationSource = vi.fn();
    const showDirectGenerationRecords = vi.fn();
    const updateGenerateRequest = vi.fn();

    const state = runGenerationSourceChangeRendererAction({
      source: "agent",
      currentRequest: {
        ...createRequest(),
        generationSource: "builtin",
        prompt: "闭包里的旧提示词",
      },
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
      updater({
        ...createRequest(),
        generationSource: "builtin",
        prompt: "最新 state 里的提示词",
      }),
    ).toMatchObject({
      generationSource: "agent",
      prompt: "最新 state 里的提示词",
    });
  });

  it("creates renderer actions for request and source changes", () => {
    const providerSettings = {
      zenmux: {
        isConfigured: true,
        customModels: [
          {
            id: "custom-seeded-model",
            label: "自定义多图模型",
            capabilityTemplate: "seeded-exact",
          },
        ],
      },
    } as unknown as PublicProviderSettings;
    const request: GenerationRequest = {
      ...createRequest(),
      generationSource: "builtin",
      model: "custom-seeded-model",
      imageCount: 9,
      seed: 42,
    };
    const getProviderSettings = vi.fn(() => providerSettings);
    const getCurrentRequest = vi.fn(() => request);
    const setGenerationSource = vi.fn();
    const showDirectGenerationRecords = vi.fn();
    const setGenerateRequest = vi.fn();
    const updateGenerateRequest = vi.fn();
    const actions = createGenerationRequestRendererActions({
      getProviderSettings,
      getCurrentRequest,
      setGenerationSource,
      showDirectGenerationRecords,
      setGenerateRequest,
      updateGenerateRequest,
    });

    const requestState = actions.changeRequest(request);
    const sourceState = actions.changeSource("agent");

    expect(requestState).toMatchObject({
      generationSource: "builtin",
      request: {
        imageCount: 4,
        seed: 42,
      },
    });
    expect(sourceState).toMatchObject({
      generationSource: "agent",
    });
    expect(getProviderSettings).toHaveBeenCalledTimes(1);
    expect(getCurrentRequest).toHaveBeenCalledTimes(1);
    expect(setGenerateRequest).toHaveBeenCalledWith(requestState.request);
    expect(updateGenerateRequest).toHaveBeenCalledTimes(1);
  });

  it("loads original scene images and reads selection references with project image records", async () => {
    const sourceScene = {
      elements: [
        {
          id: "image-1",
          type: "image",
          isDeleted: false,
          groupIds: [],
          fileId: "file-1",
          x: 0,
          y: 0,
        },
      ],
      appState: baseAppState,
      files: {
        "file-1": {
          id: "file-1",
          mimeType: "image/png",
          dataURL: "data:image/png;base64,dGh1bWJuYWls",
          created: Date.now(),
        },
      },
    } as unknown as ControllerScene;
    const originalScene = {
      ...sourceScene,
      files: {
        "file-1": {
          id: "file-1",
          mimeType: "image/png",
          dataURL: "data:image/png;base64,b3JpZ2luYWw=",
          created: Date.now(),
        },
      },
    } as unknown as ControllerScene;
    const imageRecords: ImageRecordMap = {
      "file-1": {
        fileId: "file-1",
        assetPath: "assets/file-1.png",
        sourceType: "generated",
        provider: "zenmux",
        model: "custom-gpt-image",
        width: 1024,
        height: 1024,
        createdAt: "2026-07-05T00:00:00.000Z",
        mimeType: "image/png",
        parentFileId: "file-0",
      },
    };
    const providerSettings = {
      zenmux: {
        isConfigured: true,
        customModels: [
          {
            id: "custom-gpt-image",
            label: "自定义 GPT Image",
            capabilityTemplate: "image-editing-aspect-ratio",
          },
        ],
      },
    } as unknown as PublicProviderSettings;
    const loadOriginalScene = vi.fn(
      async (_scene: ControllerSceneInput) => originalScene,
    );
    const assertProjectActive = vi.fn();

    const preparedRequest = await prepareBuiltinGenerationRequestRendererAction({
      request: createRequest(),
      providerSettings,
      sourceScene,
      imageRecords,
      loadOriginalScene,
      assertProjectActive,
    });

    expect(loadOriginalScene).toHaveBeenCalledWith(sourceScene);
    expect(assertProjectActive).toHaveBeenCalledTimes(2);
    expect(preparedRequest).toMatchObject({
      model: "custom-gpt-image",
      reference: {
        enabled: true,
        elementCount: 1,
        textCount: 0,
        image: {
          mimeType: "image/png",
          dataBase64: "b3JpZ2luYWw=",
        },
        debug: {
          fileId: "file-1",
          sourceType: "generated",
          sourceProvider: "zenmux",
          sourceModel: "custom-gpt-image",
          parentFileId: "file-0",
        },
      },
    });
  });
});
