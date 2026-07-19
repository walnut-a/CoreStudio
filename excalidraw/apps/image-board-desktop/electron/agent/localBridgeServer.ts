import http from "node:http";
import { readFile as fsReadFile } from "node:fs/promises";
import path from "node:path";

import {
  AGENT_BRIDGE_PROTOCOL_VERSION,
  AGENT_HTTP_ROUTES,
  AGENT_PERMISSIONS,
  createAgentError,
  createAgentOk,
  isAgentDesktopBridgeMethod,
  isAgentErrorCode,
} from "../../src/shared/agentBridgeTypes";

import type {
  AgentBoardCommandContext,
  AgentBrowserRuntimeState,
  AgentDesktopBridgeMethod,
  AgentErrorCode,
  AgentRendererCommandName,
} from "../../src/shared/agentBridgeTypes";
import type { TaskGrantStore } from "./taskGrants";

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
  maxRequestBodyBytes?: number;
  agentBoardAssetsDir?: string;
  isAgentAccessEnabled: () => boolean;
  getCurrentProject: () => LocalBridgeCurrentProject | null;
  getProjectByToken?: (
    token: string,
  ) => Promise<LocalBridgeCurrentProject | null>;
  getBoardUrl?: () => string | null;
  renderer: {
    request: (
      command: AgentRendererCommandName,
      payload?: unknown,
    ) => Promise<unknown>;
  };
  grants: TaskGrantStore;
}

export interface LocalBridgeServerHandle {
  host: "127.0.0.1";
  port: number;
  baseUrl: string;
  close: () => Promise<void>;
}

type JsonBody = Record<string, unknown>;

type StoredAgentBrowserRuntimeState = AgentBrowserRuntimeState & {
  receivedAt: string;
};

const AGENT_GENERATION_SOURCES = ["builtin", "agent"] as const;

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
    route: AGENT_HTTP_ROUTES.generate,
    command: "generate",
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
  BAD_REQUEST: 400,
  CAPABILITY_UNAVAILABLE: 409,
  FORBIDDEN: 403,
  PROJECT_MISMATCH: 409,
  PROJECT_REQUIRED: 409,
  STALE_PROJECT_SNAPSHOT: 409,
  WRITEBACK_CONFLICT: 409,
  UNSUPPORTED_COMMAND: 404,
};

const DEFAULT_MAX_REQUEST_BODY_BYTES = 128 * 1024 * 1024;
const CORS_ALLOW_HEADERS = "Authorization, Content-Type, Accept";
const CORS_ALLOW_METHODS = "GET, POST, OPTIONS";
const AGENT_BOARD_ROUTE = "/agent-board";
const AGENT_BOARD_ASSET_ROUTE_PREFIX = "/assets/";
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
  "loadRecentProjects",
  "loadAppInfo",
  "loadProviderSettings",
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

const serveAgentBoardAsset = async (
  response: http.ServerResponse,
  pathname: string,
  assetsDir: string | undefined,
) => {
  if (
    !assetsDir ||
    (pathname !== AGENT_BOARD_ROUTE &&
      pathname !== `${AGENT_BOARD_ROUTE}/` &&
      !pathname.startsWith(AGENT_BOARD_ASSET_ROUTE_PREFIX))
  ) {
    return false;
  }

  const relativePath =
    pathname === AGENT_BOARD_ROUTE || pathname === `${AGENT_BOARD_ROUTE}/`
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
    response.end(contents);
  } catch {
    response.writeHead(404);
    response.end();
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

const isAgentBrowserRuntimeState = (
  body: JsonBody,
): body is JsonBody & AgentBrowserRuntimeState =>
  body.source === "agent-board" &&
  typeof body.projectPath === "string" &&
  typeof body.updatedAt === "string";

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

const getBrowserRuntimeGenerationSource = (
  runtimeState: StoredAgentBrowserRuntimeState,
) => (runtimeState.generation?.source === "builtin" ? "builtin" : "agent");

const buildBrowserRuntimeAgentContext = (
  currentProject: LocalBridgeCurrentProject,
  runtimeState: StoredAgentBrowserRuntimeState,
) => ({
  project: currentProject,
  generation: {
    source: getBrowserRuntimeGenerationSource(runtimeState),
    sources: AGENT_GENERATION_SOURCES,
    builtin: {
      configured: null,
    },
  },
  selection: runtimeState.selection ?? {
    selected: false,
  },
  scene: runtimeState.scene ?? null,
  browserRuntime: {
    source: runtimeState.source,
    updatedAt: runtimeState.updatedAt,
    receivedAt: runtimeState.receivedAt,
  },
});

const buildAgentBoardCommandContext = (
  runtimeState: StoredAgentBrowserRuntimeState,
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
    const {
      dataBase64: nestedDataBase64,
      ...nestedRest
    } = payload;
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
  const {
    projectPath: _projectPath,
    ...rest
  } = body;
  return {
    ...rest,
    projectPath,
  };
};

const handleReadCommand = async (
  response: http.ServerResponse,
  renderer: LocalBridgeServerOptions["renderer"],
  command: AgentRendererCommandName,
) => {
  try {
    const result = await renderer.request(command);
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

  if (hasToken) {
    const project = await authenticateProjectRequest(request, response, options);
    if (!project) {
      return;
    }
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
    });
    sendJson(response, 200, createAgentOk(result));
  } catch (error) {
    sendRendererError(response, error);
  }
};

