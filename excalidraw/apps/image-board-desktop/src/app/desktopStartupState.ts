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

export const loadRecentProjectsStateAction = async ({
  bridge,
  setRecentProjects,
}: {
  bridge: DesktopBridgeApi | null;
  setRecentProjects: (projects: RecentProjectEntry[]) => void;
}) => {
  if (!bridge) {
    setRecentProjects([]);
    return;
  }

  try {
    setRecentProjects(await bridge.loadRecentProjects());
  } catch {
    setRecentProjects([]);
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
  setProjectError,
  setAppInfo,
  loadAcpAgentSettings,
}: {
  getBridge: () => DesktopBridgeApi | null;
  isGenerationModelSelectionLocked: ProviderSettingsLoadActionInput["isGenerationModelSelectionLocked"];
  getRememberedGenerationModelSelection?: ProviderSettingsLoadActionInput["getRememberedGenerationModelSelection"];
  setProviderSettings: ProviderSettingsLoadActionInput["setProviderSettings"];
  setGenerateRequest: ProviderSettingsLoadActionInput["setGenerateRequest"];
  setStartupError: ProviderSettingsLoadActionInput["setStartupError"];
  setRecentProjects: (projects: RecentProjectEntry[]) => void;
  setProjectError?: (message: string | null) => void;
  setAppInfo: (appInfo: DesktopAppInfo | null) => void;
  loadAcpAgentSettings: () => void | Promise<void>;
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
    void loadAcpAgentSettings();
    void loadRecentProjects();
  };

  const refreshAgentBrowser = async () => {
    void loadAppInfo();
    void loadProvider();
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
