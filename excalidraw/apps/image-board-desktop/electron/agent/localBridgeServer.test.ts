import { afterEach, describe, expect, it, vi } from "vitest";

import { AGENT_HTTP_ROUTES } from "../../src/shared/agentBridgeTypes";

import { createLocalBridgeServer } from "./localBridgeServer";
import { createTaskGrantStore } from "./taskGrants";
import { createLocalAgentSessionStore } from "./localAgentSessionStore";

const projectToken = "project-token-1";
const boardUrl = "http://127.0.0.1:60909/board";
const stableBoardUrl = "http://127.0.0.1:60909/board/stable-board-id";
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
    preferredPort: 0,
    isAgentAccessEnabled: () => true,
    getAgentImageGenerationCapability: async () => ({
      supported: true,
      authorized: false,
      configured: false,
      currentProvider: null,
      currentModel: null,
      capabilities: null,
    }),
    getCurrentProject: () => currentProject,
    getBoardUrl: () => boardUrl,
    getStableBoardUrl: async () => stableBoardUrl,
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

  it("签发受信 Agent 会话，撤销后立即拒绝访问", async () => {
    const sessions = createLocalAgentSessionStore();
    const getAgentImageGenerationCapability = vi.fn(async () => ({
      supported: true,
      authorized: false,
      configured: false,
      currentProvider: null,
      currentModel: null,
      capabilities: null,
    }));
    const { server } = await track(
      startServer({
        participantIssuerToken: "issuer-secret",
        issueAgentSession: (input) => sessions.issue(input),
        resolveAgentSession: (ref) => sessions.resolve(ref),
        getAgentImageGenerationCapability,
      }),
    );
    const input = {
      method: "POST",
      body: JSON.stringify({ host: "cursor", displayLabel: "Cursor · 任务 A" }),
    };
    const denied = await requestJson(
      server.baseUrl,
      AGENT_HTTP_ROUTES.agentSession,
      input,
    );
    expect(denied).toMatchObject({
      status: 403,
      body: { error: { code: "FORBIDDEN" } },
    });
    const issued = await requestJson(
      server.baseUrl,
      AGENT_HTTP_ROUTES.agentSession,
      {
        ...input,
        headers: { "X-CoreStudio-Participant-Issuer": "issuer-secret" },
      },
    );
    expect(issued).toMatchObject({
      status: 200,
      body: { ok: true, data: { sessionRef: expect.any(String) } },
    });
    const session = issued.body.data;
    const headers = { "X-CoreStudio-Agent-Session": session.sessionRef };
    expect(
      await requestJson(server.baseUrl, AGENT_HTTP_ROUTES.capabilities, {
        headers,
      }),
    ).toMatchObject({ status: 200 });
    expect(getAgentImageGenerationCapability).toHaveBeenCalledTimes(1);
    sessions.revokeActor(session.actorId);
    expect(
      await requestJson(server.baseUrl, AGENT_HTTP_ROUTES.capabilities, {
        headers,
      }),
    ).toMatchObject({
      status: 401,
      body: { ok: false, error: { code: "AUTH_REQUIRED" } },
    });
    expect(getAgentImageGenerationCapability).toHaveBeenCalledTimes(1);
  });

  it("rejects image generation before invoking the provider when permission is disabled", async () => {
    const generateAgentImages = vi.fn();
    const { server } = await track(
      startServer({
        participantIssuerToken: "issuer-secret",
        generateAgentImages,
      }),
    );

    const result = await requestJson(
      server.baseUrl,
      "/v1/agent/image-generation",
      {
        method: "POST",
        headers: {
          "X-CoreStudio-Participant-Issuer": "issuer-secret",
          "X-CoreStudio-Participant-Thread": "thread-b",
          "X-CoreStudio-Participant-Label": encodeURIComponent("任务 B"),
        },
        body: JSON.stringify({ prompt: "工业设计草图", count: 1 }),
      },
    );

    expect(result).toMatchObject({
      status: 403,
      body: {
        ok: false,
        error: {
          code: "IMAGE_GENERATION_DISABLED",
        },
      },
    });
    expect(generateAgentImages).not.toHaveBeenCalled();
  });

  it.each(["provider", "model", "apiKey", "baseUrl"])(
    "rejects the forbidden image generation override %s at the bridge boundary",
    async (field) => {
      const generateAgentImages = vi.fn();
      const { server } = await track(
        startServer({
          participantIssuerToken: "issuer-secret",
          getAgentImageGenerationCapability: async () => ({
            supported: true,
            authorized: true,
            configured: true,
            currentProvider: "openai",
            currentModel: "gpt-image-1",
            capabilities: {
              maxImageCount: 4,
              supportsImageCount: true,
              supportsReferenceImages: true,
            },
          }),
          generateAgentImages,
        }),
      );

      const result = await requestJson(
        server.baseUrl,
        AGENT_HTTP_ROUTES.imageGeneration,
        {
          method: "POST",
          headers: {
            "X-CoreStudio-Participant-Issuer": "issuer-secret",
            "X-CoreStudio-Participant-Thread": "thread-b",
            "X-CoreStudio-Participant-Label": encodeURIComponent("任务 B"),
          },
          body: JSON.stringify({
            prompt: "工业设计草图",
            [field]: "forbidden-value",
          }),
        },
      );

      expect(result).toMatchObject({
        status: 400,
        body: { ok: false, error: { code: "BAD_REQUEST" } },
      });
      expect(generateAgentImages).not.toHaveBeenCalled();
    },
  );

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

  it("rejects direct project scene writes from the Agent Board desktop bridge", async () => {
    const { server, renderer } = await track(startServer());

    const result = await requestJson(
      server.baseUrl,
      AGENT_HTTP_ROUTES.desktopBridge,
      {
        method: "POST",
        body: JSON.stringify({
          method: "writeProjectScene",
          args: [
            {
              projectPath: currentProject.projectPath,
              sceneJson: "{}",
              expectedSceneHash: "stale-hash",
            },
          ],
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

  it("requires trusted participant identity for add-prompt", async () => {
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

    expect(result.status).toBe(401);
    expect(renderer.request).not.toHaveBeenCalled();
  });
});
