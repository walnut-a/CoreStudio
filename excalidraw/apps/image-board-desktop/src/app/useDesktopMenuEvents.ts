import { useEffect } from "react";

import type { DesktopMenuEvent } from "../shared/desktopBridgeTypes";

import { maybeGetDesktopBridge } from "./desktopBridge";

export const useDesktopMenuEvents = (
  handler: (event: DesktopMenuEvent) => void,
) => {
  useEffect(() => {
    const bridge = maybeGetDesktopBridge();
    if (!bridge) {
      return;
    }

    return bridge.onMenuAction(handler);
  }, [handler]);
};