const handleWriteCommand = async (
  response: http.ServerResponse,
  options: LocalBridgeServerOptions,
  currentProject: LocalBridgeCurrentProject,
  config: WriteRouteConfig,
  body: JsonBody,
  runtimeState?: StoredAgentBrowserRuntimeState | null,
) => {
  const payload = createRendererPayload(
    body,
    currentProject.projectPath,
    false,
    runtimeState ? buildAgentBoardCommandContext(runtimeState) : null,
  );
  if (body.dryRun === true) {
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

    const result = await options.renderer.request(config.command, payload);
    sendJson(response, 200, createAgentOk(result));
  } catch (error) {
    sendRendererError(response, error);
  }
};

export const createLocalBridgeServer = async (
  options: LocalBridgeServerOptions,
): Promise<LocalBridgeServerHandle> => {
  let browserRuntimeState: StoredAgentBrowserRuntimeState | null = null;

  const getCurrentBrowserRuntimeState = (projectPath: string) => {
    if (
      !projectPath ||
      browserRuntimeState?.projectPath !== projectPath
    ) {
      return null;
    }
    return browserRuntimeState;
  };

  const server = http.createServer((request, response) => {
    void (async () => {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      if (
        request.method === "GET" &&
        (await serveAgentBoardAsset(
          response,
          url.pathname,
          options.agentBoardAssetsDir,
        ))
      ) {
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
        sendJson(
          response,
          200,
          createAgentOk({
            protocolVersion: AGENT_BRIDGE_PROTOCOL_VERSION,
            routes: AGENT_HTTP_ROUTES,
            permissions: AGENT_PERMISSIONS,
          }),
        );
        return;
      }

      const isBrowserStateRoute =
        url.pathname === AGENT_HTTP_ROUTES.browserState;
      if (request.method === "GET" && isBrowserStateRoute) {
        const currentProject = await authenticateProjectRequest(
          request,
          response,
          options,
        );
        if (!currentProject) {
          return;
        }
        sendJson(
          response,
          200,
          createAgentOk(getCurrentBrowserRuntimeState(currentProject.projectPath)),
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
        const runtimeState = getCurrentBrowserRuntimeState(
          currentProject.projectPath,
        );
        if (runtimeState?.selection !== undefined) {
          sendJson(response, 200, createAgentOk(runtimeState.selection));
          return;
        }

        await handleReadCommand(response, options.renderer, "scene.selection");
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
          const result = await options.renderer.request("agent.context");
          sendJson(response, 200, createAgentOk(result));
        } catch (error) {
          const runtimeState = getCurrentBrowserRuntimeState(
            currentProject.projectPath,
          );
          if (
            getErrorCode(error) === "PROJECT_REQUIRED" &&
            runtimeState &&
            currentProject
          ) {
            sendJson(
              response,
              200,
              createAgentOk(
                buildBrowserRuntimeAgentContext(currentProject, runtimeState),
              ),
            );
            return;
          }

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
        await handleReadCommand(response, options.renderer, readCommand);
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
      if (
        request.method === "POST" &&
        !isAuthorizeRoute &&
        !isSceneImagePathsRoute &&
        !writeRoute &&
        !projectCommandRoute &&
        !isDesktopBridgeRoute &&
        !isBrowserStateRoute
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

      if (request.method === "POST" && isBrowserStateRoute && body) {
        const currentProject = await authenticateProjectRequest(
          request,
          response,
          options,
        );
        if (!currentProject) {
          return;
        }
        if (!isAgentBrowserRuntimeState(body)) {
          sendError(
            response,
            400,
            "BAD_REQUEST",
            "browser-state body 必须包含 source、projectPath 和 updatedAt。",
          );
          return;
        }

        browserRuntimeState = {
          source: body.source,
          projectPath: body.projectPath,
          updatedAt: body.updatedAt,
          ...(body.selection === undefined
            ? {}
            : { selection: body.selection }),
          ...(body.scene === undefined ? {} : { scene: body.scene }),
          ...(body.generation === undefined
            ? {}
            : { generation: body.generation }),
          receivedAt: new Date().toISOString(),
        };
        sendJson(
          response,
          200,
          createAgentOk({
            accepted: true,
          }),
        );
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
          const result = await options.renderer.request(
            "scene.imagePaths",
            body,
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
        await handleWriteCommand(
          response,
          options,
          currentProject,
          writeRoute,
          body,
          getCurrentBrowserRuntimeState(currentProject.projectPath),
        );
        return;
      }

      sendError(
        response,
        404,
        "UNSUPPORTED_COMMAND",
        `Unsupported route: ${request.method ?? "GET"} ${url.pathname}`,
      );
    })().catch((error) => {
      sendError(response, 500, "COMMAND_FAILED", "Local bridge failed", {
        message: error instanceof Error ? error.message : String(error),
      });
    });
  });

  await listenLocalBridgeServer(server, options.preferredPort ?? 0);

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
        closePromise = new Promise<void>((resolve, reject) => {
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
      }
      return closePromise;
    },
  };
};
