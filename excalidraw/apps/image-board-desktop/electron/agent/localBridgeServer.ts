import http from "node:http";
import { readFile as fsReadFile } from "node:fs/promises";
import path from "node:path";

import {
  AGENT_BOARD_ROUTE,
  AGENT_BRIDGE_PROTOCOL_VERSION,
  AGENT_HTTP_ROUTES,
  AGENT_PERMISSIONS,
  createAgentError,
  createAgentOk,
  isAgentHost,
  isAgentDesktopBridgeMethod,
  isAgentErrorCode,
} from "../../src/shared/agentBridgeTypes";

import type {
  AgentBoardCommandContext,
  AgentBrowserRuntimeState,
  AgentDesktopBridgeMethod,
  AgentErrorCode,
  AgentImageGenerationCapability,
  AgentImageGenerationInput,
  AgentHost,
  LocalAgentSession,
  AgentRendererCommandName,
  StableBoardIntegrationStatus,
} from "../../src/shared/agentBridgeTypes";
import type {
  PersistedImageAssetInput,
  ProjectAssetPayload,
  RecentProjectEntry,
} from "../../src/shared/desktopBridgeTypes";
import type {
  ImageAssetRequestRendition,
  ImageRecordMap,
} from "../../src/shared/projectTypes";
import {
  PROJECT_ROOM_CAPABILITY_VERSION,
  PROJECT_ROOM_PROTOCOL_VERSION,
} from "../../src/shared/projectRoomProtocol";
import type { TaskGrantStore } from "./taskGrants";
import {
  attachProjectRoomWebSocketServer,
  type AuthenticateProjectRoomWebSocketInput,
  type AuthenticatedProjectRoomWebSocket,
} from "../room/projectRoomWebSocketServer";

export interface LocalBridgeCurrentProject {
  projectPath: string;
  name: string;
  agentAccess: {
    token: string;
    enabled: boolean;
  };
}

export interface LocalBridgeServerOptions {
  preferredPort?: number;
  allowDynamicPortFallback?: boolean;
  maxRequestBodyBytes?: number;
  agentBoardAssetsDir?: string;
  agentBoardDevServerUrl?: string;
  isAgentAccessEnabled: () => boolean;
  getCurrentProject: () => LocalBridgeCurrentProject | null;
  getProjectByToken?: (
    token: string,
  ) => Promise<LocalBridgeCurrentProject | null>;
  getBoardUrl?: () => string | null;
  getStableBoardUrl?: (
    project: LocalBridgeCurrentProject,
  ) => Promise<string | null>;
  getProjectRoomStatus?: (projectPath: string) => Promise<{
    sceneWriteMode: "room";
    roomId: string;
    sessionEpoch: number;
    roomSequence: number;
    persistedSequence: number;
    lifecycle: string;
  } | null>;
  readProjectRoomScene?: (input: {
    project: LocalBridgeCurrentProject;
    command: "scene.board" | "scene.snapshot";
  }) => Promise<unknown>;
  renderer: {
    request: (
      command: AgentRendererCommandName,
      payload?: unknown,
    ) => Promise<unknown>;
  };
  grants: TaskGrantStore;
  participantIssuerToken?: string;
  issueAgentSession?: (input: {
    host: AgentHost;
    displayLabel: string;
    externalConversationId?: string;
  }) => LocalAgentSession | Promise<LocalAgentSession>;
  resolveAgentSession?: (sessionRef: string) => LocalAgentSession;
  issueProjectRoomTicket?: (input: {
    project: LocalBridgeCurrentProject;
    threadId: string;
    actorId?: string;
    host?: AgentHost;
    displayLabel: string;
  }) => Promise<{ launchTicket: string }>;
  claimStableBoardSession?: (input: {
    stableBoardId: string;
    pageNonce: string;
    threadId: string;
    actorId?: string;
    host?: AgentHost;
    displayLabel: string;
  }) => Promise<void>;
  exchangeStableBoardSession?: (input: {
    stableBoardId: string;
    pageNonce: string;
    actorResumeToken?: string;
  }) => Promise<{
    launchTicket: string;
    actorResumeToken: string;
  }>;
  inspectStableBoardIntegration?: (input: {
    stableBoardId: string;
    pageNonce: string;
  }) => Promise<StableBoardIntegrationStatus>;
  issueBoardProjectSelection?: (input: {
    threadId: string;
    actorId?: string;
    host?: AgentHost;
    displayLabel: string;
  }) => Promise<{ selectionToken: string }>;
  listBoardProjectCandidates?: (
    selectionToken: string,
  ) => Promise<RecentProjectEntry[]>;
  openBoardProjectCandidate?: (input: {
    selectionToken: string;
    projectPath: string;
  }) => Promise<{
    boardUrl: string;
    project: { projectPath: string; name: string };
  }>;
  authenticateProjectRoomWebSocket?: (
    input: AuthenticateProjectRoomWebSocketInput,
  ) => Promise<AuthenticatedProjectRoomWebSocket>;
  readProjectRoomAssets?: (input: {
    resumeToken: string;
    fileIds: string[];
    rendition: ImageAssetRequestRendition;
  }) => Promise<ProjectAssetPayload[]>;
  persistProjectRoomAssets?: (input: {
    resumeToken: string;
    files: PersistedImageAssetInput[];
  }) => Promise<ImageRecordMap>;
  withAgentWriterCommand?: (
    input: {
      project: LocalBridgeCurrentProject;
      threadId: string;
      actorId?: string;
      host?: AgentHost;
      displayLabel: string;
      dryRun?: boolean;
    },
    run: (context: {
      sessionId: string;
      identity: import("../../src/shared/projectRoomProtocol").ProjectRoomIdentity;
      roomSequence: number;
      scene: import("../../src/shared/projectRoomProtocol").ProjectRoomScene;
    }) => Promise<unknown>,
  ) => Promise<unknown>;
  getProjectRoomParticipantState?: (input: {
    project: LocalBridgeCurrentProject;
    threadId: string;
    actorId?: string;
    host?: AgentHost;
  }) => Promise<AgentBrowserRuntimeState | null>;
  getAgentImageGenerationCapability?: (
    host?: AgentHost,
  ) => Promise<AgentImageGenerationCapability>;
  generateAgentImages?: (
    input: AgentImageGenerationInput & {
      project: LocalBridgeCurrentProject;
      threadId: string;
      actorId?: string;
      host?: AgentHost;
      displayLabel: string;
    },
  ) => Promise<unknown>;
}

export interface LocalBridgeServerHandle {
  host: "127.0.0.1";
  port: number;
  baseUrl: string;
  close: () => Promise<void>;
}

type JsonBody = Record<string, unknown>;

interface WriteRouteConfig {
  route: string;
  command: AgentRendererCommandName;
  completeGrant?: boolean;
}

interface ProjectCommandRouteConfig {
  route: string;
  command: AgentRendererCommandName;
}

const WRITE_ROUTES: WriteRouteConfig[] = [
  {
    route: AGENT_HTTP_ROUTES.sceneAddImage,
    command: "scene.addImage",
  },
  {
    route: AGENT_HTTP_ROUTES.sceneAddPrompt,
    command: "scene.addPrompt",
  },
  {
    route: AGENT_HTTP_ROUTES.sceneAddDiagram,
    command: "scene.addDiagram",
  },
  {
    route: AGENT_HTTP_ROUTES.taskComplete,
    command: "task.complete",
    completeGrant: true,
  },
];

