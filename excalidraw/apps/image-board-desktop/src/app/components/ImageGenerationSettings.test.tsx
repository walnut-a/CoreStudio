import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ProviderConfigurationSnapshot } from "../../shared/desktopBridgeTypes";
import { ImageGenerationSettings } from "./ImageGenerationSettings";

const createConfiguration = (
  configured: Array<"zenmux" | "openai"> = ["zenmux"],
): ProviderConfigurationSnapshot => ({
  schemaVersion: 2,
  defaultProvider: configured[0] ?? null,
  providers: {
    gemini: { isConfigured: false },
    zenmux: {
      isConfigured: configured.includes("zenmux"),
      defaultModel: "google/gemini-2.5-flash-image",
    },
    fal: { isConfigured: false },
    jimeng: { isConfigured: false },
    openai: {
      isConfigured: configured.includes("openai"),
      defaultModel: "gpt-image-1.5",
    },
    openrouter: { isConfigured: false },
    "openai-compatible": { isConfigured: false },
  },
});

const renderSettings = (
  configuration: ProviderConfigurationSnapshot = createConfiguration(),
) => {
  const onSave = vi.fn(async () => undefined);
  const onDelete = vi.fn(async () => undefined);
  const onDirtyChange = vi.fn();

  render(
    <ImageGenerationSettings
      configuration={configuration}
      saving={false}
      onSave={onSave}
      onDelete={onDelete}
      onDirtyChange={onDirtyChange}
    />,
  );

  return { onSave, onDelete, onDirtyChange };
};

describe("ImageGenerationSettings", () => {
  it("首页只显示已配置服务", () => {
    renderSettings();

    expect(
      screen.getByRole("button", { name: /编辑 ZenMux/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Gemini")).not.toBeInTheDocument();
    expect(screen.queryByText("缺少 API Key")).not.toBeInTheDocument();
  });

  it("从添加服务进入服务商选择，再进入配置页", () => {
    renderSettings();

    fireEvent.click(screen.getByRole("button", { name: "添加服务" }));
    expect(
      screen.getByRole("heading", { name: "选择服务商" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /添加 ZenMux/ })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /添加 OpenAI$/ }));
    expect(screen.getByRole("heading", { name: "OpenAI" })).toBeInTheDocument();
    expect(screen.getByLabelText("API Key")).toBeInTheDocument();
  });

  it("没有服务时显示唯一空状态入口", () => {
    renderSettings(createConfiguration([]));

    expect(screen.getByText("尚未配置图像生成服务")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "添加服务" }),
    ).toBeInTheDocument();
  });
});
