import type {
  DesktopAppInfo,
  DesktopBridgeApi,
  RecentProjectEntry,
} from "../shared/desktopBridgeTypes";

import { runProviderSettingsLoadAction } from "./providerSettingsLoader";
import { copy } from "./copy";

type ProviderSettingsLoadActionInput = Parameters<
  typeof runProviderSettingsLoadAction
>[0];

export type RecentProjectsLoadStatus = "loading" | "loaded" | "failed";

export const loadRecentProjectsStateAction = async ({
  bridge,
  setRecentProjects,
  setRecentProjectsLoadStatus,
}: {
  bridge: DesktopBridgeApi | null;
  setRecentProjects: (projects: RecentProjectEntry[]) => void;
  setRecentProjectsLoadStatus?: (status: RecentProjectsLoadStatus) => void;
}) => {
  setRecentProjectsLoadStatus?.("loading");

  if (!bridge) {
    setRecentProjects([]);
    setRecentProjectsLoadStatus?.("failed");
    return;
  }

  try {
    setRecentProjects(await bridge.loadRecentProjects());
    setRecentProjectsLoadStatus?.("loaded");
  } catch {
    setRecentProjects([]);
    setRecentProjectsLoadStatus?.("failed");
  }
};

export const removeRecentProjectStateAction = async ({
  bridge,
  projectPath,
  setRecentProjects,
  setProjectError,
}: {
  bridge: DesktopBridgeApi | null;
  projectPath: string;
  setRecentProjects: (projects: RecentProjectEntry[]) => void;
  setProjectError: (message: string | null) => void;
}) => {
  if (!bridge?.removeRecentProject) {
    await loadRecentProjectsStateAction({ bridge, setRecentProjects });
    return;
  }

  try {
    setRecentProjects(await bridge.removeRecentProject(projectPath));
    setProjectError(null);
  } catch {
    setProjectError(copy.welcome.removeProjectFailed);
  }
};

export const loadAppInfoStateAction = async ({
  bridge,
  setAppInfo,
}: {
  bridge: DesktopBridgeApi | null;
  setAppInfo: (appInfo: DesktopAppInfo | null) => void;
}) => {
  if (!bridge?.loadAppInfo) {
    setAppInfo(null);
    return;
  }

  try {
    setAppInfo(await bridge.loadAppInfo());
  } catch {
    setAppInfo(null);
  }
};

export const createDesktopStartupRendererActions = ({
  getBridge,
  isGenerationModelSelectionLocked,
  getRememberedGenerationModelSelection,
  setProviderSettings,
  setGenerateRequest,
  setStartupError,
  setRecentProjects,
  setRecentProjectsLoadStatus,
  setProjectError,
  setAppInfo,
}: {
  getBridge: () => DesktopBridgeApi | null;
  isGenerationModelSelectionLocked: ProviderSettingsLoadActionInput["isGenerationModelSelectionLocked"];
  getRememberedGenerationModelSelection?: ProviderSettingsLoadActionInput["getRememberedGenerationModelSelection"];
  setProviderSettings: ProviderSettingsLoadActionInput["setProviderSettings"];
  setGenerateRequest: ProviderSettingsLoadActionInput["setGenerateRequest"];
  setStartupError: ProviderSettingsLoadActionInput["setStartupError"];
  setRecentProjects: (projects: RecentProjectEntry[]) => void;
  setRecentProjectsLoadStatus?: (status: RecentProjectsLoadStatus) => void;
  setProjectError?: (message: string | null) => void;
  setAppInfo: (appInfo: DesktopAppInfo | null) => void;
}) => {
  const loadProvider = async () => {
    await runProviderSettingsLoadAction({
      bridge: getBridge(),
      isGenerationModelSelectionLocked,
      getRememberedGenerationModelSelection,
      setProviderSettings,
      setGenerateRequest,
      setStartupError,
    });
  };

  const loadRecentProjects = async () => {
    await loadRecentProjectsStateAction({
      bridge: getBridge(),
      setRecentProjects,
      setRecentProjectsLoadStatus,
    });
  };

  const removeRecentProject = async (projectPath: string) => {
    await removeRecentProjectStateAction({
      bridge: getBridge(),
      projectPath,
      setRecentProjects,
      setProjectError: setProjectError ?? (() => undefined),
    });
  };

  const loadAppInfo = async () => {
    await loadAppInfoStateAction({
      bridge: getBridge(),
      setAppInfo,
    });
  };

  const loadAll = () => {
    void loadAppInfo();
    void loadProvider();
    void loadRecentProjects();
  };

  const refreshAgentBrowser = async () => {
    void loadAppInfo();
    await loadRecentProjects();
  };

  return {
    loadProvider,
    loadRecentProjects,
    removeRecentProject,
    loadAppInfo,
    loadAll,
    refreshAgentBrowser,
  };
};
