import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PublicProviderSettings } from "../../shared/desktopBridgeTypes";
import { ImageGenerationSettings } from "./ImageGenerationSettings";

const providerSettings = {
  gemini: {
    isConfigured: true,
    defaultModel: "gemini-2.5-flash-image",
    lastStatus: "success",
    lastCheckedAt: null,
    lastError: null,
  },
  zenmux: {
    isConfigured: false,
    defaultModel: "google/gemini-2.5-flash-image",
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
  fal: { isConfigured: false, lastStatus: "unknown" },
  jimeng: { isConfigured: false, lastStatus: "unknown" },
  openai: { isConfigured: false, lastStatus: "unknown" },
  openrouter: { isConfigured: false, lastStatus: "unknown" },
} as PublicProviderSettings;

const renderSettings = () => {
  const onCurrentSelectionChange = vi.fn();
  const onSave = vi.fn(async () => providerSettings);
  const onDirtyChange = vi.fn();

  render(
    <ImageGenerationSettings
      providerSettings={providerSettings}
      currentProvider="gemini"
      currentModel="gemini-2.5-flash-image"
      saving={false}
      onCurrentSelectionChange={onCurrentSelectionChange}
      onSave={onSave}
      onDirtyChange={onDirtyChange}
    />,
  );

  return { onCurrentSelectionChange, onSave, onDirtyChange };
};

describe("ImageGenerationSettings", () => {
  it("首屏只显示当前服务和服务配置结论", () => {
    renderSettings();

    expect(screen.getByText("当前服务")).toBeInTheDocument();
    expect(screen.getAllByText("Gemini").length).toBeGreaterThan(0);
    expect(screen.getByText("已配置")).toHaveClass(
      "settings-status-badge--ready",
    );
    expect(screen.getAllByText("缺少 API Key")[0]).toHaveClass(
      "settings-status-badge--missing",
    );
    expect(screen.queryByLabelText("API Key")).not.toBeInTheDocument();
  });

  it("点击服务后才打开详情表单", () => {
    renderSettings();

    fireEvent.click(screen.getByRole("button", { name: /配置 Gemini/ }));

    expect(screen.getByRole("heading", { name: "Gemini" })).toBeInTheDocument();
    expect(screen.getByLabelText("API Key")).toBeInTheDocument();
    expect(screen.getByLabelText("模型")).toBeInTheDocument();
  });

  it("切换当前模型立即生效，API Key 只在保存时写入", async () => {
    const { onCurrentSelectionChange, onSave, onDirtyChange } = renderSettings();

    fireEvent.change(screen.getByLabelText("当前模型"), {
      target: { value: "gemini-3-pro-image-preview" },
    });
    expect(onCurrentSelectionChange).toHaveBeenCalledWith(
      "gemini",
      "gemini-3-pro-image-preview",
    );

    fireEvent.click(screen.getByRole("button", { name: /配置 Gemini/ }));
    fireEvent.change(screen.getByLabelText("API Key"), {
      target: { value: "secret" },
    });
    expect(onSave).not.toHaveBeenCalled();
    expect(onDirtyChange).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        provider: "gemini",
        apiKey: "secret",
        defaultModel: "gemini-2.5-flash-image",
      });
    });
  });
});
