import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProviderServiceEditor } from "./ProviderServiceEditor";

const renderEditor = (
  provider: "zenmux" | "openai-compatible",
  onSave = vi.fn(async () => undefined),
) => {
  render(
    <ProviderServiceEditor
      provider={provider}
      settings={undefined}
      saving={false}
      discardToken={0}
      onSave={onSave}
      onDelete={vi.fn(async () => undefined)}
      onDirtyChange={vi.fn()}
      onBack={vi.fn()}
    />,
  );
  return { onSave };
};

describe("ProviderServiceEditor", () => {
  it("ZenMux 只要求 API Key、默认模型和可选自定义模型", () => {
    renderEditor("zenmux");

    expect(screen.getByLabelText("API Key")).toBeInTheDocument();
    expect(screen.getByLabelText("默认模型")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "添加自定义模型" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Base URL")).toBeNull();
  });

  it("OpenAI 兼容服务保存名称、地址、密钥和模型能力", async () => {
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
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "openai-compatible",
          displayName: "示例服务",
          baseUrl: "https://images.example.com/v1",
          apiKey: "secret",
          defaultModel: "vendor/image-model",
          customModels: [
            expect.objectContaining({
              id: "vendor/image-model",
              adapter: "openai-images",
            }),
          ],
        }),
      ),
    );
  });
});
