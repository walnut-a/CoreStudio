export const AGENT_BRIDGE_PROTOCOL_VERSION = 2;

export const AGENT_SESSION_FILE_NAME = "agent-session.json";
export const AGENT_SETTINGS_DIRECTORY_NAME = "Excalidraw Image Board";

export const AGENT_HTTP_ROUTES = {
  status: "/v1/status",
  capabilities: "/v1/agent/capabilities",
  authorize: "/v1/agent/authorize",
  browserState: "/v1/agent/browser-state",
  desktopBridge: "/v1/desktop-bridge",
  context: "/v1/agent/context",
  projectCurrent: "/v1/project/current",
  projectRecords: "/v1/project/records",
  projectHealth: "/v1/project/health",
  sceneBoard: "/v1/scene/board",
  sceneSnapshot: "/v1/scene/snapshot",
  sceneSelection: "/v1/scene/selection",
  sceneImagePaths: "/v1/scene/image-paths",
  sceneLocate: "/v1/scene/locate",
  sceneSelect: "/v1/scene/select",
  sceneAddImage: "/v1/scene/add-image",
  sceneAddPrompt: "/v1/scene/add-prompt",
  taskComplete: "/v1/task/complete",
} as const;

export interface AgentBrowserRuntimeViewport {
  scrollX?: number;
  scrollY?: number;
  zoom?: number;
  width?: number;
  height?: number;
}

export interface AgentBrowserRuntimeSceneState {
  selectedElementIds?: string[];
  viewport?: AgentBrowserRuntimeViewport;
}

export interface AgentBrowserRuntimeState {
  source: "agent-board";
  projectPath: string;
  updatedAt: string;
  selection?: unknown;
  scene?: AgentBrowserRuntimeSceneState;
}

export interface AgentBoardCommandContext {
  selection?: unknown;
  scene?: AgentBrowserRuntimeSceneState;
  browserRuntime: {
    source: "agent-board";
    updatedAt: string;
    receivedAt?: string;
  };
}

export const AGENT_PERMISSIONS = ["read-context", "write-board"] as const;

export type AgentPermission = typeof AGENT_PERMISSIONS[number];

export const AGENT_DESKTOP_BRIDGE_METHODS = [
  "createProject",
  "openProject",
  "openRecentProject",
  "loadRecentProjects",
  "applyProjectSceneElementPatches",
  "readProjectAssetPayloads",
  "inspectProjectHealth",
  "rebuildProjectThumbnails",
  "cleanProjectCache",
  "persistImageAssets",
  "beginImageWriteback",
  "commitImageWriteback",
  "rollbackImageWriteback",
  "importImages",
  "revealProjectInFinder",
  "loadAppInfo",
  "loadProviderSettings",
  "saveProviderSettings",
  "deleteProviderSettings",
  "readClipboardImage",
] as const;

export type AgentDesktopBridgeMethod =
  typeof AGENT_DESKTOP_BRIDGE_METHODS[number];

export const isAgentDesktopBridgeMethod = (
  method: unknown,
): method is AgentDesktopBridgeMethod =>
  typeof method === "string" &&
  AGENT_DESKTOP_BRIDGE_METHODS.includes(method as AgentDesktopBridgeMethod);

export type AgentRendererCommandName =
  | "desktop.bridge"
  | "agent.context"
  | "project.current"
  | "project.records"
  | "project.health"
  | "scene.board"
  | "scene.snapshot"
  | "scene.selection"
  | "scene.imagePaths"
  | "scene.locate"
  | "scene.select"
  | "scene.addImage"
  | "scene.addPrompt"
  | "task.complete";

export interface AgentRendererCommandRequest {
  requestId: string;
  command: AgentRendererCommandName;
  payload?: unknown;
}

export interface AgentRendererCommandResponse {
  requestId: string;
  ok: boolean;
  data?: unknown;
  errorCode?: AgentErrorCode;
  errorMessage?: string;
  errorDetails?: unknown;
}

export const AGENT_ERROR_CODES = [
  "APP_NOT_READY",
  "AUTH_REQUIRED",
  "AUTH_DENIED",
  "BAD_REQUEST",
  "BRIDGE_UNAVAILABLE",
  "CAPABILITY_UNAVAILABLE",
  "COMMAND_FAILED",
  "FORBIDDEN",
  "PROJECT_MISMATCH",
  "PROJECT_REQUIRED",
  "STALE_PROJECT_SNAPSHOT",
  "TOKEN_EXPIRED",
  "UNSUPPORTED_COMMAND",
  "WRITEBACK_CONFLICT",
] as const;

export type AgentErrorCode = typeof AGENT_ERROR_CODES[number];

export const isAgentErrorCode = (code: unknown): code is AgentErrorCode =>
  typeof code === "string" &&
  AGENT_ERROR_CODES.includes(code as AgentErrorCode);

export interface AgentErrorEnvelope {
  ok: false;
  error: {
    code: AgentErrorCode;
    message: string;
    details?: unknown;
  };
}

export interface AgentOkEnvelope<T> {
  ok: true;
  data: T;
}

export type AgentEnvelope<T> = AgentOkEnvelope<T> | AgentErrorEnvelope;

export const createAgentOk = <T>(data: T): AgentOkEnvelope<T> => ({
  ok: true,
  data,
});

export const createAgentError = (
  code: AgentErrorCode,
  message: string,
  details?: unknown,
): AgentErrorEnvelope => ({
  ok: false,
  error: {
    code,
    message,
    ...(details === undefined ? {} : { details }),
  },
});

export const normalizeAgentPermissions = (
  permissions: readonly AgentPermission[],
): AgentPermission[] => {
  const seen = new Set<AgentPermission>();
  for (const permission of permissions) {
    if (!AGENT_PERMISSIONS.includes(permission)) {
      throw new Error(`Unsupported Agent permission: ${String(permission)}`);
    }
    seen.add(permission);
  }
  return AGENT_PERMISSIONS.filter((permission) => seen.has(permission));
};
