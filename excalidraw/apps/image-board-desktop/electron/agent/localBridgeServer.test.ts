import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import {
  createServer as createHttpServer,
  type Server as HttpServer,
} from "node:http";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AGENT_BRIDGE_PROTOCOL_VERSION,
  AGENT_HTTP_ROUTES,
  AGENT_PERMISSIONS,
} from "../../src/shared/agentBridgeTypes";
import {
  PROJECT_ROOM_CAPABILITY_VERSION,
  PROJECT_ROOM_PROTOCOL_VERSION,
} from "../../src/shared/projectRoomProtocol";

import { createLocalBridgeServer } from "./localBridgeServer";
import { createTaskGrantStore } from "./taskGrants";

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
const backgroundProject = {
  projectPath: "/Users/alice/CoreStudio/project-2",
  name: "Project 2",
  agentAccess: {
    token: "project-token-2",
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
  const devServers: HttpServer[] = [];
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(handles.splice(0).map((handle) => handle.close()));
    await Promise.all(
      devServers.splice(0).map(
        (server) =>
          new Promise<void>((resolve, reject) => {
            server.close((error) => (error ? reject(error) : resolve()));
          }),
      ),
    );
    await Promise.all(
      temporaryDirectories
        .splice(0)
        .map((directory) => rm(directory, { recursive: true, force: true })),
    );
    vi.restoreAllMocks();
  });

  const track = async (serverPromise: ReturnType<typeof startServer>) => {
    const serverContext = await serverPromise;
    handles.push(serverContext.server);
    return serverContext;
  };

  it("serves the packaged Agent Board and its built assets", async () => {
    const assetsDir = await mkdtemp(
      path.join(os.tmpdir(), "corestudio-agent-board-"),
    );
    temporaryDirectories.push(assetsDir);
    await mkdir(path.join(assetsDir, "assets"));
    await writeFile(
      path.join(assetsDir, "index.html"),
      '<html><head></head><body><script type="module" src="./assets/index.js"></script></body></html>',
    );
    await writeFile(
      path.join(assetsDir, "assets", "index.js"),
      'console.log("agent-board")',
    );
    const { server } = await track(
      startServer({
        agentBoardAssetsDir: assetsDir,
      }),
    );

    const boardResponse = await fetch(`${server.baseUrl}/board`);
    expect(boardResponse.status).toBe(200);
    expect(boardResponse.headers.get("content-type")).toBe(
      "text/html; charset=utf-8",
    );
    await expect(boardResponse.text()).resolves.toContain("./assets/index.js");

    const stableBoardResponse = await fetch(
      `${server.baseUrl}/board/stable-board-id`,
    );
    expect(stableBoardResponse.status).toBe(200);
    expect(stableBoardResponse.headers.get("cache-control")).toBe("no-cache");
    const stableBoardHtml = await stableBoardResponse.text();
    expect(stableBoardHtml).toContain('<base href="/"');
    expect(stableBoardHtml).toContain("./assets/index.js");

    const assetResponse = await fetch(`${server.baseUrl}/assets/index.js`);
    expect(assetResponse.status).toBe(200);
    expect(assetResponse.headers.get("content-type")).toBe(
      "text/javascript; charset=utf-8",
    );
    await expect(assetResponse.text()).resolves.toContain("agent-board");

    const removedRouteResponse = await fetch(
      `${server.baseUrl}/agent-board/stable-board-id`,
    );
    expect(removedRouteResponse.status).toBe(404);

    const trailingSlashResponse = await fetch(`${server.baseUrl}/board/`);
    expect(trailingSlashResponse.status).toBe(404);

    const nestedRouteResponse = await fetch(
      `${server.baseUrl}/board/stable-board-id/extra`,
    );
    expect(nestedRouteResponse.status).toBe(404);
  });

  it("serves the development Board through the canonical Local Bridge origin", async () => {
    const requestedPaths: string[] = [];
    const devServer = createHttpServer((request, response) => {
      requestedPaths.push(request.url ?? "");
      response.writeHead(200, {
        "Content-Type": request.url?.startsWith("/src/")
          ? "text/javascript; charset=utf-8"
          : "text/html; charset=utf-8",
      });
      response.end(
        request.url?.startsWith("/src/")
          ? 'console.log("development-board")'
          : '<script type="module" src="/src/main.tsx"></script>',
      );
    });
    await new Promise<void>((resolve) => {
      devServer.listen(0, "127.0.0.1", resolve);
    });
    devServers.push(devServer);
    const address = devServer.address();
    if (!address || typeof address === "string") {
      throw new Error("Development server did not expose a TCP port.");
    }
    const { server } = await track(
      startServer({
        agentBoardDevServerUrl: `http://127.0.0.1:${address.port}`,
      }),
    );

    const boardResponse = await fetch(
      `${server.baseUrl}/board/stable-board-id`,
    );
    expect(boardResponse.status).toBe(200);
    expect(boardResponse.url).toBe(`${server.baseUrl}/board/stable-board-id`);
    await expect(boardResponse.text()).resolves.toContain("/src/main.tsx");

    const moduleResponse = await fetch(`${server.baseUrl}/src/main.tsx?t=123`);
    expect(moduleResponse.status).toBe(200);
    await expect(moduleResponse.text()).resolves.toContain("development-board");

    const removedRouteResponse = await fetch(
      `${server.baseUrl}/agent-board/stable-board-id`,
    );
    expect(removedRouteResponse.status).toBe(404);

    const invalidPageResponse = await fetch(
      `${server.baseUrl}/not-a-board-page`,
      {
        headers: {
          Accept: "text/html",
        },
      },
    );
    expect(invalidPageResponse.status).toBe(404);

    const trailingSlashResponse = await fetch(`${server.baseUrl}/board/`);
    expect(trailingSlashResponse.status).toBe(404);
    expect(requestedPaths).toEqual(["/", "/src/main.tsx?t=123"]);
  });

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

  it("reads room assets with only a scoped resume token", async () => {
    const readProjectRoomAssets = vi.fn(async () => [
      {
        fileId: "image-1",
        mimeType: "image/png",
        dataBase64: "cG5n",
        width: 40,
        height: 20,
        createdAt: "2026-07-23T08:00:00.000Z",
        rendition: "preview" as const,
      },
    ]);
    const { server, renderer } = await track(
      startServer({ readProjectRoomAssets }),
    );

    const response = await fetch(
      `${server.baseUrl}${AGENT_HTTP_ROUTES.roomAssets}`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer resume-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileIds: ["image-1"],
          rendition: "preview",
        }),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: [
        expect.objectContaining({
          fileId: "image-1",
          dataBase64: "cG5n",
        }),
      ],
    });
    expect(readProjectRoomAssets).toHaveBeenCalledWith({
      resumeToken: "resume-token",
      fileIds: ["image-1"],
      rendition: "preview",
    });
    expect(renderer.request).not.toHaveBeenCalled();
  });

  it("persists imported room assets with only a scoped resume token", async () => {
    const persistProjectRoomAssets = vi.fn(async () => ({
      "image-1": {
        fileId: "image-1",
        assetPath: "assets/image-1.png",
        sourceType: "imported" as const,
        mimeType: "image/png",
        width: 40,
        height: 20,
        createdAt: "2026-07-23T08:00:00.000Z",
      },
    }));
    const { server, renderer } = await track(
      startServer({ persistProjectRoomAssets }),
    );
    const file = {
      fileId: "image-1",
      mimeType: "image/png",
      dataBase64: "cG5n",
      width: 40,
      height: 20,
      createdAt: "2026-07-23T08:00:00.000Z",
      sourceType: "imported",
    };

    const response = await fetch(
      `${server.baseUrl}${AGENT_HTTP_ROUTES.roomPersistAssets}`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer resume-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ files: [file] }),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: {
        "image-1": {
          assetPath: "assets/image-1.png",
        },
      },
    });
    expect(persistProjectRoomAssets).toHaveBeenCalledWith({
      resumeToken: "resume-token",
      files: [file],
    });
    expect(renderer.request).not.toHaveBeenCalled();
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

  it("issues room launch tickets only to the trusted participant issuer", async () => {
    const issueProjectRoomTicket = vi.fn(async () => ({
      launchTicket: "launch-ticket",
    }));
    const { server } = await track(
      startServer({
        participantIssuerToken: "issuer-secret",
        issueProjectRoomTicket,
      }),
    );

    const denied = await requestJson(
      server.baseUrl,
      AGENT_HTTP_ROUTES.roomTicket,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: "thread-b",
          displayLabel: "任务 B",
        }),
      },
    );
    expect(denied).toMatchObject({
      status: 403,
      body: { error: { code: "FORBIDDEN" } },
    });

    const issued = await requestJson(
      server.baseUrl,
      AGENT_HTTP_ROUTES.roomTicket,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CoreStudio-Participant-Issuer": "issuer-secret",
          "X-CoreStudio-Participant-Thread": "thread-b",
          "X-CoreStudio-Participant-Label": encodeURIComponent("任务 B"),
        },
        body: JSON.stringify({
          threadId: "thread-b",
          displayLabel: "任务 B",
        }),
      },
    );
    expect(issued).toEqual({
      status: 200,
      body: {
        ok: true,
        data: {
          launchTicket: "launch-ticket",
          boardUrl,
        },
      },
    });
    expect(issueProjectRoomTicket).toHaveBeenCalledWith({
      project: currentProject,
      threadId: "thread-b",
      displayLabel: "任务 B",
    });
  });

  it("issues local Agent sessions only through the trusted participant issuer", async () => {
    const issuedSession = {
      sessionRef: "cursor-session-ref",
      actorId: "agent:cursor:cursor-session-ref",
      host: "cursor" as const,
      displayLabel: "Cursor · 任务 A",
      issuedAt: "2026-08-02T00:00:00.000Z",
    };
    const issueAgentSession = vi.fn(() => issuedSession);
    const { server } = await track(
      startServer({
        participantIssuerToken: "issuer-secret",
        issueAgentSession,
      }),
    );

    const denied = await requestJson(
      server.baseUrl,
      AGENT_HTTP_ROUTES.agentSession,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: "cursor",
          displayLabel: "Cursor · 任务 A",
        }),
      },
    );
    expect(denied).toMatchObject({
      status: 403,
      body: { error: { code: "FORBIDDEN" } },
    });

    const issued = await requestJson(
      server.baseUrl,
      AGENT_HTTP_ROUTES.agentSession,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CoreStudio-Participant-Issuer": "issuer-secret",
        },
        body: JSON.stringify({
          host: "cursor",
          displayLabel: "Cursor · 任务 A",
        }),
      },
    );
    expect(issued).toEqual({
      status: 200,
      body: { ok: true, data: issuedSession },
    });
    expect(issueAgentSession).toHaveBeenCalledWith({
      host: "cursor",
      displayLabel: "Cursor · 任务 A",
    });
  });

  it("resolves a local Agent session for trusted project room writes", async () => {
    const session = {
      sessionRef: "cursor-session-ref",
      actorId: "agent:cursor:cursor-session-ref",
      host: "cursor" as const,
      displayLabel: "Cursor · 任务 A",
      issuedAt: "2026-08-02T00:00:00.000Z",
    };
    const resolveAgentSession = vi.fn(() => session);
    const withAgentWriterCommand = vi.fn(async (_input, run) =>
      run({
        sessionId: "writer-session",
        identity: {
          projectId: "project-1",
          canonicalProjectPath: currentProject.projectPath,
          roomId: "room-1",
          sessionEpoch: 1,
        },
        roomSequence: 1,
        scene: { elements: [], sharedSceneConfig: {} },
      }),
    );
    const { server } = await track(
      startServer({ resolveAgentSession, withAgentWriterCommand }),
    );

    const result = await requestJson(
      server.baseUrl,
      AGENT_HTTP_ROUTES.sceneAddPrompt,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CoreStudio-Agent-Session": session.sessionRef,
        },
        body: JSON.stringify({ text: "方案 A" }),
      },
    );

    expect(result.status).toBe(200);
    expect(resolveAgentSession).toHaveBeenCalledWith(session.sessionRef);
    expect(withAgentWriterCommand).toHaveBeenCalledWith(
      {
        project: currentProject,
        threadId: session.sessionRef,
        actorId: session.actorId,
        host: "cursor",
        displayLabel: session.displayLabel,
      },
      expect.any(Function),
    );
  });

  it("keeps concurrent Cursor and Claude Code writer identities isolated", async () => {
    const sessions = {
      "cursor-session-ref": {
        sessionRef: "cursor-session-ref",
        actorId: "agent:cursor:cursor-session-ref",
        host: "cursor" as const,
        displayLabel: "Cursor · 任务 A",
        issuedAt: "2026-08-02T00:00:00.000Z",
      },
      "claude-session-ref": {
        sessionRef: "claude-session-ref",
        actorId: "agent:claude-code:claude-session-ref",
        host: "claude-code" as const,
        displayLabel: "Claude Code · 任务 B",
        issuedAt: "2026-08-02T00:00:01.000Z",
      },
    };
    const resolveAgentSession = vi.fn(
      (sessionRef: string) =>
        sessions[sessionRef as keyof typeof sessions] ?? null,
    );
    const withAgentWriterCommand = vi.fn(async (_input, run) =>
      run({
        sessionId: "writer-session",
        identity: {
          projectId: "project-1",
          canonicalProjectPath: currentProject.projectPath,
          roomId: "room-1",
          sessionEpoch: 1,
        },
        roomSequence: 1,
        scene: { elements: [], sharedSceneConfig: {} },
      }),
    );
    const { server } = await track(
      startServer({ resolveAgentSession, withAgentWriterCommand }),
    );

    for (const session of Object.values(sessions)) {
      const result = await requestJson(
        server.baseUrl,
        AGENT_HTTP_ROUTES.sceneAddPrompt,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CoreStudio-Agent-Session": session.sessionRef,
          },
          body: JSON.stringify({ text: session.displayLabel }),
        },
      );
      expect(result.status).toBe(200);
    }

    expect(withAgentWriterCommand).toHaveBeenNthCalledWith(
      1,
      {
        project: currentProject,
        threadId: sessions["cursor-session-ref"].sessionRef,
        actorId: sessions["cursor-session-ref"].actorId,
        host: "cursor",
        displayLabel: sessions["cursor-session-ref"].displayLabel,
      },
      expect.any(Function),
    );
    expect(withAgentWriterCommand).toHaveBeenNthCalledWith(
      2,
      {
        project: currentProject,
        threadId: sessions["claude-session-ref"].sessionRef,
        actorId: sessions["claude-session-ref"].actorId,
        host: "claude-code",
        displayLabel: sessions["claude-session-ref"].displayLabel,
      },
      expect.any(Function),
    );
  });

  it("issues a scoped project-selection session when there is no current project", async () => {
    const issueBoardProjectSelection = vi.fn(async () => ({
      selectionToken: "selection-token",
    }));
    const { server } = await track(
      startServer({
        getCurrentProject: () => null,
        participantIssuerToken: "issuer-secret",
        issueBoardProjectSelection,
      }),
    );

    const result = await requestJsonWithoutAuth(
      server.baseUrl,
      AGENT_HTTP_ROUTES.boardSession,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CoreStudio-Participant-Issuer": "issuer-secret",
          "X-CoreStudio-Participant-Thread": "thread-b",
          "X-CoreStudio-Participant-Label": encodeURIComponent("任务 B"),
        },
        body: JSON.stringify({
          threadId: "thread-b",
          displayLabel: "任务 B",
        }),
      },
    );

    expect(result).toEqual({
      status: 200,
      body: {
        ok: true,
        data: {
          boardUrl,
          selectionToken: "selection-token",
        },
      },
    });
  });

  it("issues a scoped project-selection session from a claimed stable Board", async () => {
    const issueBoardProjectSelectionFromStableBoard = vi.fn(async () => ({
      selectionToken: "selection-token",
    }));
    const { server } = await track(
      startServer({
        issueBoardProjectSelectionFromStableBoard,
      }),
    );

    const result = await requestJsonWithoutAuth(
      server.baseUrl,
      AGENT_HTTP_ROUTES.boardProjectSelectionSession,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer actor-resume-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stableBoardId: "stable-board-id",
          pageNonce: "page-nonce",
        }),
      },
    );

    expect(result).toEqual({
      status: 200,
      body: {
        ok: true,
        data: {
          boardUrl,
          selectionToken: "selection-token",
        },
      },
    });
    expect(issueBoardProjectSelectionFromStableBoard).toHaveBeenCalledWith({
      stableBoardId: "stable-board-id",
      pageNonce: "page-nonce",
      actorResumeToken: "actor-resume-token",
    });
  });

  it("rejects stable Board project switching without an actor resume token", async () => {
    const issueBoardProjectSelectionFromStableBoard = vi.fn(async () => ({
      selectionToken: "selection-token",
    }));
    const { server } = await track(
      startServer({
        issueBoardProjectSelectionFromStableBoard,
      }),
    );

    const result = await requestJsonWithoutAuth(
      server.baseUrl,
      AGENT_HTTP_ROUTES.boardProjectSelectionSession,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stableBoardId: "stable-board-id",
          pageNonce: "page-nonce",
        }),
      },
    );

    expect(result).toEqual({
      status: 401,
      body: {
        ok: false,
        error: {
          code: "AUTH_REQUIRED",
          message: "A valid stable Board actor resume token is required.",
        },
      },
    });
    expect(issueBoardProjectSelectionFromStableBoard).not.toHaveBeenCalled();
  });

  it("lists candidates and opens their stable Board address", async () => {
    const candidates = [
      {
        projectPath: "/projects/a",
        name: "项目 A",
        lastOpenedAt: "2026-07-24T08:00:00.000Z",
      },
    ];
    const listBoardProjectCandidates = vi.fn(async () => candidates);
    const openBoardProjectCandidate = vi.fn(async () => ({
      boardUrl: stableBoardUrl,
      project: {
        projectPath: "/projects/a",
        name: "项目 A",
      },
    }));
    const { server } = await track(
      startServer({
        listBoardProjectCandidates,
        openBoardProjectCandidate,
      }),
    );

    const listed = await requestJsonWithoutAuth(
      server.baseUrl,
      AGENT_HTTP_ROUTES.boardProjects,
      {
        headers: { Authorization: "Bearer selection-token" },
      },
    );
    expect(listed).toEqual({
      status: 200,
      body: { ok: true, data: candidates },
    });
    expect(listBoardProjectCandidates).toHaveBeenCalledWith("selection-token");

    const opened = await requestJsonWithoutAuth(
      server.baseUrl,
      AGENT_HTTP_ROUTES.boardProjectOpen,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer selection-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectPath: "/projects/a" }),
      },
    );
    expect(opened).toEqual({
      status: 200,
      body: {
        ok: true,
        data: {
          boardUrl: stableBoardUrl,
          project: {
            projectPath: "/projects/a",
            name: "项目 A",
          },
        },
      },
    });
    expect(openBoardProjectCandidate).toHaveBeenCalledWith({
      selectionToken: "selection-token",
      projectPath: "/projects/a",
    });
  });

  it("keeps stable Board actor claim and session exchange separate", async () => {
    const claimStableBoardSession = vi.fn(async () => undefined);
    const exchangeStableBoardSession = vi.fn(async () => ({
      launchTicket: "short-lived-ticket",
      actorResumeToken: "actor-resume-token",
    }));
    const { server } = await track(
      startServer({
        participantIssuerToken: "issuer-secret",
        claimStableBoardSession,
        exchangeStableBoardSession,
      }),
    );

    const claim = await requestJsonWithoutAuth(
      server.baseUrl,
      AGENT_HTTP_ROUTES.stableBoardSessionClaim,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CoreStudio-Participant-Issuer": "issuer-secret",
          "X-CoreStudio-Participant-Thread": "thread-b",
          "X-CoreStudio-Participant-Label": encodeURIComponent("任务 B"),
        },
        body: JSON.stringify({
          stableBoardId: "stable-board-id",
          pageNonce: "page-nonce",
        }),
      },
    );
    expect(claim).toEqual({
      status: 200,
      body: { ok: true, data: { claimed: true } },
    });
    expect(claimStableBoardSession).toHaveBeenCalledWith({
      stableBoardId: "stable-board-id",
      pageNonce: "page-nonce",
      threadId: "thread-b",
      displayLabel: "任务 B",
    });

    const exchange = await requestJsonWithoutAuth(
      server.baseUrl,
      AGENT_HTTP_ROUTES.stableBoardSessionExchange,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stableBoardId: "stable-board-id",
          pageNonce: "page-nonce",
          actorResumeToken: "previous-actor-resume-token",
        }),
      },
    );
    expect(exchange).toEqual({
      status: 200,
      body: {
        ok: true,
        data: {
          launchTicket: "short-lived-ticket",
          actorResumeToken: "actor-resume-token",
        },
      },
    });
    expect(exchangeStableBoardSession).toHaveBeenCalledWith({
      stableBoardId: "stable-board-id",
      pageNonce: "page-nonce",
      actorResumeToken: "previous-actor-resume-token",
    });
  });

  it.each([
    {
      host: "cursor" as const,
      sessionRef: "cursor-session-ref",
      actorId: "agent:cursor:cursor-session-ref",
      displayLabel: "Cursor · 任务 A",
    },
    {
      host: "claude-code" as const,
      sessionRef: "claude-session-ref",
      actorId: "agent:claude-code:claude-session-ref",
      displayLabel: "Claude Code · 任务 B",
    },
  ])(
    "claims the original stable Board with a $host session",
    async (session) => {
      const resolveAgentSession = vi.fn(() => ({
        ...session,
        issuedAt: "2026-08-02T00:00:00.000Z",
      }));
      const claimStableBoardSession = vi.fn(async () => undefined);
      const { server } = await track(
        startServer({ resolveAgentSession, claimStableBoardSession }),
      );

      const claim = await requestJsonWithoutAuth(
        server.baseUrl,
        AGENT_HTTP_ROUTES.stableBoardSessionClaim,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CoreStudio-Agent-Session": session.sessionRef,
          },
          body: JSON.stringify({
            stableBoardId: "stable-board-id",
            pageNonce: "page-nonce",
          }),
        },
      );

      expect(claim).toEqual({
        status: 200,
        body: { ok: true, data: { claimed: true } },
      });
      expect(resolveAgentSession).toHaveBeenCalledWith(session.sessionRef);
      expect(claimStableBoardSession).toHaveBeenCalledWith({
        stableBoardId: "stable-board-id",
        pageNonce: "page-nonce",
        threadId: session.sessionRef,
        actorId: session.actorId,
        host: session.host,
        displayLabel: session.displayLabel,
      });
    },
  );

  it("returns stable Board diagnostics without exposing a browser repair route", async () => {
    const inspectStableBoardIntegration = vi.fn(async () => ({
      state: "repair-required" as const,
      appVersion: "1.1.26",
      integrationVersion: "1.9.0",
      bridgeProtocolVersion: 3,
      actorClaimed: false,
      issues: [
        {
          code: "CODEX_INTEGRATION_OUTDATED" as const,
          message: "需要更新集成。",
        },
      ],
    }));
    const { server } = await track(
      startServer({
        inspectStableBoardIntegration,
      }),
    );
    const identity = {
      stableBoardId: "stable-board-id",
      pageNonce: "page-nonce",
    };

    const status = await requestJsonWithoutAuth(
      server.baseUrl,
      AGENT_HTTP_ROUTES.stableBoardIntegrationStatus,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(identity),
      },
    );
    expect(status).toMatchObject({
      status: 200,
      body: {
        ok: true,
        data: {
          state: "repair-required",
        },
      },
    });

    const repair = await requestJsonWithoutAuth(
      server.baseUrl,
      "/v1/agent-board/integration/repair",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "install-codex-integration" }),
      },
    );
    expect(repair).toMatchObject({
      status: 404,
      body: { error: { code: "UNSUPPORTED_COMMAND" } },
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
        imageGeneration: {
          supported: true,
          authorized: false,
          configured: false,
          currentProvider: null,
          currentModel: null,
          capabilities: null,
        },
      },
    });
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

  it("passes authorized image generation to the trusted Codex integration", async () => {
    const generateAgentImages = vi.fn(async () => ({
      jobId: "job-1",
      provider: "openai",
      model: "gpt-image-1",
      generationSource: "agent",
      images: [],
      operationId: "operation-1",
      roomSequence: 2,
      persistedSequence: 2,
      persisted: true,
    }));
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
      "/v1/agent/image-generation",
      {
        method: "POST",
        headers: {
          "X-CoreStudio-Participant-Issuer": "issuer-secret",
          "X-CoreStudio-Participant-Thread": "thread-b",
          "X-CoreStudio-Participant-Label": encodeURIComponent("任务 B"),
        },
        body: JSON.stringify({
          prompt: "工业设计草图",
          count: 2,
          referenceFileIds: ["file-1"],
          referenceElementIds: ["element-1"],
        }),
      },
    );

    expect(result.status).toBe(200);
    expect(generateAgentImages).toHaveBeenCalledWith({
      project: currentProject,
      threadId: "thread-b",
      displayLabel: "任务 B",
      prompt: "工业设计草图",
      count: 2,
      referenceFileIds: ["file-1"],
      referenceElementIds: ["element-1"],
    });
  });

  it("resolves image generation permission and writes for the active Agent host", async () => {
    const getAgentImageGenerationCapability = vi.fn(async () => ({
      supported: true,
      authorized: true,
      configured: true,
      currentProvider: "openai",
      currentModel: "gpt-image-1",
      capabilities: {
        maxImageCount: 1,
        supportsImageCount: true,
        supportsReferenceImages: false,
      },
    }));
    const generateAgentImages = vi.fn(async () => ({ persisted: true }));
    const { server } = await track(
      startServer({
        resolveAgentSession: () => ({
          sessionRef: "cursor-session",
          actorId: "agent:cursor:cursor-session",
          host: "cursor",
          displayLabel: "Cursor Agent",
          issuedAt: "2026-08-02T00:00:00.000Z",
        }),
        getAgentImageGenerationCapability,
        generateAgentImages,
      }),
    );

    const result = await requestJson(
      server.baseUrl,
      "/v1/agent/image-generation",
      {
        method: "POST",
        headers: {
          "X-CoreStudio-Agent-Session": "cursor-session",
        },
        body: JSON.stringify({ prompt: "工业设计草图", count: 1 }),
      },
    );

    expect(result.status).toBe(200);
    expect(getAgentImageGenerationCapability).toHaveBeenCalledWith("cursor");
    expect(generateAgentImages).toHaveBeenCalledWith({
      project: currentProject,
      threadId: "cursor-session",
      actorId: "agent:cursor:cursor-session",
      host: "cursor",
      displayLabel: "Cursor Agent",
      prompt: "工业设计草图",
      count: 1,
      referenceFileIds: [],
      referenceElementIds: [],
    });
  });

  it("rejects an expired Agent session before resolving host capabilities", async () => {
    const getAgentImageGenerationCapability = vi.fn();
    const { server } = await track(
      startServer({
        resolveAgentSession: () => {
          throw Object.assign(new Error("Agent session expired."), {
            code: "AUTH_REQUIRED",
          });
        },
        getAgentImageGenerationCapability,
      }),
    );

    const result = await requestJson(
      server.baseUrl,
      AGENT_HTTP_ROUTES.capabilities,
      {
        headers: { "X-CoreStudio-Agent-Session": "expired-session" },
      },
    );

    expect(result).toMatchObject({
      status: 401,
      body: { ok: false, error: { code: "AUTH_REQUIRED" } },
    });
    expect(getAgentImageGenerationCapability).not.toHaveBeenCalled();
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

  it("does not expose recent project discovery through the desktop bridge", async () => {
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

    expect(result.status).toBe(400);
    expect(renderer.request).not.toHaveBeenCalled();
  });

  it("does not let Agent Board switch projects through the desktop bridge", async () => {
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

    expect(result.status).toBe(400);
    expect(renderer.request).not.toHaveBeenCalled();
  });

  it("allows browser CORS preflight requests from the canonical Board origin", async () => {
    const { server } = await track(startServer());

    const response = await fetch(
      `${server.baseUrl}${AGENT_HTTP_ROUTES.status}`,
      {
        method: "OPTIONS",
        headers: {
          Origin: "http://127.0.0.1:60909",
          "Access-Control-Request-Method": "GET",
          "Access-Control-Request-Headers": "authorization",
        },
      },
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "http://127.0.0.1:60909",
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
  ] as const)("forwards %s to %s", async (route, command) => {
    const { server, renderer } = await track(startServer());

    const result = await requestJson(server.baseUrl, route);

    expect(result.status).toBe(200);
    expect(renderer.request).toHaveBeenCalledWith(command, {
      projectPath: currentProject.projectPath,
    });
    expect(result.body).toEqual({
      ok: true,
      data: {
        command,
        payload: {
          projectPath: currentProject.projectPath,
        },
      },
    });
  });

  it("routes an authenticated background project to its own renderer", async () => {
    const { server, renderer } = await track(
      startServer({
        getProjectByToken: async (token) =>
          token === backgroundProject.agentAccess.token
            ? backgroundProject
            : null,
      }),
    );

    const response = await fetch(
      `${server.baseUrl}${AGENT_HTTP_ROUTES.projectCurrent}`,
      {
        headers: {
          Authorization: `Bearer ${backgroundProject.agentAccess.token}`,
        },
      },
    );

    expect(response.status).toBe(200);
    expect(renderer.request).toHaveBeenCalledWith("project.current", {
      projectPath: backgroundProject.projectPath,
    });
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        command: "project.current",
        payload: {
          projectPath: backgroundProject.projectPath,
        },
      },
    });
  });

  it.each([
    [AGENT_HTTP_ROUTES.sceneBoard, "scene.board"],
    [AGENT_HTTP_ROUTES.sceneSnapshot, "scene.snapshot"],
  ] as const)(
    "reads %s from the authoritative project room instead of the renderer snapshot",
    async (route, command) => {
      const readProjectRoomScene = vi.fn(async () => ({
        source: "project-room",
        command,
      }));
      const { server, renderer } = await track(
        startServer({
          readProjectRoomScene,
        }),
      );

      const result = await requestJson(server.baseUrl, route);

      expect(result).toEqual({
        status: 200,
        body: {
          ok: true,
          data: {
            source: "project-room",
            command,
          },
        },
      });
      expect(readProjectRoomScene).toHaveBeenCalledWith({
        project: currentProject,
        command,
      });
      expect(renderer.request).not.toHaveBeenCalled();
    },
  );

  it.each([
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
  ])(
    "forwards $route to $command with payload",
    async ({ route, command, body }) => {
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
    },
  );

  it("returns the calling Codex actor room selection in room mode", async () => {
    const roomSelection = {
      source: "agent-board" as const,
      projectPath: currentProject.projectPath,
      updatedAt: "2026-07-23T00:00:00.000Z",
      selection: {
        selected: true,
        kind: "image",
        fileIds: ["file-room"],
      },
      scene: {
        selectedElementIds: ["element-room"],
      },
    };
    const getProjectRoomParticipantState = vi.fn(async () => roomSelection);
    const { server, renderer } = await track(
      startServer({
        participantIssuerToken: "issuer-secret",
        getProjectRoomParticipantState,
      }),
    );

    const result = await requestJson(
      server.baseUrl,
      AGENT_HTTP_ROUTES.sceneSelection,
      {
        headers: {
          "X-CoreStudio-Participant-Issuer": "issuer-secret",
          "X-CoreStudio-Participant-Thread": "thread-b",
          "X-CoreStudio-Participant-Label": encodeURIComponent("任务 B"),
        },
      },
    );

    expect(result).toEqual({
      status: 200,
      body: {
        ok: true,
        data: roomSelection.selection,
      },
    });
    expect(getProjectRoomParticipantState).toHaveBeenCalledWith({
      project: currentProject,
      threadId: "thread-b",
    });
    expect(renderer.request).not.toHaveBeenCalled();
  });

  it("does not expose the retired built-in generation route", async () => {
    const { server, renderer } = await track(startServer());

    const result = await requestJson(server.baseUrl, "/v1/generate", {
      method: "POST",
      body: JSON.stringify({
        prompt: "优化这台桌面 CNC",
        useSelection: true,
      }),
    });

    expect(result.status).toBe(404);
    expect(renderer.request).not.toHaveBeenCalled();
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

  it("maps storage divergence errors to conflict responses", async () => {
    const error = Object.assign(new Error("磁盘内容与当前项目房间不一致。"), {
      code: "PROJECT_STORAGE_DIVERGED",
      details: {
        expectedSceneHash: "old",
        currentSceneHash: "new",
      },
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
          code: "PROJECT_STORAGE_DIVERGED",
          message: "磁盘内容与当前项目房间不一致。",
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

  it("forwards only the informational desktop bridge method", async () => {
    const { server, renderer } = await track(startServer());

    const result = await requestJson(
      server.baseUrl,
      AGENT_HTTP_ROUTES.desktopBridge,
      {
        method: "POST",
        body: JSON.stringify({
          method: "loadAppInfo",
          args: [],
        }),
      },
    );

    expect(result.status).toBe(200);
    expect(renderer.request).toHaveBeenCalledWith("desktop.bridge", {
      method: "loadAppInfo",
      args: [],
      projectPath: currentProject.projectPath,
    });
    expect(result.body).toEqual({
      ok: true,
      data: {
        command: "desktop.bridge",
        payload: {
          method: "loadAppInfo",
          args: [],
          projectPath: currentProject.projectPath,
        },
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

  it("does not treat legacy write-board grants as room identity", async () => {
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

    expect(result.status).toBe(401);
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

  it("runs room write commands as the trusted Codex agent-writer identity", async () => {
    const withAgentWriterCommand = vi.fn(
      async (
        input: {
          threadId: string;
          displayLabel: string;
          project: typeof currentProject;
        },
        run: (context: {
          sessionId: string;
          identity: {
            projectId: string;
            canonicalProjectPath: string;
            roomId: string;
            sessionEpoch: number;
          };
          roomSequence: number;
          scene: {
            elements: [];
            sharedSceneConfig: {};
          };
        }) => Promise<unknown>,
      ) =>
        run({
          sessionId: "agent-writer-session",
          identity: {
            projectId: "project-1",
            canonicalProjectPath: currentProject.projectPath,
            roomId: "room-1",
            sessionEpoch: 2,
          },
          roomSequence: 0,
          scene: {
            elements: [],
            sharedSceneConfig: {},
          },
        }),
    );
    const { server, renderer } = await track(
      startServer({
        participantIssuerToken: "issuer-secret",
        withAgentWriterCommand,
      }),
    );

    const result = await requestJson(
      server.baseUrl,
      AGENT_HTTP_ROUTES.sceneAddPrompt,
      {
        method: "POST",
        headers: {
          "X-CoreStudio-Participant-Issuer": "issuer-secret",
          "X-CoreStudio-Participant-Thread": "thread-b",
          "X-CoreStudio-Participant-Label": encodeURIComponent("任务 B"),
        },
        body: JSON.stringify({
          text: "make this softer",
        }),
      },
    );

    expect(result.status).toBe(200);
    expect(withAgentWriterCommand).toHaveBeenCalledWith(
      {
        project: currentProject,
        threadId: "thread-b",
        displayLabel: "任务 B",
      },
      expect.any(Function),
    );
    expect(renderer.request).toHaveBeenCalledWith("scene.addPrompt", {
      projectPath: currentProject.projectPath,
      text: "make this softer",
      dryRun: false,
      projectRoomAgentWriter: {
        sessionId: "agent-writer-session",
        identity: {
          projectId: "project-1",
          canonicalProjectPath: currentProject.projectPath,
          roomId: "room-1",
          sessionEpoch: 2,
        },
        roomSequence: 0,
        scene: {
          elements: [],
          sharedSceneConfig: {},
        },
      },
    });
  });

  it("runs diagram dry-runs through the renderer without applying a room operation", async () => {
    const withAgentWriterCommand = vi.fn(
      async (
        _input: {
          threadId: string;
          displayLabel: string;
          project: typeof currentProject;
          dryRun?: boolean;
        },
        run: (context: {
          sessionId: string;
          identity: {
            projectId: string;
            canonicalProjectPath: string;
            roomId: string;
            sessionEpoch: number;
          };
          roomSequence: number;
          scene: {
            elements: [];
            sharedSceneConfig: {};
          };
        }) => Promise<unknown>,
      ) =>
        run({
          sessionId: "agent-writer-session",
          identity: {
            projectId: "project-1",
            canonicalProjectPath: currentProject.projectPath,
            roomId: "room-1",
            sessionEpoch: 2,
          },
          roomSequence: 0,
          scene: {
            elements: [],
            sharedSceneConfig: {},
          },
        }),
    );
    const { server, renderer } = await track(
      startServer({
        participantIssuerToken: "issuer-secret",
        withAgentWriterCommand,
      }),
    );

    const result = await requestJson(
      server.baseUrl,
      AGENT_HTTP_ROUTES.sceneAddDiagram,
      {
        method: "POST",
        headers: {
          "X-CoreStudio-Participant-Issuer": "issuer-secret",
          "X-CoreStudio-Participant-Thread": "thread-b",
          "X-CoreStudio-Participant-Label": encodeURIComponent("任务 B"),
        },
        body: JSON.stringify({
          format: "mermaid",
          source: "flowchart LR\nA --> B",
          anchor: "auto",
          dryRun: true,
        }),
      },
    );

    expect(result.status).toBe(200);
    expect(withAgentWriterCommand).toHaveBeenCalledWith(
      {
        project: currentProject,
        threadId: "thread-b",
        displayLabel: "任务 B",
        dryRun: true,
      },
      expect.any(Function),
    );
    expect(renderer.request).toHaveBeenCalledWith("scene.addDiagram", {
      projectPath: currentProject.projectPath,
      format: "mermaid",
      source: "flowchart LR\nA --> B",
      anchor: "auto",
      dryRun: true,
      projectRoomAgentWriter: expect.objectContaining({
        sessionId: "agent-writer-session",
      }),
    });
  });

  it("forwards image path queries with only the local bridge token", async () => {
    const { server, renderer } = await track(startServer());

    const result = await requestJson(server.baseUrl, "/v1/scene/image-paths", {
      method: "POST",
      body: JSON.stringify({
        fileIds: ["file-1", "file-2"],
      }),
    });

    expect(result.status).toBe(200);
    expect(renderer.request).toHaveBeenCalledWith("scene.imagePaths", {
      fileIds: ["file-1", "file-2"],
      projectPath: currentProject.projectPath,
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

  it("rejects legacy grant permissions on room write routes", async () => {
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

    expect(result.status).toBe(401);
    expect(renderer.request).not.toHaveBeenCalled();
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

  it("keeps a stable bridge address by rejecting an occupied preferred port", async () => {
    const first = await track(startServer());

    await expect(
      startServer({
        preferredPort: first.server.port,
        allowDynamicPortFallback: false,
      }),
    ).rejects.toMatchObject({ code: "EADDRINUSE" });
  });

  it("completes task grants before forwarding task.complete", async () => {
    const { server, renderer, grants } = await track(startServer());
    const grant = grants.createGrant({
      projectPath: currentProject.projectPath,
      permissions: ["write-board"],
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
