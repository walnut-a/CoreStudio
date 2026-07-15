import { describe, expect, it, vi } from "vitest";

import { createGenerateDialogAdvancedSettingsProps } from "./GenerateDialogAdvancedSettingsProps";

import type {
  AspectRatioOption,
  GenerationField,
  GenerationRequest,
  ProviderModelDefinition,
} from "../../shared/providerTypes";

const request: Pick<
  GenerationRequest,
  | "provider"
  | "model"
  | "negativePrompt"
  | "width"
  | "height"
  | "seed"
  | "imageCount"
> = {
  provider: "gemini",
  model: "model-a",
  negativePrompt: "不要文字",
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

const createInput = () => {
  const advancedRequestHandlers = {
    changeProvider: vi.fn(),
    changeModel: vi.fn(),
    changeNegativePrompt: vi.fn(),
    changeAspectRatio: vi.fn(),
    changeWidth: vi.fn(),
    changeHeight: vi.fn(),
    changeSeed: vi.fn(),
    changeImageCount: vi.fn(),
  };
  return {
    request,
    providerModels,
    visibleFields,
    selectedAspectRatio: "4:3",
    aspectRatioOptions,
    configuredProviders: ["gemini"] as const,
    advancedRequestHandlers,
    handleTextInputKeyDown: vi.fn(),
  };
};

describe("createGenerateDialogAdvancedSettingsProps", () => {
  it("maps generation parameter props to the advanced fields panel", () => {
    const input = createInput();
    const props = createGenerateDialogAdvancedSettingsProps(input);

    expect(props.advancedFieldsProps).toMatchObject({
      request,
      providerModels,
      visibleFields,
      selectedAspectRatio: "4:3",
      aspectRatioOptions,
      configuredProviders: ["gemini"],
    });
    expect(props.advancedFieldsProps.onProviderChange).toBe(
      input.advancedRequestHandlers.changeProvider,
    );
    expect(props.advancedFieldsProps.onTextInputKeyDown).toBe(
      input.handleTextInputKeyDown,
    );
  });
});
