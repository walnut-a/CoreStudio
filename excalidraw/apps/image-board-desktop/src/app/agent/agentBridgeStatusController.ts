import { useEffect } from "react";

import type {
  DesktopAgentBridgeStatus,
  DesktopProjectBundle,
} from "../../shared/desktopBridgeTypes";
import {
  buildAgentBridgeStatusCurrentProjectUpdate,
  canReadAgentBridgeStatus,
  refreshAgentBridgeStatus,
  runAgentBridgeEnabledToggle,
  type AgentBridgeProjectStateNotifier,
  type AgentBridgeStatusReader,
  type AgentBridgeStatusWriter,
  type AgentBridgeEnabledToggleResult,
} from "./agentBridgeStatus";
import {
  buildAgentBrowserConnectionRefreshPlan,
  type AgentBrowserConnectionRefreshPlan,
} from "./agentBrowserConnectionState";

export interface AgentBridgeStatusRefreshActionResult {
  canReadStatus: boolean;
  didApply: boolean;
  nextStatus: DesktopAgentBridgeStatus | null;
}

export interface AgentBrowserConnectionRefreshActionResult
  extends AgentBridgeStatusRefreshActionResult {
  refreshPlan: AgentBrowserConnectionRefreshPlan;
}

export interface RunAgentBridgeStatusRefreshActionInput {
  bridge:
    | (AgentBridgeStatusReader & AgentBridgeProjectStateNotifier)
    | null
    | undefined;
  currentProject: DesktopProjectBundle | null;
  fallbackBoardUrl: string | null;
  applyBridgeStatus: (status: DesktopAgentBridgeStatus | null) => void;
  canApply?: () => boolean;
}

const shouldApply = (canApply: (() => boolean) | undefined): boolean =>
  canApply ? canApply() : true;

export type AgentBridgeStatusUpdate = (
  status: DesktopAgentBridgeStatus | null,
) => DesktopAgentBridgeStatus | null;

export interface ApplyAgentBridgeStatusCurrentProjectUpdateInput {
  project: DesktopProjectBundle | null;
  applyBridgeStatus: (update: AgentBridgeStatusUpdate) => void;
}

export const applyAgentBridgeStatusCurrentProjectUpdate = ({
  project,
  applyBridgeStatus,
}: ApplyAgentBridgeStatusCurrentProjectUpdateInput): void => {
  applyBridgeStatus((status) =>
    buildAgentBridgeStatusCurrentProjectUpdate({
      status,
      project,
    }),
  );
};

export const useAgentBridgeStatusCurrentProjectSyncEffect = ({
  project,
  applyBridgeStatus,
}: ApplyAgentBridgeStatusCurrentProjectUpdateInput) => {
  useEffect(() => {
    if (!project) {
      return;
    }

    applyAgentBridgeStatusCurrentProjectUpdate({
      project,
      applyBridgeStatus,
    });
  }, [applyBridgeStatus, project?.project.name, project?.projectPath]);
};

export const runAgentBridgeStatusRefreshAction = async ({
  bridge,
  currentProject,
  fallbackBoardUrl,
  applyBridgeStatus,
  canApply,
}: RunAgentBridgeStatusRefreshActionInput): Promise<AgentBridgeStatusRefreshActionResult> => {
  if (!canReadAgentBridgeStatus(bridge)) {
    if (!shouldApply(canApply)) {
      return {
        canReadStatus: false,
        didApply: false,
        nextStatus: null,
      };
    }

    applyBridgeStatus(null);
    return {
      canReadStatus: false,
      didApply: true,
      nextStatus: null,
    };
  }

  const nextStatus = await refreshAgentBridgeStatus({
    bridge,
    currentProject,
    fallbackBoardUrl,
  });

  if (!shouldApply(canApply)) {
    return {
      canReadStatus: true,
      didApply: false,
      nextStatus,
    };
  }

  applyBridgeStatus(nextStatus);
  return {
    canReadStatus: true,
    didApply: true,
    nextStatus,
  };
};

export interface RunAgentBrowserConnectionRefreshActionInput
  extends RunAgentBridgeStatusRefreshActionInput {
  isAgentBrowserRoute: boolean;
  currentProjectPath: string | null;
  resetAutoOpenProjectPath: (projectPath: string | null) => void;
  refreshDesktopStartupState: () => void | Promise<void>;
}

export const runAgentBrowserConnectionRefreshAction = async ({
  isAgentBrowserRoute,
  currentProjectPath,
  resetAutoOpenProjectPath,
  refreshDesktopStartupState,
  ...refreshInput
}: RunAgentBrowserConnectionRefreshActionInput): Promise<AgentBrowserConnectionRefreshActionResult> => {
  const refreshResult = await runAgentBridgeStatusRefreshAction(refreshInput);
  const refreshPlan = buildAgentBrowserConnectionRefreshPlan({
    isAgentBrowserRoute,
    bridgeStatus: refreshResult.nextStatus,
    currentProjectPath,
  });

  if (!refreshResult.didApply) {
    return {
      ...refreshResult,
      refreshPlan,
    };
  }

  if (refreshPlan.resetAutoOpenProjectPath) {
    resetAutoOpenProjectPath(null);
  }
  if (refreshPlan.loadDesktopStartupState) {
    await refreshDesktopStartupState();
  }

  return {
    ...refreshResult,
    refreshPlan,
  };
};

