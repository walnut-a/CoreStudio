import { render, screen } from "@testing-library/react";
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
    configuredProviders: ["gemini"],
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
  it("只保留生成参数，不再内嵌服务连接设置", () => {
    const { container } = renderAdvancedSettings();

    expect(container).toHaveTextContent(copy.generateDialog.provider);
    expect(container).not.toHaveTextContent("API Key");
    expect(screen.getByLabelText(copy.generateDialog.width)).toHaveValue(1024);
    expect(
      screen.queryByRole("button", { name: /连接与自定义模型/ }),
    ).toBeNull();
  });
});
