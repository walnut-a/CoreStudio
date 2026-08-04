import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  CodexIntegrationStatus,
  ProviderConfigurationSnapshot,
} from "../../shared/desktopBridgeTypes";
import { setActiveDesktopLocale } from "../copy";
import { CodexIntegrationSettings } from "./CodexIntegrationSettings";
import { ImageGenerationSettings } from "./ImageGenerationSettings";
import { ProviderServiceEditor } from "./ProviderServiceEditor";

afterEach(() => {
  setActiveDesktopLocale("zh-CN");
});

describe("application settings localization", () => {
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
        onRefreshCatalog={vi.fn(async () => undefined)}
        onOpenExternal={vi.fn()}
        onDirtyChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Image Sources" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add Source" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("switch", {
        name: "Show Image Generation Composer",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Show on the board")).toBeInTheDocument();
    expect(screen.queryByText("添加服务")).not.toBeInTheDocument();
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
        onOpenExternal={vi.fn()}
        onDirtyChange={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        "Configure credentials and the models available on the board.",
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Advanced Settings/ }));
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
      integrationVersion: "1.1.0",
      guideUrl: "https://example.com/guide",
      detectedAt: "2026-07-15T00:00:00.000Z",
      checks: [],
    };

    render(
      <CodexIntegrationSettings
        open
        inspect={vi.fn(async () => status)}
        install={vi.fn(async () => ({
          ok: true as const,
          output: "",
          warning: null,
        }))}
        copyText={vi.fn(async () => true)}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Agent Integrations" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Environment ready")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy Instructions" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("环境已准备好")).not.toBeInTheDocument();
  });
});
