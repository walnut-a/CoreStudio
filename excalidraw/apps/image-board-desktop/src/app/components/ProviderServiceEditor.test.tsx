import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PublicProviderSettings } from "../../shared/desktopBridgeTypes";
import { ProviderServiceEditor } from "./ProviderServiceEditor";

const renderEditor = (
  provider: "zenmux" | "openai-compatible" | "jimeng",
  onSave = vi.fn(async () => undefined),
  settings?: PublicProviderSettings[typeof provider],
) => {
  const onDirtyChange = vi.fn();
  const onOpenExternal = vi.fn();
  render(
    <ProviderServiceEditor
      provider={provider}
      settings={settings}
      saving={false}
      discardToken={0}
      onSave={onSave}
      onDelete={vi.fn(async () => undefined)}
      onOpenExternal={onOpenExternal}
      onDirtyChange={onDirtyChange}
      onBack={vi.fn()}
    />,
  );
  return { onSave, onOpenExternal, onDirtyChange };
};

describe("ProviderServiceEditor", () => {
  it("明确只支持火山方舟控制台的 API Key Secret", () => {
    renderEditor("jimeng");

    expect(screen.getByLabelText("API Key Secret")).toBeInTheDocument();
    expect(
      screen.getByText(/仅支持在火山方舟控制台创建的 API Key Secret/),
    ).toBeInTheDocument();
    expect(screen.getByText(/不要填写 API Key ID/)).toBeInTheDocument();
    expect(
      screen.getByText(/主账号密钥列表或 IAM 用户创建的 API Key 暂不支持/),
    ).toBeInTheDocument();
  });

  it("把 Seedream 帮助放在对应字段旁，不再显示前置教程卡", () => {
    const { onOpenExternal } = renderEditor("jimeng");

    expect(screen.queryByText("配置前先完成这三步")).not.toBeInTheDocument();
    expect(screen.queryByText("尚未配置")).not.toBeInTheDocument();
    expect(screen.queryByText(/等待验证/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("API Key Secret")).toBeInTheDocument();
    expect(screen.getByLabelText("默认模型")).toBeInTheDocument();
    expect(screen.getByText(/不要填写 API Key ID/)).toBeInTheDocument();
    expect(
      screen.getByText(/所选模型需要先在火山方舟开通/),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "获取 API Key（将在浏览器打开）" }),
    );
    expect(onOpenExternal).toHaveBeenLastCalledWith(
      "https://console.volcengine.com/ark/region%3Aark%2Bcn-beijing/apiKey?projectName=default",
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "开通或管理模型（将在浏览器打开）",
      }),
    );
    expect(onOpenExternal).toHaveBeenLastCalledWith(
      "https://console.volcengine.com/ark/region%3Acn-beijing/openManagement?advancedActiveKey=model&tab=ComputerVision",
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "查看官方接入文档（将在浏览器打开）",
      }),
    );
    expect(onOpenExternal).toHaveBeenLastCalledWith(
      "https://docs.volcengine.com/docs/82379/1541523?lang=zh",
    );
  });

  it("正常配置只提供保存反馈，不展示验证状态机", async () => {
    const onSave = vi.fn(async () => undefined);
    renderEditor("jimeng", onSave, {
      isConfigured: true,
      defaultModel: "doubao-seedream-5-0-pro-260628",
      lastStatus: "success",
      lastCheckedAt: "2026-08-04T00:20:00.000Z",
    });

    expect(screen.queryByText("已验证")).not.toBeInTheDocument();
    expect(screen.queryByText(/已成功完成生图/)).not.toBeInTheDocument();
    expect(screen.queryByText(/最近验证/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("API Key Secret"), {
      target: { value: "new-secret" },
    });
    expect(screen.queryByText("有未保存的修改")).not.toBeInTheDocument();
    expect(screen.queryByText(/上次验证成功/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "保存配置" }));

    await waitFor(() => expect(screen.getByText("已保存")).toBeInTheDocument());
    expect(screen.queryByText(/等待验证/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "去画布验证" }),
    ).not.toBeInTheDocument();
  });

  it("展示 Seedream 最近一次精确失败信息", () => {
    renderEditor(
      "jimeng",
      vi.fn(async () => undefined),
      {
        isConfigured: true,
        defaultModel: "doubao-seedream-5-0-pro-260628",
        lastStatus: "error",
        lastCheckedAt: "2026-08-04T00:20:00.000Z",
        lastError: "AuthenticationError：API Key 无效或模型尚未开通。",
      },
    );

    expect(screen.getByText("验证失败")).toBeInTheDocument();
    expect(
      screen.getByText("AuthenticationError：API Key 无效或模型尚未开通。"),
    ).toBeInTheDocument();
    expect(screen.getByText(/最近验证/)).toBeInTheDocument();
  });

  it("把自定义模型收进可选高级设置并提供可区分的移除按钮", () => {
    renderEditor(
      "jimeng",
      vi.fn(async () => undefined),
      {
        isConfigured: true,
        defaultModel: "doubao-seedream-5-0-pro-260628",
        customModels: [
          {
            id: "custom-seedream",
            label: "内部测试模型",
            capabilityTemplate: "image-editing-aspect-ratio",
            adapter: "jimeng-image",
          },
        ],
      },
    );

    const advanced = screen.getByRole("button", { name: /高级设置/ });
    expect(advanced).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("button", { name: "移除模型 内部测试模型" }),
    ).toBeInTheDocument();

    fireEvent.click(advanced);
    expect(screen.queryByLabelText("模型 ID")).not.toBeInTheDocument();
  });

  it("ZenMux 只要求 API Key、默认模型和可选自定义模型", () => {
    renderEditor("zenmux");

    expect(screen.getByLabelText("API Key")).toBeInTheDocument();
    const defaultModel = screen.getByLabelText("默认模型");
    expect(defaultModel).toBeInTheDocument();
    expect(
      defaultModel
        .closest(".settings-select")
        ?.querySelector(".settings-select__chevron"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "添加自定义模型" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /高级设置/ }));
    expect(
      screen.getByRole("button", { name: "添加自定义模型" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Base URL")).toBeNull();
  });

  it("OpenAI 兼容服务自动识别模型用法并保存配置", async () => {
    const { onSave } = renderEditor("openai-compatible");

    expect(screen.getByText("填写模型 ID 后自动识别")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "手动调整" })).toBeNull();

    fireEvent.change(screen.getByLabelText("服务名称"), {
      target: { value: "示例服务" },
    });
    fireEvent.change(screen.getByLabelText("Base URL"), {
      target: { value: "https://images.example.com/v1" },
    });
    fireEvent.change(screen.getByLabelText("API Key"), {
      target: { value: "secret" },
    });
    fireEvent.change(screen.getByLabelText("模型 ID"), {
      target: { value: "gpt-image-1.5" },
    });
    expect(screen.getByText("模型用法")).toBeInTheDocument();
    expect(screen.getByText("支持参考图 · 按比例控制尺寸")).toBeInTheDocument();
    expect(screen.queryByLabelText("模型能力")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "openai-compatible",
          displayName: "示例服务",
          baseUrl: "https://images.example.com/v1",
          apiKey: "secret",
          defaultModel: "gpt-image-1.5",
          customModels: [
            expect.objectContaining({
              id: "gpt-image-1.5",
              adapter: "openai-images",
            }),
          ],
        }),
      ),
    );
  });

  it("只在用户要求时展开独立的模型能力设置", async () => {
    const { onSave } = renderEditor("openai-compatible");

    fireEvent.change(screen.getByLabelText("服务名称"), {
      target: { value: "示例服务" },
    });
    fireEvent.change(screen.getByLabelText("Base URL"), {
      target: { value: "https://images.example.com/v1" },
    });
    fireEvent.change(screen.getByLabelText("API Key"), {
      target: { value: "secret" },
    });
    fireEvent.change(screen.getByLabelText("模型 ID"), {
      target: { value: "vendor/image-model" },
    });

    expect(screen.queryByLabelText("支持参考图")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "手动调整" }));

    fireEvent.click(screen.getByLabelText("支持参考图"));
    fireEvent.click(screen.getByLabelText("按宽高控制尺寸"));
    fireEvent.click(screen.getByLabelText("支持种子参数"));
    fireEvent.click(screen.getByLabelText("支持批量生成"));
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          customModels: [
            expect.objectContaining({
              id: "vendor/image-model",
              capabilities: expect.objectContaining({
                supportsReferenceImages: true,
                maxReferenceImageCount: 8,
                sizeControlMode: "exact",
                supportsSeed: true,
                supportsImageCount: true,
                maxImageCount: 4,
              }),
            }),
          ],
        }),
      ),
    );
  });

  it("仅展开手动设置时不写入能力覆盖", async () => {
    const { onSave, onDirtyChange } = renderEditor("openai-compatible");

    fireEvent.change(screen.getByLabelText("服务名称"), {
      target: { value: "示例服务" },
    });
    fireEvent.change(screen.getByLabelText("Base URL"), {
      target: { value: "https://images.example.com/v1" },
    });
    fireEvent.change(screen.getByLabelText("API Key"), {
      target: { value: "secret" },
    });
    fireEvent.change(screen.getByLabelText("模型 ID"), {
      target: { value: "vendor/image-model" },
    });

    onDirtyChange.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "手动调整" }));
    expect(screen.getByLabelText("支持参考图")).toBeInTheDocument();
    expect(onDirtyChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          customModels: [
            expect.not.objectContaining({
              capabilities: expect.anything(),
            }),
          ],
        }),
      ),
    );
  });
});
