import { useEffect } from "react";

type AgentBrowserAutoOpenProjectRendererActions = {
  maybeOpen: () => void;
};

export const useAgentBridgeWiring = ({
  agentBrowserAutoOpenProjectRendererActions,
  agentBrowserAutoOpenProjectPath,
  agentBrowserInitialProjectToken,
  agentBridgeCurrentProjectPath,
  currentProjectPath,
  isAgentBrowserRoute,
  loadingProject,
}: {
  agentBrowserAutoOpenProjectRendererActions: AgentBrowserAutoOpenProjectRendererActions;
  agentBrowserAutoOpenProjectPath: string | null;
  agentBrowserInitialProjectToken: boolean;
  agentBridgeCurrentProjectPath: string | null;
  currentProjectPath: string | null;
  isAgentBrowserRoute: boolean;
  loadingProject: boolean;
}) => {
  useEffect(() => {
    agentBrowserAutoOpenProjectRendererActions.maybeOpen();
  }, [
    agentBrowserAutoOpenProjectPath,
    agentBrowserInitialProjectToken,
    agentBridgeCurrentProjectPath,
    currentProjectPath,
    isAgentBrowserRoute,
    loadingProject,
  ]);
};
