import { useEffect, useRef } from "react";

import type { DesktopMenuEvent } from "../shared/desktopBridgeTypes";

import { maybeGetDesktopBridge } from "./desktopBridge";

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

    return bridge.onMenuAction((event) => handlerRef.current(event));
  }, []);
};
