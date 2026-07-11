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
import type { AcpAgentSettings } from "../../shared/acpTypes";
import type {
  ImageRecordMap,
  ProjectImageWritebackTransaction,
} from "../../shared/projectTypes";
import type { GenerationResponse } from "../../shared/providerTypes";

export interface AgentBrowserBridgeConfig {
  bridge: string;
  token?: string;
}

export interface AgentBrowserRouteState {
  isAgentBrowserRoute: boolean;
  hasInitialProjectToken: boolean;
}

interface AgentBridgeStatusResponse {
  ready: boolean;
  currentProject: DesktopCurrentProject | null;
}

export const buildAgentBrowserRouteState = ({
  pathname,
  href,
}: {
  pathname: string;
  href: string;
}): AgentBrowserRouteState => {
  const isAgentBrowserRoute = pathname === "/agent-board";
  if (!isAgentBrowserRoute) {
    return {
      isAgentBrowserRoute: false,
      hasInitialProjectToken: false,
    };
  }

  const url = new URL(href);
  return {
    isAgentBrowserRoute,
    hasInitialProjectToken: Boolean(
      url.searchParams.get("projectToken") ?? url.searchParams.get("token"),
    ),
  };
};

export const buildAgentBrowserBridgeConfig = ({
  pathname,
  href,
}: {
  pathname: string;
  href: string;
}): AgentBrowserBridgeConfig | null => {
  if (pathname !== "/agent-board") {
    return null;
  }

  const url = new URL(href);
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

export const buildAgentBrowserProjectTokenHref = ({
  href,
  token,
}: {
  href: string;
  token: string;
}) => {
  const url = new URL(href);
  url.searchParams.set("projectToken", token);
  return url.toString();
};

const getAgentBrowserBridgeConfig = (): AgentBrowserBridgeConfig | null => {
  return buildAgentBrowserBridgeConfig({
    pathname: window.location.pathname,
    href: window.location.href,
  });
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
          window.history.replaceState(
            null,
            "",
            buildAgentBrowserProjectTokenHref({
              href: window.location.href,
              token: config.token,
            }),
          );
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
      beginImageWriteback: (input) =>
        callDesktopBridge<ProjectImageWritebackTransaction>(
          config,
          "beginImageWriteback",
          [input],
        ),
      commitImageWriteback: (input) =>
        callDesktopBridge<void>(config, "commitImageWriteback", [input]),
      rollbackImageWriteback: (input) =>
        callDesktopBridge<ImageRecordMap>(config, "rollbackImageWriteback", [
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
      loadAcpAgentSettings: () =>
        callDesktopBridge<AcpAgentSettings>(config, "loadAcpAgentSettings"),
      saveAcpAgentSettings: (settings: AcpAgentSettings) =>
        callDesktopBridge<AcpAgentSettings>(config, "saveAcpAgentSettings", [
          settings,
        ]),
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
