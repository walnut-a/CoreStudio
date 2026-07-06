import { buildAgentBrowserAutoOpenProjectPlan } from "./agentBrowserConnectionState";

export type AgentBrowserAutoOpenProjectActionResult =
  | {
      status: "skipped";
    }
  | {
      status: "opening";
      projectPath: string;
    };

export interface RunAgentBrowserAutoOpenProjectActionInput {
  isAgentBrowserRoute: boolean;
  hasInitialProjectToken: boolean;
  loadingProject: boolean;
  bridgeProjectPath: string | null;
  currentProjectPath: string | null;
  autoOpenProjectPath: string | null;
  setAutoOpenProjectPath: (projectPath: string) => void;
  openProject: (projectPath: string) => void | Promise<void>;
}

export interface AgentBrowserAutoOpenProjectRendererActionsInput {
  getIsAgentBrowserRoute: () => boolean;
  getHasInitialProjectToken: () => boolean;
  getLoadingProject: () => boolean;
  getBridgeProjectPath: () => string | null;
  getCurrentProjectPath: () => string | null;
  getAutoOpenProjectPath: () => string | null;
  setAutoOpenProjectPath: (projectPath: string) => void;
  openProject: (projectPath: string) => void | Promise<void>;
}

export interface AgentBrowserAutoOpenProjectRendererActions {
  maybeOpen: () => AgentBrowserAutoOpenProjectActionResult;
}

export const runAgentBrowserAutoOpenProjectAction = ({
  isAgentBrowserRoute,
  hasInitialProjectToken,
  loadingProject,
  bridgeProjectPath,
  currentProjectPath,
  autoOpenProjectPath,
  setAutoOpenProjectPath,
  openProject,
}: RunAgentBrowserAutoOpenProjectActionInput): AgentBrowserAutoOpenProjectActionResult => {
  const plan = buildAgentBrowserAutoOpenProjectPlan({
    isAgentBrowserRoute,
    hasInitialProjectToken,
    loadingProject,
    bridgeProjectPath,
    currentProjectPath,
    autoOpenProjectPath,
  });

  if (plan.action !== "open-project") {
    return { status: "skipped" };
  }

  setAutoOpenProjectPath(plan.projectPath);
  void openProject(plan.projectPath);

  return {
    status: "opening",
    projectPath: plan.projectPath,
  };
};

export const createAgentBrowserAutoOpenProjectRendererActions = ({
  getIsAgentBrowserRoute,
  getHasInitialProjectToken,
  getLoadingProject,
  getBridgeProjectPath,
  getCurrentProjectPath,
  getAutoOpenProjectPath,
  setAutoOpenProjectPath,
  openProject,
}: AgentBrowserAutoOpenProjectRendererActionsInput): AgentBrowserAutoOpenProjectRendererActions => ({
  maybeOpen: () =>
    runAgentBrowserAutoOpenProjectAction({
      isAgentBrowserRoute: getIsAgentBrowserRoute(),
      hasInitialProjectToken: getHasInitialProjectToken(),
      loadingProject: getLoadingProject(),
      bridgeProjectPath: getBridgeProjectPath(),
      currentProjectPath: getCurrentProjectPath(),
      autoOpenProjectPath: getAutoOpenProjectPath(),
      setAutoOpenProjectPath,
      openProject,
    }),
});
