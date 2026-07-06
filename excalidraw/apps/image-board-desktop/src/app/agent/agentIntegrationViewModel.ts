import {
  getSelectedAcpAgent,
  normalizeAcpAgentSettings,
  type AcpAgentSettings,
} from "../../shared/acpTypes";
import type { DesktopAgentBridgeStatus } from "../../shared/desktopBridgeTypes";
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
  switch (readiness) {
    case "disabled":
      return "Agent 集成已关闭";
    case "connected":
      return "Agent 已连接";
    case "waiting-project":
      return "Agent 集成已开启";
    case "unready":
      return "Agent 未就绪";
  }
};

const getBadgeText = (readiness: AgentIntegrationReadiness) => {
  switch (readiness) {
    case "disabled":
      return "关闭";
    case "connected":
      return "在线";
    case "waiting-project":
      return "等待项目";
    case "unready":
      return "未连接";
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
    return "未启动";
  }

  if (endpoint) {
    return endpoint;
  }

  return status.ready ? "本地桥已启动" : "未启动";
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
    return "任务运行中";
  }

  if (enabled && agentName) {
    return agentName;
  }

  if (configured) {
    return "已配置，未启用";
  }

  return "未配置";
};

export const buildAgentIntegrationViewModel = ({
  bridgeStatus = null,
  acpAgentSettings = null,
  runningTaskId = null,
}: BuildAgentIntegrationViewModelInput): AgentIntegrationViewModel => {
  const readiness = getReadiness(bridgeStatus);
  const enabled = Boolean(bridgeStatus?.enabled);
  const connected = readiness === "connected";
  const endpoint = getBridgeEndpoint(bridgeStatus);
  const projectToken = bridgeStatus?.currentProject?.agentAccess?.token ?? null;
  const normalizedAcpSettings = acpAgentSettings
    ? normalizeAcpAgentSettings(acpAgentSettings)
    : null;
  const selectedAgent = acpAgentSettings
    ? getSelectedAcpAgent(acpAgentSettings)
    : null;
  const acpConfigured = Boolean(normalizedAcpSettings?.defaultAgentId);
  const acpEnabled = Boolean(normalizedAcpSettings?.enabled && selectedAgent);
  const acpRunning = Boolean(runningTaskId);

  return {
    readiness,
    statusText: getStatusText(readiness),
    badgeText: getBadgeText(readiness),
    enabled,
    connected,
    bridge: {
      ready: Boolean(bridgeStatus?.ready),
      endpoint,
      endpointLabel: getBridgeEndpointLabel(bridgeStatus, endpoint),
      boardUrl: bridgeStatus?.boardUrl ?? null,
      boardUrlReady: Boolean(bridgeStatus?.boardUrl),
    },
    project: {
      open: Boolean(bridgeStatus?.currentProject),
      name: bridgeStatus?.currentProject?.name ?? null,
      path: bridgeStatus?.currentProject?.projectPath ?? null,
      token: projectToken,
    },
    cli: {
      available: enabled && Boolean(bridgeStatus?.ready),
      envCopyable: enabled && Boolean(bridgeStatus?.ready && projectToken),
      statusText:
        enabled && bridgeStatus?.ready
          ? "可自动发现当前会话"
          : "开启连接后可发现",
    },
    board: {
      available: Boolean(bridgeStatus?.boardUrl),
      statusText: bridgeStatus?.boardUrl
        ? "可复制 Board 链接"
        : "等待 Board 链接",
    },
    acp: {
      configured: acpConfigured,
      enabled: acpEnabled,
      agentId: selectedAgent?.id ?? null,
      agentName: selectedAgent?.name ?? null,
      runningTaskId,
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
      errorMessage: "Agent Board 链接尚未就绪。",
    };
  }

  return {
    text: integration.bridge.boardUrl,
    successMessage: "Agent Board 链接已复制。",
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
      errorMessage: "CLI 环境变量尚未就绪，请先开启 Agent 集成并打开项目。",
    };
  }

  return {
    text: environmentLines.join("\n"),
    successMessage: "CLI 环境变量已复制。",
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
  if (phase === "bridge-connection") {
    return {
      heading: bridgeStatus ? "桌面端未连接" : "正在连接桌面端",
      description: "请确认 CoreStudio 桌面端仍在运行，然后刷新连接状态。",
      actionLabel: "刷新连接状态",
    };
  }

  return {
    heading: "正在进入桌面端当前项目",
    description: bridgeStatus?.currentProject?.name
      ? `当前项目：${bridgeStatus.currentProject.name}`
      : "已确认本地桥连接，正在读取桌面端当前项目。",
    actionLabel: "重新加载当前画板",
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
  const unavailableMessage =
    hasSelectedAgent && integration.enabled
      ? "Agent 暂不可用"
      : "先在设置里启用 ACP Agent";

  return {
    ready,
    canSubmitMessage,
    submitMessageDisabledReason: taskRunning
      ? "当前任务处理中"
      : unavailableMessage,
    composerConfig: {
      defaultMode: isAgentBrowserRoute ? "agent" : "direct",
      showModeSwitch: !isAgentBrowserRoute && integration.acp.enabled,
      modeSwitchVariant: isAgentBrowserRoute
        ? "agent-operation"
        : "acp-agent",
      showModeIndicator: isAgentBrowserRoute,
      defaultGenerationSource: isAgentBrowserRoute ? "agent" : "builtin",
      showGenerationSourceSwitch: false,
      agentGenerationAvailable: canSubmitMessage,
      agentGenerationUnavailableMessage: `${unavailableMessage}。`,
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