const PROJECT_COMMAND_ROUTES: ProjectCommandRouteConfig[] = [
  {
    route: AGENT_HTTP_ROUTES.sceneLocate,
    command: "scene.locate",
  },
  {
    route: AGENT_HTTP_ROUTES.sceneSelect,
    command: "scene.select",
  },
];

const RENDERER_STATUS_BY_CODE: Partial<Record<AgentErrorCode, number>> = {
  ACTOR_CLAIM_REQUIRED: 409,
  AUTH_REQUIRED: 401,
  BAD_REQUEST: 400,
  CAPABILITY_UNAVAILABLE: 409,
  FORBIDDEN: 403,
  IMAGE_GENERATION_DISABLED: 403,
  IMAGE_GENERATION_FAILED: 502,
  IMAGE_MODEL_CAPABILITY_UNSUPPORTED: 409,
  IMAGE_PROVIDER_NOT_CONFIGURED: 409,
  PROJECT_MISMATCH: 409,
  PROJECT_OPEN_IN_ANOTHER_APP: 409,
  PROJECT_REQUIRED: 409,
  ROOM_CLOSED: 409,
  ROOM_CLOSING: 409,
  ROOM_MISMATCH: 409,
  SESSION_EPOCH_EXPIRED: 409,
  SESSION_NOT_FOUND: 409,
  TOKEN_EXPIRED: 401,
  PERSISTENCE_FAILED: 500,
  PROJECT_STORAGE_DIVERGED: 409,
  PARTICIPANTS_CHANGED: 409,
  WRITEBACK_CONFLICT: 409,
  UNSUPPORTED_COMMAND: 404,
};

const DEFAULT_MAX_REQUEST_BODY_BYTES = 128 * 1024 * 1024;
const CORS_ALLOW_HEADERS =
  "Authorization, Content-Type, Accept, X-CoreStudio-Agent-Session";
const CORS_ALLOW_METHODS = "GET, POST, OPTIONS";
const PARTICIPANT_ISSUER_HEADER = "x-corestudio-participant-issuer";
const PARTICIPANT_THREAD_HEADER = "x-corestudio-participant-thread";
const PARTICIPANT_LABEL_HEADER = "x-corestudio-participant-label";
const AGENT_SESSION_HEADER = "x-corestudio-agent-session";
const AGENT_BOARD_ASSET_ROUTE_PREFIX = "/assets/";
const RETIRED_AGENT_BOARD_ROUTE = "/agent-board";

const parseStringArray = (value: unknown, fieldName: string): string[] => {
  if (value === undefined) {
    return [];
  }
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string" || !item.trim())
  ) {
    throw Object.assign(
      new Error(`${fieldName} must be an array of non-empty strings.`),
      { code: "BAD_REQUEST" },
    );
  }
  return Array.from(new Set(value.map((item) => item.trim())));
};

const parseAgentImageGenerationInput = (
  body: JsonBody,
  capability: AgentImageGenerationCapability,
): AgentImageGenerationInput => {
  for (const forbiddenField of ["provider", "model", "apiKey", "baseUrl"]) {
    if (body[forbiddenField] !== undefined) {
      throw Object.assign(
        new Error(`${forbiddenField} cannot be overridden by an Agent.`),
        { code: "BAD_REQUEST" },
      );
    }
  }
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    throw Object.assign(new Error("prompt must be a non-empty string."), {
      code: "BAD_REQUEST",
    });
  }
  const count = body.count === undefined ? 1 : body.count;
  if (typeof count !== "number" || !Number.isInteger(count) || count <= 0) {
    throw Object.assign(new Error("count must be a positive integer."), {
      code: "BAD_REQUEST",
    });
  }
  if (
    capability.capabilities &&
    count > capability.capabilities.maxImageCount
  ) {
    throw Object.assign(
      new Error(
        `The current model supports at most ${capability.capabilities.maxImageCount} images per request.`,
      ),
      { code: "IMAGE_MODEL_CAPABILITY_UNSUPPORTED" },
    );
  }
  const referenceFileIds = parseStringArray(
    body.referenceFileIds,
    "referenceFileIds",
  );
  const referenceElementIds = parseStringArray(
    body.referenceElementIds,
    "referenceElementIds",
  );
  if (
    referenceFileIds.length > 0 &&
    capability.capabilities?.supportsReferenceImages === false
  ) {
    throw Object.assign(
      new Error("The current model does not support image references."),
      { code: "IMAGE_MODEL_CAPABILITY_UNSUPPORTED" },
    );
  }
  return {
    prompt,
    count,
    referenceFileIds,
    referenceElementIds,
  };
};
const STATIC_CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const PUBLIC_DESKTOP_BRIDGE_METHODS = new Set<AgentDesktopBridgeMethod>([
  "loadAppInfo",
]);

class RequestBodyTooLargeError extends Error {
  constructor(public readonly maxBytes: number) {
    super("Request body is too large");
  }
}

const getRequestOrigin = (request: http.IncomingMessage) => {
  const origin = request.headers.origin;
  return Array.isArray(origin) ? origin[0] : origin ?? null;
};

const getAllowedCorsOrigin = (
  requestOrigin: string | null,
  boardUrl: string | null,
) => {
  if (!requestOrigin || !boardUrl) {
    return null;
  }

  try {
    const allowedOrigin = new URL(boardUrl).origin;
    return requestOrigin === allowedOrigin ? requestOrigin : null;
  } catch {
    return null;
  }
};

const applyCorsHeaders = (
  response: http.ServerResponse,
  allowedOrigin: string | null,
) => {
  if (!allowedOrigin) {
    return;
  }

  response.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  response.setHeader("Access-Control-Allow-Headers", CORS_ALLOW_HEADERS);
  response.setHeader("Access-Control-Allow-Methods", CORS_ALLOW_METHODS);
  response.setHeader("Vary", "Origin");
};

const sendJson = (
  response: http.ServerResponse,
  statusCode: number,
  body: unknown,
) => {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
};

const sendCorsPreflight = (response: http.ServerResponse) => {
  response.writeHead(204, {
    "Access-Control-Max-Age": "600",
  });
  response.end();
};

const isAgentBoardRoutePath = (pathname: string) =>
  pathname === AGENT_BOARD_ROUTE ||
  pathname.startsWith(`${AGENT_BOARD_ROUTE}/`);

const isAgentBoardPagePath = (pathname: string) => {
  if (pathname === AGENT_BOARD_ROUTE) {
    return true;
  }
  const stableBoardPathSegment = pathname.startsWith(`${AGENT_BOARD_ROUTE}/`)
    ? pathname.slice(`${AGENT_BOARD_ROUTE}/`.length)
    : "";
  return (
    stableBoardPathSegment.length > 0 && !stableBoardPathSegment.includes("/")
  );
};

const isRetiredAgentBoardPagePath = (pathname: string) =>
  pathname === RETIRED_AGENT_BOARD_ROUTE ||
  pathname === `${RETIRED_AGENT_BOARD_ROUTE}/` ||
  pathname.startsWith(`${RETIRED_AGENT_BOARD_ROUTE}/`);

