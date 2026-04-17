import type { DesktopBridgeApi } from "../shared/desktopBridgeTypes";

const missingBridgeError = () =>
  new Error("Electron desktop bridge is not available in this environment.");

export const getDesktopBridge = (): DesktopBridgeApi => {
  if (!window.imageBoardDesktop) {
    throw missingBridgeError();
  }
  return window.imageBoardDesktop;
};

export const maybeGetDesktopBridge = () => window.imageBoardDesktop ?? null;
