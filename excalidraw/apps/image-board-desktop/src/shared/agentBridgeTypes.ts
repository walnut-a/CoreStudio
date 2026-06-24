export const AGENT_BRIDGE_PROTOCOL_VERSION = 1;

export const AGENT_SESSION_FILE_NAME = "agent-session.json";
export const AGENT_SETTINGS_DIRECTORY_NAME = "Excalidraw Image Board";

export const AGENT_HTTP_ROUTES = {
  status: "/v1/status",
  capabilities: "/v1/agent/capabilities",
  authorize: "/v1/agent/authorize",
  context: "/v1/agent/context",
  projectCurrent: "/v1/project/current",
  sceneSnapshot: "/v1/scene/snapshot",
  sceneSelection: "/v1/scene/selection",
  sceneAddImage: "/v1/scene/add-image",
  sceneAddPrompt: "/v1/scene/add-prompt",
  generate: "/v1/generate",
  taskComplete: "/v1/task/complete",
} as const;

export const AGENT_PERMISSIONS = [
  "read-context",
  "write-board",
  "generate-image",
] as const;

export type AgentPermission = typeof AGENT_PERMISSIONS[number];

export type AgentRendererCommandName =
  | "agent.context"
  | "project.current"
  | "scene.snapshot"
  | "scene.selection"
  | "scene.addImage"
  | "scene.addPrompt"
  | "generate"
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
}

export const AGENT_ERROR_CODES = [
  "APP_NOT_READY",
  "AUTH_REQUIRED",
  "AUTH_DENIED",
  "BAD_REQUEST",
  "BRIDGE_UNAVAILABLE",
  "COMMAND_FAILED",
  "FORBIDDEN",
  "PROJECT_MISMATCH",
  "PROJECT_REQUIRED",
  "TOKEN_EXPIRED",
  "UNSUPPORTED_COMMAND",
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