const addAgentBoardBaseHref = (contents: Buffer) => {
  const html = contents.toString("utf8");
  if (/<base\b/i.test(html)) {
    return contents;
  }
  const nextHtml = html.replace(
    /<head(\s[^>]*)?>/i,
    (head) => `${head}<base href="/" />`,
  );
  return Buffer.from(nextHtml === html ? `<base href="/" />${html}` : nextHtml);
};

const serveAgentBoardAsset = async (
  response: http.ServerResponse,
  pathname: string,
  assetsDir: string | undefined,
) => {
  if (
    !assetsDir ||
    (!isAgentBoardPagePath(pathname) &&
      !pathname.startsWith(AGENT_BOARD_ASSET_ROUTE_PREFIX))
  ) {
    return false;
  }

  const relativePath = isAgentBoardPagePath(pathname)
    ? "index.html"
    : pathname.slice(1);
  const root = path.resolve(assetsDir);
  const filePath = path.resolve(root, relativePath);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(404);
    response.end();
    return true;
  }

  try {
    const contents = await fsReadFile(filePath);
    response.writeHead(200, {
      "Content-Type":
        STATIC_CONTENT_TYPES[path.extname(filePath).toLowerCase()] ??
        "application/octet-stream",
      "Cache-Control":
        relativePath === "index.html"
          ? "no-cache"
          : "public, max-age=31536000, immutable",
    });
    response.end(
      relativePath === "index.html"
        ? addAgentBoardBaseHref(contents)
        : contents,
    );
  } catch {
    response.writeHead(404);
    response.end();
  }
  return true;
};

const proxyAgentBoardDevAsset = async (
  request: http.IncomingMessage,
  response: http.ServerResponse,
  url: URL,
  devServerUrl: string | undefined,
) => {
  if (
    !devServerUrl ||
    request.method !== "GET" ||
    url.pathname.startsWith("/v1/")
  ) {
    return false;
  }
  if (isRetiredAgentBoardPagePath(url.pathname)) {
    response.writeHead(404);
    response.end();
    return true;
  }
  if (
    isAgentBoardRoutePath(url.pathname) &&
    !isAgentBoardPagePath(url.pathname)
  ) {
    return false;
  }
  if (
    request.headers.accept?.includes("text/html") &&
    !isAgentBoardPagePath(url.pathname)
  ) {
    return false;
  }

  const target = new URL(`${url.pathname}${url.search}`, devServerUrl);
  if (isAgentBoardPagePath(url.pathname)) {
    target.pathname = "/";
    target.search = "";
  }

  try {
    const upstream = await fetch(target, {
      headers: {
        Accept:
          typeof request.headers.accept === "string"
            ? request.headers.accept
            : "*/*",
        "Accept-Encoding": "identity",
      },
    });
    const headers: Record<string, string> = {};
    for (const name of [
      "content-type",
      "cache-control",
      "etag",
      "last-modified",
    ]) {
      const value = upstream.headers.get(name);
      if (value) {
        headers[name] = value;
      }
    }
    const body = Buffer.from(await upstream.arrayBuffer());
    response.writeHead(upstream.status, headers);
    response.end(body);
  } catch {
    response.writeHead(502, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end("CoreStudio development renderer is unavailable.");
  }
  return true;
};

const sendError = (
  response: http.ServerResponse,
  statusCode: number,
  code: AgentErrorCode,
  message: string,
  details?: unknown,
) => {
  sendJson(response, statusCode, createAgentError(code, message, details));
};

const isObjectBody = (body: unknown): body is JsonBody =>
  typeof body === "object" && body !== null && !Array.isArray(body);

const getErrorCode = (error: unknown) =>
  error &&
  typeof error === "object" &&
  "code" in error &&
  isAgentErrorCode(error.code)
    ? error.code
    : null;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const getErrorDetails = (error: unknown) =>
  error && typeof error === "object" && "details" in error
    ? error.details
    : undefined;

const sendRendererError = (response: http.ServerResponse, error: unknown) => {
  const code = getErrorCode(error);
  if (code) {
    sendError(
      response,
      RENDERER_STATUS_BY_CODE[code] ?? 500,
      code,
      getErrorMessage(error),
      getErrorDetails(error),
    );
    return;
  }

  sendError(response, 500, "COMMAND_FAILED", "Renderer command failed", {
    message: getErrorMessage(error),
  });
};

const getBearerToken = (request: http.IncomingMessage) => {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }
  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
};

const getSingleHeader = (request: http.IncomingMessage, name: string) => {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
};

const getTrustedParticipantIdentity = (
  request: http.IncomingMessage,
  options: Pick<
    LocalBridgeServerOptions,
    "participantIssuerToken" | "resolveAgentSession"
  >,
) => {
  const sessionRef = getSingleHeader(request, AGENT_SESSION_HEADER)?.trim();
  if (sessionRef) {
    if (!options.resolveAgentSession) {
      throw Object.assign(
        new Error("Local Agent session resolution is unavailable."),
        { code: "AUTH_REQUIRED" },
      );
    }
    const session = options.resolveAgentSession(sessionRef);
    return {
      threadId: session.sessionRef,
      actorId: session.actorId,
      host: session.host,
      displayLabel: session.displayLabel,
    };
  }
  if (
    !options.participantIssuerToken ||
    getSingleHeader(request, PARTICIPANT_ISSUER_HEADER) !==
      options.participantIssuerToken
  ) {
    return null;
  }
  const threadId = getSingleHeader(request, PARTICIPANT_THREAD_HEADER)?.trim();
  const encodedLabel = getSingleHeader(
    request,
    PARTICIPANT_LABEL_HEADER,
  )?.trim();
  if (!threadId || !encodedLabel) {
    return null;
  }
  try {
    const displayLabel = decodeURIComponent(encodedLabel).trim();
    return displayLabel ? { threadId, displayLabel } : null;
  } catch {
    return null;
  }
};

const resolveProjectByToken = async (
  token: string,
  options: Pick<
    LocalBridgeServerOptions,
    "getCurrentProject" | "getProjectByToken"
  >,
) => {
  const currentProject = options.getCurrentProject();
  if (currentProject?.agentAccess.token === token) {
    return currentProject;
  }

  return (await options.getProjectByToken?.(token)) ?? null;
};

const authenticateProjectRequest = async (
  request: http.IncomingMessage,
  response: http.ServerResponse,
  options: Pick<
    LocalBridgeServerOptions,
    "getCurrentProject" | "getProjectByToken" | "isAgentAccessEnabled"
  >,
) => {
  if (!options.isAgentAccessEnabled()) {
    sendError(response, 403, "FORBIDDEN", "Agent access is disabled");
    return null;
  }

  const token = getBearerToken(request);
  if (!token) {
    sendError(response, 401, "AUTH_REQUIRED", "Missing or invalid token");
    return null;
  }

  const project = await resolveProjectByToken(token, options);
  if (!project) {
    sendError(response, 401, "AUTH_REQUIRED", "Missing or invalid token");
    return null;
  }

  return project;
};

const resolveOptionalProjectRequest = async (
  request: http.IncomingMessage,
  response: http.ServerResponse,
  options: Pick<
    LocalBridgeServerOptions,
    "getCurrentProject" | "getProjectByToken" | "isAgentAccessEnabled"
  >,
) => {
  if (!options.isAgentAccessEnabled()) {
    sendError(response, 403, "FORBIDDEN", "Agent access is disabled");
    return undefined;
  }

  const token = getBearerToken(request);
  if (!token) {
    return null;
  }

  const project = await resolveProjectByToken(token, options);
  if (!project) {
    sendError(response, 401, "AUTH_REQUIRED", "Missing or invalid token");
    return undefined;
  }

  return project;
};

