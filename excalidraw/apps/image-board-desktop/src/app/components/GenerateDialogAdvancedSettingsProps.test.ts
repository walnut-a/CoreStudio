import { describe, expect, it, vi } from "vitest";

import { createGenerateDialogAdvancedSettingsProps } from "./GenerateDialogAdvancedSettingsProps";

import type { SyntheticEvent } from "react";
import type {
  AspectRatioOption,
  GenerationField,
  GenerationRequest,
  ProviderCapabilities,
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

const customModelCapabilities: ProviderCapabilities = {
  supportsNegativePrompt: true,
  supportsSeed: true,
  supportsImageCount: true,
  supportsReferenceImages: true,
  maxImageCount: 4,
  maxReferenceImageCount: 4,
  sizeControlMode: "aspect-ratio",
};

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
  const providerSettingsActions = {
    addCustomModelToRequest: vi.fn(),
    changeSupportsReferenceImages: vi.fn(),
    changeSupportsSeed: vi.fn(),
    changeSizeControlMode: vi.fn(),
    changeImageCountMode: vi.fn(),
  };

  return {
    request,
    providerModels,
    visibleFields,
    selectedAspectRatio: "4:3",
    aspectRatioOptions,
    advancedRequestHandlers,
    handleTextInputKeyDown: vi.fn(),
    apiSettingsOpen: false,
    providerLabel: "Gemini",
    currentProviderStatus: "未配置",
    currentModelLabel: "模型 A",
    isProviderConfigured: false,
    apiKeyInputRef: { current: null },
    apiKeyDraft: "",
    savingProviderSettings: false,
    canSaveProviderSettings: false,
    customModelDraft: "",
    customModelTemplate: "image-editing-aspect-ratio" as const,
    customModelUsageDescription: "用于图片生成",
    customModelAdvancedOpen: false,
    customModelCapabilities,
    customModelAdapter: "openai-images" as const,
    canAddCustomModel: false,
    providerSaveFeedback: null,
    stopInputEventPropagation: vi.fn(),
    setApiSettingsOpen: vi.fn(),
    updateApiKeyDraft: vi.fn(),
    handleApiKeyKeyDown: vi.fn(),
    saveProviderSettings: vi.fn(),
    updateCustomModelDraft: vi.fn(),
    handleCustomModelKeyDown: vi.fn(),
    updateCustomModelTemplate: vi.fn(),
    setCustomModelAdvancedOpen: vi.fn(),
    updateCustomModelAdapter: vi.fn(),
    providerSettingsActions,
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
    });
    expect(props.advancedFieldsProps.onProviderChange).toBe(
      input.advancedRequestHandlers.changeProvider,
    );
    expect(props.advancedFieldsProps.onTextInputKeyDown).toBe(
      input.handleTextInputKeyDown,
    );
  });

  it("maps provider settings metadata and wraps panel actions", () => {
    const input = createInput();
    const props = createGenerateDialogAdvancedSettingsProps(input);
    const event = {} as SyntheticEvent<HTMLElement>;

    expect(props.providerSettingsProps).toMatchObject({
      open: false,
      provider: "gemini",
      providerLabel: "Gemini",
      providerStatus: "未配置",
      modelLabel: "模型 A",
      isProviderConfigured: false,
      customModelUsageDescription: "用于图片生成",
    });

    props.providerSettingsProps.onToggleOpen(event);
    props.providerSettingsProps.onSaveProviderSettings(event);
    props.providerSettingsProps.onToggleCustomModelAdvanced(event);
    props.providerSettingsProps.onAddCustomModel(event);

    expect(input.stopInputEventPropagation).toHaveBeenCalledTimes(4);
    expect(input.stopInputEventPropagation).toHaveBeenCalledWith(event);
    expect(input.setApiSettingsOpen).toHaveBeenCalledWith(expect.any(Function));
    expect(input.setCustomModelAdvancedOpen).toHaveBeenCalledWith(
      expect.any(Function),
    );
    expect(input.saveProviderSettings).toHaveBeenCalledTimes(1);
    expect(input.providerSettingsActions.addCustomModelToRequest).toHaveBeenCalledTimes(
      1,
    );
  });
});
