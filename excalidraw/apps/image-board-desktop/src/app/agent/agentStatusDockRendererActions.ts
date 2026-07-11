export interface AgentStatusDockRendererActionsInput {
  copyBoardUrl: () => unknown | Promise<unknown>;
  copyCliEnvironment: () => unknown | Promise<unknown>;
  refreshStatus: () => void | Promise<unknown>;
  openSettings: () => void;
  openConversation?: () => void;
}

export interface AgentStatusDockRendererActions {
  copyBoardUrl: () => void;
  copyCliEnvironment: () => void;
  refreshStatus: () => void | Promise<unknown>;
  openSettings: () => void;
  openConversation?: () => void;
}

export const createAgentStatusDockRendererActions = ({
  copyBoardUrl,
  copyCliEnvironment,
  refreshStatus,
  openSettings,
  openConversation,
}: AgentStatusDockRendererActionsInput): AgentStatusDockRendererActions => ({
  copyBoardUrl: () => {
    void copyBoardUrl();
  },
  copyCliEnvironment: () => {
    void copyCliEnvironment();
  },
  refreshStatus,
  openSettings,
  openConversation,
});