const buildAgentBoardCommandContext = (
  runtimeState: AgentBrowserRuntimeState & { receivedAt?: string },
): AgentBoardCommandContext => ({
  ...(runtimeState.selection === undefined
    ? {}
    : { selection: runtimeState.selection }),
  ...(runtimeState.scene === undefined ? {} : { scene: runtimeState.scene }),
  browserRuntime: {
    source: runtimeState.source,
    updatedAt: runtimeState.updatedAt,
    receivedAt: runtimeState.receivedAt,
  },
});

const readRequestBody = async (
  request: http.IncomingMessage,
  maxBodyBytes = DEFAULT_MAX_REQUEST_BODY_BYTES,
): Promise<JsonBody> => {
  const contentLengthHeader = request.headers["content-length"];
  const contentLength = Array.isArray(contentLengthHeader)
    ? Number(contentLengthHeader[0])
    : Number(contentLengthHeader);
  if (Number.isFinite(contentLength) && contentLength > maxBodyBytes) {
    throw new RequestBodyTooLargeError(maxBodyBytes);
  }

  const chunks: Buffer[] = [];
  let receivedBytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    receivedBytes += buffer.length;
    if (receivedBytes > maxBodyBytes) {
      throw new RequestBodyTooLargeError(maxBodyBytes);
    }
    chunks.push(buffer);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8").trim();
  if (!rawBody) {
    return {};
  }

  const parsedBody = JSON.parse(rawBody) as unknown;
  if (!isObjectBody(parsedBody)) {
    throw new Error("Expected a JSON object body");
  }
  return parsedBody;
};

const listenLocalBridgeServer = async (
  server: http.Server,
  preferredPort = 0,
  allowDynamicPortFallback = true,
) => {
  const listen = (port: number) =>
    new Promise<void>((resolve, reject) => {
      const handleError = (error: NodeJS.ErrnoException) => {
        server.off("listening", handleListening);
        reject(error);
      };
      const handleListening = () => {
        server.off("error", handleError);
        resolve();
      };
      server.once("error", handleError);
      server.once("listening", handleListening);
      server.listen(port, "127.0.0.1");
    });

  try {
    await listen(preferredPort);
  } catch (error) {
    if (
      preferredPort === 0 ||
      !allowDynamicPortFallback ||
      !(error instanceof Error) ||
      (error as NodeJS.ErrnoException).code !== "EADDRINUSE"
    ) {
      throw error;
    }
    await listen(0);
  }
};

const requireTaskFields = (body: JsonBody) => {
  if (typeof body.taskId !== "string" || typeof body.writeToken !== "string") {
    return null;
  }
  return {
    taskId: body.taskId,
    writeToken: body.writeToken,
  };
};

const createRendererPayload = (
  body: JsonBody,
  projectPath: string,
  dryRun: boolean,
  agentBoardContext?: AgentBoardCommandContext | null,
) => {
  const {
    taskId: _taskId,
    writeToken: _writeToken,
    dryRun: _dryRun,
    projectPath: _projectPath,
    agentBoardContext: _agentBoardContext,
    ...rest
  } = body;
  return {
    ...rest,
    projectPath,
    dryRun,
    ...(agentBoardContext ? { agentBoardContext } : {}),
  };
};

const createDryRunPayload = (body: JsonBody) => {
  const {
    taskId: _taskId,
    writeToken: _writeToken,
    dryRun: _dryRun,
    projectPath: _projectPath,
    agentBoardContext: _agentBoardContext,
    dataBase64,
    files,
    ...rest
  } = body;
  const summarizeImagePayload = (payload: unknown) => {
    if (!isObjectBody(payload)) {
      return payload;
    }
    const { dataBase64: nestedDataBase64, ...nestedRest } = payload;
    return {
      ...nestedRest,
      ...(typeof nestedDataBase64 === "string"
        ? { dataBase64Length: nestedDataBase64.length }
        : {}),
    };
  };

  return {
    ...rest,
    ...(typeof dataBase64 === "string"
      ? { dataBase64Length: dataBase64.length }
      : {}),
    ...(Array.isArray(files)
      ? { files: files.map((file) => summarizeImagePayload(file)) }
      : {}),
  };
};

const createProjectCommandPayload = (body: JsonBody, projectPath: string) => {
  const { projectPath: _projectPath, ...rest } = body;
  return {
    ...rest,
    projectPath,
  };
};

const handleReadCommand = async (
  response: http.ServerResponse,
  renderer: LocalBridgeServerOptions["renderer"],
  command: AgentRendererCommandName,
  projectPath: string,
) => {
  try {
    const result = await renderer.request(command, { projectPath });
    sendJson(response, 200, createAgentOk(result));
  } catch (error) {
    sendRendererError(response, error);
  }
};

const handleDesktopBridgeCommand = async (
  response: http.ServerResponse,
  request: http.IncomingMessage,
  options: LocalBridgeServerOptions,
  renderer: LocalBridgeServerOptions["renderer"],
  body: JsonBody,
) => {
  if (!options.isAgentAccessEnabled()) {
    sendError(response, 403, "FORBIDDEN", "Agent access is disabled");
    return;
  }

  const method = body.method;
  if (!isAgentDesktopBridgeMethod(method)) {
    sendError(
      response,
      400,
      "BAD_REQUEST",
      "Unsupported desktop bridge method",
    );
    return;
  }

  const hasToken = Boolean(getBearerToken(request));
  if (!hasToken && !PUBLIC_DESKTOP_BRIDGE_METHODS.has(method)) {
    sendError(response, 401, "AUTH_REQUIRED", "Missing or invalid token");
    return;
  }

  const authenticatedProject = hasToken
    ? await authenticateProjectRequest(request, response, options)
    : null;
  if (hasToken && !authenticatedProject) {
    return;
  }

  const args = body.args;
  if (args !== undefined && !Array.isArray(args)) {
    sendError(
      response,
      400,
      "BAD_REQUEST",
      "desktop bridge args must be an array",
    );
    return;
  }

  try {
    const result = await renderer.request("desktop.bridge", {
      method,
      args: args ?? [],
      ...(authenticatedProject
        ? { projectPath: authenticatedProject.projectPath }
        : {}),
    });
    sendJson(response, 200, createAgentOk(result));
  } catch (error) {
    sendRendererError(response, error);
  }
};

