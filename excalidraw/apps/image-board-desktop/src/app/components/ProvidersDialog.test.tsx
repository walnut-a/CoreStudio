import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import type { PublicProviderSettings } from "../../shared/desktopBridgeTypes";
import { ProvidersDialog } from "./ProvidersDialog";

const providerSettings: PublicProviderSettings = {
  gemini: {
    defaultModel: "gemini-2.5-flash-image",
    isConfigured: true,
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
  zenmux: {
    defaultModel: "google/gemini-2.5-flash-image",
    isConfigured: false,
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
  fal: {
    defaultModel: "fal-ai/flux/schnell",
    isConfigured: false,
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
  jimeng: {
    defaultModel: "doubao-seedream-5-0-lite-260128",
    isConfigured: false,
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
  openai: {
    defaultModel: "gpt-image-1.5",
    isConfigured: false,
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
  openrouter: {
    defaultModel: "google/gemini-3.1-flash-image-preview",
    isConfigured: false,
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
};

describe("ProvidersDialog", () => {
  it("shows a clear local save message after saving", async () => {
    const onSave = vi.fn(async () => undefined);

    render(
      <ProvidersDialog
        open={true}
        providerSettings={providerSettings}
        saving={false}
        onClose={() => undefined}
        onSave={onSave}
      />,
    );

    expect(screen.getByLabelText("当前服务")).toHaveValue("gemini");

    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        provider: "gemini",
        apiKey: "",
        defaultModel: "gemini-2.5-flash-image",
      });
    });

    expect(screen.getByText("已保存到本地，密钥不会回显。")).toBeInTheDocument();
    expect(screen.getByText("状态：已保存，待验证")).toBeInTheDocument();
  });

  it("shows the save error message when saving fails", async () => {
    render(
      <ProvidersDialog
        open={true}
        providerSettings={providerSettings}
        saving={false}
        onClose={() => undefined}
        onSave={vi.fn(async () => {
          throw new Error("磁盘写入失败");
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("保存失败：磁盘写入失败")).toBeInTheDocument();
  });

  it("switches the current service and saves only that provider", async () => {
    const onSave = vi.fn(async () => undefined);

    render(
      <ProvidersDialog
        open={true}
        providerSettings={providerSettings}
        saving={false}
        onClose={() => undefined}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText("当前服务"), {
      target: { value: "fal" },
    });

    expect(screen.getByText("状态：未配置")).toBeInTheDocument();
    expect(screen.getByLabelText("默认模型")).toHaveValue("fal-ai/flux/schnell");

    fireEvent.change(screen.getByLabelText("默认模型"), {
      target: { value: "fal-ai/nano-banana-2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        provider: "fal",
        apiKey: "",
        defaultModel: "fal-ai/nano-banana-2",
      });
    });
  });

  it("keeps the selected service visible after saving", async () => {
    const Harness = () => {
      const [settings, setSettings] = useState(providerSettings);

      return (
        <ProvidersDialog
          open={true}
          providerSettings={settings}
          saving={false}
          onClose={() => undefined}
          onSave={async (input) => {
            setSettings((current) => ({
              ...current,
              [input.provider]: {
                ...current[input.provider],
                defaultModel: input.defaultModel,
                isConfigured: true,
                lastStatus: "unknown",
                lastCheckedAt: null,
                lastError: null,
              },
            }));
          }}
        />
      );
    };

    render(<Harness />);

    fireEvent.change(screen.getByLabelText("当前服务"), {
      target: { value: "fal" },
    });
    fireEvent.change(screen.getByLabelText("API Key"), {
      target: { value: "test-fal-key" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(screen.getByText("已保存到本地，密钥不会回显。")).toBeInTheDocument();
    });

    expect(screen.getByLabelText("当前服务")).toHaveValue("fal");
    expect(screen.getByText("状态：已保存，待验证")).toBeInTheDocument();
  });

  it("shows ZenMux in the current service list and saves it independently", async () => {
    const onSave = vi.fn(async () => undefined);

    render(
      <ProvidersDialog
        open={true}
        providerSettings={providerSettings}
        saving={false}
        onClose={() => undefined}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText("当前服务"), {
      target: { value: "zenmux" },
    });

    expect(screen.getByText("状态：未配置")).toBeInTheDocument();
    expect(screen.getByLabelText("默认模型")).toHaveValue(
      "google/gemini-2.5-flash-image",
    );

    fireEvent.change(screen.getByLabelText("API Key"), {
      target: { value: "sk-ai-v1-test" },
    });
    fireEvent.change(screen.getByLabelText("默认模型"), {
      target: { value: "google/gemini-3-pro-image-preview" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        provider: "zenmux",
        apiKey: "sk-ai-v1-test",
        defaultModel: "google/gemini-3-pro-image-preview",
      });
    });
  });

  it("shows 即梦 in the current service list and saves it independently", async () => {
    const onSave = vi.fn(async () => undefined);

    render(
      <ProvidersDialog
        open={true}
        providerSettings={providerSettings}
        saving={false}
        onClose={() => undefined}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText("当前服务"), {
      target: { value: "jimeng" },
    });

    expect(screen.getAllByText("即梦 / Seedream").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("默认模型")).toHaveValue(
      "doubao-seedream-5-0-lite-260128",
    );

    fireEvent.change(screen.getByLabelText("API Key"), {
      target: { value: "ark-key" },
    });
    fireEvent.change(screen.getByLabelText("默认模型"), {
      target: { value: "doubao-seedream-4-0-250828" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        provider: "jimeng",
        apiKey: "ark-key",
        defaultModel: "doubao-seedream-4-0-250828",
      });
    });
  });

  it("shows OpenAI and OpenRouter in the current service list", async () => {
    const onSave = vi.fn(async () => undefined);

    render(
      <ProvidersDialog
        open={true}
        providerSettings={providerSettings}
        saving={false}
        onClose={() => undefined}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText("当前服务"), {
      target: { value: "openai" },
    });

    expect(screen.getByLabelText("默认模型")).toHaveValue("gpt-image-1.5");

    fireEvent.change(screen.getByLabelText("当前服务"), {
      target: { value: "openrouter" },
    });

    expect(screen.getByLabelText("默认模型")).toHaveValue(
      "google/gemini-3.1-flash-image-preview",
    );
  });
});
