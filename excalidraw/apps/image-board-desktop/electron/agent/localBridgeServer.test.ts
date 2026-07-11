import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AGENT_BRIDGE_PROTOCOL_VERSION,
  AGENT_HTTP_ROUTES,
  AGENT_PERMISSIONS,
} from "../../src/shared/agentBridgeTypes";

import { createLocalBridgeServer } from "./localBridgeServer";
import { createTaskGrantStore } from "./taskGrants";

const projectToken = "project-token-1";
const boardUrl =
  "http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909";
const currentProject = {
  projectPath: "/Users/alice/CoreStudio/project-1",
  name: "Project 1",
  agentAccess: {
    token: projectToken,
    enabled: true,
  },
};

const requestJson = async (
  baseUrl: string,
  path: string,
  init: RequestInit = {},
) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${projectToken}`,
      ...(init.headers ?? {}),
    },
  });
  return {
    status: response.status,
    body: await response.json(),
  };
};

const requestJsonWithoutAuth = async (
  baseUrl: string,
  path: string,
  init: RequestInit = {},
) => {
  const response = await fetch(`${baseUrl}${path}`, init);
  return {
    status: response.status,
    body: await response.json(),
  };
};

const startServer = async (
  overrides: Partial<Parameters<typeof createLocalBridgeServer>[0]> = {},
) => {
  const renderer = {
    request: vi.fn(async (command: string, payload?: unknown) => ({
      command,
      payload,
    })),
  };
  const grants = createTaskGrantStore({
    now: () => new Date("2026-06-24T08:00:00.000Z"),
    randomId: () => "id-1",
  });
  const server = await createLocalBridgeServer({
    isAgentAccessEnabled: () => true,
    getCurrentProject: () => currentProject,
    getBoardUrl: () => boardUrl,
    renderer,
    grants,
    ...overrides,
  });

  return {
    server,
    renderer,
    grants,
  };
};

describe("createLocalBridgeServer", () => {
  const handles: Awaited<ReturnType<typeof startServer>>["server"][] = [];

  afterEach(async () => {
    await Promise.all(handles.splice(0).map((handle) => handle.close()));
    vi.restoreAllMocks();
  });

  const track = async (serverPromise: ReturnType<typeof startServer>) => {
    const serverContext = await serverPromise;
    handles.push(serverContext.server);
    return serverContext;
  };

  it("returns status with the current project when authenticated", async () => {
    const { server } = await track(startServer());

    const result = await requestJson(server.baseUrl, AGENT_HTTP_ROUTES.status);

    expect(result).toEqual({
      status: 200,
      body: {
        ok: true,
        data: {
          ready: true,
          currentProject,
          boardUrl,
        },
      },
    });
  });

  it("returns bridge readiness without requiring a project token", async () => {
    const { server } = await track(startServer());

    const result = await requestJsonWithoutAuth(
      server.baseUrl,
      AGENT_HTTP_ROUTES.status,
    );

    expect(result).toEqual({
      status: 200,
      body: {
        ok: true,
        data: {
          ready: true,
          currentProject: null,
          boardUrl,
        },
      },
    });
  });

  it("requires a known project before accepting project token requests", async () => {
    const { server } = await track(
      startServer({
        getCurrentProject: () => null,
      }),
    );

    const result = await requestJson(server.baseUrl, AGENT_HTTP_ROUTES.status);

    expect(result).toEqual({
      status: 401,
      body: {
        ok: false,
        error: {
          code: "AUTH_REQUIRED",
          message: "Missing or invalid token",
        },
      },
    });
  });

  it("rejects requests while global Agent access is disabled", async () => {
    const { server } = await track(
      startServer({
        isAgentAccessEnabled: () => false,
      }),
    );

    const result = await requestJson(server.baseUrl, AGENT_HTTP_ROUTES.status);

    expect(result).toEqual({
      status: 403,
      body: {
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: "Agent access is disabled",
        },
      },
    });
  });

  it("accepts legacy project tokens whose manifest switch is disabled when global Agent access is enabled", async () => {
    const legacyDisabledProject = {
      ...currentProject,
      agentAccess: {
        token: projectToken,
        enabled: false,
      },
    };
    const { server } = await track(
      startServer({
        getCurrentProject: () => legacyDisabledProject,
      }),
    );

    const result = await requestJson(server.baseUrl, AGENT_HTTP_ROUTES.status);

    expect(result).toEqual({
      status: 200,
      body: {
        ok: true,
        data: {
          ready: true,
          currentProject: legacyDisabledProject,
          boardUrl,
        },
      },
    });
  });

  it("returns capabilities with routes, permissions, and protocol version", async () => {
    const { server } = await track(startServer());

    const result = await requestJson(
      server.baseUrl,
      AGENT_HTTP_ROUTES.capabilities,
    );

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      ok: true,
      data: {
        protocolVersion: AGENT_BRIDGE_PROTOCOL_VERSION,
        routes: AGENT_HTTP_ROUTES,
        permissions: AGENT_PERMISSIONS,
      },
    });
  });

  it("rejects project read requests without Authorization", async () => {
    const { server } = await track(startServer());

    const response = await fetch(
      `${server.baseUrl}${AGENT_HTTP_ROUTES.sceneBoard}`,
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: {
        code: "AUTH_REQUIRED",
      },
    });
  });

  it("allows recent project discovery through the desktop bridge without bearer auth", async () => {
    const { server, renderer } = await track(startServer());

    const result = await requestJsonWithoutAuth(
      server.baseUrl,
      AGENT_HTTP_ROUTES.desktopBridge,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method: "loadRecentProjects",
          args: [],
        }),
      },
    );

    expect(result.status).toBe(200);
    expect(renderer.request).toHaveBeenCalledWith("desktop.bridge", {
      method: "loadRecentProjects",
      args: [],
    });
  });

  it("requires bearer auth before opening a recent project through the desktop bridge", async () => {
    const { server, renderer } = await track(startServer());

    const result = await requestJsonWithoutAuth(
      server.baseUrl,
      AGENT_HTTP_ROUTES.desktopBridge,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method: "openRecentProject",
          args: [currentProject.projectPath],
        }),
      },
    );

    expect(result.status).toBe(401);
    expect(result.body).toMatchObject({
      ok: false,
      error: {
        code: "AUTH_REQUIRED",
      },
    });
    expect(renderer.request).not.toHaveBeenCalled();
  });

  it("allows browser CORS preflight requests from the Agent Board origin", async () => {
    const { server } = await track(startServer());

    const response = await fetch(
      `${server.baseUrl}${AGENT_HTTP_ROUTES.status}`,
      {
        method: "OPTIONS",
        headers: {
          Origin: "http://127.0.0.1:5174",
          "Access-Control-Request-Method": "GET",
          "Access-Control-Request-Headers": "authorization",
        },
      },
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "http://127.0.0.1:5174",
    );
    expect(response.headers.get("access-control-allow-headers")).toContain(
      "Authorization",
    );
  });

  it("rejects browser CORS preflight requests from unrelated origins", async () => {
    const { server } = await track(startServer());

    const response = await fetch(
      `${server.baseUrl}${AGENT_HTTP_ROUTES.status}`,
      {
        method: "OPTIONS",
        headers: {
          Origin: "https://example.invalid",
          "Access-Control-Request-Method": "GET",
          "Access-Control-Request-Headers": "authorization",
        },
      },
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: {
        code: "FORBIDDEN",
      },
    });
  });

  it("rejects request bodies that exceed the configured bridge limit", async () => {
    const { server } = await track(
      startServer({
        maxRequestBodyBytes: 32,
      }),
    );

    const response = await fetch(
      `${server.baseUrl}${AGENT_HTTP_ROUTES.sceneAddPrompt}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${projectToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: "x".repeat(64),
        }),
      },
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: {
        code: "BAD_REQUEST",
        message: "Request body is too large",
      },
    });
  });

  it("returns unsupported command for unknown routes", async () => {
    const { server } = await track(startServer());

    const result = await requestJson(server.baseUrl, "/v1/missing");

    expect(result).toMatchObject({
      status: 404,
      body: {
        ok: false,
        error: {
          code: "UNSUPPORTED_COMMAND",
        },
      },
    });
  });

  it("returns unsupported command for unknown POST routes before parsing JSON", async () => {
    const { server } = await track(startServer());

    const response = await fetch(`${server.baseUrl}/v1/missing`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${projectToken}`,
        "Content-Type": "application/json",
      },
      body: "{",
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: {
        code: "UNSUPPORTED_COMMAND",
      },
    });
  });

  it("returns bad request for malformed JSON bodies", async () => {
    const { server } = await track(startServer());

    const response = await fetch(
      `${server.baseUrl}${AGENT_HTTP_ROUTES.sceneAddPrompt}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${projectToken}`,
          "Content-Type": "application/json",
        },
        body: "{",
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: {
        code: "BAD_REQUEST",
      },
    });
  });

  it.each([
    [AGENT_HTTP_ROUTES.context, "agent.context"],
    [AGENT_HTTP_ROUTES.projectCurrent, "project.current"],
    ["/v1/project/records", "project.records"],
    ["/v1/project/health", "project.health"],
    [AGENT_HTTP_ROUTES.sceneBoard, "scene.board"],
    [AGENT_HTTP_ROUTES.sceneSnapshot, "scene.snapshot"],
    [AGENT_HTTP_ROUTES.sceneSelection, "scene.selection"],
    ["/v1/acp/runs", "acp.runs"],
    ["/v1/acp/threads", "acp.threads"],
  ] as const)("forwards %s to %s", async (route, command) => {
    const { server, renderer } = await track(startServer());

    const result = await requestJson(server.baseUrl, route);

    expect(result.status).toBe(200);
    expect(renderer.request).toHaveBeenCalledWith(command);
    expect(result.body).toEqual({
      ok: true,
      data: {
        command,
      },
    });
  });

  it.each([
    {
      route: "/v1/acp/run",
      command: "acp.run",
      body: { taskId: "task-1" },
    },
    {
      route: "/v1/acp/thread",
      command: "acp.thread",
      body: { threadId: "thread-1" },
    },
    {
      route: "/v1/scene/locate",
      command: "scene.locate",
      body: { fileId: "file-1" },
    },
    {
      route: "/v1/scene/select",
      command: "scene.select",
      body: { elementIds: ["element-1"], fileIds: ["file-1"] },
    },
  ])("forwards $route to $command with payload", async ({ route, command, body }) => {
    const { server, renderer } = await track(startServer());

    const result = await requestJson(server.baseUrl, route, {
      method: "POST",
      body: JSON.stringify(body),
    });

    expect(result.status).toBe(200);
    expect(renderer.request).toHaveBeenCalledWith(command, {
      projectPath: currentProject.projectPath,
      ...body,
    });
    expect(result.body).toEqual({
      ok: true,
      data: {
        command,
        payload: {
          projectPath: currentProject.projectPath,
          ...body,
        },
      },
    });
  });

  it("returns browser board runtime selection before asking the desktop renderer", async () => {
    const { server, renderer } = await track(startServer());
    const selection = {
      selected: true,
      reference: {
        enabled: true,
        elementCount: 1,
        textCount: 0,
        items: [
          {
            id: "image-1",
            index: 1,
            kind: "image",
            label: "图片",
            fileId: "file-1",
          },
        ],
        source: {
          elementIds: ["image-1"],
          fileIds: ["file-1"],
        },
      },
    };

    const publishResult = await requestJson(
      server.baseUrl,
      "/v1/agent/browser-state",
      {
        method: "POST",
        body: JSON.stringify({
          source: "agent-board",
          projectPath: currentProject.projectPath,
          updatedAt: "2026-06-24T08:01:00.000Z",
          selection,
          scene: {
            selectedElementIds: ["image-1"],
            viewport: {
              scrollX: 120,
              scrollY: -80,
              zoom: 0.75,
              width: 1440,
              height: 900,
            },
          },
        }),
      },
    );

    expect(publishResult).toEqual({
      status: 200,
      body: {
        ok: true,
        data: {
          accepted: true,
        },
      },
    });

    const result = await requestJson(
      server.baseUrl,
      AGENT_HTTP_ROUTES.sceneSelection,
    );

    expect(result).toEqual({
      status: 200,
      body: {
        ok: true,
        data: selection,
      },
    });
    expect(renderer.request).not.toHaveBeenCalledWith("scene.selection");
  });

  it("attaches browser board runtime context to generate write requests", async () => {
    const { server, renderer } = await track(startServer());
    const selection = {
      selected: true,
      reference: {
        enabled: true,
        elementCount: 1,
        textCount: 0,
        items: [
          {
            id: "image-1",
            index: 1,
            kind: "image",
            label: "图片",
            fileId: "file-1",
          },
        ],
        source: {
          elementIds: ["image-1"],
          fileIds: ["file-1"],
        },
      },
    };
    const scene = {
      selectedElementIds: ["image-1"],
      viewport: {
        scrollX: -1200,
        scrollY: -640,
        zoom: 2,
        width: 900,
        height: 700,
      },
    };

    await requestJson(server.baseUrl, AGENT_HTTP_ROUTES.browserState, {
      method: "POST",
      body: JSON.stringify({
        source: "agent-board",
        projectPath: currentProject.projectPath,
        updatedAt: "2026-06-24T08:01:00.000Z",
        selection,
        scene,
      }),
    });
    renderer.request.mockClear();

    const result = await requestJson(server.baseUrl, AGENT_HTTP_ROUTES.generate, {
      method: "POST",
      body: JSON.stringify({
        prompt: "优化这台桌面 CNC",
        useSelection: true,
      }),
    });

    expect(result.status).toBe(200);
    expect(renderer.request).toHaveBeenCalledWith("generate", {
      projectPath: currentProject.projectPath,
      prompt: "优化这台桌面 CNC",
      useSelection: true,
      dryRun: false,
      agentBoardContext: {
        selection,
        scene,
        browserRuntime: {
          source: "agent-board",
          updatedAt: "2026-06-24T08:01:00.000Z",
          receivedAt: expect.any(String),
        },
      },
    });
  });

  it("falls back to browser runtime generation context when the desktop renderer has no project", async () => {
    const renderer = {
      request: vi.fn(async () => {
        throw Object.assign(new Error("当前没有打开 CoreStudio 项目。"), {
          code: "PROJECT_REQUIRED",
        });
      }),
    };
    const { server } = await track(startServer({ renderer }));

    await requestJson(server.baseUrl, AGENT_HTTP_ROUTES.browserState, {
      method: "POST",
      body: JSON.stringify({
        source: "agent-board",
        projectPath: currentProject.projectPath,
        updatedAt: "2026-06-25T08:00:00.000Z",
        selection: {
          selected: false,
        },
        scene: {
          selectedElementIds: [],
        },
        generation: {
          source: "agent",
        },
      }),
    });

    const result = await requestJson(server.baseUrl, AGENT_HTTP_ROUTES.context);

    expect(result.status).toBe(200);
    expect(renderer.request).toHaveBeenCalledWith("agent.context");
    expect(result.body).toMatchObject({
      ok: true,
      data: {
        project: currentProject,
        generation: {
          source: "agent",
          sources: ["builtin", "agent"],
        },
        selection: {
          selected: false,
        },
        scene: {
          selectedElementIds: [],
        },
      },
    });
  });

  it("maps renderer PROJECT_REQUIRED errors on read routes to conflict responses", async () => {
    const error = Object.assign(new Error("当前没有打开 CoreStudio 项目。"), {
      code: "PROJECT_REQUIRED",
    });
    const renderer = {
      request: vi.fn().mockRejectedValue(error),
    };
    const { server } = await track(startServer({ renderer }));

    const result = await requestJson(server.baseUrl, AGENT_HTTP_ROUTES.context);

    expect(result).toMatchObject({
      status: 409,
      body: {
        ok: false,
        error: {
          code: "PROJECT_REQUIRED",
          message: "当前没有打开 CoreStudio 项目。",
        },
      },
    });
  });

  it("maps renderer STALE_PROJECT_SNAPSHOT errors to conflict responses", async () => {
    const error = Object.assign(
      new Error("画板文件已经被其他会话更新，已停止保存旧快照。"),
      {
        code: "STALE_PROJECT_SNAPSHOT",
        details: {
          expectedSceneHash: "old",
          currentSceneHash: "new",
        },
      },
    );
    const renderer = {
      request: vi.fn().mockRejectedValue(error),
    };
    const { server } = await track(startServer({ renderer }));

    const result = await requestJson(server.baseUrl, AGENT_HTTP_ROUTES.context);

    expect(result).toMatchObject({
      status: 409,
      body: {
        ok: false,
        error: {
          code: "STALE_PROJECT_SNAPSHOT",
          message: "画板文件已经被其他会话更新，已停止保存旧快照。",
          details: {
            expectedSceneHash: "old",
            currentSceneHash: "new",
          },
        },
      },
    });
  });

  it("maps renderer WRITEBACK_CONFLICT errors to conflict responses", async () => {
    const error = Object.assign(new Error("图片写回事务发生冲突。"), {
      code: "WRITEBACK_CONFLICT",
      details: { transactionId: "transaction-1" },
    });
    const renderer = {
      request: vi.fn().mockRejectedValue(error),
    };
    const { server } = await track(startServer({ renderer }));

    const result = await requestJson(server.baseUrl, AGENT_HTTP_ROUTES.context);

    expect(result).toMatchObject({
      status: 409,
      body: {
        ok: false,
        error: {
          code: "WRITEBACK_CONFLICT",
          message: "图片写回事务发生冲突。",
          details: { transactionId: "transaction-1" },
        },
      },
    });
  });

  it("maps renderer CAPABILITY_UNAVAILABLE errors to conflict responses", async () => {
    const error = Object.assign(new Error("当前环境不能检查项目健康度。"), {
      code: "CAPABILITY_UNAVAILABLE",
      details: {
        command: "project.health",
        capability: "inspectProjectHealth",
      },
    });
    const renderer = {
      request: vi.fn().mockRejectedValue(error),
    };
    const { server } = await track(startServer({ renderer }));

    const result = await requestJson(
      server.baseUrl,
      AGENT_HTTP_ROUTES.projectHealth,
    );

    expect(result).toMatchObject({
      status: 409,
      body: {
        ok: false,
        error: {
          code: "CAPABILITY_UNAVAILABLE",
          message: "当前环境不能检查项目健康度。",
          details: {
            command: "project.health",
            capability: "inspectProjectHealth",
          },
        },
      },
    });
  });

  it("forwards allowed desktop bridge methods without task grants", async () => {
    const { server, renderer } = await track(startServer());

    const result = await requestJson(
      server.baseUrl,
      AGENT_HTTP_ROUTES.desktopBridge,
      {
        method: "POST",
        body: JSON.stringify({
          method: "openRecentProject",
          args: [currentProject.projectPath],
        }),
      },
    );

    expect(result.status).toBe(200);
    expect(renderer.request).toHaveBeenCalledWith("desktop.bridge", {
      method: "openRecentProject",
      args: [currentProject.projectPath],
    });
    expect(result.body).toEqual({
      ok: true,
      data: {
        command: "desktop.bridge",
        payload: {
          method: "openRecentProject",
          args: [currentProject.projectPath],
        },
      },
    });
  });

  it("rejects unsupported desktop bridge methods", async () => {
    const { server, renderer } = await track(startServer());

    const result = await requestJson(
      server.baseUrl,
      AGENT_HTTP_ROUTES.desktopBridge,
      {
        method: "POST",
        body: JSON.stringify({
          method: "onAgentCommandRequest",
          args: [],
        }),
      },
    );

    expect(result).toMatchObject({
      status: 400,
      body: {
        ok: false,
        error: {
          code: "BAD_REQUEST",
        },
      },
    });
    expect(renderer.request).not.toHaveBeenCalled();
  });

  it("forwards add-prompt with a valid write-board grant", async () => {
    const { server, renderer, grants } = await track(startServer());
    const grant = grants.createGrant({
      projectPath: currentProject.projectPath,
      permissions: ["write-board"],
      ttlSeconds: 60,
    });

    const result = await requestJson(
      server.baseUrl,
      AGENT_HTTP_ROUTES.sceneAddPrompt,
      {
        method: "POST",
        body: JSON.stringify({
          taskId: grant.taskId,
          writeToken: grant.writeToken,
          projectPath: "/tmp/forged-project",
          text: "make this softer",
        }),
      },
    );

    expect(result.status).toBe(200);
    expect(renderer.request).toHaveBeenCalledWith("scene.addPrompt", {
      projectPath: currentProject.projectPath,
      text: "make this softer",
      dryRun: false,
    });
  });

  it("forwards add-prompt with only the local bridge token", async () => {
    const { server, renderer } = await track(startServer());

    const result = await requestJson(
      server.baseUrl,
      AGENT_HTTP_ROUTES.sceneAddPrompt,
      {
        method: "POST",
        body: JSON.stringify({
          text: "make this softer",
        }),
      },
    );

    expect(result.status).toBe(200);
    expect(renderer.request).toHaveBeenCalledWith("scene.addPrompt", {
      projectPath: currentProject.projectPath,
      text: "make this softer",
      dryRun: false,
    });
  });

  it("forwards image path queries with only the local bridge token", async () => {
    const { server, renderer } = await track(startServer());

    const result = await requestJson(
      server.baseUrl,
      "/v1/scene/image-paths",
      {
        method: "POST",
        body: JSON.stringify({
          fileIds: ["file-1", "file-2"],
        }),
      },
    );

    expect(result.status).toBe(200);
    expect(renderer.request).toHaveBeenCalledWith("scene.imagePaths", {
      fileIds: ["file-1", "file-2"],
    });
  });

  it("returns a dry-run add-prompt operation without forwarding to renderer", async () => {
    const { server, renderer, grants } = await track(startServer());
    const grant = grants.createGrant({
      projectPath: currentProject.projectPath,
      permissions: ["write-board"],
      ttlSeconds: 60,
    });

    const result = await requestJson(
      server.baseUrl,
      AGENT_HTTP_ROUTES.sceneAddPrompt,
      {
        method: "POST",
        body: JSON.stringify({
          taskId: grant.taskId,
          writeToken: grant.writeToken,
          text: "try this",
          dryRun: true,
        }),
      },
    );

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      ok: true,
      data: {
        dryRun: true,
        command: "scene.addPrompt",
        projectPath: currentProject.projectPath,
        payload: {
          text: "try this",
        },
      },
    });
    expect(renderer.request).not.toHaveBeenCalled();
  });

  it("returns a compact dry-run add-image operation without forwarding image bytes", async () => {
    const { server } = await track(startServer());

    const result = await requestJson(
      server.baseUrl,
      AGENT_HTTP_ROUTES.sceneAddImage,
      {
        method: "POST",
        body: JSON.stringify({
          fileId: "file-1",
          fileName: "source.png",
          mimeType: "image/png",
          dataBase64: "ZmFrZQ==",
          width: 320,
          height: 240,
          createdAt: "2026-06-24T09:00:00.000Z",
          dryRun: true,
        }),
      },
    );

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      ok: true,
      data: {
        dryRun: true,
        command: "scene.addImage",
        projectPath: currentProject.projectPath,
        payload: {
          fileId: "file-1",
          fileName: "source.png",
          mimeType: "image/png",
          dataBase64Length: 8,
          width: 320,
          height: 240,
          createdAt: "2026-06-24T09:00:00.000Z",
        },
      },
    });
  });

  it("ignores legacy write grant permissions on local-token write routes", async () => {
    const { server, renderer, grants } = await track(startServer());
    const grant = grants.createGrant({
      projectPath: currentProject.projectPath,
      permissions: ["read-context"],
      ttlSeconds: 60,
    });

    const result = await requestJson(
      server.baseUrl,
      AGENT_HTTP_ROUTES.sceneAddPrompt,
      {
        method: "POST",
        body: JSON.stringify({
          taskId: grant.taskId,
          writeToken: grant.writeToken,
          text: "not allowed",
        }),
      },
    );

    expect(result.status).toBe(200);
    expect(renderer.request).toHaveBeenCalledWith("scene.addPrompt", {
      projectPath: currentProject.projectPath,
      text: "not allowed",
      dryRun: false,
    });
  });

  it("requires a known project token for write routes", async () => {
    const { server } = await track(
      startServer({
        getCurrentProject: () => null,
      }),
    );

    const result = await requestJson(
      server.baseUrl,
      AGENT_HTTP_ROUTES.sceneAddPrompt,
      {
        method: "POST",
        body: JSON.stringify({
          taskId: "task-1",
          writeToken: "write-1",
          text: "needs project",
        }),
      },
    );

    expect(result).toMatchObject({
      status: 401,
      body: {
        ok: false,
        error: {
          code: "AUTH_REQUIRED",
        },
      },
    });
  });

  it("keeps authorize as a local-token compatibility no-op", async () => {
    const { server } = await track(startServer());
    const body = {
      permissions: ["read-context", "write-board"],
      ttlSeconds: 120,
      reason: "inspect and add notes",
    };

    const result = await requestJson(
      server.baseUrl,
      AGENT_HTTP_ROUTES.authorize,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      ok: true,
      data: {
        authorized: true,
        mode: "project-token",
        permissions: body.permissions,
        reason: body.reason,
      },
    });
  });

  it("requires a known project token before accepting authorize compatibility requests", async () => {
    const { server } = await track(
      startServer({
        getCurrentProject: () => null,
      }),
    );

    const result = await requestJson(
      server.baseUrl,
      AGENT_HTTP_ROUTES.authorize,
      {
        method: "POST",
        body: JSON.stringify({
          permissions: ["write-board"],
        }),
      },
    );

    expect(result).toMatchObject({
      status: 401,
      body: {
        ok: false,
        error: {
          code: "AUTH_REQUIRED",
          message: "Missing or invalid token",
        },
      },
    });
  });

  it("allows close to be called more than once", async () => {
    const { server } = await track(startServer());

    await server.close();
    await expect(server.close()).resolves.toBeUndefined();
  });

  it("falls back to a dynamic port when the preferred port is already in use", async () => {
    const first = await track(startServer());
    const second = await track(
      startServer({
        preferredPort: first.server.port,
      }),
    );

    expect(second.server.port).not.toBe(first.server.port);
    expect(second.server.baseUrl).toBe(
      `http://127.0.0.1:${second.server.port}`,
    );
  });

  it("completes task grants before forwarding task.complete", async () => {
    const { server, renderer, grants } = await track(startServer());
    const grant = grants.createGrant({
      projectPath: currentProject.projectPath,
      permissions: ["write-board", "generate-image"],
      ttlSeconds: 60,
    });

    const result = await requestJson(
      server.baseUrl,
      AGENT_HTTP_ROUTES.taskComplete,
      {
        method: "POST",
        body: JSON.stringify({
          taskId: grant.taskId,
          writeToken: grant.writeToken,
        }),
      },
    );

    expect(result.status).toBe(200);
    expect(renderer.request).toHaveBeenCalledWith("task.complete", {
      projectPath: currentProject.projectPath,
      taskId: grant.taskId,
      completedGrant: {
        ...grant,
        completedAt: "2026-06-24T08:00:00.000Z",
      },
    });
  });
});
