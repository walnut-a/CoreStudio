import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GenerateDialogBody } from "./GenerateDialogBody";
import { copy, setActiveDesktopLocale } from "../copy";

const renderBody = (
  overrides: Partial<Parameters<typeof GenerateDialogBody>[0]> = {},
) => {
  const props: Parameters<typeof GenerateDialogBody>[0] = {
    show: true,
    isConfigured: true,
    error: null,
    advancedOpen: true,
    advancedContent: (
      <>
        <div>高级参数</div>
        <div>模型参数</div>
      </>
    ),
    ...overrides,
  };

  return {
    props,
    ...render(<GenerateDialogBody {...props} />),
  };
};

describe("GenerateDialogBody", () => {
  afterEach(() => setActiveDesktopLocale("zh-CN"));

  it("renders nothing when the composer body is collapsed", () => {
    const { container } = renderBody({ show: false });

    expect(container).toBeEmptyDOMElement();
  });

  it("renders provider warnings and errors without an empty advanced section", () => {
    const onOpenErrorDetails = vi.fn();
    const onOpenProviderSettings = vi.fn();

    renderBody({
      isConfigured: false,
      error: "生成失败",
      onOpenErrorDetails,
      onOpenProviderSettings,
    });

    expect(
      screen.getByText(copy.generateDialog.providerWarning),
    ).toBeInTheDocument();
    const configurationState = screen.getByRole("status");
    expect(configurationState).toHaveClass(
      "generate-panel__configuration-state",
    );
    expect(configurationState).not.toHaveClass("dialog-card__warning");
    expect(screen.getByText("生成失败")).toBeInTheDocument();
    expect(screen.queryByText("高级参数")).toBeNull();
    expect(screen.queryByText("模型参数")).toBeNull();
    expect(
      configurationState.parentElement?.querySelector(".dialog-form-grid"),
    ).toBeNull();

    const settingsButton = screen.getByRole("button", {
      name: "打开应用设置",
    });
    expect(settingsButton).toHaveClass("image-board-button--small");
    expect(settingsButton).toHaveClass(
      "generate-panel__configuration-action",
    );
    fireEvent.click(settingsButton);
    expect(onOpenProviderSettings).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: copy.debugError.view }));

    expect(onOpenErrorDetails).toHaveBeenCalledTimes(1);
  });

  it("renders advanced panels when a provider is configured", () => {
    const { container } = renderBody();

    expect(screen.getByText("高级参数")).toBeInTheDocument();
    expect(screen.getByText("模型参数")).toBeInTheDocument();
    expect(container.querySelector(".dialog-form-grid")).toBeInTheDocument();
  });

  it("keeps advanced panels unmounted until settings are expanded", () => {
    renderBody({ advancedOpen: false });

    expect(screen.queryByText("高级参数")).toBeNull();
    expect(screen.queryByText("模型参数")).toBeNull();
  });

  it("localizes the application settings action", () => {
    setActiveDesktopLocale("en");

    renderBody({
      isConfigured: false,
      onOpenProviderSettings: vi.fn(),
    });

    expect(
      screen.getByRole("button", { name: "Open Application Settings" }),
    ).toBeInTheDocument();
  });
});
