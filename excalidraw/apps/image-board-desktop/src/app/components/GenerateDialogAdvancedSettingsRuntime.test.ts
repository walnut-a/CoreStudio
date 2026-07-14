import { describe, expect, it, vi } from "vitest";

import {
  createGenerateDialogAdvancedSettingsActions,
  createGenerateDialogAdvancedSettingsRuntime,
} from "./GenerateDialogAdvancedSettingsRuntime";

import type {
  AspectRatioOption,
  GenerationField,
  GenerationRequest,
  ProviderModelDefinition,
} from "../../shared/providerTypes";

const request: GenerationRequest = {
  provider: "gemini",
  model: "model-a",
  prompt: "一台桌面 CNC",
  negativePrompt: "不要文字",
  aspectRatio: "4:3",
  width: 1024,
  height: 768,
  seed: 12,
  imageCount: 1,
};

const providerModels: Record<string, ProviderModelDefinition> = {
  "model-a": {
    id: "model-a",
    label: "模型 A",
    capabilities: {
      supportsNegativePrompt: true,
      supportsSeed: true,
      supportsImageCount: true,
      supportsReferenceImages: true,
      maxImageCount: 4,
      maxReferenceImageCount: 4,
      sizeControlMode: "aspect-ratio",
    },
  },
};

const visibleFields: Record<GenerationField, boolean> = {
  prompt: true,
  negativePrompt: true,
  width: true,
  height: true,
  aspectRatio: true,
  seed: true,
  imageCount: true,
};

const aspectRatioOptions: readonly AspectRatioOption[] = [
  { id: "4:3", label: "4:3", width: 4, height: 3 },
];

const createRuntimeInput = () => {
  const updateRequest = vi.fn(
    (
      updater:
        | GenerationRequest
        | ((current: GenerationRequest) => GenerationRequest),
    ) => (typeof updater === "function" ? updater(request) : updater),
  );

  return {
    request,
    providerSettings: {
      gemini: {
        isConfigured: true,
        defaultModel: "model-a",
        customModels: [],
      },
      zenmux: {
        isConfigured: false,
        customModels: [],
      },
      fal: {
        isConfigured: false,
        customModels: [],
      },
      jimeng: {
        isConfigured: false,
        customModels: [],
      },
      openai: {
        isConfigured: false,
        customModels: [],
      },
      openrouter: {
        isConfigured: false,
        customModels: [],
      },
    },
    providerModels,
    visibleFields,
    selectedAspectRatio: "4:3",
    aspectRatioOptions,
    configuredProviders: ["gemini"] as const,
    updateRequest,
    onModelSelectionChange: vi.fn(),
    handleTextInputKeyDown: vi.fn(),
  };
};

const createRuntime = (input = createRuntimeInput()) => {
  const {
    providerSettings,
    updateRequest,
    onModelSelectionChange,
    ...runtimeInput
  } = input;

  const advancedSettingsActions = createGenerateDialogAdvancedSettingsActions({
    providerSettings,
    aspectRatioOptions: runtimeInput.aspectRatioOptions,
    updateRequest,
    onModelSelectionChange,
  });

  return {
    input,
    runtime: createGenerateDialogAdvancedSettingsRuntime({
      ...runtimeInput,
      advancedSettingsActions,
    }),
  };
};

describe("createGenerateDialogAdvancedSettingsRuntime", () => {
  it("wires advanced field changes and model selection feedback", () => {
    const { input, runtime } = createRuntime();

    runtime.advancedSettingsProps.advancedFieldsProps.onModelChange("model-b");

    expect(input.updateRequest).toHaveBeenCalledWith(expect.any(Function));
    expect(input.onModelSelectionChange).toHaveBeenCalledWith({
      provider: "gemini",
      model: "model-b",
    });
  });
});
