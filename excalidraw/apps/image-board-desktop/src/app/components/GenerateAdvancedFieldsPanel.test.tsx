import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GenerateAdvancedFieldsPanel } from "./GenerateAdvancedFieldsPanel";
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
  "zenmux-image-api-model": {
    id: "zenmux-image-api-model",
    label: "ZenMux 图片 API 模型",
    capabilities: {
      supportsNegativePrompt: false,
      supportsSeed: false,
      supportsImageCount: true,
      supportsReferenceImages: true,
      maxImageCount: 10,
      maxReferenceImageCount: 4,
      sizeControlMode: "aspect-ratio",
    },
  },
  "custom-model": {
    id: "custom-model",
    label: "自定义模型",
    custom: true,
    capabilities: {
      supportsNegativePrompt: false,
      supportsSeed: false,
      supportsImageCount: false,
      supportsReferenceImages: false,
      maxImageCount: 1,
      maxReferenceImageCount: 0,
      sizeControlMode: "exact",
    },
  },
};

const renderPanel = (
  overrides: Partial<Parameters<typeof GenerateAdvancedFieldsPanel>[0]> = {},
) => {
  const props: Parameters<typeof GenerateAdvancedFieldsPanel>[0] = {
    request,
    providerModels,
    visibleFields,
    selectedAspectRatio: "4:3",
    aspectRatioOptions: [
      { id: "1:1", label: "1:1", width: 1024, height: 1024 },
      { id: "4:3", label: "4:3", width: 1024, height: 768 },
    ],
    onProviderChange: vi.fn(),
    onModelChange: vi.fn(),
    onNegativePromptChange: vi.fn(),
    onAspectRatioChange: vi.fn(),
    onWidthChange: vi.fn(),
    onHeightChange: vi.fn(),
    onSeedChange: vi.fn(),
    onImageCountChange: vi.fn(),
    onTextInputKeyDown: vi.fn(),
    ...overrides,
  };

  return {
    props,
    ...render(
      <div className="dialog-form-grid">
        <GenerateAdvancedFieldsPanel {...props} />
      </div>,
    ),
  };
};

describe("GenerateAdvancedFieldsPanel", () => {
  it("renders provider model and generation fields", () => {
    renderPanel();

    expect(screen.getByLabelText(copy.generateDialog.provider)).toHaveValue(
      "gemini",
    );
    expect(screen.getByLabelText(copy.generateDialog.model)).toHaveValue(
      "model-a",
    );
    expect(screen.getByText("自定义：自定义模型")).toBeInTheDocument();
    expect(
      screen.getByLabelText(copy.generateDialog.negativePrompt),
    ).toHaveValue("不要文字");
    expect(screen.getByLabelText(copy.generateDialog.aspectRatio)).toHaveValue(
      "4:3",
    );
    expect(screen.getByLabelText(copy.generateDialog.width)).toHaveValue(1024);
    expect(screen.getByLabelText(copy.generateDialog.height)).toHaveValue(768);
    expect(screen.getByLabelText(copy.generateDialog.seed)).toHaveValue(12);
    expect(screen.getByLabelText(copy.generateDialog.imageCount)).toHaveValue(
      1,
    );
  });

  it("reports changed field values", () => {
    const onProviderChange = vi.fn();
    const onModelChange = vi.fn();
    const onNegativePromptChange = vi.fn();
    const onAspectRatioChange = vi.fn();
    const onWidthChange = vi.fn();
    const onHeightChange = vi.fn();
    const onSeedChange = vi.fn();
    const onImageCountChange = vi.fn();

    renderPanel({
      onProviderChange,
      onModelChange,
      onNegativePromptChange,
      onAspectRatioChange,
      onWidthChange,
      onHeightChange,
      onSeedChange,
      onImageCountChange,
    });

    fireEvent.change(screen.getByLabelText(copy.generateDialog.provider), {
      target: { value: "zenmux" },
    });
    fireEvent.change(screen.getByLabelText(copy.generateDialog.model), {
      target: { value: "custom-model" },
    });
    fireEvent.change(
      screen.getByLabelText(copy.generateDialog.negativePrompt),
      {
        target: { value: "不要水印" },
      },
    );
    fireEvent.change(screen.getByLabelText(copy.generateDialog.aspectRatio), {
      target: { value: "1:1" },
    });
    fireEvent.change(screen.getByLabelText(copy.generateDialog.width), {
      target: { value: "1280" },
    });
    fireEvent.change(screen.getByLabelText(copy.generateDialog.height), {
      target: { value: "1024" },
    });
    fireEvent.change(screen.getByLabelText(copy.generateDialog.seed), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText(copy.generateDialog.imageCount), {
      target: { value: "3" },
    });

    expect(onProviderChange).toHaveBeenCalledWith("zenmux");
    expect(onModelChange).toHaveBeenCalledWith("custom-model");
    expect(onNegativePromptChange).toHaveBeenCalledWith("不要水印");
    expect(onAspectRatioChange).toHaveBeenCalledWith("1:1");
    expect(onWidthChange).toHaveBeenCalledWith(1280);
    expect(onHeightChange).toHaveBeenCalledWith(1024);
    expect(onSeedChange).toHaveBeenCalledWith(null);
    expect(onImageCountChange).toHaveBeenCalledWith(3);
  });

  it("uses the selected model image count limit", () => {
    renderPanel({
      request: {
        ...request,
        model: "zenmux-image-api-model",
        imageCount: 5,
      },
    });

    expect(screen.getByLabelText(copy.generateDialog.imageCount)).toHaveValue(
      5,
    );
    expect(screen.getByLabelText(copy.generateDialog.imageCount)).toHaveAttribute(
      "max",
      "10",
    );
  });

  it("hides optional generation fields when they are unavailable", () => {
    renderPanel({
      visibleFields: {
        ...visibleFields,
        negativePrompt: false,
        seed: false,
        imageCount: false,
      },
    });

    expect(
      screen.queryByLabelText(copy.generateDialog.negativePrompt),
    ).toBeNull();
    expect(screen.queryByLabelText(copy.generateDialog.seed)).toBeNull();
    expect(screen.queryByLabelText(copy.generateDialog.imageCount)).toBeNull();
  });
});
