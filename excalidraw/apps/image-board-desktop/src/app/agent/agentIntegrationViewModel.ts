import {
  getSelectedAcpAgent,
  isAcpExperimentalFeatureEnabled,
  normalizeAcpAgentSettings,
  type AcpAgentSettings,
} from "../../shared/acpTypes";
import type { DesktopAgentBridgeStatus } from "../../shared/desktopBridgeTypes";
import { copy } from "../copy";
import type { GenerateComposerConfig } from "./useGenerateComposerController";

export type AgentIntegrationReadiness =
  | "disabled"
  | "connected"
  | "waiting-project"
  | "unready";

export interface AgentIntegrationViewModel {
  readiness: AgentIntegrationReadiness;
  statusText: string;
  badgeText: string;
  enabled: boolean;
  connected: boolean;
  collaboration: {
    status: "disabled" | "ready" | "waiting-project" | "unavailable";
    statusText: string;
    description: string;
    projectName: string | null;
  };
  bridge: {
    ready: boolean;
    endpoint: string | null;
    endpointLabel: string;
    boardUrl: string | null;
    boardUrlReady: boolean;
  };
  project: {
    open: boolean;
    name: string | null;
    path: string | null;
    token: string | null;
  };
  cli: {
    available: boolean;
    envCopyable: boolean;
    statusText: string;
  };
  board: {
    available: boolean;
    statusText: string;
  };
  acp: {
    experimentalEnabled: boolean;
    configured: boolean;
    enabled: boolean;
    agentId: string | null;
    agentName: string | null;
    runningTaskId: string | null;
    running: boolean;
    statusText: string;
  };
}

export interface BuildAgentIntegrationViewModelInput {
  bridgeStatus?: DesktopAgentBridgeStatus | null;
  acpAgentSettings?: AcpAgentSettings | null;
  runningTaskId?: string | null;
}

export interface AcpAgentGenerationViewModel {
  ready: boolean;
  canSubmitMessage: boolean;
  submitMessageDisabledReason: string;
  composerConfig: GenerateComposerConfig;
}

export interface AgentBoardStartupViewModel {
  heading: string;
  description: string;
  actionLabel: string;
}

export interface BuildAgentBoardStartupRenderPlanInput {
  isAgentBrowserRoute: boolean;
  hasInitialProjectToken: boolean;
  bridgeStatus?: DesktopAgentBridgeStatus | null;
  hasCurrentProject: boolean;
  hasInitialData: boolean;
}

export type AgentBoardStartupRenderPlan =
  | {
      action: "none";
    }
  | {
      action: "show-startup";
      phase: AgentBoardStartupPhase;
      viewModel: AgentBoardStartupViewModel;
    };

export type AgentIntegrationCopyAction =
  | {
      text: string;
      successMessage: string;
      errorMessage: null;
    }
  | {
      text: null;
      successMessage: null;
      errorMessage: string;
    };

export interface BuildAcpAgentGenerationViewModelInput {
  integration: AgentIntegrationViewModel;
  isAgentBrowserRoute: boolean;
  canStartAcpAgentTask: boolean;
  taskRunning: boolean;
  agentTaskStatus: GenerateComposerConfig["agentTaskStatus"];
}

export interface BuildAgentIntegrationRuntimeViewModelInput {
  bridgeStatus?: DesktopAgentBridgeStatus | null;
  acpAgentSettings?: AcpAgentSettings | null;
  agentTaskStatus: GenerateComposerConfig["agentTaskStatus"];
  taskRunning: boolean;
  canStartAcpAgentTask: boolean;
  isAgentBrowserRoute: boolean;
  hasInitialProjectToken: boolean;
  hasCurrentProject: boolean;
  hasInitialData: boolean;
}

export interface AgentIntegrationRuntimeViewModel {
  integration: AgentIntegrationViewModel;
  acpGeneration: AcpAgentGenerationViewModel;
  boardStartup: AgentBoardStartupRenderPlan;
}

export type AgentBoardStartupPhase = "bridge-connection" | "project-loading";

