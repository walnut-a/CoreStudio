import { describe, expect, it, vi } from "vitest";

import { ASPECT_RATIO_AUTO_ID } from "../shared/providerCatalog";
import { createGenerateAdvancedRequestHandlers } from "./generateAdvancedRequestHandlers";
import type { PublicProviderSettings } from "../shared/desktopBridgeTypes";
import type {
  CustomProviderModel,
  GenerationRequest,
  ProviderId,
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

const createSettings = (
  patch: Partial<PublicProviderSettings> = {},
): PublicProviderSettings =>
  ({
    gemini: {
      isConfigured: true,
      defaultModel: "gemini-2.5-flash-image-preview",
      customModels: [],
    },
    zenmux: {
      isConfigured: true,
      defaultModel: "gemini-3-pro-image-preview",
      customModels: [
        {
          id: "zen-custom",
          label: "Zen Custom",
          capabilityTemplate: "text-to-image-exact",
        },
      ],
    },
    fal: {
      isConfigured: false,
      defaultModel: "fal-ai/imagen4/preview",
      customModels: [],
    },
    jimeng: {
      isConfigured: false,
      defaultModel: "jimeng-3.1",
      customModels: [],
    },
    openai: {
      isConfigured: false,
      defaultModel: "gpt-image-1",
      customModels: [],
    },
    openrouter: {
      isConfigured: false,
      defaultModel: "google/gemini-3-pro-image-preview",
      customModels: [],
    },
    ...patch,
  }) as PublicProviderSettings;

const createHarness = ({
  initialRequest = createRequest(),
  providerSettings = createSettings(),
}: {
  initialRequest?: GenerationRequest;
  providerSettings?: PublicProviderSettings | null;
} = {}) => {
  let currentRequest = initialRequest;
  const onModelSelectionChange = vi.fn();
  const updateRequest = vi.fn(
    (
      updater:
        | GenerationRequest
        | ((current: GenerationRequest) => GenerationRequest),
      _customModels?: readonly CustomProviderModel[],
    ) => {
      currentRequest =
        typeof updater === "function" ? updater(currentRequest) : updater;
      return currentRequest;
    },
  );

  const handlers = createGenerateAdvancedRequestHandlers({
    providerSettings,
    aspectRatioOptions: [
      {
        id: "16:9",
        label: "16:9",
        width: 1536,
        height: 864,
      },
    ],
    updateRequest,
    onModelSelectionChange,
  });

  return {
    handlers,
    updateRequest,
    onModelSelectionChange,
    getRequest: () => currentRequest,
  };
};

describe("createGenerateAdvancedRequestHandlers", () => {
  it("switches provider with the provider default model and custom model list", () => {
    const { handlers, updateRequest, onModelSelectionChange, getRequest } =
      createHarness();

    handlers.changeProvider("zenmux");

    expect(getRequest()).toMatchObject({
      provider: "zenmux",
      model: "gemini-3-pro-image-preview",
    });
    expect(updateRequest).toHaveBeenLastCalledWith(
      expect.any(Function),
      [
        {
          id: "zen-custom",
          label: "Zen Custom",
          capabilityTemplate: "text-to-image-exact",
        },
      ],
    );
    expect(onModelSelectionChange).toHaveBeenCalledWith({
      provider: "zenmux",
      model: "gemini-3-pro-image-preview",
    });
  });

  it("switches model and reports the normalized model selection", () => {
    const { handlers, onModelSelectionChange, getRequest } = createHarness({
      initialRequest: createRequest({ provider: "zenmux" }),
    });

    handlers.changeModel("zen-custom");

    expect(getRequest()).toMatchObject({
      provider: "zenmux",
      model: "zen-custom",
    });
    expect(onModelSelectionChange).toHaveBeenCalledWith({
      provider: "zenmux",
      model: "zen-custom",
    });
  });

  it("updates aspect ratio dimensions and can reset aspect ratio to auto", () => {
    const { handlers, getRequest } = createHarness();

    handlers.changeAspectRatio("16:9");

    expect(getRequest()).toMatchObject({
      aspectRatio: "16:9",
      width: 1536,
      height: 864,
    });

    handlers.changeAspectRatio(ASPECT_RATIO_AUTO_ID);

    expect(getRequest()).toMatchObject({
      aspectRatio: null,
      width: 1536,
      height: 864,
    });
  });

  it("updates individual advanced request fields without touching other fields", () => {
    const { handlers, getRequest } = createHarness();

    handlers.changeNegativePrompt("不要文字");
    handlers.changeWidth(1280);
    handlers.changeHeight(960);
    handlers.changeSeed(42);
    handlers.changeImageCount(3);

    expect(getRequest()).toMatchObject({
      provider: "gemini" satisfies ProviderId,
      model: "gemini-2.5-flash-image-preview",
      negativePrompt: "不要文字",
      width: 1280,
      height: 960,
      seed: 42,
      imageCount: 3,
    });
  });
});
