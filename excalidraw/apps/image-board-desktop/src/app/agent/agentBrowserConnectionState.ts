import type { DesktopAgentBridgeStatus } from "../../shared/desktopBridgeTypes";

export interface AgentBrowserConnectionRefreshPlan {
  loadDesktopStartupState: boolean;
  resetAutoOpenProjectPath: boolean;
}

export interface AgentBrowserBridgeStatusRetryPlan {
  scheduleRetry: boolean;
  delayMs: number;
}

export const buildAgentBrowserConnectionRefreshPlan = ({
  isAgentBrowserRoute,
  bridgeStatus,
  currentProjectPath,
}: {
  isAgentBrowserRoute: boolean;
  bridgeStatus: DesktopAgentBridgeStatus | null | undefined;
  currentProjectPath: string | null;
}): AgentBrowserConnectionRefreshPlan => {
  if (!isAgentBrowserRoute || !bridgeStatus?.ready) {
    return {
      loadDesktopStartupState: false,
      resetAutoOpenProjectPath: false,
    };
  }

  return {
    loadDesktopStartupState: true,
    resetAutoOpenProjectPath: Boolean(
      bridgeStatus.currentProject &&
        currentProjectPath !== bridgeStatus.currentProject.projectPath,
    ),
  };
};

export const buildAgentBrowserBridgeStatusRetryPlan = ({
  bridgeStatus,
  attempts,
  maxAttempts = 20,
  delayMs = 500,
}: {
  bridgeStatus: DesktopAgentBridgeStatus | null | undefined;
  attempts: number;
  maxAttempts?: number;
  delayMs?: number;
}): AgentBrowserBridgeStatusRetryPlan => ({
  scheduleRetry: !bridgeStatus?.boardUrl && attempts < maxAttempts,
  delayMs,
});