const handleWriteCommand = async (
  response: http.ServerResponse,
  request: http.IncomingMessage,
  options: LocalBridgeServerOptions,
  currentProject: LocalBridgeCurrentProject,
  config: WriteRouteConfig,
  body: JsonBody,
  runtimeState?: (AgentBrowserRuntimeState & { receivedAt?: string }) | null,
) => {
  const payload = createRendererPayload(
    body,
    currentProject.projectPath,
    body.dryRun === true,
    runtimeState ? buildAgentBoardCommandContext(runtimeState) : null,
  );
  if (body.dryRun === true && config.command !== "scene.addDiagram") {
    sendJson(
      response,
      200,
      createAgentOk({
        dryRun: true,
        command: config.command,
        projectPath: currentProject.projectPath,
        payload: createDryRunPayload(body),
      }),
    );
    return;
  }

  try {
    if (config.completeGrant) {
      const taskFields = requireTaskFields(body);
      const completedGrant = taskFields
        ? options.grants.completeGrant(taskFields.taskId)
        : null;
      const result = await options.renderer.request(config.command, {
        projectPath: currentProject.projectPath,
        ...(taskFields
          ? {
              taskId: taskFields.taskId,
              completedGrant,
            }
          : {}),
      });
      sendJson(
        response,
        200,
        createAgentOk(
          result ?? {
            completed: true,
            grant: completedGrant,
          },
        ),
      );
      return;
    }

    const trustedParticipant = getTrustedParticipantIdentity(request, options);
    const isRoomWrite =
      config.command === "scene.addImage" ||
      config.command === "scene.addPrompt" ||
      config.command === "scene.addDiagram";
    let result: unknown;
    if (isRoomWrite) {
      if (!trustedParticipant) {
        throw Object.assign(
          new Error(
            "A trusted Agent participant identity is required for project room writes.",
          ),
          { code: "AUTH_REQUIRED" },
        );
      }
      if (!options.withAgentWriterCommand) {
        throw Object.assign(
          new Error("The project room command writer is unavailable."),
          { code: "CAPABILITY_UNAVAILABLE" },
        );
      }
      result = await options.withAgentWriterCommand(
        {
          project: currentProject,
          ...trustedParticipant,
          ...(body.dryRun === true ? { dryRun: true } : {}),
        },
        (context) =>
          options.renderer.request(config.command, {
            ...payload,
            projectRoomAgentWriter: context,
          }),
      );
    } else {
      result = await options.renderer.request(config.command, payload);
    }
    sendJson(response, 200, createAgentOk(result));
  } catch (error) {
    sendRendererError(response, error);
  }
};

