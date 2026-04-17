import type { DesktopBridgeApi } from "../shared/desktopBridgeTypes";

declare global {
  interface Window {
    imageBoardDesktop?: DesktopBridgeApi;
  }
}

export {};
