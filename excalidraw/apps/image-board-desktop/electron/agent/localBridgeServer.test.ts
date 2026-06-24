import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AGENT_BRIDGE_PROTOCOL_VERSION,
  AGENT_HTTP_ROUTES,
  AGENT_PERMISSIONS,
} from "../../src/shared/agentBridgeTypes";

import { createLocalBridgeServer } from "./localBridgeServer";
import { createTaskGrantStore } from "./taskGrants";

import type { AgentPermission } from "../../src/shared/agentBridgeTypes";

const readToken = "read-token-1";
const currentProject = {
  projectPath: "/Users/alice/CoreStudio/project-1",
  name: "Project 1",
};

const requestJson = async (
  baseUrl: string,
  path: string,
  init: RequestInit = {},
) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${readToken}`,
      ...(init.headers ?? {}),
    },
  });
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
  const authorize = vi.fn(async (input) => ({
    authorized: true,
    input,
  }));
  const server = await createLocalBridgeServer({
    readToken,
    getCurrentProject: () => currentProject,
    renderer,
    grants,
    authorize,
    ...overrides,
  });

  return {
    server,
    renderer,
    grants,
    authorize,
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
        },
      },
    });
  });

  it("returns bridge-ready status even when no project is open", async () => {
    const { server } = await track(
      startServer({
        getCurrentProject: () => null,
      }),
    );

    const result = await requestJson(server.baseUrl, AGENT_HTTP_ROUTES.status);

    expect(result).toEqual({
      status: 200,
      body: {
        ok: true,
        data: {
          ready: true,
          currentProject: null,
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

  it("rejects requests without Authorization", async () => {
    const { server } = await track(startServer());

    const response = await fetch(
      `${server.baseUrl}${AGENT_HTTP_ROUTES.status}`,
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: {
        code: "AUTH_REQUIRED",
      },
    });
  });

  it("allows browser CORS preflight requests without bearer auth", async () => {
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
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-headers")).toContain(
      "Authorization",
    );
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
        Authorization: `Bearer ${readToken}`,
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
          Authorization: `Bearer ${readToken}`,
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
    [AGENT_HTTP_ROUTES.sceneBoard, "scene.board"],
    [AGENT_HTTP_ROUTES.sceneSnapshot, "scene.snapshot"],
    [AGENT_HTTP_ROUTES.sceneSelection, "scene.selection"],
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

  it("rejects add-prompt when task token fields are missing", async () => {
    const { server } = await track(startServer());

    const result = await requestJson(
      server.baseUrl,
      AGENT_HTTP_ROUTES.sceneAddPrompt,
      {
        method: "POST",
        body: JSON.stringify({ text: "missing token" }),
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
  });

  it("rejects add-prompt when the grant lacks write-board permission", async () => {
    const { server, grants } = await track(startServer());
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

    expect(result).toMatchObject({
      status: 403,
      body: {
        ok: false,
        error: {
          code: "FORBIDDEN",
        },
      },
    });
  });

  it("requires a current project for write routes", async () => {
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
      status: 409,
      body: {
        ok: false,
        error: {
          code: "PROJECT_REQUIRED",
        },
      },
    });
  });

  it("passes authorize requests to the injected authorize handler", async () => {
    const { server, authorize } = await track(startServer());
    const body = {
      permissions: ["read-context", "write-board"] as AgentPermission[],
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
    expect(authorize).toHaveBeenCalledWith(body);
    expect(result.body).toEqual({
      ok: true,
      data: {
        authorized: true,
        input: body,
      },
    });
  });

  it("maps denied authorize requests to auth denied responses", async () => {
    const { server } = await track(
      startServer({
        authorize: vi.fn(async () => {
          throw Object.assign(new Error("用户已取消 Agent 授权。"), {
            code: "AUTH_DENIED",
          });
        }),
      }),
    );

    const result = await requestJson(
      server.baseUrl,
      AGENT_HTTP_ROUTES.authorize,
      {
        method: "POST",
        body: JSON.stringify({
          permissions: ["read-context"],
        }),
      },
    );

    expect(result).toMatchObject({
      status: 401,
      body: {
        ok: false,
        error: {
          code: "AUTH_DENIED",
          message: "用户已取消 Agent 授权。",
        },
      },
    });
  });

  it("maps missing project authorize requests to project required responses", async () => {
    const { server } = await track(
      startServer({
        authorize: vi.fn(async () => {
          throw Object.assign(new Error("当前没有打开 CoreStudio 项目。"), {
            code: "PROJECT_REQUIRED",
          });
        }),
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

  it("allows close to be called more than once", async () => {
    const { server } = await track(startServer());

    await server.close();
    await expect(server.close()).resolves.toBeUndefined();
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
