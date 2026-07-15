import { useEffect, useState, type RefObject } from "react";

import type { GenerateComposerMode } from "./agent/useGenerateComposerController";

interface FocusableHandle {
  focus: () => void;
}

interface UseGenerateDialogPanelControllerInput {
  open: boolean;
  persistent: boolean;
  focusToken: number;
  effectiveComposerMode: GenerateComposerMode;
  error: string | null;
  isConfigured: boolean;
  panelRef: RefObject<HTMLElement | null>;
  promptEditorRef: RefObject<FocusableHandle | null>;
  onClose: () => void;
}

export const useGenerateDialogPanelController = ({
  open,
  persistent,
  focusToken,
  effectiveComposerMode,
  error,
  isConfigured,
  panelRef,
  promptEditorRef,
  onClose,
}: UseGenerateDialogPanelControllerInput) => {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (effectiveComposerMode !== "direct") {
      return;
    }

    if (error || !isConfigured) {
      setAdvancedOpen(true);
    }
  }, [effectiveComposerMode, error, isConfigured, open]);

  useEffect(() => {
    if (!open || focusToken === 0 || effectiveComposerMode !== "direct") {
      return;
    }

    promptEditorRef.current?.focus();
  }, [effectiveComposerMode, focusToken, open, promptEditorRef]);

  useEffect(() => {
    if (effectiveComposerMode === "direct") {
      return;
    }

    setAdvancedOpen(false);
  }, [effectiveComposerMode]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (persistent) {
        setAdvancedOpen(false);
        return;
      }

      onClose();
    };

    const handlePointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (panelRef.current?.contains(target)) {
        return;
      }

      if (persistent) {
        setAdvancedOpen(false);
        return;
      }

      onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [onClose, open, panelRef, persistent]);

  return {
    advancedOpen,
    setAdvancedOpen,
  };
};
