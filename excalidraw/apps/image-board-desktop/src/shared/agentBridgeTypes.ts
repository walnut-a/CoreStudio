import type { PersistedImageAssetInput } from "./desktopBridgeTypes";
import type {
  ProjectRoomIdentity,
  ProjectRoomScene,
  ProjectRoomSceneElement,
} from "./projectRoomProtocol";

export const AGENT_BRIDGE_PROTOCOL_VERSION = 6;

export const AGENT_SESSION_FILE_NAME = "agent-session.json";
export const AGENT_SETTINGS_DIRECTORY_NAME = "Excalidraw Image Board";
export const AGENT_BOARD_ROUTE = "/board";

export const AGENT_HOSTS = ["codex", "cursor", "claude-code"] as const;

export type AgentHost = typeof AGENT_HOSTS[number];

export const isAgentHost = (value: unknown): value is AgentHost =>
  typeof value === "string" && AGENT_HOSTS.includes(value as AgentHost);

export interface LocalAgentSession {
  sessionRef: string;
  actorId: string;
  host: AgentHost;
  displayLabel: string;
  issuedAt: string;
  externalConversationId?: string;
}

export const AGENT_HTTP_ROUTES = {
  status: "/v1/status",
  capabilities: "/v1/agent/capabilities",
  agentSession: "/v1/agent/session",
  imageGeneration: "/v1/agent/image-generation",
  authorize: "/v1/agent/authorize",
  boardSession: "/v1/board/session",
  boardProjectSelectionSession: "/v1/board/projects/session",
  stableBoardSessionClaim: "/v1/agent-board/session/claim",
  stableBoardSessionExchange: "/v1/agent-board/session/exchange",
  stableBoardIntegrationStatus: "/v1/agent-board/integration/status",
  boardProjects: "/v1/board/projects",
  boardProjectOpen: "/v1/board/projects/open",
  roomTicket: "/v1/room/ticket",
  roomAssets: "/v1/room/assets",
  roomPersistAssets: "/v1/room/assets/persist",
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
  sceneAddDiagram: "/v1/scene/add-diagram",
  taskComplete: "/v1/task/complete",
} as const;

export interface StableBoardIntegrationIssue {
  code:
    | "CODEX_INTEGRATION_MISSING"
    | "CODEX_INTEGRATION_OUTDATED"
    | "PROJECT_NOT_FOUND";
  message: string;
}

export interface StableBoardIntegrationStatus {
  state: "ready" | "repair-required" | "project-unavailable";
  appVersion: string;
  integrationVersion: string;
  bridgeProtocolVersion: number;
  actorClaimed: boolean;
  projectName?: string;
  issues: StableBoardIntegrationIssue[];
}

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

export interface AgentWriterCommandContext {
  sessionId: string;
  identity: ProjectRoomIdentity;
  roomSequence: number;
  scene: ProjectRoomScene;
}

export interface PreparedAgentWriterCommand {
  type: "agent-writer.prepared";
  elements: ProjectRoomSceneElement[];
  files?: PersistedImageAssetInput[];
  result?: Record<string, unknown>;
}

export interface AgentImageGenerationCapability {
  supported: boolean;
  authorized: boolean;
  configured: boolean;
  currentProvider: string | null;
  currentModel: string | null;
  capabilities: {
    maxImageCount: number;
    supportsImageCount: boolean;
    supportsReferenceImages: boolean;
  } | null;
}

export interface AgentImageGenerationInput {
  prompt: string;
  count: number;
  referenceFileIds: string[];
  referenceElementIds: string[];
}

export const AGENT_PERMISSIONS = ["read-context", "write-board"] as const;

export type AgentPermission = typeof AGENT_PERMISSIONS[number];

export const AGENT_DESKTOP_BRIDGE_METHODS = ["loadAppInfo"] as const;

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
  | "scene.addCoreStudioGenerationPlaceholders"
  | "scene.addCoreStudioGeneratedImage"
  | "scene.failCoreStudioGenerationPlaceholders"
  | "scene.addPrompt"
  | "scene.addDiagram"
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
  "ACTOR_CLAIM_REQUIRED",
  "AUTH_REQUIRED",
  "AUTH_DENIED",
  "BAD_REQUEST",
  "BRIDGE_UNAVAILABLE",
  "CAPABILITY_UNAVAILABLE",
  "COMMAND_FAILED",
  "FORBIDDEN",
  "IMAGE_GENERATION_DISABLED",
  "IMAGE_GENERATION_FAILED",
  "IMAGE_MODEL_CAPABILITY_UNSUPPORTED",
  "IMAGE_PROVIDER_NOT_CONFIGURED",
  "PROJECT_MISMATCH",
  "PROJECT_REQUIRED",
  "PROJECT_OPEN_IN_ANOTHER_APP",
  "ROOM_CLOSED",
  "ROOM_CLOSING",
  "ROOM_MISMATCH",
  "SESSION_EPOCH_EXPIRED",
  "SESSION_NOT_FOUND",
  "PERSISTENCE_FAILED",
  "PARTICIPANTS_CHANGED",
  "PROJECT_STORAGE_DIVERGED",
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
