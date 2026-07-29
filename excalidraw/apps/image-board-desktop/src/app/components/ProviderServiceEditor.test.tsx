import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProviderServiceEditor } from "./ProviderServiceEditor";

const renderEditor = (
  provider: "zenmux" | "openai-compatible",
  onSave = vi.fn(async () => undefined),
) => {
  const onDirtyChange = vi.fn();
  render(
    <ProviderServiceEditor
      provider={provider}
      settings={undefined}
      saving={false}
      discardToken={0}
      onSave={onSave}
      onDelete={vi.fn(async () => undefined)}
      onDirtyChange={onDirtyChange}
      onBack={vi.fn()}
    />,
  );
  return { onSave, onDirtyChange };
};

describe("ProviderServiceEditor", () => {
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
      screen.getByRole("button", { name: "添加自定义模型" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Base URL")).toBeNull();
  });

  it("OpenAI 兼容服务自动识别模型用法并保存配置", async () => {
    const { onSave } = renderEditor("openai-compatible");

    expect(
      screen.getByText("填写模型 ID 后自动识别"),
    ).toBeInTheDocument();
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
    expect(
      screen.getByText("支持参考图 · 按比例控制尺寸"),
    ).toBeInTheDocument();
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
