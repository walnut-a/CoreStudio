import { useEffect, useRef } from "react";

import type { DesktopMenuEvent } from "../shared/desktopBridgeTypes";
import { isNativeTextEditControl } from "../shared/nativeEditContextReporter";

import { maybeGetDesktopBridge } from "./desktopBridge";
import { dispatchDesktopEditCommand } from "./desktopEditCommand";

export const useDesktopMenuEvents = (
  handler: (event: DesktopMenuEvent) => void,
) => {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const bridge = maybeGetDesktopBridge();
    if (!bridge) {
      return;
    }

    let lastFocusedElement =
      document.activeElement instanceof HTMLElement &&
      document.activeElement !== document.body
        ? document.activeElement
        : null;
    const rememberFocusedTarget = (event: Event) => {
      if (event.target instanceof HTMLElement) {
        lastFocusedElement = event.target;
      }
    };
    const rememberPointerTarget = (event: Event) => {
      if (
        event.target instanceof HTMLElement &&
        !isNativeTextEditControl(event.target)
      ) {
        lastFocusedElement = event.target;
      }
    };
    const forgetBlurredNativeTarget = (event: Event) => {
      if (
        event.target === lastFocusedElement &&
        isNativeTextEditControl(event.target)
      ) {
        lastFocusedElement = null;
      }
    };
    document.addEventListener("focus", rememberFocusedTarget, true);
    document.addEventListener("blur", forgetBlurredNativeTarget, true);
    document.addEventListener("pointerdown", rememberPointerTarget, true);

    const unsubscribe = bridge.onMenuAction((event) => {
      if (
        event.action === "edit-undo" ||
        event.action === "edit-redo" ||
        event.action === "edit-select-all"
      ) {
        dispatchDesktopEditCommand(
          event.action === "edit-undo"
            ? "undo"
            : event.action === "edit-redo"
            ? "redo"
            : "select-all",
          lastFocusedElement,
        );
        return;
      }

      handlerRef.current(event);
    });

    return () => {
      document.removeEventListener("focus", rememberFocusedTarget, true);
      document.removeEventListener("blur", forgetBlurredNativeTarget, true);
      document.removeEventListener("pointerdown", rememberPointerTarget, true);
      unsubscribe();
    };
  }, []);
};
