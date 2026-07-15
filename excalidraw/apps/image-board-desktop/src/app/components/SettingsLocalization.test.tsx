import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE } from "../../shared/acpTypes";
import type {
  CodexIntegrationStatus,
  ProviderConfigurationSnapshot,
} from "../../shared/desktopBridgeTypes";
import { setActiveDesktopLocale } from "../copy";
import { AcpAgentSettingsPanel } from "./AcpAgentSettingsPanel";
import { CodexIntegrationSettings } from "./CodexIntegrationSettings";
import { ExperimentalFeaturesSettingsSection } from "./ExperimentalFeaturesSettingsSection";
import { ImageGenerationSettings } from "./ImageGenerationSettings";
import { ProviderServiceEditor } from "./ProviderServiceEditor";

afterEach(() => {
  setActiveDesktopLocale("zh-CN");
});

describe("application settings localization", () => {
  it("renders experimental settings from the English catalog", () => {
    setActiveDesktopLocale("en");

    render(
      <ExperimentalFeaturesSettingsSection
        acpEnabled
        disabled={false}
        saving={false}
        presetId="codex-acp"
        onAcpEnabledChange={vi.fn()}
        onPresetChange={vi.fn()}
        onOpenAdvanced={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Experimental Features" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Advanced Settings" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("高级配置")).not.toBeInTheDocument();
  });

  it("renders image generation settings from the English catalog", () => {
    setActiveDesktopLocale("en");
    const configuration: ProviderConfigurationSnapshot = {
      schemaVersion: 2,
      defaultProvider: null,
      providers: {},
    };

    render(
      <ImageGenerationSettings
        configuration={configuration}
        saving={false}
        onSave={vi.fn(async () => undefined)}
        onDelete={vi.fn(async () => undefined)}
        onDirtyChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Image Generation" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add Service" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("添加服务")).not.toBeInTheDocument();
  });

  it("renders ACP advanced settings from the English catalog", () => {
    setActiveDesktopLocale("en");

    render(
      <AcpAgentSettingsPanel
        draft={{
          enabled: true,
          presetId: "codex-acp",
          command: "npx",
          args: "--stdio",
          cwd: "",
          taskInstructionTemplate: DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE,
        }}
        selectedAgent={null}
        editable
        saving={false}
        defaultCwd="/tmp/project"
        onBack={vi.fn()}
        onCommandChange={vi.fn()}
        onArgsChange={vi.fn()}
        onCwdChange={vi.fn()}
        onTaskInstructionChange={vi.fn()}
        onSave={vi.fn()}
        debugContent={null}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "ACP Advanced Settings" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.queryByText("保存")).not.toBeInTheDocument();
  });

  it("renders the provider editor from the English catalog", () => {
    setActiveDesktopLocale("en");

    render(
      <ProviderServiceEditor
        provider="openai"
        settings={undefined}
        saving={false}
        discardToken={0}
        onSave={vi.fn(async () => undefined)}
        onDelete={vi.fn(async () => undefined)}
        onDirtyChange={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        "Configure credentials and the models available on the board.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Custom Models" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.queryByText("自定义模型")).not.toBeInTheDocument();
  });

  it("renders Codex integration settings from the English catalog", async () => {
    setActiveDesktopLocale("en");
    const status: CodexIntegrationStatus = {
      state: "ready",
      command: "corestudio",
      appVersion: "1.0.0",
      guideUrl: "https://example.com/guide",
      detectedAt: "2026-07-15T00:00:00.000Z",
      checks: [],
    };

    render(
      <CodexIntegrationSettings
        open
        inspect={vi.fn(async () => status)}
        copyText={vi.fn(async () => true)}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Codex Integration" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Environment ready")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy Instructions" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("环境已准备好")).not.toBeInTheDocument();
  });
});
