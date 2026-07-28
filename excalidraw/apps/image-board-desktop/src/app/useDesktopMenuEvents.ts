import { useEffect, useRef } from "react";

import type { DesktopMenuEvent } from "../shared/desktopBridgeTypes";

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
    const rememberInteractionTarget = (event: Event) => {
      if (event.target instanceof HTMLElement) {
        lastFocusedElement = event.target;
      }
    };
    document.addEventListener("focus", rememberInteractionTarget, true);
    document.addEventListener("pointerdown", rememberInteractionTarget, true);

    const unsubscribe = bridge.onMenuAction((event) => {
      if (event.action === "edit-undo" || event.action === "edit-redo") {
        dispatchDesktopEditCommand(
          event.action === "edit-undo" ? "undo" : "redo",
          lastFocusedElement,
        );
        return;
      }

      handlerRef.current(event);
    });

    return () => {
      document.removeEventListener("focus", rememberInteractionTarget, true);
      document.removeEventListener(
        "pointerdown",
        rememberInteractionTarget,
        true,
      );
      unsubscribe();
    };
  }, []);
};
