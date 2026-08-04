import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
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
  const onRefreshCatalog = vi.fn(async () => undefined);
  const onOpenExternal = vi.fn();
  const onDirtyChange = vi.fn();
  const onComposerVisibilityChange = vi.fn(async () => undefined);

  render(
    <ImageGenerationSettings
      configuration={configuration}
      saving={false}
      onSave={onSave}
      onDelete={onDelete}
      onRefreshCatalog={onRefreshCatalog}
      onOpenExternal={onOpenExternal}
      onDirtyChange={onDirtyChange}
      onComposerVisibilityChange={onComposerVisibilityChange}
    />,
  );

  return {
    onSave,
    onDelete,
    onRefreshCatalog,
    onOpenExternal,
    onDirtyChange,
    onComposerVisibilityChange,
  };
};

describe("ImageGenerationSettings", () => {
  it("immediately changes composer visibility without marking provider settings dirty", async () => {
    const { onComposerVisibilityChange, onDirtyChange } = renderSettings({
      ...createConfiguration(),
      composerVisible: true,
    });

    const visibilitySwitch = screen.getByRole("switch", {
      name: "显示图片生成输入框",
    });
    expect(visibilitySwitch).toHaveAttribute("aria-checked", "true");

    fireEvent.click(visibilitySwitch);

    await waitFor(() => {
      expect(onComposerVisibilityChange).toHaveBeenCalledWith(false);
    });
    expect(onDirtyChange).not.toHaveBeenCalled();
  });

  it("首页只显示已配置服务", () => {
    renderSettings();

    expect(
      screen.queryByRole("heading", { name: "图片集成" }),
    ).not.toBeInTheDocument();

    const servicesSection = screen.getByRole("region", {
      name: "图片来源",
    });
    expect(
      within(servicesSection).getByRole("heading", {
        name: "图片来源",
      }),
    ).toBeInTheDocument();
    expect(
      within(servicesSection).getByRole("button", {
        name: "添加来源",
      }),
    ).toBeInTheDocument();
    expect(
      within(servicesSection).getByRole("button", { name: /编辑 ZenMux/ }),
    ).toBeInTheDocument();

    const secondarySettings = screen.getByRole("region", {
      name: "其他设置",
    });
    expect(
      within(secondarySettings).getByRole("switch", {
        name: "显示图片生成输入框",
      }),
    ).toBeInTheDocument();
    expect(
      within(secondarySettings).getByText("在画布显示图片生成输入框"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "画布设置" }),
    ).not.toBeInTheDocument();
    expect(
      servicesSection.compareDocumentPosition(secondarySettings) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.queryByText("Gemini")).not.toBeInTheDocument();
    expect(screen.queryByText("缺少 API Key")).not.toBeInTheDocument();
  });

  it("从添加服务进入服务商选择，再进入配置页", () => {
    renderSettings();

    fireEvent.click(screen.getByRole("button", { name: "添加来源" }));
    expect(
      screen.getByRole("heading", { name: "选择图片来源" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /添加 ZenMux/ })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /添加 OpenAI$/ }));
    expect(screen.getByRole("heading", { name: "OpenAI" })).toBeInTheDocument();
    expect(screen.getByLabelText("API Key")).toBeInTheDocument();
  });

  it("没有服务时显示唯一空状态入口", () => {
    renderSettings(createConfiguration([]));

    expect(screen.getByText("尚未添加图片来源")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "添加来源" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "添加来源" })).toHaveLength(1);
  });

  it("以低权重工具行显示模型目录版本和更新入口", async () => {
    const configuration = {
      ...createConfiguration(),
      modelCatalog: {
        source: "cache" as const,
        revision: 3,
        checkedAt: "2026-07-26T22:00:00.000Z",
        catalog: null,
      },
    };
    const { onRefreshCatalog, onOpenExternal } = renderSettings(configuration);

    expect(screen.getByText("模型目录")).toBeInTheDocument();
    expect(screen.getByText("版本 3")).toBeInTheDocument();
    const repository = screen.getByRole("button", {
      name: "打开模型目录更新仓库",
    });
    expect(repository).toHaveTextContent("更新来源");

    fireEvent.click(repository);
    expect(onOpenExternal).toHaveBeenCalledWith(
      "https://github.com/walnut-a/CoreStudio-Model-Catalog",
    );

    fireEvent.click(screen.getByRole("button", { name: "检查更新" }));

    await waitFor(() => {
      expect(onRefreshCatalog).toHaveBeenCalledTimes(1);
    });
  });
});
