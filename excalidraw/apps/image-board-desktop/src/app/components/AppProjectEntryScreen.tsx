import type { ReactNode } from "react";

import type {
  DesktopAgentActiveProject,
  DesktopProjectTheme,
  RecentProjectEntry,
} from "../../shared/desktopBridgeTypes";
import { AppErrorBanners } from "./AppErrorBanners";
import { type ProviderConfigurationStatus, WelcomePane } from "./WelcomePane";
import type { RecentProjectsLoadStatus } from "../desktopStartupState";

interface AppProjectEntryScreenProps {
  titlebar?: ReactNode;
  content?: ReactNode;
  startupError: string | null;
  projectError: string | null;
  loadingProject: boolean;
  recentProjects: RecentProjectEntry[];
  agentActiveProjects?: DesktopAgentActiveProject[];
  recentProjectsLoadStatus: RecentProjectsLoadStatus;
  providerConfigurationStatus: ProviderConfigurationStatus;
  onCreateProject: () => void;
  onOpenProject: () => void;
  onReloadRecentProjects?: () => void | Promise<void>;
  onOpenProviderSettings: () => void;
  onOpenRecentProject: (projectPath: string) => void;
  onOpenAgentProject?: (projectPath: string) => void;
  onRemoveRecentProject: (projectPath: string) => void | Promise<void>;
  onRevealProject: (projectPath: string) => void | Promise<void>;
  manualProjectActionsVisible: boolean;
  globalDialogs: ReactNode;
  theme?: DesktopProjectTheme;
}

export const AppProjectEntryScreen = ({
  titlebar,
  content,
  startupError,
  projectError,
  loadingProject,
  recentProjects,
  agentActiveProjects = [],
  recentProjectsLoadStatus,
  providerConfigurationStatus,
  onCreateProject,
  onOpenProject,
  onReloadRecentProjects,
  onOpenProviderSettings,
  onOpenRecentProject,
  onOpenAgentProject,
  onRemoveRecentProject,
  onRevealProject,
  manualProjectActionsVisible,
  globalDialogs,
  theme = "light",
}: AppProjectEntryScreenProps) => (
  <div className="image-board-app" data-theme={theme}>
    {titlebar}
    <AppErrorBanners startupError={startupError} projectError={projectError} />
    {content ?? (
      <WelcomePane
        loading={loadingProject}
        onCreateProject={onCreateProject}
        onOpenProject={onOpenProject}
        onReloadRecentProjects={onReloadRecentProjects}
        recentProjects={recentProjects}
        agentActiveProjects={agentActiveProjects}
        recentProjectsLoadStatus={recentProjectsLoadStatus}
        providerConfigurationStatus={providerConfigurationStatus}
        onOpenProviderSettings={onOpenProviderSettings}
        onOpenRecentProject={onOpenRecentProject}
        onOpenAgentProject={onOpenAgentProject}
        onRemoveRecentProject={onRemoveRecentProject}
        onRevealProject={onRevealProject}
        manualProjectActionsVisible={manualProjectActionsVisible}
      />
    )}
    {globalDialogs}
  </div>
);
