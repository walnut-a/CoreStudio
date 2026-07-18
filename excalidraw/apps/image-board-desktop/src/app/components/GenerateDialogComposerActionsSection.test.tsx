import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GenerateDialogComposerActionsSection } from "./GenerateDialogComposerActionsSection";
import { copy } from "../copy";

const renderActionsSection = (
  overrides: Partial<Parameters<typeof GenerateDialogComposerActionsSection>[0]> = {},
) => {
  const props: Parameters<typeof GenerateDialogComposerActionsSection>[0] = {
    showAgentSourceSelect: false,
    showPromptComposerActions: true,
    showPromptTools: true,
    advancedOpen: false,
    canSubmit: true,
    showGenerationSourceSwitch: true,
    agentGenerationSelectable: true,
    effectiveGenerationSource: "builtin",
    generationSourceLabel: "直接生成",
    generationSourceResetKey: "direct:open",
    onSelectGenerationSource: vi.fn(),
    onStopInputEvent: vi.fn(),
    setAdvancedOpen: vi.fn(),
    ...overrides,
  };

  return {
    props,
    ...render(<GenerateDialogComposerActionsSection {...props} />),
  };
};

describe("GenerateDialogComposerActionsSection", () => {
  it("keeps only active generation controls in the prompt composer action bar", () => {
    renderActionsSection();

    expect(
      screen.getByRole("button", {
        name: copy.generateDialog.expandSettings,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "生成方式" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: copy.generateDialog.generate }),
    ).toBeInTheDocument();
  });

  it("renders only the source selector in Agent operation mode", () => {
    renderActionsSection({
      showAgentSourceSelect: true,
      showPromptComposerActions: false,
    });

    expect(
      screen.getByRole("button", { name: "生成方式" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: copy.generateDialog.generate }),
    ).toBeNull();
  });

  it("wraps the settings toggle with input event stopping", () => {
    const onStopInputEvent = vi.fn();
    const setAdvancedOpen = vi.fn();

    renderActionsSection({
      onStopInputEvent,
      setAdvancedOpen,
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: copy.generateDialog.expandSettings,
      }),
    );

    expect(onStopInputEvent).toHaveBeenCalledTimes(1);
    expect(setAdvancedOpen).toHaveBeenCalledWith(expect.any(Function));
    expect(setAdvancedOpen.mock.calls[0]?.[0](false)).toBe(true);
  });

  it("forwards generation source selections", () => {
    const onSelectGenerationSource = vi.fn();

    renderActionsSection({ onSelectGenerationSource });

    fireEvent.click(screen.getByRole("button", { name: "生成方式" }));
    fireEvent.click(screen.getByRole("option", { name: "ACP Agent" }));

    expect(onSelectGenerationSource).toHaveBeenCalledWith(
      "agent",
      expect.any(Object),
    );
  });
});
