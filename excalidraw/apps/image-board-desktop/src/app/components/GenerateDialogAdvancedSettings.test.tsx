import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GenerateDialogAdvancedSettings } from "./GenerateDialogAdvancedSettings";
import { copy } from "../copy";

import type {
  GenerationField,
  GenerationRequest,
  ProviderModelDefinition,
} from "../../shared/providerTypes";

const visibleFields: Record<GenerationField, boolean> = {
  prompt: true,
  negativePrompt: true,
  width: true,
  height: true,
  aspectRatio: true,
  seed: true,
  imageCount: true,
};

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

const createAdvancedSettingsProps = (): Parameters<
  typeof GenerateDialogAdvancedSettings
>[0] => ({
  advancedFieldsProps: {
    request,
    providerModels,
    visibleFields,
    selectedAspectRatio: "4:3",
    aspectRatioOptions: [{ id: "4:3", label: "4:3", width: 4, height: 3 }],
    onProviderChange: vi.fn(),
    onModelChange: vi.fn(),
    onNegativePromptChange: vi.fn(),
    onAspectRatioChange: vi.fn(),
    onWidthChange: vi.fn(),
    onHeightChange: vi.fn(),
    onSeedChange: vi.fn(),
    onImageCountChange: vi.fn(),
    onTextInputKeyDown: vi.fn(),
  },
  providerSettingsProps: {
    open: false,
    provider: "gemini",
    providerLabel: "Gemini",
    providerStatus: "未配置",
    modelLabel: "模型 A",
    isProviderConfigured: false,
    apiKeyInputRef: { current: null },
    apiKeyDraft: "",
    savingProviderSettings: false,
    canSaveProviderSettings: false,
    customModelDraft: "",
    customModelTemplate: "image-editing-aspect-ratio",
    customModelUsageDescription: "用于图片生成",
    customModelAdvancedOpen: false,
    customModelCapabilities: {
      supportsNegativePrompt: true,
      supportsSeed: true,
      supportsImageCount: true,
      supportsReferenceImages: true,
      maxImageCount: 4,
      maxReferenceImageCount: 4,
      sizeControlMode: "aspect-ratio",
    },
    customModelAdapter: "openai-images",
    canAddCustomModel: false,
    providerSaveFeedback: null,
    onToggleOpen: vi.fn(),
    onApiKeyChange: vi.fn(),
    onApiKeyKeyDown: vi.fn(),
    onSaveProviderSettings: vi.fn(),
    onCustomModelDraftChange: vi.fn(),
    onCustomModelKeyDown: vi.fn(),
    onCustomModelTemplateChange: vi.fn(),
    onToggleCustomModelAdvanced: vi.fn(),
    onSupportsReferenceImagesChange: vi.fn(),
    onSupportsSeedChange: vi.fn(),
    onCustomModelAdapterChange: vi.fn(),
    onSizeControlModeChange: vi.fn(),
    onImageCountModeChange: vi.fn(),
    onAddCustomModel: vi.fn(),
    onStopInputEvent: vi.fn(),
  },
});

const renderAdvancedSettings = (
  overrides: Partial<Parameters<typeof GenerateDialogAdvancedSettings>[0]> = {},
) => {
  const props: Parameters<typeof GenerateDialogAdvancedSettings>[0] = {
    ...createAdvancedSettingsProps(),
    ...overrides,
  };

  return {
    props,
    ...render(<GenerateDialogAdvancedSettings {...props} />),
  };
};

describe("GenerateDialogAdvancedSettings", () => {
  it("keeps generation parameters before provider connection settings", () => {
    const { container } = renderAdvancedSettings();

    expect(
      container.textContent?.indexOf(copy.generateDialog.provider),
    ).toBeLessThan(
      container.textContent?.indexOf(copy.generateDialog.apiKeySettings) ?? -1,
    );
    expect(screen.getByLabelText(copy.generateDialog.width)).toHaveValue(1024);
    expect(
      screen.getByRole("button", {
        name: new RegExp(copy.generateDialog.apiKeySettings),
      }),
    ).toHaveTextContent("Gemini · 未配置");
  });

  it("forwards provider setting toggle events", () => {
    const onToggleOpen = vi.fn();
    const onStopInputEvent = vi.fn();
    const baseProps = createAdvancedSettingsProps();
    renderAdvancedSettings({
      providerSettingsProps: {
        ...baseProps.providerSettingsProps,
        onToggleOpen,
        onStopInputEvent,
      },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: new RegExp(copy.generateDialog.apiKeySettings),
      }),
    );

    expect(onToggleOpen).toHaveBeenCalledTimes(1);
  });
});
