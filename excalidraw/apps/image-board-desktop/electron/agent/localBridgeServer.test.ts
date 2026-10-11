import http from "node:http";
import { once } from "node:events";
import { transferableAbortController } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AGENT_HTTP_ROUTES } from "../../src/shared/agentBridgeTypes";

import {
  createLocalBridgeServer,
  type LocalBridgeRequestError,
} from "./localBridgeServer";
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
  const onRequestError = vi.fn();
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
    onRequestError,
    ...overrides,
  });

  return {
    server,
    renderer,
    grants,
    onRequestError,
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

  it.each(["circular", "bigint"])(
    "%s 序列化失败只返回一次完整 500，并记录无敏感输入的原始栈",
    async (kind) => {
      const circular: Record<string, unknown> = {};
      circular["private-prompt"] = circular;
      const result = kind === "circular" ? circular : BigInt(1);
      const { server, onRequestError } = await track(
        startServer({ renderer: { request: async () => result } }),
      );
      const controller = transferableAbortController();
      const timeout = setTimeout(() => controller.abort(), 1_000);
      try {
        const response = await requestJson(
          server.baseUrl,
          `${AGENT_HTTP_ROUTES.desktopBridge}?token=query-secret`,
          {
            method: "POST",
            body: JSON.stringify({
              method: "loadAppInfo",
              args: ["private-prompt"],
            }),
            signal: controller.signal,
          },
        );
        expect(response).toMatchObject({
          status: 500,
          body: { ok: false, error: { code: "COMMAND_FAILED" } },
        });
        expect(onRequestError).toHaveBeenCalledTimes(1);
        expect(onRequestError).toHaveBeenCalledWith(
          expect.objectContaining({
            requestId: expect.any(String),
            method: "POST",
            route: AGENT_HTTP_ROUTES.desktopBridge,
            phase: "serialize",
            response: expect.objectContaining({ headersSent: false }),
            error: expect.objectContaining({
              name: "TypeError",
              reason: `${kind}-json`,
              stack: expect.arrayContaining([
                expect.stringContaining("localBridgeServer"),
              ]),
            }),
          }),
        );
        const diagnostic = JSON.stringify(onRequestError.mock.calls);
        expect(diagnostic).not.toMatch(
          /query-secret|private-prompt|project-token/,
        );
        expect(
          await requestJson(server.baseUrl, AGENT_HTTP_ROUTES.status),
        ).toMatchObject({ status: 200 });
      } finally {
        clearTimeout(timeout);
      }
    },
  );

  it("错误详情无法序列化且诊断写入失败时，仍返回固定错误并保留首次异常", async () => {
    const details: Record<string, unknown> = {};
    details.self = details;
    const original = Object.assign(
      new Error("private-prompt apiKey=secret\n    at secret-body:1:2"),
      {
        code: "COMMAND_FAILED",
        details,
      },
    );
    const onRequestError = vi.fn(async (_entry: LocalBridgeRequestError) => {
      throw new Error("diagnostic sink unavailable");
    });
    const fallbackLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const { server } = await track(
      startServer({
        renderer: {
          request: async () => {
            throw original;
          },
        },
        onRequestError,
      }),
    );
    expect(
      await requestJson(server.baseUrl, AGENT_HTTP_ROUTES.sceneBoard),
    ).toEqual({
      status: 500,
      body: {
        ok: false,
        error: {
          code: "COMMAND_FAILED",
          message: "Local Bridge request failed",
        },
      },
    });
    expect(onRequestError).toHaveBeenCalledTimes(2);
    const [first, second] = onRequestError.mock.calls.map(([entry]) => entry);
    expect(first).toMatchObject({
      phase: "handler",
      error: { name: "Error", code: "COMMAND_FAILED" },
    });
    expect(second).toMatchObject({
      phase: "error-response",
      originalError: first.error,
      error: { name: "TypeError" },
    });
    await vi.waitFor(() => expect(fallbackLog).toHaveBeenCalledTimes(2));
    expect(JSON.stringify(fallbackLog.mock.calls)).not.toMatch(
      /private-prompt|apiKey|secret/,
    );
  });

  it.each(["headers-sent", "ended", "disconnected"])(
    "%s 后异步任务失败不再写响应，并保留首次失败",
    async (state) => {
      const created = vi.spyOn(http, "createServer");
      let fail!: (error: Error) => void;
      let entered!: () => void;
      const started = new Promise<void>((resolve) => {
        entered = resolve;
      });
      const pending = new Promise<never>((_, reject) => {
        fail = reject;
      });
      const { server, onRequestError } = await track(
        startServer({
          renderer: {
            request: () => {
              entered();
              return pending;
            },
          },
        }),
      );
      const rawServer = created.mock.results[0].value as http.Server;
      const incoming = once(rawServer, "request");
      const controller = transferableAbortController();
      const outcome = fetch(
        `${server.baseUrl}${AGENT_HTTP_ROUTES.sceneBoard}`,
        {
          headers: { Authorization: `Bearer ${projectToken}` },
          signal: controller.signal,
        },
      )
        .then(async (response) => ({
          status: response.status,
          body: await response.text(),
        }))
        .catch(() => "disconnected");
      const [, response] = (await incoming) as [
        http.IncomingMessage,
        http.ServerResponse,
      ];
      await started;
      if (state === "headers-sent") {
        response.writeHead(202);
        response.flushHeaders();
      } else if (state === "ended") {
        response.end("already complete");
        await outcome;
      } else {
        const closed = once(response, "close");
        controller.abort();
        await closed;
      }
      const writeHead = vi.spyOn(response, "writeHead");
      const end = vi.spyOn(response, "end");
      fail(new Error("private-prompt failure"));
      await vi.waitFor(() => expect(onRequestError).toHaveBeenCalledTimes(1));
      expect(writeHead).not.toHaveBeenCalled();
      expect(end).not.toHaveBeenCalled();
      expect(await outcome).toEqual(
        state === "ended"
          ? { status: 200, body: "already complete" }
          : "disconnected",
      );
      expect(onRequestError).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: "handler",
          error: expect.objectContaining({ name: "Error" }),
          response: expect.objectContaining(
            state === "disconnected"
              ? { destroyed: true }
              : { headersSent: true },
          ),
        }),
      );
    },
  );

  it("异步 socket 写入错误被收束，迟到结果不再序列化或写入", async () => {
    const created = vi.spyOn(http, "createServer");
    let finish!: (value: unknown) => void;
    const pending = new Promise((resolve) => {
      finish = resolve;
    });
    const { server, onRequestError } = await track(
      startServer({
        renderer: { request: () => pending },
      }),
    );
    const rawServer = created.mock.results[0].value as http.Server;
    const incoming = once(rawServer, "request");
    const outcome = fetch(`${server.baseUrl}${AGENT_HTTP_ROUTES.sceneBoard}`, {
      headers: { Authorization: `Bearer ${projectToken}` },
    })
      .then((response) => response.text())
      .catch(() => "disconnected");
    const [, response] = (await incoming) as [
      http.IncomingMessage,
      http.ServerResponse,
    ];
    const writeHead = vi.spyOn(response, "writeHead");
    const end = vi.spyOn(response, "end");
    response.emit(
      "error",
      Object.assign(new Error("socket failed"), { code: "ECONNRESET" }),
    );
    const toJSON = vi.fn(() => {
      throw new Error("should not serialize");
    });
    finish({ toJSON });
    expect(await outcome).toBe("disconnected");
    expect(toJSON).not.toHaveBeenCalled();
    expect(writeHead).not.toHaveBeenCalled();
    expect(end).not.toHaveBeenCalled();
    expect(onRequestError).toHaveBeenCalledTimes(1);
    expect(onRequestError).toHaveBeenCalledWith(
      expect.objectContaining({
        phase: "response-stream",
        error: expect.objectContaining({ code: "ECONNRESET" }),
      }),
    );
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
