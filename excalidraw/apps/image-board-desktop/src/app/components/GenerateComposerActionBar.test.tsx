import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GenerateComposerActionBar } from "./GenerateComposerActionBar";
import { copy } from "../copy";

const renderActionBar = (
  overrides: Partial<Parameters<typeof GenerateComposerActionBar>[0]> = {},
) => {
  const props: Parameters<typeof GenerateComposerActionBar>[0] = {
    showPromptTools: true,
    advancedOpen: false,
    canSubmit: true,
    sourceSelect: <span>生成方式选择</span>,
    onToggleAdvanced: vi.fn(),
    onCancelGeneration: vi.fn(),
    onStopInputEvent: vi.fn(),
    ...overrides,
  };

  return {
    props,
    ...render(<GenerateComposerActionBar {...props} />),
  };
};

describe("GenerateComposerActionBar", () => {
  it("renders active prompt tools and reports settings toggles", () => {
    const onToggleAdvanced = vi.fn();

    renderActionBar({
      onToggleAdvanced,
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: copy.generateDialog.expandSettings,
      }),
    );

    expect(screen.getByText("生成方式选择")).toBeInTheDocument();
    expect(onToggleAdvanced).toHaveBeenCalledWith(expect.any(Object));
  });

  it("uses the collapse settings label when advanced settings are open", () => {
    renderActionBar({ advancedOpen: true });

    expect(
      screen.getByRole("button", {
        name: copy.generateDialog.collapseSettings,
      }),
    ).toBeInTheDocument();
  });

  it("hides prompt tools outside prompt composer mode", () => {
    renderActionBar({ showPromptTools: false });

    expect(screen.queryByText("生成方式选择")).toBeNull();
    expect(
      screen.getByRole("button", { name: copy.generateDialog.generate }),
    ).toBeInTheDocument();
  });

  it("disables submit when the composer cannot submit", () => {
    renderActionBar({ canSubmit: false });

    expect(
      screen.getByRole("button", { name: copy.generateDialog.generate }),
    ).toBeDisabled();
  });

  it("shows a stop action while generation is running", () => {
    const onCancelGeneration = vi.fn();
    renderActionBar({
      loading: true,
      onCancelGeneration,
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: copy.generateDialog.cancelGeneration,
      }),
    );

    expect(onCancelGeneration).toHaveBeenCalledWith(expect.any(Object));
    expect(
      screen.queryByRole("button", { name: copy.generateDialog.generate }),
    ).toBeNull();
  });
});
