import type { ReactNode } from "react";

import type { RecentProjectEntry } from "../../shared/desktopBridgeTypes";
import type { AgentIntegrationViewModel } from "../agent/agentIntegrationViewModel";
import { AppErrorBanners } from "./AppErrorBanners";
import { AgentStatusDock } from "./AgentStatusDock";
import { WelcomePane } from "./WelcomePane";

interface AppProjectEntryScreenProps {
  startupError: string | null;
  projectError: string | null;
  loadingProject: boolean;
  recentProjects: RecentProjectEntry[];
  onCreateProject: () => void;
  onOpenProject: () => void;
  onOpenRecentProject: (projectPath: string) => void;
  onRemoveRecentProject: (projectPath: string) => void | Promise<void>;
  onRevealProject: (projectPath: string) => void | Promise<void>;
  manualProjectActionsVisible: boolean;
  showAgentStatusDock: boolean;
  integration: AgentIntegrationViewModel;
  onOpenAgentSettings?: () => void;
  globalDialogs: ReactNode;
}

export const AppProjectEntryScreen = ({
  startupError,
  projectError,
  loadingProject,
  recentProjects,
  onCreateProject,
  onOpenProject,
  onOpenRecentProject,
  onRemoveRecentProject,
  onRevealProject,
  manualProjectActionsVisible,
  showAgentStatusDock,
  integration,
  onOpenAgentSettings,
  globalDialogs,
}: AppProjectEntryScreenProps) => (
  <div className="image-board-app">
    <AppErrorBanners startupError={startupError} projectError={projectError} />
    <WelcomePane
      loading={loadingProject}
      onCreateProject={onCreateProject}
      onOpenProject={onOpenProject}
      recentProjects={recentProjects}
      onOpenRecentProject={onOpenRecentProject}
      onRemoveRecentProject={onRemoveRecentProject}
      onRevealProject={onRevealProject}
      manualProjectActionsVisible={manualProjectActionsVisible}
    />
    {showAgentStatusDock ? (
      <AgentStatusDock
        integration={integration}
        onOpenAgentSettings={onOpenAgentSettings}
      />
    ) : null}
    {globalDialogs}
  </div>
);
