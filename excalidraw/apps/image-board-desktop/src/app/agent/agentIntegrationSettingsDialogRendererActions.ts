export interface AgentIntegrationSettingsDialogRendererActionsInput {
  close: () => void;
  setIntegrationEnabled: (enabled: boolean) => unknown | Promise<unknown>;
  copyBoardUrl: () => unknown | Promise<unknown>;
  getBoardUrl: () => string | null | undefined;
  openExternalUrl: (url: string, target: string) => unknown;
  copyCliEnvironment: () => unknown | Promise<unknown>;
  saveAcpAgentSettings: () => unknown | Promise<unknown>;
  setAcpDebugOpen: (open: boolean) => void;
  refreshAcpRunSummaries: () => unknown | Promise<unknown>;
  openAcpRunLog: (taskId: string) => unknown | Promise<unknown>;
}

export interface AgentIntegrationSettingsDialogRendererActions {
  close: () => void;
  setIntegrationEnabled: (enabled: boolean) => void;
  copyBoardUrl: () => void;
  openBoardUrl: () => void;
  copyCliEnvironment: () => void;
  saveAcpAgentSettings: () => void;
  setAcpDebugOpen: (open: boolean) => void;
  refreshAcpRunSummaries: () => void;
  openAcpRunLog: (taskId: string) => void;
}

export const createAgentIntegrationSettingsDialogRendererActions = ({
  close,
  setIntegrationEnabled,
  copyBoardUrl,
  getBoardUrl,
  openExternalUrl,
  copyCliEnvironment,
  saveAcpAgentSettings,
  setAcpDebugOpen,
  refreshAcpRunSummaries,
  openAcpRunLog,
}: AgentIntegrationSettingsDialogRendererActionsInput): AgentIntegrationSettingsDialogRendererActions => ({
  close,
  setIntegrationEnabled: (enabled) => {
    void setIntegrationEnabled(enabled);
  },
  copyBoardUrl: () => {
    void copyBoardUrl();
  },
  openBoardUrl: () => {
    const boardUrl = getBoardUrl();
    if (boardUrl) {
      openExternalUrl(boardUrl, "_blank");
    }
  },
  copyCliEnvironment: () => {
    void copyCliEnvironment();
  },
  saveAcpAgentSettings: () => {
    void saveAcpAgentSettings();
  },
  setAcpDebugOpen,
  refreshAcpRunSummaries: () => {
    void refreshAcpRunSummaries();
  },
  openAcpRunLog: (taskId) => {
    void openAcpRunLog(taskId);
  },
});