export const createLocalBridgeServer = async (
  options: LocalBridgeServerOptions,
): Promise<LocalBridgeServerHandle> => {
  const server = http.createServer((request, response) => {
    void (async () => {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      if (
        request.method === "GET" &&
        ((await serveAgentBoardAsset(
          response,
          url.pathname,
          options.agentBoardAssetsDir,
        )) ||
          (await proxyAgentBoardDevAsset(
            request,
            response,
            url,
            options.agentBoardDevServerUrl,
          )))
      ) {
        return;
      }

      if (
        request.method === "POST" &&
        url.pathname === AGENT_HTTP_ROUTES.agentSession
      ) {
        if (
          !options.participantIssuerToken ||
          getSingleHeader(request, PARTICIPANT_ISSUER_HEADER) !==
            options.participantIssuerToken ||
          !options.issueAgentSession
        ) {
          sendError(
            response,
            403,
            "FORBIDDEN",
            "Local Agent session issuer is not authorized.",
          );
          return;
        }
        try {
          const body = await readRequestBody(
            request,
            options.maxRequestBodyBytes ?? DEFAULT_MAX_REQUEST_BODY_BYTES,
          );
          if (
            !isAgentHost(body.host) ||
            typeof body.displayLabel !== "string" ||
            !body.displayLabel.trim() ||
            (body.externalConversationId !== undefined &&
              (typeof body.externalConversationId !== "string" ||
                !body.externalConversationId.trim()))
          ) {
            throw Object.assign(
              new Error(
                "Local Agent session requires a supported host and displayLabel.",
              ),
              { code: "BAD_REQUEST" },
            );
          }
          sendJson(
            response,
            200,
            createAgentOk(
              await options.issueAgentSession({
                host: body.host,
                displayLabel: body.displayLabel.trim(),
                ...(typeof body.externalConversationId === "string"
                  ? {
                      externalConversationId:
                        body.externalConversationId.trim(),
                    }
                  : {}),
              }),
            ),
          );
        } catch (error) {
          sendRendererError(response, error);
        }
        return;
      }

      if (
        request.method === "POST" &&
        url.pathname === AGENT_HTTP_ROUTES.roomTicket
      ) {
        const currentProject = await authenticateProjectRequest(
          request,
          response,
          options,
        );
        if (!currentProject) {
          return;
        }
        const issuerToken = request.headers[PARTICIPANT_ISSUER_HEADER];
        if (
          !options.participantIssuerToken ||
          issuerToken !== options.participantIssuerToken ||
          !options.issueProjectRoomTicket
        ) {
          sendError(
            response,
            403,
            "FORBIDDEN",
            "Project room ticket issuer is not authorized.",
          );
          return;
        }
        const body = await readRequestBody(
          request,
          options.maxRequestBodyBytes ?? DEFAULT_MAX_REQUEST_BODY_BYTES,
        );
        if (
          typeof body.threadId !== "string" ||
          !body.threadId.trim() ||
          typeof body.displayLabel !== "string" ||
          !body.displayLabel.trim()
        ) {
          sendError(
            response,
            400,
            "BAD_REQUEST",
            "Project room ticket requires threadId and displayLabel.",
          );
          return;
        }
        const ticket = await options.issueProjectRoomTicket({
          project: currentProject,
          threadId: body.threadId,
          displayLabel: body.displayLabel,
        });
        sendJson(
          response,
          200,
          createAgentOk({
            ...ticket,
            boardUrl: options.getBoardUrl?.() ?? null,
          }),
        );
        return;
      }
      const requestOrigin = getRequestOrigin(request);
      const allowedCorsOrigin = getAllowedCorsOrigin(
        requestOrigin,
        options.getBoardUrl?.() ?? null,
      );

      if (requestOrigin && !allowedCorsOrigin) {
        sendError(response, 403, "FORBIDDEN", "Origin is not allowed");
        return;
      }

      applyCorsHeaders(response, allowedCorsOrigin);

      if (request.method === "OPTIONS") {
        sendCorsPreflight(response);
        return;
      }

      if (
        request.method === "POST" &&
        url.pathname === AGENT_HTTP_ROUTES.boardSession
      ) {
        if (!options.isAgentAccessEnabled()) {
          sendError(response, 403, "FORBIDDEN", "Agent access is disabled");
          return;
        }
        const trustedParticipant = getTrustedParticipantIdentity(
          request,
          options,
        );
        if (!trustedParticipant) {
          sendError(
            response,
            403,
            "FORBIDDEN",
            "Board session issuer is not authorized.",
          );
          return;
        }
        let body: JsonBody;
        try {
          body = await readRequestBody(
            request,
            options.maxRequestBodyBytes ?? DEFAULT_MAX_REQUEST_BODY_BYTES,
          );
        } catch (error) {
          sendError(response, 400, "BAD_REQUEST", "Invalid JSON body", {
            message: getErrorMessage(error),
          });
          return;
        }
        try {
          if (body.listProjects === true) {
            if (
              !options.issueBoardProjectSelection ||
              !options.listBoardProjectCandidates
            ) {
              throw Object.assign(
                new Error("Board project selection is unavailable."),
                { code: "CAPABILITY_UNAVAILABLE" },
              );
            }
            const selection = await options.issueBoardProjectSelection(
              trustedParticipant,
            );
            sendJson(
              response,
              200,
              createAgentOk({
                projects: await options.listBoardProjectCandidates(
                  selection.selectionToken,
                ),
              }),
            );
            return;
          }
          if (typeof body.projectPath === "string" && body.projectPath.trim()) {
            if (!options.openBoardProjectCandidate) {
              throw Object.assign(
                new Error("Board project selection is unavailable."),
                { code: "CAPABILITY_UNAVAILABLE" },
              );
            }
            const selection = await options.issueBoardProjectSelection?.(
              trustedParticipant,
            );
            if (!selection) {
              throw Object.assign(
                new Error("Board project selection is unavailable."),
                { code: "CAPABILITY_UNAVAILABLE" },
              );
            }
            const ticket = await options.openBoardProjectCandidate({
              selectionToken: selection.selectionToken,
              projectPath: body.projectPath,
            });
            sendJson(response, 200, createAgentOk(ticket));
            return;
          }

          const currentProject = options.getCurrentProject();
          if (currentProject && options.getStableBoardUrl) {
            sendJson(
              response,
              200,
              createAgentOk({
                boardUrl: await options.getStableBoardUrl(currentProject),
              }),
            );
            return;
          }

          if (!options.issueBoardProjectSelection) {
            throw Object.assign(
              new Error("Board project selection is unavailable."),
              { code: "CAPABILITY_UNAVAILABLE" },
            );
          }
          sendJson(
            response,
            200,
            createAgentOk({
              ...(await options.issueBoardProjectSelection(trustedParticipant)),
              boardUrl: options.getBoardUrl?.() ?? null,
            }),
          );
        } catch (error) {
          sendRendererError(response, error);
        }
        return;
      }

      if (
        request.method === "POST" &&
        url.pathname === AGENT_HTTP_ROUTES.stableBoardSessionClaim
      ) {
        const trustedParticipant = getTrustedParticipantIdentity(
          request,
          options,
        );
        if (!trustedParticipant || !options.claimStableBoardSession) {
          sendError(
            response,
            403,
            "FORBIDDEN",
            "Stable Board actor claim issuer is not authorized.",
          );
          return;
        }
        try {
          const body = await readRequestBody(
            request,
            options.maxRequestBodyBytes ?? DEFAULT_MAX_REQUEST_BODY_BYTES,
          );
          if (
            typeof body.stableBoardId !== "string" ||
            !body.stableBoardId.trim() ||
            typeof body.pageNonce !== "string" ||
            !body.pageNonce.trim()
          ) {
            throw Object.assign(
              new Error("Stable board id and page nonce are required."),
              { code: "BAD_REQUEST" },
            );
          }
          await options.claimStableBoardSession({
            stableBoardId: body.stableBoardId,
            pageNonce: body.pageNonce,
            ...trustedParticipant,
          });
          sendJson(response, 200, createAgentOk({ claimed: true }));
        } catch (error) {
          sendRendererError(response, error);
        }
        return;
      }

      if (
        request.method === "POST" &&
        url.pathname === AGENT_HTTP_ROUTES.stableBoardSessionExchange
      ) {
        if (!options.exchangeStableBoardSession) {
          sendError(
            response,
            409,
            "CAPABILITY_UNAVAILABLE",
            "Stable Board session exchange is unavailable.",
          );
          return;
        }
        try {
          const body = await readRequestBody(
            request,
            options.maxRequestBodyBytes ?? DEFAULT_MAX_REQUEST_BODY_BYTES,
          );
          if (
            typeof body.stableBoardId !== "string" ||
            !body.stableBoardId.trim() ||
            typeof body.pageNonce !== "string" ||
            !body.pageNonce.trim()
          ) {
            throw Object.assign(
              new Error("Stable board id and page nonce are required."),
              { code: "BAD_REQUEST" },
            );
          }
          sendJson(
            response,
            200,
            createAgentOk(
              await options.exchangeStableBoardSession({
                stableBoardId: body.stableBoardId,
                pageNonce: body.pageNonce,
                ...(typeof body.actorResumeToken === "string" &&
                body.actorResumeToken
                  ? { actorResumeToken: body.actorResumeToken }
                  : {}),
              }),
            ),
          );
        } catch (error) {
          sendRendererError(response, error);
        }
        return;
      }

      if (
        request.method === "POST" &&
        url.pathname === AGENT_HTTP_ROUTES.stableBoardIntegrationStatus
      ) {
        if (!options.inspectStableBoardIntegration) {
          sendError(
            response,
            409,
            "CAPABILITY_UNAVAILABLE",
            "Stable Board integration diagnostics are unavailable.",
          );
          return;
        }
        try {
          const body = await readRequestBody(
            request,
            options.maxRequestBodyBytes ?? DEFAULT_MAX_REQUEST_BODY_BYTES,
          );
          if (
            typeof body.stableBoardId !== "string" ||
            !body.stableBoardId.trim() ||
            typeof body.pageNonce !== "string" ||
            !body.pageNonce.trim()
          ) {
            throw Object.assign(
              new Error("Stable board id and page nonce are required."),
              { code: "BAD_REQUEST" },
            );
          }
          sendJson(
            response,
            200,
            createAgentOk(
              await options.inspectStableBoardIntegration({
                stableBoardId: body.stableBoardId,
                pageNonce: body.pageNonce,
              }),
            ),
          );
        } catch (error) {
          sendRendererError(response, error);
        }
        return;
      }

      if (
        request.method === "GET" &&
        url.pathname === AGENT_HTTP_ROUTES.boardProjects
      ) {
        const selectionToken = getBearerToken(request);
        if (!selectionToken || !options.listBoardProjectCandidates) {
          sendError(
            response,
            401,
            "AUTH_REQUIRED",
            "A valid project selection token is required.",
          );
          return;
        }
        try {
          sendJson(
            response,
            200,
            createAgentOk(
              await options.listBoardProjectCandidates(selectionToken),
            ),
          );
        } catch (error) {
          sendRendererError(response, error);
        }
        return;
      }

      if (
        request.method === "POST" &&
        url.pathname === AGENT_HTTP_ROUTES.boardProjectOpen
      ) {
        const selectionToken = getBearerToken(request);
        if (!selectionToken || !options.openBoardProjectCandidate) {
          sendError(
            response,
            401,
            "AUTH_REQUIRED",
            "A valid project selection token is required.",
          );
          return;
        }
        let body: JsonBody;
        try {
          body = await readRequestBody(
            request,
            options.maxRequestBodyBytes ?? DEFAULT_MAX_REQUEST_BODY_BYTES,
          );
        } catch (error) {
          sendError(response, 400, "BAD_REQUEST", "Invalid JSON body", {
            message: getErrorMessage(error),
          });
          return;
        }
        if (typeof body.projectPath !== "string" || !body.projectPath.trim()) {
          sendError(
            response,
            400,
            "BAD_REQUEST",
            "Board project selection requires projectPath.",
          );
          return;
        }
        try {
          sendJson(
            response,
            200,
            createAgentOk(
              await options.openBoardProjectCandidate({
                selectionToken,
                projectPath: body.projectPath,
              }),
            ),
          );
        } catch (error) {
          sendRendererError(response, error);
        }
        return;
      }

      if (
        request.method === "POST" &&
        url.pathname === AGENT_HTTP_ROUTES.roomAssets
      ) {
        const resumeToken = getBearerToken(request);
        if (!resumeToken || !options.readProjectRoomAssets) {
          sendError(
            response,
            401,
            "AUTH_REQUIRED",
            "A valid project room resume token is required.",
          );
          return;
        }
        let body: JsonBody;
        try {
          body = await readRequestBody(
            request,
            options.maxRequestBodyBytes ?? DEFAULT_MAX_REQUEST_BODY_BYTES,
          );
        } catch (error) {
          sendError(response, 400, "BAD_REQUEST", "Invalid JSON body", {
            message: getErrorMessage(error),
          });
          return;
        }
        const rendition =
          body.rendition === "preview" || body.rendition === "thumbnail"
            ? body.rendition
            : "original";
        if (
          !Array.isArray(body.fileIds) ||
          body.fileIds.some(
            (fileId) => typeof fileId !== "string" || !fileId.trim(),
          )
        ) {
          sendError(
            response,
            400,
            "BAD_REQUEST",
            "Room asset request requires string fileIds.",
          );
          return;
        }
        try {
          const payloads = await options.readProjectRoomAssets({
            resumeToken,
            fileIds: body.fileIds as string[],
            rendition,
          });
          sendJson(response, 200, createAgentOk(payloads));
        } catch (error) {
          sendRendererError(response, error);
        }
        return;
      }

      if (
        request.method === "POST" &&
        url.pathname === AGENT_HTTP_ROUTES.roomPersistAssets
      ) {
        const resumeToken = getBearerToken(request);
        if (!resumeToken || !options.persistProjectRoomAssets) {
          sendError(
            response,
            401,
            "AUTH_REQUIRED",
            "A valid project room resume token is required.",
          );
          return;
        }
        let body: JsonBody;
        try {
          body = await readRequestBody(
            request,
            options.maxRequestBodyBytes ?? DEFAULT_MAX_REQUEST_BODY_BYTES,
          );
        } catch (error) {
          sendError(response, 400, "BAD_REQUEST", "Invalid JSON body", {
            message: getErrorMessage(error),
          });
          return;
        }
        if (
          !Array.isArray(body.files) ||
          body.files.length === 0 ||
          body.files.some(
            (file) =>
              !file ||
              typeof file !== "object" ||
              typeof file.fileId !== "string" ||
              !file.fileId.trim() ||
              typeof file.mimeType !== "string" ||
              typeof file.dataBase64 !== "string" ||
              typeof file.width !== "number" ||
              typeof file.height !== "number" ||
              typeof file.createdAt !== "string" ||
              file.sourceType !== "imported",
          )
        ) {
          sendError(
            response,
            400,
            "BAD_REQUEST",
            "Room asset persistence requires imported image payloads.",
          );
          return;
        }
        try {
          const imageRecords = await options.persistProjectRoomAssets({
            resumeToken,
            files: body.files as unknown as PersistedImageAssetInput[],
          });
          sendJson(response, 200, createAgentOk(imageRecords));
        } catch (error) {
          sendRendererError(response, error);
        }
        return;
      }

      if (
        request.method === "GET" &&
        url.pathname === AGENT_HTTP_ROUTES.status
      ) {
        const currentProject = await resolveOptionalProjectRequest(
          request,
          response,
          options,
        );
        if (currentProject === undefined) {
          return;
        }
        sendJson(
          response,
          200,
          createAgentOk({
            ready: true,
            currentProject,
            boardUrl: options.getBoardUrl?.() ?? null,
            ...(options.getProjectRoomStatus
              ? {
                  projectRoom: currentProject
                    ? await options.getProjectRoomStatus(
                        currentProject.projectPath,
                      )
                    : null,
                }
              : {}),
          }),
        );
        return;
      }

      if (
        request.method === "GET" &&
        url.pathname === AGENT_HTTP_ROUTES.capabilities
      ) {
        if (!options.isAgentAccessEnabled()) {
          sendError(response, 403, "FORBIDDEN", "Agent access is disabled");
          return;
        }
        const capabilityParticipant = getTrustedParticipantIdentity(
          request,
          options,
        );
        const imageGeneration = options.getAgentImageGenerationCapability
          ? await options.getAgentImageGenerationCapability(
              capabilityParticipant?.host,
            )
          : {
              supported: false,
              authorized: false,
              configured: false,
              currentProvider: null,
              currentModel: null,
              capabilities: null,
            };
        sendJson(
          response,
          200,
          createAgentOk({
            protocolVersion: AGENT_BRIDGE_PROTOCOL_VERSION,
            roomProtocolVersion: PROJECT_ROOM_PROTOCOL_VERSION,
            roomCapabilityVersion: PROJECT_ROOM_CAPABILITY_VERSION,
            roomCapabilities: [
              "scene-operations",
              "room-assets",
              "presence",
              "persistence-confirmation",
            ],
            routes: AGENT_HTTP_ROUTES,
            permissions: AGENT_PERMISSIONS,
            imageGeneration,
          }),
        );
        return;
      }

      if (
        request.method === "GET" &&
        url.pathname === AGENT_HTTP_ROUTES.sceneSelection
      ) {
        const currentProject = await authenticateProjectRequest(
          request,
          response,
          options,
        );
        if (!currentProject) {
          return;
        }
        const trustedParticipant = getTrustedParticipantIdentity(
          request,
          options,
        );
        const roomRuntimeState =
          trustedParticipant && options.getProjectRoomParticipantState
            ? await options.getProjectRoomParticipantState({
                project: currentProject,
                threadId: trustedParticipant.threadId,
              })
            : null;
        if (roomRuntimeState?.selection !== undefined) {
          sendJson(response, 200, createAgentOk(roomRuntimeState.selection));
          return;
        }
        await handleReadCommand(
          response,
          options.renderer,
          "scene.selection",
          currentProject.projectPath,
        );
        return;
      }

      if (
        request.method === "GET" &&
        url.pathname === AGENT_HTTP_ROUTES.context
      ) {
        const currentProject = await authenticateProjectRequest(
          request,
          response,
          options,
        );
        if (!currentProject) {
          return;
        }
        try {
          const result = await options.renderer.request("agent.context", {
            projectPath: currentProject.projectPath,
          });
          sendJson(response, 200, createAgentOk(result));
        } catch (error) {
          sendRendererError(response, error);
        }
        return;
      }

      const readRoutes = new Map<string, AgentRendererCommandName>([
        [AGENT_HTTP_ROUTES.projectCurrent, "project.current"],
        [AGENT_HTTP_ROUTES.projectRecords, "project.records"],
        [AGENT_HTTP_ROUTES.projectHealth, "project.health"],
        [AGENT_HTTP_ROUTES.sceneBoard, "scene.board"],
        [AGENT_HTTP_ROUTES.sceneSnapshot, "scene.snapshot"],
      ]);
      const readCommand = readRoutes.get(url.pathname);
      if (request.method === "GET" && readCommand) {
        const currentProject = await authenticateProjectRequest(
          request,
          response,
          options,
        );
        if (!currentProject) {
          return;
        }
        if (
          options.readProjectRoomScene &&
          (readCommand === "scene.board" || readCommand === "scene.snapshot")
        ) {
          try {
            sendJson(
              response,
              200,
              createAgentOk(
                await options.readProjectRoomScene({
                  project: currentProject,
                  command: readCommand,
                }),
              ),
            );
          } catch (error) {
            sendRendererError(response, error);
          }
          return;
        }
        await handleReadCommand(
          response,
          options.renderer,
          readCommand,
          currentProject.projectPath,
        );
        return;
      }

      const writeRoute = WRITE_ROUTES.find(
        (config) => config.route === url.pathname,
      );
      const projectCommandRoute = PROJECT_COMMAND_ROUTES.find(
        (config) => config.route === url.pathname,
      );
      const isAuthorizeRoute = url.pathname === AGENT_HTTP_ROUTES.authorize;
      const isSceneImagePathsRoute =
        url.pathname === AGENT_HTTP_ROUTES.sceneImagePaths;
      const isDesktopBridgeRoute =
        url.pathname === AGENT_HTTP_ROUTES.desktopBridge;
      const isImageGenerationRoute =
        url.pathname === AGENT_HTTP_ROUTES.imageGeneration;
      if (
        request.method === "POST" &&
        !isAuthorizeRoute &&
        !isSceneImagePathsRoute &&
        !writeRoute &&
        !projectCommandRoute &&
        !isDesktopBridgeRoute &&
        !isImageGenerationRoute
      ) {
        sendError(
          response,
          404,
          "UNSUPPORTED_COMMAND",
          `Unsupported route: ${request.method} ${url.pathname}`,
        );
        return;
      }

      let body: JsonBody | null = null;
      if (request.method === "POST") {
        try {
          body = await readRequestBody(
            request,
            options.maxRequestBodyBytes ?? DEFAULT_MAX_REQUEST_BODY_BYTES,
          );
        } catch (error) {
          if (error instanceof RequestBodyTooLargeError) {
            sendError(response, 413, "BAD_REQUEST", error.message, {
              maxBytes: error.maxBytes,
            });
            return;
          }
          sendError(response, 400, "BAD_REQUEST", "Invalid JSON body", {
            message: error instanceof Error ? error.message : String(error),
          });
          return;
        }
      }

      if (request.method === "POST" && isAuthorizeRoute) {
        const currentProject = await authenticateProjectRequest(
          request,
          response,
          options,
        );
        if (!currentProject) {
          return;
        }
        const authorizeBody = body ?? {};
        sendJson(
          response,
          200,
          createAgentOk({
            authorized: true,
            mode: "project-token",
            permissions: Array.isArray(authorizeBody.permissions)
              ? authorizeBody.permissions
              : [],
            ...(typeof authorizeBody.reason === "string"
              ? { reason: authorizeBody.reason }
              : {}),
          }),
        );
        return;
      }

      if (request.method === "POST" && isImageGenerationRoute && body) {
        const currentProject = await authenticateProjectRequest(
          request,
          response,
          options,
        );
        if (!currentProject) {
          return;
        }
        const trustedParticipant = getTrustedParticipantIdentity(
          request,
          options,
        );
        if (!trustedParticipant) {
          sendError(
            response,
            401,
            "AUTH_REQUIRED",
            "A trusted Agent participant identity is required for image generation.",
          );
          return;
        }
        const capability = options.getAgentImageGenerationCapability
          ? await options.getAgentImageGenerationCapability(
              trustedParticipant.host,
            )
          : null;
        if (!capability?.supported || !options.generateAgentImages) {
          sendError(
            response,
            409,
            "CAPABILITY_UNAVAILABLE",
            "CoreStudio Agent image generation is unavailable.",
          );
          return;
        }
        if (!capability.authorized) {
          sendError(
            response,
            403,
            "IMAGE_GENERATION_DISABLED",
            "This Agent is not allowed to use CoreStudio image generation.",
          );
          return;
        }
        if (!capability.configured) {
          sendError(
            response,
            409,
            "IMAGE_PROVIDER_NOT_CONFIGURED",
            "The current CoreStudio image provider and model are not configured.",
          );
          return;
        }
        try {
          const input = parseAgentImageGenerationInput(body, capability);
          const result = await options.generateAgentImages({
            project: currentProject,
            ...trustedParticipant,
            ...input,
          });
          sendJson(response, 200, createAgentOk(result));
        } catch (error) {
          sendRendererError(response, error);
        }
        return;
      }

      if (request.method === "POST" && isSceneImagePathsRoute && body) {
        const currentProject = await authenticateProjectRequest(
          request,
          response,
          options,
        );
        if (!currentProject) {
          return;
        }
        try {
          const trustedParticipant = getTrustedParticipantIdentity(
            request,
            options,
          );
          const roomRuntimeState =
            trustedParticipant && options.getProjectRoomParticipantState
              ? await options.getProjectRoomParticipantState({
                  project: currentProject,
                  threadId: trustedParticipant.threadId,
                })
              : null;
          const result = await options.renderer.request(
            "scene.imagePaths",
            createRendererPayload(
              body,
              currentProject.projectPath,
              false,
              roomRuntimeState
                ? buildAgentBoardCommandContext(roomRuntimeState)
                : null,
            ),
          );
          sendJson(response, 200, createAgentOk(result));
        } catch (error) {
          sendRendererError(response, error);
        }
        return;
      }

      if (request.method === "POST" && isDesktopBridgeRoute && body) {
        await handleDesktopBridgeCommand(
          response,
          request,
          options,
          options.renderer,
          body,
        );
        return;
      }

      if (request.method === "POST" && projectCommandRoute && body) {
        const currentProject = await authenticateProjectRequest(
          request,
          response,
          options,
        );
        if (!currentProject) {
          return;
        }
        try {
          const result = await options.renderer.request(
            projectCommandRoute.command,
            createProjectCommandPayload(body, currentProject.projectPath),
          );
          sendJson(response, 200, createAgentOk(result));
        } catch (error) {
          sendRendererError(response, error);
        }
        return;
      }

      if (request.method === "POST" && writeRoute && body) {
        const currentProject = await authenticateProjectRequest(
          request,
          response,
          options,
        );
        if (!currentProject) {
          return;
        }
        const trustedParticipant = getTrustedParticipantIdentity(
          request,
          options,
        );
        const roomRuntimeState =
          trustedParticipant && options.getProjectRoomParticipantState
            ? await options.getProjectRoomParticipantState({
                project: currentProject,
                threadId: trustedParticipant.threadId,
              })
            : null;
        await handleWriteCommand(
          response,
          request,
          options,
          currentProject,
          writeRoute,
          body,
          roomRuntimeState,
        );
        return;
      }

      sendError(
        response,
        404,
        "UNSUPPORTED_COMMAND",
        `Unsupported route: ${request.method ?? "GET"} ${url.pathname}`,
      );
    })().catch((error) => sendRendererError(response, error));
  });

  const projectRoomWebSocket = options.authenticateProjectRoomWebSocket
    ? attachProjectRoomWebSocketServer({
        server,
        authenticate: options.authenticateProjectRoomWebSocket,
        allowOrigin: (origin) =>
          getAllowedCorsOrigin(origin, options.getBoardUrl?.() ?? null) !==
          null,
      })
    : null;

  await listenLocalBridgeServer(
    server,
    options.preferredPort ?? 0,
    options.allowDynamicPortFallback,
  );

  const address = server.address();
  if (!address || typeof address === "string") {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    throw new Error("Local bridge server did not receive a TCP port");
  }

  let closePromise: Promise<void> | null = null;

  return {
    host: "127.0.0.1",
    port: address.port,
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => {
      if (!closePromise) {
        closePromise = (async () => {
          await projectRoomWebSocket?.close();
          await new Promise<void>((resolve, reject) => {
            if (!server.listening) {
              resolve();
              return;
            }
            server.close((error) => {
              if (error) {
                reject(error);
                return;
              }
              resolve();
            });
          });
        })();
      }
      return closePromise;
    },
  };
};
