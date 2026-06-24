import http from "node:http";

import {
  AGENT_BRIDGE_PROTOCOL_VERSION,
  AGENT_HTTP_ROUTES,
  AGENT_PERMISSIONS,
  createAgentError,
  createAgentOk,
  isAgentErrorCode,
} from "../../src/shared/agentBridgeTypes";

import type {
  AgentErrorCode,
  AgentPermission,
  AgentRendererCommandName,
} from "../../src/shared/agentBridgeTypes";
import type { TaskGrantStore } from "./taskGrants";

export interface LocalBridgeCurrentProject {
  projectPath: string;
  name: string;
}

export interface LocalBridgeAuthorizeInput {
  permissions: AgentPermission[];
  ttlSeconds?: number;
  reason?: string;
}

export interface LocalBridgeServerOptions {
  readToken: string;
  getCurrentProject: () => LocalBridgeCurrentProject | null;
  renderer: {
    request: (
      command: AgentRendererCommandName,
      payload?: unknown,
    ) => Promise<unknown>;
  };
  grants: TaskGrantStore;
  authorize: (input: LocalBridgeAuthorizeInput) => Promise<unknown> | unknown;
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
  permission: AgentPermission;
  completeGrant?: boolean;
}

const WRITE_ROUTES: WriteRouteConfig[] = [
  {
    route: AGENT_HTTP_ROUTES.sceneAddImage,
    command: "scene.addImage",
    permission: "write-board",
  },
  {
    route: AGENT_HTTP_ROUTES.sceneAddPrompt,
    command: "scene.addPrompt",
    permission: "write-board",
  },
  {
    route: AGENT_HTTP_ROUTES.generate,
    command: "generate",
    permission: "generate-image",
  },
  {
    route: AGENT_HTTP_ROUTES.taskComplete,
    command: "task.complete",
    permission: "read-context",
    completeGrant: true,
  },
];

const GRANT_STATUS_BY_CODE: Partial<Record<AgentErrorCode, number>> = {
  AUTH_DENIED: 401,
  TOKEN_EXPIRED: 401,
  FORBIDDEN: 403,
  PROJECT_MISMATCH: 409,
};

const AUTHORIZE_STATUS_BY_CODE: Partial<Record<AgentErrorCode, number>> = {
  APP_NOT_READY: 503,
  AUTH_DENIED: 401,
  AUTH_REQUIRED: 401,
  BAD_REQUEST: 400,
  BRIDGE_UNAVAILABLE: 503,
  COMMAND_FAILED: 500,
  FORBIDDEN: 403,
  PROJECT_MISMATCH: 409,
  PROJECT_REQUIRED: 409,
  TOKEN_EXPIRED: 401,
  UNSUPPORTED_COMMAND: 404,
};

