import type { DesktopBridgeApi } from "../shared/desktopBridgeTypes";
import { maybeCreateAgentBrowserDesktopBridge } from "./agent/agentBrowserBridge";

const missingBridgeError = () =>
  new Error("Electron desktop bridge is not available in this environment.");

export const getDesktopBridge = (): DesktopBridgeApi => {
  const bridge = maybeGetDesktopBridge();
  if (!bridge) {
    throw missingBridgeError();
  }
  return bridge;
};

export const maybeGetDesktopBridge = () => {
  if (window.imageBoardDesktop) {
    return window.imageBoardDesktop;
  }

  const agentBrowserBridge = maybeCreateAgentBrowserDesktopBridge();
  if (agentBrowserBridge) {
    window.imageBoardDesktop = agentBrowserBridge;
  }
  return agentBrowserBridge ?? null;
};
