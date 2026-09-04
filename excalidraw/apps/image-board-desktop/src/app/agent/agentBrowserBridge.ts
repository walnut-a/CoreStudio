import {
  AGENT_BOARD_ROUTE,
  AGENT_HTTP_ROUTES,
  type AgentDesktopBridgeMethod,
  type AgentEnvelope,
  type StableBoardIntegrationStatus,
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
import {
  getAgentBrowserRoomResumeToken,
  getOrCreateStableBoardPageNonce,
  getStableBoardActorResumeToken,
  setAgentBrowserRoomResumeToken,
} from "./agentBrowserRoomCredentials";

export interface AgentBrowserBridgeConfig {
  bridge: string;
  token?: string;
  projectSelectionToken?: string;
  stableBoardId?: string;
}

export interface AgentBrowserRouteState {
  isAgentBrowserRoute: boolean;
  stableBoardId?: string;
  projectSelectionToken?: string;
  invalidAddress?: boolean;
}

export interface AgentBrowserProjectVersion {
  projectPath: string;
  updatedAt: string;
}

export interface PendingAgentBoardConnection {
  stableBoardId: string;
  projectName: string;
  returnUrl: string;
}

export const AGENT_BOARD_ROOM_SESSION_EXPIRED_EVENT =
  "corestudio:agent-board-room-session-expired";

const AGENT_BOARD_ROOM_SESSION_ROUTES = new Set<string>([
  AGENT_HTTP_ROUTES.roomAssets,
  AGENT_HTTP_ROUTES.roomPersistAssets,
]);

const AGENT_BOARD_ROOM_SESSION_ERROR_CODES = new Set([
  "AUTH_REQUIRED",
  "TOKEN_EXPIRED",
]);

const TARGET_PROJECT_NAME_PARAM = "targetProjectName";
const RETURN_PROJECT_SELECTION_TOKEN_PARAM = "returnProjectSelectionToken";

export const getPendingAgentBoardConnection = (
  stableBoardId: string,
): PendingAgentBoardConnection | null => {
  try {
    const currentUrl = new URL(window.location.href);
    const currentRoute = buildAgentBrowserRouteState({
      pathname: currentUrl.pathname,
      href: currentUrl.toString(),
    });
    const projectName = currentUrl.searchParams
      .get(TARGET_PROJECT_NAME_PARAM)
      ?.trim();
    const returnSelectionToken = currentUrl.searchParams
      .get(RETURN_PROJECT_SELECTION_TOKEN_PARAM)
      ?.trim();
    if (
      currentRoute.stableBoardId !== stableBoardId ||
      !projectName ||
      !returnSelectionToken
    ) {
      return null;
    }
    const returnUrl = new URL(AGENT_BOARD_ROUTE, currentUrl.origin);
    returnUrl.searchParams.set("projectSelectionToken", returnSelectionToken);
    return {
      stableBoardId,
      projectName,
      returnUrl: returnUrl.toString(),
    };
  } catch {
    return null;
  }
};

export const returnToAgentBoardProjectSelection = (
  connection: PendingAgentBoardConnection,
) => {
  window.history.replaceState(null, "", connection.returnUrl);
  window.location.reload();
};

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
  const stableBoardRoutePrefix = `${AGENT_BOARD_ROUTE}/`;
  const stableBoardPathSegment =
    pathname.startsWith(stableBoardRoutePrefix) &&
    pathname.slice(stableBoardRoutePrefix.length).length > 0 &&
    !pathname.slice(stableBoardRoutePrefix.length).includes("/")
      ? pathname.slice(stableBoardRoutePrefix.length)
      : undefined;
  const isAgentBrowserRoute =
    pathname === AGENT_BOARD_ROUTE || stableBoardPathSegment !== undefined;
  if (!isAgentBrowserRoute) {
    return {
      isAgentBrowserRoute: false,
    };
  }

  let stableBoardId: string | undefined;
  if (stableBoardPathSegment !== undefined) {
    try {
      stableBoardId = decodeURIComponent(stableBoardPathSegment);
    } catch {
      return {
        isAgentBrowserRoute: true,
        invalidAddress: true,
      };
    }
  }

  const url = new URL(href);
  const queryEntries = [...url.searchParams.entries()];
  const projectSelectionToken =
    pathname === AGENT_BOARD_ROUTE &&
    queryEntries.length === 1 &&
    queryEntries[0][0] === "projectSelectionToken" &&
    queryEntries[0][1].trim()
      ? queryEntries[0][1]
      : undefined;
  const hasValidStableConnectionContext =
    stableBoardId !== undefined &&
    queryEntries.length === 2 &&
    url.searchParams.get(TARGET_PROJECT_NAME_PARAM)?.trim() &&
    url.searchParams.get(RETURN_PROJECT_SELECTION_TOKEN_PARAM)?.trim() &&
    new Set(queryEntries.map(([key]) => key)).size === 2;
  const invalidAddress =
    stableBoardId !== undefined
      ? queryEntries.length > 0 && !hasValidStableConnectionContext
      : queryEntries.length > 0 && !projectSelectionToken;
  return {
    isAgentBrowserRoute,
    ...(stableBoardId ? { stableBoardId } : {}),
    ...(projectSelectionToken ? { projectSelectionToken } : {}),
    ...(invalidAddress ? { invalidAddress: true } : {}),
  };
};