const getReadiness = (
  status?: DesktopAgentBridgeStatus | null,
): AgentIntegrationReadiness => {
  if (!status?.enabled) {
    return "disabled";
  }

  if (status.ready && status.currentProject) {
    return "connected";
  }

  if (status.ready) {
    return "waiting-project";
  }

  return "unready";
};

const getStatusText = (readiness: AgentIntegrationReadiness) => {
  const status = copy.agentUi.integration.status;
  switch (readiness) {
    case "disabled":
      return status.disabled;
    case "connected":
      return status.connected;
    case "waiting-project":
      return status.waitingProject;
    case "unready":
      return status.unready;
  }
};

const getBadgeText = (readiness: AgentIntegrationReadiness) => {
  const badge = copy.agentUi.integration.badge;
  switch (readiness) {
    case "disabled":
      return badge.disabled;
    case "connected":
      return badge.connected;
    case "waiting-project":
      return badge.waitingProject;
    case "unready":
      return badge.unready;
  }
};

const getCollaborationPresentation = (
  readiness: AgentIntegrationReadiness,
  projectName: string | null,
): AgentIntegrationViewModel["collaboration"] => {
  const collaboration = copy.agentUi.integration.collaboration;
  switch (readiness) {
    case "disabled":
      return {
        status: "disabled",
        statusText: collaboration.disabledStatus,
        description: collaboration.disabledDescription,
        projectName: null,
      };
    case "connected":
      return {
        status: "ready",
        statusText: collaboration.readyStatus,
        description: collaboration.readyDescription,
        projectName,
      };
    case "waiting-project":
      return {
        status: "waiting-project",
        statusText: collaboration.waitingProjectStatus,
        description: collaboration.waitingProjectDescription,
        projectName: null,
      };
    case "unready":
      return {
        status: "unavailable",
        statusText: collaboration.unavailableStatus,
        description: collaboration.unavailableDescription,
        projectName: null,
      };
  }
};

const getBridgeEndpoint = (status?: DesktopAgentBridgeStatus | null) => {
  if (!status?.enabled) {
    return null;
  }

  if (!status.boardUrl) {
    return null;
  }

  try {
    const boardUrl = new URL(status.boardUrl);
    return boardUrl.searchParams.get("bridge");
  } catch {
    return null;
  }
};

const getBridgeEndpointLabel = (
  status: DesktopAgentBridgeStatus | null | undefined,
  endpoint: string | null,
) => {
  if (!status?.enabled) {
    return copy.agentUi.integration.bridgeNotStarted;
  }

  if (endpoint) {
    return endpoint;
  }

  return status.ready
    ? copy.agentUi.integration.bridgeStarted
    : copy.agentUi.integration.bridgeNotStarted;
};

const getAcpStatusText = ({
  configured,
  enabled,
  running,
  agentName,
}: {
  configured: boolean;
  enabled: boolean;
  running: boolean;
  agentName: string | null;
}) => {
  if (running) {
    return copy.agentUi.integration.acpTaskRunning;
  }

  if (enabled && agentName) {
    return agentName;
  }

  if (configured) {
    return copy.agentUi.integration.acpConfiguredDisabled;
  }

  return copy.agentUi.integration.acpNotConfigured;
};

