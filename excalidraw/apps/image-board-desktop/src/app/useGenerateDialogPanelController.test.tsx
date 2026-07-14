import { act, render, screen, waitFor } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { useGenerateDialogPanelController } from "./useGenerateDialogPanelController";
import type { GenerateComposerMode } from "./agent/useGenerateComposerController";

let controller: ReturnType<typeof useGenerateDialogPanelController> | null =
  null;
let promptFocus = vi.fn();

const ControllerProbe = ({
  open = true,
  persistent = false,
  focusToken = 0,
  effectiveComposerMode = "direct",
  error = null,
  isConfigured = true,
  onClose = vi.fn(),
}: {
  open?: boolean;
  persistent?: boolean;
  focusToken?: number;
  effectiveComposerMode?: GenerateComposerMode;
  error?: string | null;
  isConfigured?: boolean;
  onClose?: () => void;
}) => {
  const panelRef = useRef<HTMLElement | null>(null);
  const promptEditorRef = useRef<{ focus: () => void } | null>({
    focus: promptFocus,
  });
  const apiKeyInputRef = useRef<HTMLInputElement | null>(null);

  controller = useGenerateDialogPanelController({
    open,
    persistent,
    focusToken,
    effectiveComposerMode,
    error,
    isConfigured,
    panelRef,
    promptEditorRef,
    apiKeyInputRef,
    onClose,
  });

  return (
    <>
      <section ref={panelRef} data-testid="panel">
        <input ref={apiKeyInputRef} data-testid="api-key" />
      </section>
      <button type="button" data-testid="outside">
        outside
      </button>
      <output data-testid="state">
        {JSON.stringify({
          advancedOpen: controller.advancedOpen,
          apiSettingsOpen: controller.apiSettingsOpen,
          promptLibraryOpen: controller.promptLibraryOpen,
          promptLibrarySearch: controller.promptLibrarySearch,
        })}
      </output>
    </>
  );
};

const getState = () =>
  JSON.parse(screen.getByTestId("state").textContent ?? "{}") as {
    advancedOpen: boolean;
    apiSettingsOpen: boolean;
    promptLibraryOpen: boolean;
    promptLibrarySearch: string;
  };

describe("useGenerateDialogPanelController", () => {
  it("opens advanced settings for direct generation errors", async () => {
    render(<ControllerProbe error="缺少配置" />);

    await waitFor(() => {
      expect(getState().advancedOpen).toBe(true);
    });
  });

  it("focuses the prompt editor when the dialog receives a direct-mode focus token", () => {
    promptFocus = vi.fn();

    render(<ControllerProbe focusToken={1} />);

    expect(promptFocus).toHaveBeenCalledTimes(1);
  });

  it("closes direct-mode panels when switching to another composer mode", async () => {
    const { rerender } = render(<ControllerProbe />);

    act(() => {
      controller?.setAdvancedOpen(true);
      controller?.setApiSettingsOpen(true);
      controller?.setPromptLibraryOpen(true);
      controller?.setPromptLibrarySearch("参考");
    });

    expect(getState()).toMatchObject({
      advancedOpen: true,
      apiSettingsOpen: true,
      promptLibraryOpen: true,
      promptLibrarySearch: "参考",
    });

    rerender(<ControllerProbe effectiveComposerMode="acp" />);

    await waitFor(() => {
      expect(getState()).toMatchObject({
        advancedOpen: false,
        apiSettingsOpen: false,
        promptLibraryOpen: false,
      });
    });
  });

  it("collapses advanced settings on Escape for persistent panels", async () => {
    const onClose = vi.fn();
    render(<ControllerProbe persistent onClose={onClose} />);

    act(() => {
      controller?.setAdvancedOpen(true);
    });

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });

    await waitFor(() => {
      expect(getState().advancedOpen).toBe(false);
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes non-persistent panels on outside pointer down", () => {
    const onClose = vi.fn();
    render(<ControllerProbe onClose={onClose} />);

    act(() => {
      screen
        .getByTestId("outside")
        .dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
