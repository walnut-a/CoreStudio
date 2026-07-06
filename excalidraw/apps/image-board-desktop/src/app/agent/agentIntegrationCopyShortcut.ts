import type { AcpAgentSettings } from "../../shared/acpTypes";
import type { DesktopAgentBridgeStatus } from "../../shared/desktopBridgeTypes";
import {
  buildAgentBoardCopyAction,
  buildAgentCliEnvironmentCopyAction,
  buildAgentIntegrationViewModel,
} from "./agentIntegrationViewModel";

export type AgentIntegrationCopyShortcut = "board-url" | "cli-environment";

export type AgentIntegrationCopyShortcutResult =
  | {
      status: "copied";
      message: string;
    }
  | {
      status: "unavailable";
      message: string;
    }
  | {
      status: "copy-failed";
      message: null;
    };

export interface RunAgentIntegrationCopyShortcutInput {
  shortcut: AgentIntegrationCopyShortcut;
  bridgeStatus: DesktopAgentBridgeStatus | null;
  acpAgentSettings: AcpAgentSettings | null;
  runningTaskId: string | null;
  refreshBridgeStatus: () => Promise<DesktopAgentBridgeStatus | null>;
  copyText: (text: string) => Promise<boolean>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export interface RunAgentIntegrationCopyShortcutRendererActionInput {
  shortcut: AgentIntegrationCopyShortcut;
  getBridgeStatus: () => DesktopAgentBridgeStatus | null;
  getAcpAgentSettings: () => AcpAgentSettings | null;
  getRunningTaskId: () => string | null;
  refreshBridgeStatus: () => Promise<DesktopAgentBridgeStatus | null>;
  copyText: (text: string) => Promise<boolean>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export const runAgentIntegrationCopyShortcut = async ({
  shortcut,
  bridgeStatus,
  acpAgentSettings,
  runningTaskId,
  refreshBridgeStatus,
  copyText,
  onSuccess,
  onError,
}: RunAgentIntegrationCopyShortcutInput): Promise<AgentIntegrationCopyShortcutResult> => {
  const refreshedBridgeStatus = await refreshBridgeStatus();
  const integration = buildAgentIntegrationViewModel({
    bridgeStatus: refreshedBridgeStatus ?? bridgeStatus,
    acpAgentSettings,
    runningTaskId,
  });
  const action =
    shortcut === "board-url"
      ? buildAgentBoardCopyAction(integration)
      : buildAgentCliEnvironmentCopyAction(integration);

  if (!action.text) {
    const errorMessage =
      action.errorMessage ?? "Agent 集成快捷动作尚未就绪。";
    onError(errorMessage);
    return {
      status: "unavailable",
      message: errorMessage,
    };
  }

  if (!(await copyText(action.text))) {
    return {
      status: "copy-failed",
      message: null,
    };
  }

  onSuccess(action.successMessage);
  return {
    status: "copied",
    message: action.successMessage,
  };
};

export const runAgentIntegrationCopyShortcutRendererAction = async ({
  shortcut,
  getBridgeStatus,
  getAcpAgentSettings,
  getRunningTaskId,
  refreshBridgeStatus,
  copyText,
  onSuccess,
  onError,
}: RunAgentIntegrationCopyShortcutRendererActionInput): Promise<AgentIntegrationCopyShortcutResult> =>
  runAgentIntegrationCopyShortcut({
    shortcut,
    bridgeStatus: getBridgeStatus(),
    acpAgentSettings: getAcpAgentSettings(),
    runningTaskId: getRunningTaskId(),
    refreshBridgeStatus,
    copyText,
    onSuccess,
    onError,
  });

export const createAgentIntegrationCopyShortcutRendererActions = ({
  getBridgeStatus,
  getAcpAgentSettings,
  getRunningTaskId,
  refreshBridgeStatus,
  copyText,
  onSuccess,
  onError,
}: Omit<RunAgentIntegrationCopyShortcutRendererActionInput, "shortcut">) => ({
  copyBoardUrl: () =>
    runAgentIntegrationCopyShortcutRendererAction({
      shortcut: "board-url",
      getBridgeStatus,
      getAcpAgentSettings,
      getRunningTaskId,
      refreshBridgeStatus,
      copyText,
      onSuccess,
      onError,
    }),
  copyCliEnvironment: () =>
    runAgentIntegrationCopyShortcutRendererAction({
      shortcut: "cli-environment",
      getBridgeStatus,
      getAcpAgentSettings,
      getRunningTaskId,
      refreshBridgeStatus,
      copyText,
      onSuccess,
      onError,
    }),
});
