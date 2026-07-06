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
    promptLibraryOpen: false,
    advancedOpen: false,
    canSubmit: true,
    showGenerationSourceSwitch: true,
    agentGenerationSelectable: true,
    effectiveGenerationSource: "builtin",
    generationSourceLabel: "直接生成",
    generationSourceResetKey: "direct:open",
    onSelectGenerationSource: vi.fn(),
    onStopInputEvent: vi.fn(),
    setPromptLibraryOpen: vi.fn(),
    setAdvancedOpen: vi.fn(),
    ...overrides,
  };

  return {
    props,
    ...render(<GenerateDialogComposerActionsSection {...props} />),
  };
};

describe("GenerateDialogComposerActionsSection", () => {
  it("places the generation source selector inside the prompt composer action bar", () => {
    renderActionsSection();

    expect(
      screen.getByRole("button", {
        name: copy.generateDialog.promptLibrary,
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

  it("wraps prompt tool toggles with input event stopping", () => {
    const onStopInputEvent = vi.fn();
    const setPromptLibraryOpen = vi.fn();
    const setAdvancedOpen = vi.fn();

    renderActionsSection({
      onStopInputEvent,
      setPromptLibraryOpen,
      setAdvancedOpen,
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: copy.generateDialog.promptLibrary,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: copy.generateDialog.expandSettings,
      }),
    );

    expect(onStopInputEvent).toHaveBeenCalledTimes(2);
    expect(setPromptLibraryOpen).toHaveBeenCalledWith(expect.any(Function));
    expect(setAdvancedOpen).toHaveBeenCalledWith(expect.any(Function));
    expect(setPromptLibraryOpen.mock.calls[0]?.[0](false)).toBe(true);
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