export interface RunAgentBridgeEnabledToggleActionInput {
  bridge:
    | (AgentBridgeStatusWriter & AgentBridgeProjectStateNotifier)
    | null
    | undefined;
  enabled: boolean;
  currentProject: DesktopProjectBundle | null;
  applyBridgeStatus: (status: DesktopAgentBridgeStatus) => void;
  updateCurrentProject: (project: DesktopProjectBundle) => void;
  showError: (message: string) => void;
}

export const runAgentBridgeEnabledToggleAction = async ({
  bridge,
  enabled,
  currentProject,
  applyBridgeStatus,
  updateCurrentProject,
  showError,
}: RunAgentBridgeEnabledToggleActionInput): Promise<AgentBridgeEnabledToggleResult> => {
  const result = await runAgentBridgeEnabledToggle({
    bridge,
    enabled,
    currentProject,
  });

  if (result.status === "failed") {
    showError(result.errorMessage);
    return result;
  }

  applyBridgeStatus(result.nextStatus);
  if (result.projectUpdate) {
    updateCurrentProject(result.projectUpdate);
  }
  return result;
};

export type AgentBridgeStatusRendererBridge =
  | (AgentBridgeStatusReader &
      AgentBridgeStatusWriter &
      AgentBridgeProjectStateNotifier)
  | null
  | undefined;

export interface AgentBridgeStatusRendererRefreshOptions {
  canApply?: () => boolean;
}

export interface AgentBrowserConnectionRendererRefreshOptions
  extends AgentBridgeStatusRendererRefreshOptions {
  refreshDesktopStartupState?: () => void | Promise<void>;
}

export interface CreateAgentBridgeStatusRendererActionsInput {
  getBridge: () => AgentBridgeStatusRendererBridge;
  getCurrentProject: () => DesktopProjectBundle | null;
  getIsAgentBrowserRoute: () => boolean;
  getFallbackBoardUrl: () => string | null;
  applyBridgeStatus: (status: DesktopAgentBridgeStatus | null) => void;
  resetAutoOpenProjectPath: (projectPath: string | null) => void;
  refreshDesktopStartupState: () => void | Promise<void>;
  updateCurrentProject: (project: DesktopProjectBundle) => void;
  showError: (message: string) => void;
}

export interface AgentBridgeStatusRendererActions {
  loadStatus(
    options?: AgentBridgeStatusRendererRefreshOptions,
  ): Promise<DesktopAgentBridgeStatus | null>;
  refreshBrowserConnection(
    options?: AgentBrowserConnectionRendererRefreshOptions,
  ): Promise<AgentBrowserConnectionRefreshActionResult>;
  refreshBrowserConnectionStatus(
    options?: AgentBrowserConnectionRendererRefreshOptions,
  ): Promise<DesktopAgentBridgeStatus | null>;
  setEnabled(enabled: boolean): Promise<AgentBridgeEnabledToggleResult>;
}

export const createAgentBridgeStatusRendererActions = ({
  getBridge,
  getCurrentProject,
  getIsAgentBrowserRoute,
  getFallbackBoardUrl,
  applyBridgeStatus,
  resetAutoOpenProjectPath,
  refreshDesktopStartupState,
  updateCurrentProject,
  showError,
}: CreateAgentBridgeStatusRendererActionsInput): AgentBridgeStatusRendererActions => {
  const refreshBrowserConnection: AgentBridgeStatusRendererActions["refreshBrowserConnection"] = (
    options,
  ) => {
    const currentProject = getCurrentProject();
    return runAgentBrowserConnectionRefreshAction({
      bridge: getBridge(),
      currentProject,
      isAgentBrowserRoute: getIsAgentBrowserRoute(),
      currentProjectPath: currentProject?.projectPath ?? null,
      fallbackBoardUrl: getFallbackBoardUrl(),
      applyBridgeStatus,
      resetAutoOpenProjectPath,
      refreshDesktopStartupState:
        options?.refreshDesktopStartupState ?? refreshDesktopStartupState,
      canApply: options?.canApply,
    });
  };

  return {
    loadStatus: async (options) => {
      const result = await runAgentBridgeStatusRefreshAction({
        bridge: getBridge(),
        currentProject: getCurrentProject(),
        fallbackBoardUrl: getFallbackBoardUrl(),
        applyBridgeStatus,
        canApply: options?.canApply,
      });
      return result.nextStatus;
    },
    refreshBrowserConnection,
    refreshBrowserConnectionStatus: async (options) => {
      const result = await refreshBrowserConnection(options);
      return result.nextStatus;
    },
    setEnabled: (enabled) =>
      runAgentBridgeEnabledToggleAction({
        bridge: getBridge(),
        enabled,
        currentProject: getCurrentProject(),
        applyBridgeStatus,
        updateCurrentProject,
        showError,
      }),
  };
};
