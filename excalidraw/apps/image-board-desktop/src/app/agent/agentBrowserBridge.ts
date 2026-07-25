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
  ProviderConfigurationSnapshot,
  PublicProviderSettings,
  RebuildProjectThumbnailsResult,
  RecentProjectEntry,
  DeleteProviderSettingsInput,
  SaveProviderSettingsInput,
} from "../../shared/desktopBridgeTypes";
import type {
  ImageRecordMap,
  ProjectImageWritebackTransaction,
} from "../../shared/projectTypes";

export interface AgentBrowserBridgeConfig {
  bridge: string;
  token?: string;
  projectSelectionToken?: string;
}

export interface AgentBrowserRouteState {
  isAgentBrowserRoute: boolean;
}

export interface AgentBrowserProjectVersion {
  projectPath: string;
  updatedAt: string;
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
    };
  }

  return {
    isAgentBrowserRoute,
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
  if (!bridge) {
    return null;
  }

  return {
    bridge: bridge.replace(/\/+$/, ""),
    ...(url.searchParams.get("projectSelectionToken")
      ? {
          projectSelectionToken:
            url.searchParams.get("projectSelectionToken") ?? undefined,
        }
      : {}),
  };
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
    throw Object.assign(new Error(json.error.message), {
      code: json.error.code,
      details: json.error.details,
    });
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

const rejectUnavailableAgentBoardCapability = (capability: string) =>
  Promise.reject(
    Object.assign(new Error(`Agent Board 不提供 ${capability} 能力。`), {
      code: "CAPABILITY_UNAVAILABLE",
    }),
  );

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
        if (!config.projectSelectionToken) {
          return null;
        }
        const result = await requestAgentBridge<{
          boardUrl: string;
          launchTicket: string;
        }>(
          {
            bridge: config.bridge,
            token: config.projectSelectionToken,
          },
          AGENT_HTTP_ROUTES.boardProjectOpen,
          {
            method: "POST",
            body: JSON.stringify({ projectPath }),
          },
        );
        const nextUrl = new URL(result.boardUrl);
        nextUrl.searchParams.set("launchTicket", result.launchTicket);
        nextUrl.searchParams.delete("projectSelectionToken");
        window.history.replaceState(null, "", nextUrl.toString());
        window.location.reload();
        return null;
      },
      loadRecentProjects: async () => {
        if (!config.projectSelectionToken) {
          return [];
        }
        return requestAgentBridge<RecentProjectEntry[]>(
          {
            bridge: config.bridge,
            token: config.projectSelectionToken,
          },
          AGENT_HTTP_ROUTES.boardProjects,
        );
      },
      readProjectAssetPayloads: (input) =>
        (() => {
          const resumeToken = new URL(window.location.href).searchParams.get(
            "resumeToken",
          );
          if (!config.token && resumeToken) {
            return requestAgentBridge<ProjectAssetPayload[]>(
              {
                bridge: config.bridge,
                token: resumeToken,
              },
              AGENT_HTTP_ROUTES.roomAssets,
              {
                method: "POST",
                body: JSON.stringify({
                  fileIds: input.fileIds,
                  rendition: input.rendition ?? "original",
                }),
              },
            );
          }
          return rejectUnavailableAgentBoardCapability("项目资产直读");
        })(),
      inspectProjectHealth: () =>
        rejectUnavailableAgentBoardCapability("项目健康检查"),
      rebuildProjectThumbnails: () =>
        rejectUnavailableAgentBoardCapability("项目修复"),
      cleanProjectCache: () =>
        rejectUnavailableAgentBoardCapability("项目缓存清理"),
      persistImageAssets: (input: {
        projectPath: string;
        files: PersistedImageAssetInput[];
      }) => {
        const resumeToken = new URL(window.location.href).searchParams.get(
          "resumeToken",
        );
        if (!config.token && resumeToken) {
          return requestAgentBridge<ImageRecordMap>(
            {
              bridge: config.bridge,
              token: resumeToken,
            },
            AGENT_HTTP_ROUTES.roomPersistAssets,
            {
              method: "POST",
              body: JSON.stringify({ files: input.files }),
            },
          );
        }
        return rejectUnavailableAgentBoardCapability("项目资产写入");
      },
      beginImageWriteback: () =>
        rejectUnavailableAgentBoardCapability("旧图片写回事务"),
      commitImageWriteback: () =>
        rejectUnavailableAgentBoardCapability("旧图片写回事务"),
      rollbackImageWriteback: () =>
        rejectUnavailableAgentBoardCapability("旧图片写回事务"),
      importImages: () => rejectUnavailableAgentBoardCapability("系统图片导入"),
      revealProjectInFinder: () =>
        rejectUnavailableAgentBoardCapability("访达定位"),
      loadAppInfo: () =>
        callDesktopBridge<DesktopAppInfo>(config, "loadAppInfo"),
      loadProviderSettings: () =>
        rejectUnavailableAgentBoardCapability("模型供应商设置"),
      saveProviderSettings: () =>
        rejectUnavailableAgentBoardCapability("模型供应商设置"),
      deleteProviderSettings: () =>
        rejectUnavailableAgentBoardCapability("模型供应商设置"),
      generateImages: async (_input: GenerateImagesInput) => {
        throw new Error(
          "Agent Board 不能调用 CoreStudio 内置生成模型，请写回外部生成的图片。",
        );
      },
      readClipboardImage: () =>
        rejectUnavailableAgentBoardCapability("系统剪贴板读取"),
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
      onFlushProjectRoomRequest: () => () => undefined,
      onAgentCommandRequest: () => () => undefined,
    };

    return bridge;
  };