const RENDERER_STATUS_BY_CODE: Partial<Record<AgentErrorCode, number>> = {
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
  PROJECT_MISMATCH: 409,
  PROJECT_REQUIRED: 409,
  UNSUPPORTED_COMMAND: 404,
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

const sendRendererError = (response: http.ServerResponse, error: unknown) => {
  const code = getErrorCode(error);
  if (code) {
    sendError(
      response,
      RENDERER_STATUS_BY_CODE[code] ?? 500,
      code,
      getErrorMessage(error),
    );
    return;
  }

  sendError(response, 500, "COMMAND_FAILED", "Renderer command failed", {
    message: getErrorMessage(error),
  });
};

const readRequestBody = async (
  request: http.IncomingMessage,
): Promise<JsonBody> => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
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
) => {
  const {
    taskId: _taskId,
    writeToken: _writeToken,
    dryRun: _dryRun,
    projectPath: _projectPath,
    ...rest
  } = body;
  return {
    ...rest,
    projectPath,
    dryRun,
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

const handleWriteCommand = async (
  response: http.ServerResponse,
  options: LocalBridgeServerOptions,
  config: WriteRouteConfig,
  body: JsonBody,
) => {
  const currentProject = options.getCurrentProject();
  if (!currentProject) {
    sendError(
      response,
      409,
      "PROJECT_REQUIRED",
      "A current CoreStudio project is required",
    );
    return;
  }

  const taskFields = requireTaskFields(body);
  if (!taskFields) {
    sendError(
      response,
      400,
      "BAD_REQUEST",
      "Write routes require taskId and writeToken",
    );
    return;
  }

  const grantResult = options.grants.verifyGrant({
    taskId: taskFields.taskId,
    writeToken: taskFields.writeToken,
    projectPath: currentProject.projectPath,
    ...(config.completeGrant ? {} : { permission: config.permission }),
  });
  if (!grantResult.ok) {
    sendError(
      response,
      GRANT_STATUS_BY_CODE[grantResult.code] ?? 400,
      grantResult.code,
      "Task grant verification failed",
    );
    return;
  }

  const payload = createRendererPayload(
    body,
    currentProject.projectPath,
    false,
  );
  if (body.dryRun === true) {
    const {
      taskId: _taskId,
      writeToken: _writeToken,
      dryRun: _dryRun,
      ...dryRunPayload
    } = body;
    sendJson(
      response,
      200,
      createAgentOk({
        dryRun: true,
        command: config.command,
        projectPath: currentProject.projectPath,
        payload: dryRunPayload,
      }),
    );
    return;
  }

  try {
    if (config.completeGrant) {
      const completedGrant = options.grants.completeGrant(taskFields.taskId);
      const result = await options.renderer.request(config.command, {
        projectPath: currentProject.projectPath,
        taskId: taskFields.taskId,
        completedGrant,
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
  const server = http.createServer((request, response) => {
    void (async () => {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");

      if (request.headers.authorization !== `Bearer ${options.readToken}`) {
        sendError(response, 401, "AUTH_REQUIRED", "Missing or invalid token");
        return;
      }

      if (
        request.method === "GET" &&
        url.pathname === AGENT_HTTP_ROUTES.status
      ) {
        const currentProject = options.getCurrentProject();
        sendJson(
          response,
          200,
          createAgentOk({
            ready: Boolean(currentProject),
            currentProject,
          }),
        );
        return;
      }

      if (
        request.method === "GET" &&
        url.pathname === AGENT_HTTP_ROUTES.capabilities
      ) {
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

      const readRoutes = new Map<string, AgentRendererCommandName>([
        [AGENT_HTTP_ROUTES.context, "agent.context"],
        [AGENT_HTTP_ROUTES.projectCurrent, "project.current"],
        [AGENT_HTTP_ROUTES.sceneSnapshot, "scene.snapshot"],
        [AGENT_HTTP_ROUTES.sceneSelection, "scene.selection"],
      ]);
      const readCommand = readRoutes.get(url.pathname);
      if (request.method === "GET" && readCommand) {
        await handleReadCommand(response, options.renderer, readCommand);
        return;
      }

      const writeRoute = WRITE_ROUTES.find(
        (config) => config.route === url.pathname,
      );
      const isAuthorizeRoute = url.pathname === AGENT_HTTP_ROUTES.authorize;
      if (request.method === "POST" && !isAuthorizeRoute && !writeRoute) {
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
          body = await readRequestBody(request);
        } catch (error) {
          sendError(response, 400, "BAD_REQUEST", "Invalid JSON body", {
            message: error instanceof Error ? error.message : String(error),
          });
          return;
        }
      }

      if (request.method === "POST" && isAuthorizeRoute) {
        try {
          const authorizeBody = body ?? {};
          const result = await options.authorize({
            permissions: Array.isArray(authorizeBody.permissions)
              ? (authorizeBody.permissions as AgentPermission[])
              : [],
            ...(typeof authorizeBody.ttlSeconds === "number"
              ? { ttlSeconds: authorizeBody.ttlSeconds }
              : {}),
            ...(typeof authorizeBody.reason === "string"
              ? { reason: authorizeBody.reason }
              : {}),
          });
          sendJson(response, 200, createAgentOk(result));
        } catch (error) {
          const code = getErrorCode(error);
          if (code) {
            sendError(
              response,
              AUTHORIZE_STATUS_BY_CODE[code] ?? 500,
              code,
              getErrorMessage(error),
            );
            return;
          }

          sendError(response, 500, "COMMAND_FAILED", "Authorize failed", {
            message: getErrorMessage(error),
          });
        }
        return;
      }

      if (request.method === "POST" && writeRoute && body) {
        await handleWriteCommand(response, options, writeRoute, body);
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

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });

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