export const buildAgentIntegrationViewModel = ({
  bridgeStatus = null,
  acpAgentSettings = null,
  runningTaskId = null,
}: BuildAgentIntegrationViewModelInput): AgentIntegrationViewModel => {
  const readiness = getReadiness(bridgeStatus);
  const enabled = Boolean(bridgeStatus?.enabled);
  const connected = readiness === "connected";
  const projectName = bridgeStatus?.currentProject?.name ?? null;
  const endpoint = getBridgeEndpoint(bridgeStatus);
  const projectToken = bridgeStatus?.currentProject?.agentAccess?.token ?? null;
  const normalizedAcpSettings = acpAgentSettings
    ? normalizeAcpAgentSettings(acpAgentSettings)
    : null;
  const selectedAgent = acpAgentSettings
    ? getSelectedAcpAgent(acpAgentSettings)
    : null;
  const acpExperimentalEnabled = normalizedAcpSettings
    ? isAcpExperimentalFeatureEnabled(normalizedAcpSettings)
    : false;
  const acpConfigured = Boolean(normalizedAcpSettings?.defaultAgentId);
  const acpEnabled = Boolean(acpExperimentalEnabled && selectedAgent);
  const acpRunning = Boolean(acpEnabled && runningTaskId);

  return {
    readiness,
    statusText: getStatusText(readiness),
    badgeText: getBadgeText(readiness),
    enabled,
    connected,
    collaboration: getCollaborationPresentation(readiness, projectName),
    bridge: {
      ready: Boolean(bridgeStatus?.ready),
      endpoint,
      endpointLabel: getBridgeEndpointLabel(bridgeStatus, endpoint),
      boardUrl: bridgeStatus?.boardUrl ?? null,
      boardUrlReady: Boolean(bridgeStatus?.boardUrl),
    },
    project: {
      open: Boolean(bridgeStatus?.currentProject),
      name: projectName,
      path: bridgeStatus?.currentProject?.projectPath ?? null,
      token: projectToken,
    },
    cli: {
      available: enabled && Boolean(bridgeStatus?.ready),
      envCopyable: enabled && Boolean(bridgeStatus?.ready && projectToken),
      statusText:
        enabled && bridgeStatus?.ready
          ? copy.agentUi.integration.cliDiscoverable
          : copy.agentUi.integration.cliEnableToDiscover,
    },
    board: {
      available: Boolean(bridgeStatus?.boardUrl),
      statusText: bridgeStatus?.boardUrl
        ? copy.agentUi.integration.boardLinkReady
        : copy.agentUi.integration.boardLinkWaiting,
    },
    acp: {
      experimentalEnabled: acpExperimentalEnabled,
      configured: acpConfigured,
      enabled: acpEnabled,
      agentId: selectedAgent?.id ?? null,
      agentName: selectedAgent?.name ?? null,
      runningTaskId: acpRunning ? runningTaskId : null,
      running: acpRunning,
      statusText: getAcpStatusText({
        configured: acpConfigured,
        enabled: acpEnabled,
        running: acpRunning,
        agentName: selectedAgent?.name ?? null,
      }),
    },
  };
};

const quoteShellValue = (value: string) =>
  `'${value.replaceAll("'", "'\\''")}'`;

export const buildAgentCliEnvironmentExports = (
  integration: AgentIntegrationViewModel,
): string[] | null => {
  const bridgeUrl = integration.bridge.endpoint;
  const projectToken = integration.project.token;

  if (!bridgeUrl || !projectToken) {
    return null;
  }

  return [
    `export CORESTUDIO_AGENT_BRIDGE_URL=${quoteShellValue(bridgeUrl)}`,
    `export CORESTUDIO_AGENT_PROJECT_TOKEN=${quoteShellValue(projectToken)}`,
    integration.bridge.boardUrl
      ? `export CORESTUDIO_AGENT_BOARD_URL=${quoteShellValue(
          integration.bridge.boardUrl,
        )}`
      : null,
  ].filter((line): line is string => Boolean(line));
};

export const buildAgentBoardCopyAction = (
  integration: AgentIntegrationViewModel,
): AgentIntegrationCopyAction => {
  if (!integration.bridge.boardUrl) {
    return {
      text: null,
      successMessage: null,
      errorMessage: copy.agentUi.integration.boardLinkNotReady,
    };
  }

  return {
    text: integration.bridge.boardUrl,
    successMessage: copy.agentUi.integration.boardLinkCopied,
    errorMessage: null,
  };
};

export const buildAgentCliEnvironmentCopyAction = (
  integration: AgentIntegrationViewModel,
): AgentIntegrationCopyAction => {
  const environmentLines = buildAgentCliEnvironmentExports(integration);

  if (!environmentLines) {
    return {
      text: null,
      successMessage: null,
      errorMessage: copy.agentUi.integration.cliEnvironmentNotReady,
    };
  }

  return {
    text: environmentLines.join("\n"),
    successMessage: copy.agentUi.integration.cliEnvironmentCopied,
    errorMessage: null,
  };
};

