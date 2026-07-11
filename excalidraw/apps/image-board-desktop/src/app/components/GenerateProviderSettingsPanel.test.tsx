import { createRef } from "react";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GenerateProviderSettingsPanel } from "./GenerateProviderSettingsPanel";
import type {
  CustomModelCapabilityTemplateId,
  ProviderCapabilities,
  ProviderRequestAdapter,
} from "../../shared/providerTypes";

const baseCapabilities: ProviderCapabilities = {
  supportsNegativePrompt: false,
  supportsSeed: true,
  supportsImageCount: false,
  supportsReferenceImages: true,
  maxImageCount: 1,
  maxReferenceImageCount: 8,
  sizeControlMode: "aspect-ratio",
};

const renderPanel = (
  overrides: Partial<
    Parameters<typeof GenerateProviderSettingsPanel>[0]
  > = {},
) => {
  const props: Parameters<typeof GenerateProviderSettingsPanel>[0] = {
    open: true,
    provider: "gemini",
    providerLabel: "Gemini",
    providerStatus: "已配置",
    modelLabel: "gemini-3-pro-image-preview",
    isProviderConfigured: true,
    apiKeyInputRef: createRef<HTMLInputElement>(),
    apiKeyDraft: "",
    savingProviderSettings: false,
    canSaveProviderSettings: true,
    customModelDraft: "",
    customModelTemplate: "image-editing-aspect-ratio",
    customModelUsageDescription: "适合参考图编辑",
    customModelAdvancedOpen: false,
    customModelCapabilities: baseCapabilities,
    customModelAdapter: "gemini-generate-content",
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
    ...overrides,
  };

  return {
    props,
    ...render(<GenerateProviderSettingsPanel {...props} />),
  };
};

describe("GenerateProviderSettingsPanel", () => {
  it("renders a collapsed provider settings summary", () => {
    renderPanel({ open: false });

    const toggle = screen.getByRole("button", {
      name: /连接与自定义模型/,
    });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveTextContent("Gemini · 已配置");
    expect(screen.queryByLabelText("连接与自定义模型")).toBeNull();
  });

  it("renders provider and model summary when expanded", () => {
    renderPanel();

    const summary = screen.getByLabelText("连接与自定义模型");
    expect(summary).toHaveTextContent("当前服务");
    expect(summary).toHaveTextContent("Gemini");
    expect(summary).toHaveTextContent("当前模型");
    expect(summary).toHaveTextContent("gemini-3-pro-image-preview");
  });

  it("reports API key edits and save actions", () => {
    const onApiKeyChange = vi.fn();
    const onSaveProviderSettings = vi.fn();

    renderPanel({
      apiKeyDraft: "old",
      onApiKeyChange,
      onSaveProviderSettings,
    });

    fireEvent.change(screen.getByLabelText("API Key"), {
      target: { value: "new-key" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(onApiKeyChange).toHaveBeenCalledWith("new-key");
    expect(onSaveProviderSettings).toHaveBeenCalledWith(expect.any(Object));
  });

  it("reports custom model configuration changes", () => {
    const onCustomModelDraftChange = vi.fn();
    const onCustomModelTemplateChange = vi.fn();

    renderPanel({
      customModelDraft: "gemini-custom",
      canAddCustomModel: true,
      onCustomModelDraftChange,
      onCustomModelTemplateChange,
    });

    fireEvent.change(screen.getByLabelText("新模型 ID"), {
      target: { value: "gemini-custom-v2" },
    });
    fireEvent.change(screen.getByLabelText("模型类型"), {
      target: {
        value: "text-to-image-exact" satisfies CustomModelCapabilityTemplateId,
      },
    });

    expect(onCustomModelDraftChange).toHaveBeenCalledWith("gemini-custom-v2");
    expect(onCustomModelTemplateChange).toHaveBeenCalledWith(
      "text-to-image-exact",
    );
  });

  it("reports advanced capability changes", () => {
    const onSupportsReferenceImagesChange = vi.fn();
    const onSupportsSeedChange = vi.fn();
    const onCustomModelAdapterChange = vi.fn();
    const onSizeControlModeChange = vi.fn();
    const onImageCountModeChange = vi.fn();

    renderPanel({
      customModelAdvancedOpen: true,
      onSupportsReferenceImagesChange,
      onSupportsSeedChange,
      onCustomModelAdapterChange,
      onSizeControlModeChange,
      onImageCountModeChange,
    });

    const referenceSwitch = screen.getByLabelText("允许发送参考图");
    fireEvent.click(referenceSwitch);
    fireEvent.click(screen.getByLabelText("显示种子"));
    fireEvent.change(screen.getByLabelText("接口格式"), {
      target: {
        value: "gemini-generate-content" satisfies ProviderRequestAdapter,
      },
    });
    fireEvent.change(screen.getByLabelText("尺寸设置"), {
      target: { value: "exact" },
    });
    fireEvent.change(screen.getByLabelText("出图数量"), {
      target: { value: "multiple" },
    });

    expect(onSupportsReferenceImagesChange).toHaveBeenCalledWith(false);
    expect(onSupportsSeedChange).toHaveBeenCalledWith(false);
    expect(onCustomModelAdapterChange).toHaveBeenCalledWith(
      "gemini-generate-content",
    );
    expect(onSizeControlModeChange).toHaveBeenCalledWith("exact");
    expect(onImageCountModeChange).toHaveBeenCalledWith(true);
  });

  it("renders provider save feedback", () => {
    renderPanel({
      providerSaveFeedback: {
        kind: "success",
        message: "已保存",
      },
    });

    const feedback = screen.getByText("已保存");
    expect(feedback).toHaveClass("provider-card__feedback--success");
  });

  it("keeps the custom model add action disabled until it is valid", () => {
    renderPanel({
      canAddCustomModel: false,
    });

    const section = screen.getByText("自定义模型（可选）").closest("section");
    expect(section).not.toBeNull();
    expect(
      within(section as HTMLElement).getByRole("button", {
        name: "添加到模型列表并使用",
      }),
    ).toBeDisabled();
  });
});
