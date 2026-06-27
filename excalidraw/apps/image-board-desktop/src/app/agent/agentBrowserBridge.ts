import {
  AGENT_HTTP_ROUTES,
  type AgentBrowserRuntimeState,
  type AgentDesktopBridgeMethod,
  type AgentEnvelope,
} from "../../shared/agentBridgeTypes";

import type {
  CleanProjectCacheResult,
  DesktopAgentBridgeStatus,
  DesktopAppInfo,
  DesktopBridgeApi,
  DesktopCurrentProject,
  DesktopProjectBundle,
  GenerateImagesInput,
  ImportedImagePayload,
  PersistedImageAssetInput,
  ProjectAssetPayload,
  ProjectHealthReport,
  PublicProviderSettings,
  RebuildProjectThumbnailsResult,
  RecentProjectEntry,
  SavedPrompt,
  SavePromptInput,
  SaveProviderSettingsInput,
} from "../../shared/desktopBridgeTypes";
import type { ImageRecordMap } from "../../shared/projectTypes";
import type { GenerationResponse } from "../../shared/providerTypes";

interface AgentBrowserBridgeConfig {
  bridge: string;
  token?: string;
}

interface AgentBridgeStatusResponse {
  ready: boolean;
  currentProject: DesktopCurrentProject | null;
}

const getAgentBrowserBridgeConfig = (): AgentBrowserBridgeConfig | null => {
  if (window.location.pathname !== "/agent-board") {
    return null;
  }

  const url = new URL(window.location.href);
  const bridge = url.searchParams.get("bridge");
  const token =
    url.searchParams.get("projectToken") ?? url.searchParams.get("token");
  if (!bridge) {
    return null;
  }

  return {
    bridge: bridge.replace(/\/+$/, ""),
    ...(token ? { token } : {}),
  };
};

const isEnvelope = <T>(value: unknown): value is AgentEnvelope<T> =>
  typeof value === "object" && value !== null && "ok" in value;

const requestAgentBridge = async <T>(
  config: AgentBrowserBridgeConfig,
  route: string,
  init: RequestInit = {},
): Promise<T> => {
  const response = await fetch(`${config.bridge}${route}`, {
    ...init,
    headers: {
      ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });
  const json = (await response.json()) as unknown;
  if (!isEnvelope<T>(json)) {
    throw new Error("Agent Bridge 返回了无法识别的数据。");
  }
  if (!json.ok) {
    throw new Error(json.error.message);
  }
  return json.data;
};

const callDesktopBridge = <T>(
  config: AgentBrowserBridgeConfig,
  method: AgentDesktopBridgeMethod,
  args: unknown[] = [],
) =>
  requestAgentBridge<T>(config, AGENT_HTTP_ROUTES.desktopBridge, {
    method: "POST",
    body: JSON.stringify({
      method,
      args,
    }),
  });

export const publishAgentBrowserRuntimeState = async (
  state: AgentBrowserRuntimeState,
) => {
  const config = getAgentBrowserBridgeConfig();
  if (!config) {
    return false;
  }

  await requestAgentBridge<{ accepted: true }>(
    config,
    AGENT_HTTP_ROUTES.browserState,
    {
      method: "POST",
      body: JSON.stringify(state),
    },
  );
  return true;
};

export const maybeCreateAgentBrowserDesktopBridge =
  (): DesktopBridgeApi | null => {
    const config = getAgentBrowserBridgeConfig();
    if (!config) {
      return null;
    }

    const getStatus = () =>
      requestAgentBridge<AgentBridgeStatusResponse>(
        config,
        AGENT_HTTP_ROUTES.status,
      );

    const bridge: DesktopBridgeApi = {
      createProject: async () => null,
      openProject: async () => null,
      openRecentProject: async (projectPath) => {
        const bundle = await callDesktopBridge<DesktopProjectBundle | null>(
          config,
          "openRecentProject",
          [projectPath],
        );
        if (bundle?.project.agentAccess.token) {
          config.token = bundle.project.agentAccess.token;
          const url = new URL(window.location.href);
          url.searchParams.set("projectToken", config.token);
          window.history.replaceState(null, "", url.toString());
        }
        return bundle;
      },
      loadRecentProjects: () =>
        callDesktopBridge<RecentProjectEntry[]>(config, "loadRecentProjects"),
      writeProjectScene: (input) =>
        callDesktopBridge<void>(config, "writeProjectScene", [input]),
      readProjectAssetPayloads: (input) =>
        callDesktopBridge<ProjectAssetPayload[]>(
          config,
          "readProjectAssetPayloads",
          [input],
        ),
      inspectProjectHealth: (input) =>
        callDesktopBridge<ProjectHealthReport>(config, "inspectProjectHealth", [
          input,
        ]),
      rebuildProjectThumbnails: (input) =>
        callDesktopBridge<RebuildProjectThumbnailsResult>(
          config,
          "rebuildProjectThumbnails",
          [input],
        ),
      cleanProjectCache: (input) =>
        callDesktopBridge<CleanProjectCacheResult>(
          config,
          "cleanProjectCache",
          [input],
        ),
      persistImageAssets: (input: {
        projectPath: string;
        files: PersistedImageAssetInput[];
      }) =>
        callDesktopBridge<ImageRecordMap>(config, "persistImageAssets", [
          input,
        ]),
      importImages: () =>
        callDesktopBridge<ImportedImagePayload[]>(config, "importImages"),
      revealProjectInFinder: (projectPath) =>
        callDesktopBridge<void>(config, "revealProjectInFinder", [projectPath]),
      loadAppInfo: () =>
        callDesktopBridge<DesktopAppInfo>(config, "loadAppInfo"),
      loadProviderSettings: () =>
        callDesktopBridge<PublicProviderSettings>(
          config,
          "loadProviderSettings",
        ),
      saveProviderSettings: (input: SaveProviderSettingsInput) =>
        callDesktopBridge<PublicProviderSettings>(
          config,
          "saveProviderSettings",
          [input],
        ),
      loadPromptLibrary: () =>
        callDesktopBridge<SavedPrompt[]>(config, "loadPromptLibrary"),
      savePrompt: (input: SavePromptInput) =>
        callDesktopBridge<SavedPrompt[]>(config, "savePrompt", [input]),
      deleteSavedPrompt: (id) =>
        callDesktopBridge<SavedPrompt[]>(config, "deleteSavedPrompt", [id]),
      markSavedPromptUsed: (id) =>
        callDesktopBridge<SavedPrompt[]>(config, "markSavedPromptUsed", [id]),
      generateImages: (input: GenerateImagesInput) =>
        callDesktopBridge<GenerationResponse>(config, "generateImages", [
          input,
        ]),
      readClipboardImage: () =>
        callDesktopBridge<ImportedImagePayload | null>(
          config,
          "readClipboardImage",
        ),
      onMenuAction: () => () => undefined,
      notifyRendererReady: () => undefined,
      notifyProjectStateChanged: () => undefined,
      getAgentBridgeStatus: async (): Promise<DesktopAgentBridgeStatus> => {
        const status = await getStatus();
        return {
          enabled: true,
          ready: status.ready,
          currentProject: status.currentProject,
          boardUrl: window.location.href,
        };
      },
      onFlushAutosaveRequest: () => () => undefined,
      onAgentCommandRequest: () => () => undefined,
    };

    return bridge;
  };