export const buildAgentBoardStartupViewModel = ({
  phase,
  bridgeStatus,
}: {
  phase: AgentBoardStartupPhase;
  bridgeStatus: DesktopAgentBridgeStatus | null | undefined;
}): AgentBoardStartupViewModel => {
  const startup = copy.agentUi.integration.startup;
  if (phase === "bridge-connection") {
    return {
      heading: bridgeStatus ? startup.disconnected : startup.connecting,
      description: startup.connectionDescription,
      actionLabel: startup.refresh,
    };
  }

  return {
    heading: startup.openingProject,
    description: bridgeStatus?.currentProject?.name
      ? startup.currentProject(bridgeStatus.currentProject.name)
      : startup.loadingProject,
    actionLabel: startup.reloadBoard,
  };
};

export const buildAgentBoardStartupRenderPlan = ({
  isAgentBrowserRoute,
  hasInitialProjectToken,
  bridgeStatus,
  hasCurrentProject,
  hasInitialData,
}: BuildAgentBoardStartupRenderPlanInput): AgentBoardStartupRenderPlan => {
  if (!isAgentBrowserRoute) {
    return { action: "none" };
  }

  if (!bridgeStatus || !bridgeStatus.ready) {
    const phase: AgentBoardStartupPhase = "bridge-connection";

    return {
      action: "show-startup",
      phase,
      viewModel: buildAgentBoardStartupViewModel({
        phase,
        bridgeStatus,
      }),
    };
  }

  if (
    hasInitialProjectToken &&
    bridgeStatus.currentProject &&
    (!hasCurrentProject || !hasInitialData)
  ) {
    const phase: AgentBoardStartupPhase = "project-loading";

    return {
      action: "show-startup",
      phase,
      viewModel: buildAgentBoardStartupViewModel({
        phase,
        bridgeStatus,
      }),
    };
  }

  return { action: "none" };
};

export const buildAcpAgentGenerationViewModel = ({
  integration,
  isAgentBrowserRoute,
  canStartAcpAgentTask,
  taskRunning,
  agentTaskStatus,
}: BuildAcpAgentGenerationViewModelInput): AcpAgentGenerationViewModel => {
  const ready = Boolean(
    integration.enabled &&
      integration.bridge.ready &&
      integration.acp.enabled &&
      canStartAcpAgentTask,
  );
  const canSubmitMessage = ready && !taskRunning;
  const hasSelectedAgent = Boolean(integration.acp.agentName);
  const composer = copy.agentUi.integration.composer;
  const unavailableMessage =
    hasSelectedAgent && integration.enabled
      ? composer.unavailable
      : composer.enableFirst;

  return {
    ready,
    canSubmitMessage,
    submitMessageDisabledReason: taskRunning
      ? composer.taskRunning
      : unavailableMessage,
    composerConfig: {
      defaultMode: "direct",
      showModeSwitch: !isAgentBrowserRoute && integration.acp.enabled,
      modeSwitchVariant: "acp-agent",
      showModeIndicator: false,
      defaultGenerationSource: "builtin",
      showGenerationSourceSwitch: false,
      agentGenerationAvailable: canSubmitMessage,
      agentGenerationUnavailableMessage:
        hasSelectedAgent && integration.enabled
          ? composer.unavailableSentence
          : composer.enableFirstSentence,
      agentTaskStatus,
    },
  };
};

export const buildAgentIntegrationRuntimeViewModel = ({
  bridgeStatus = null,
  acpAgentSettings = null,
  agentTaskStatus,
  taskRunning,
  canStartAcpAgentTask,
  isAgentBrowserRoute,
  hasInitialProjectToken,
  hasCurrentProject,
  hasInitialData,
}: BuildAgentIntegrationRuntimeViewModelInput): AgentIntegrationRuntimeViewModel => {
  const integration = buildAgentIntegrationViewModel({
    bridgeStatus,
    acpAgentSettings,
    runningTaskId: taskRunning ? agentTaskStatus?.taskId ?? null : null,
  });

  return {
    integration,
    acpGeneration: buildAcpAgentGenerationViewModel({
      integration,
      isAgentBrowserRoute,
      canStartAcpAgentTask,
      taskRunning,
      agentTaskStatus,
    }),
    boardStartup: buildAgentBoardStartupRenderPlan({
      isAgentBrowserRoute,
      hasInitialProjectToken,
      bridgeStatus,
      hasCurrentProject,
      hasInitialData,
    }),
  };
};