export const buildAgentBrowserBridgeConfig = ({
  pathname,
  href,
}: {
  pathname: string;
  href: string;
}): AgentBrowserBridgeConfig | null => {
  const routeState = buildAgentBrowserRouteState({ pathname, href });
  if (!routeState.isAgentBrowserRoute || routeState.invalidAddress) {
    return null;
  }

  const url = new URL(href);
  return {
    bridge: url.origin,
    ...(routeState.stableBoardId
      ? { stableBoardId: routeState.stableBoardId }
      : {}),
    ...(routeState.projectSelectionToken
      ? {
          projectSelectionToken: routeState.projectSelectionToken,
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
    if (
      AGENT_BOARD_ROOM_SESSION_ROUTES.has(route) &&
      AGENT_BOARD_ROOM_SESSION_ERROR_CODES.has(json.error.code)
    ) {
      setAgentBrowserRoomResumeToken(null);
      window.dispatchEvent(
        new CustomEvent(AGENT_BOARD_ROOM_SESSION_EXPIRED_EVENT, {
          detail: { code: json.error.code },
        }),
      );
      throw Object.assign(new Error("画板连接已断开，请刷新页面恢复连接。"), {
        code: "AGENT_BOARD_REFRESH_REQUIRED",
      });
    }
    throw Object.assign(new Error(json.error.message), {
      code: json.error.code,
      details: json.error.details,
    });
  }
  return json.data;
};

export const exchangeStableAgentBoardSession = ({
  bridge,
  stableBoardId,
  pageNonce,
  actorResumeToken = getStableBoardActorResumeToken(stableBoardId),
}: {
  bridge: string;
  stableBoardId: string;
  pageNonce: string;
  actorResumeToken?: string | null;
}) =>
  requestAgentBridge<{
    launchTicket: string;
    actorResumeToken: string;
  }>({ bridge }, AGENT_HTTP_ROUTES.stableBoardSessionExchange, {
    method: "POST",
    body: JSON.stringify({
      stableBoardId,
      pageNonce,
      ...(actorResumeToken ? { actorResumeToken } : {}),
    }),
  });

export const inspectStableAgentBoardIntegration = ({
  bridge,
  stableBoardId,
  pageNonce,
}: {
  bridge: string;
  stableBoardId: string;
  pageNonce: string;
}) =>
  requestAgentBridge<StableBoardIntegrationStatus>(
    { bridge },
    AGENT_HTTP_ROUTES.stableBoardIntegrationStatus,
    {
      method: "POST",
      body: JSON.stringify({ stableBoardId, pageNonce }),
    },
  );

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
          returnSelectionToken: string;
          project: { projectPath: string; name: string };
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
        nextUrl.searchParams.delete("projectSelectionToken");
        const nextRoute = buildAgentBrowserRouteState({
          pathname: nextUrl.pathname,
          href: nextUrl.toString(),
        });
        if (!nextRoute.stableBoardId) {
          throw new Error("Agent Bridge 返回了无效的画布地址。");
        }
        nextUrl.searchParams.set(
          TARGET_PROJECT_NAME_PARAM,
          result.project.name,
        );
        nextUrl.searchParams.set(
          RETURN_PROJECT_SELECTION_TOKEN_PARAM,
          result.returnSelectionToken,
        );
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
      switchAgentBoardProject: async () => {
        if (!config.stableBoardId) {
          return;
        }
        const actorResumeToken = getStableBoardActorResumeToken(
          config.stableBoardId,
        );
        if (!actorResumeToken) {
          return rejectUnavailableAgentBoardCapability("项目切换");
        }
        const result = await requestAgentBridge<{
          boardUrl: string | null;
          selectionToken: string;
        }>(
          {
            bridge: config.bridge,
            token: actorResumeToken,
          },
          AGENT_HTTP_ROUTES.boardProjectSelectionSession,
          {
            method: "POST",
            body: JSON.stringify({
              stableBoardId: config.stableBoardId,
              pageNonce: getOrCreateStableBoardPageNonce(config.stableBoardId),
            }),
          },
        );
        if (!result.boardUrl) {
          return rejectUnavailableAgentBoardCapability("项目切换");
        }
        const nextUrl = new URL(result.boardUrl);
        nextUrl.searchParams.set(
          "projectSelectionToken",
          result.selectionToken,
        );
        window.history.replaceState(null, "", nextUrl.toString());
        window.location.reload();
      },
      readProjectAssetPayloads: (input) =>
        (() => {
          const resumeToken = getAgentBrowserRoomResumeToken();
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
        const resumeToken = getAgentBrowserRoomResumeToken();
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
