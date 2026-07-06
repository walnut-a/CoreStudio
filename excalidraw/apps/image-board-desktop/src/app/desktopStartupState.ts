import type {
  DesktopAppInfo,
  DesktopBridgeApi,
  RecentProjectEntry,
} from "../shared/desktopBridgeTypes";

import { loadSavedPromptLibraryStateAction } from "./generatePromptLibraryActions";
import { runProviderSettingsLoadAction } from "./providerSettingsLoader";

type ProviderSettingsLoadActionInput = Parameters<
  typeof runProviderSettingsLoadAction
>[0];

type PromptLibraryLoadActionInput = Parameters<
  typeof loadSavedPromptLibraryStateAction
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
  setProviderSettings,
  setGenerateRequest,
  setStartupError,
  setRecentProjects,
  setAppInfo,
  setSavedPrompts,
  loadAcpAgentSettings,
}: {
  getBridge: () => DesktopBridgeApi | null;
  isGenerationModelSelectionLocked: ProviderSettingsLoadActionInput["isGenerationModelSelectionLocked"];
  setProviderSettings: ProviderSettingsLoadActionInput["setProviderSettings"];
  setGenerateRequest: ProviderSettingsLoadActionInput["setGenerateRequest"];
  setStartupError: ProviderSettingsLoadActionInput["setStartupError"];
  setRecentProjects: (projects: RecentProjectEntry[]) => void;
  setAppInfo: (appInfo: DesktopAppInfo | null) => void;
  setSavedPrompts: PromptLibraryLoadActionInput["setSavedPrompts"];
  loadAcpAgentSettings: () => void | Promise<void>;
}) => {
  const loadProvider = async () => {
    await runProviderSettingsLoadAction({
      bridge: getBridge(),
      isGenerationModelSelectionLocked,
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

  const loadAppInfo = async () => {
    await loadAppInfoStateAction({
      bridge: getBridge(),
      setAppInfo,
    });
  };

  const loadPromptLibrary = async () => {
    await loadSavedPromptLibraryStateAction({
      bridge: getBridge(),
      setSavedPrompts,
    });
  };

  const loadAll = () => {
    void loadAppInfo();
    void loadProvider();
    void loadAcpAgentSettings();
    void loadRecentProjects();
    void loadPromptLibrary();
  };

  const refreshAgentBrowser = async () => {
    void loadAppInfo();
    void loadProvider();
    void loadPromptLibrary();
    await loadRecentProjects();
  };

  return {
    loadProvider,
    loadRecentProjects,
    loadAppInfo,
    loadPromptLibrary,
    loadAll,
    refreshAgentBrowser,
  };
};
