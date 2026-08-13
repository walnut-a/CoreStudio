import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";

import { AGENT_HTTP_ROUTES } from "../shared/agentBridgeTypes";
import {
  App,
  act,
  createMockProjectBundle,
  fireEvent,
  mockExcalidrawAPI,
  newImageElement,
  render,
  screen,
  triggerExcalidrawInitialize,
  triggerExcalidrawScrollChange,
  waitFor,
} from "./App.testSupport";
import type { FileId } from "./App.testSupport";

const readyIntegrationStatus = {
  state: "ready",
  appVersion: "1.1.26",
  integrationVersion: "1.9.0",
  bridgeProtocolVersion: 3,
  actorClaimed: false,
  projectName: "平面设计助手",
  issues: [],
};

describe("App Agent Board room route", () => {
  it("shows recent project candidates when opened without an active project", async () => {
    window.history.pushState(
      null,
      "",
      "/board?projectSelectionToken=selection-token",
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const pathname = new URL(String(input)).pathname;
        const data =
          pathname === AGENT_HTTP_ROUTES.boardProjects
            ? [
                {
                  projectPath: "/projects/project-a",
                  name: "项目 A",
                  lastOpenedAt: "2026-07-24T08:00:00.000Z",
                },
              ]
            : pathname === AGENT_HTTP_ROUTES.status
            ? { ready: true, currentProject: null }
            : { name: "CoreStudio", version: "1.1.26" };
        return new Response(JSON.stringify({ ok: true, data }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );

    render(<App />);

    expect(await screen.findByText("项目 A")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "删除项目：项目 A" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("status", { name: "正在连接当前项目…" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Agent Board 不提供 模型供应商设置 能力。"),
    ).not.toBeInTheDocument();
  });

  it("shows a room connection state instead of the project picker while joining", () => {
    class PendingRoomWebSocket {
      static readonly OPEN = 1;
      readonly readyState = 0;
      addEventListener() {}
      send() {}
      close() {}
    }
    window.history.pushState(null, "", "/board/stable-board-id");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async (input: string | URL) =>
          new Response(
            JSON.stringify({
              ok: true,
              data:
                new URL(String(input)).pathname ===
                AGENT_HTTP_ROUTES.stableBoardIntegrationStatus
                  ? readyIntegrationStatus
                  : {
                      launchTicket: "launch-ticket",
                      actorResumeToken: "actor-resume-token",
                    },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
      ),
    );
    vi.stubGlobal("WebSocket", PendingRoomWebSocket);

    render(<App />);

    expect(
      screen.getByRole("status", { name: "正在连接当前项目…" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "选择项目开始" }),
    ).not.toBeInTheDocument();
  });

  it("explains how to connect the page while waiting for trusted Codex identity", async () => {
    window.history.pushState(
      null,
      "",
      "/board/stable-board-id?targetProjectName=%E5%B9%B3%E9%9D%A2%E8%AE%BE%E8%AE%A1%E5%8A%A9%E6%89%8B&returnProjectSelectionToken=return-selection-token",
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async (input: string | URL) =>
          new Response(
            JSON.stringify(
              new URL(String(input)).pathname ===
                AGENT_HTTP_ROUTES.stableBoardIntegrationStatus
                ? { ok: true, data: readyIntegrationStatus }
                : {
                    ok: false,
                    error: {
                      code: "ACTOR_CLAIM_REQUIRED",
                      message: "Waiting for a trusted Agent identity.",
                    },
                  },
            ),
            {
              status: 409,
              headers: { "Content-Type": "application/json" },
            },
          ),
      ),
    );

    render(<App />);

    await waitFor(() => {
      expect(document.documentElement.dataset.corestudioStableBoardId).toBe(
        "stable-board-id",
      );
      expect(document.documentElement.dataset.corestudioPageNonce).toEqual(
        expect.any(String),
      );
    });
    expect(
      screen.getByRole("heading", { name: "画布正在等待连接 Agent" }),
    ).toBeInTheDocument();
    expect(screen.getByText("即将连接的项目")).toBeInTheDocument();
    expect(screen.getByText("平面设计助手")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "返回选择项目" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "当前状态" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "CoreStudio 和项目已经就绪，但这个画布页面尚未连接到本地 Agent 对话，因此暂时无法进入画布。",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "你需要做什么" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "点击下方按钮复制连接指令，然后返回你希望使用这个画布的本地 Agent 对话，粘贴并发送。",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "完成后" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Agent 会连接这个画布。连接成功后，本页面将自动进入可编辑画布，无需刷新或重新打开。",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制连接指令" })).toBeEnabled();
    expect(
      screen.queryByRole("status", { name: "正在连接当前项目…" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Waiting for a trusted Agent identity."),
    ).not.toBeInTheDocument();
  });

  it("guides the user to CoreStudio settings when the Codex integration is outdated", async () => {
    window.history.pushState(null, "", "/board/stable-board-id");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              ok: true,
              data: {
                ...readyIntegrationStatus,
                state: "repair-required",
                issues: [
                  {
                    code: "CODEX_INTEGRATION_OUTDATED",
                    message: "当前 Codex 集成与 CoreStudio 版本不匹配。",
                  },
                ],
              },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
      ),
    );

    render(<App />);

    expect(
      await screen.findByRole("heading", {
        name: "请在 CoreStudio 中更新集成",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "回到 CoreStudio，打开“应用设置”中的“Codex 集成”，完成更新后再返回这个页面。",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "当前状态" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "你需要做什么" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "我已更新，重新检查" }),
    ).toBeEnabled();
    expect(
      screen.getByText("更新完成后无需重新复制画布地址。"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "更新 Codex 集成" }),
    ).not.toBeInTheDocument();
  });

  it("explains how to recover when a previous room ticket is invalid after restart", async () => {
    class ExpiredRoomWebSocket {
      static readonly OPEN = 1;
      readonly readyState = ExpiredRoomWebSocket.OPEN;
      private readonly listeners = new Map<
        string,
        Array<(event: { data?: string }) => void>
      >();

      constructor() {
        queueMicrotask(() => {
          this.emit("message", {
            data: JSON.stringify({
              type: "room.error",
              error: {
                code: "AUTH_REQUIRED",
                message: "A valid project room ticket is required.",
              },
            }),
          });
        });
      }

      addEventListener(
        type: string,
        listener: (event: { data?: string }) => void,
      ) {
        const listeners = this.listeners.get(type) ?? [];
        listeners.push(listener);
        this.listeners.set(type, listeners);
      }

      send() {}
      close() {}

      private emit(type: string, event: { data?: string }) {
        for (const listener of this.listeners.get(type) ?? []) {
          listener(event);
        }
      }
    }

    window.history.pushState(null, "", "/board?resumeToken=expired-token");
    vi.stubGlobal("WebSocket", ExpiredRoomWebSocket);

    render(<App />);

    expect(
      await screen.findByRole("heading", {
        name: "这个内置画布连接已失效",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "CoreStudio 重新启动或切换项目后，之前的画布链接不能继续使用。请回到当前本地 Agent 对话，重新打开 CoreStudio Agent Board。",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("A valid project room ticket is required."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "选择项目开始" }),
    ).not.toBeInTheDocument();
  });

  it("hydrates CLI image updates live and preserves the board viewport", async () => {
    const project = createMockProjectBundle({
      projectPath: "/tmp/live-room-project",
    });
    const identity = {
      projectId: "project-live",
      canonicalProjectPath: project.projectPath,
      roomId: "room-live",
      sessionEpoch: 1,
    };
    let activeRoomSocket: LiveRoomWebSocket | null = null;
    class LiveRoomWebSocket {
      static readonly OPEN = 1;
      readonly readyState = LiveRoomWebSocket.OPEN;
      private readonly listeners = new Map<
        string,
        Array<(event: { data?: string }) => void>
      >();

      constructor() {
        activeRoomSocket = this;
        queueMicrotask(() => {
          this.emit({
            type: "room.joined",
            sessionId: "board-session",
            resumeToken: "resume-token",
            snapshot: {
              type: "room.snapshot",
              identity,
              sequence: 0,
              persistedSequence: 0,
              projectRevision: "revision-1",
              scene: {
                elements: [],
                sharedSceneConfig: {
                  scrollX: 0,
                  scrollY: 0,
                  zoom: { value: 1 },
                  viewBackgroundColor: "#fff",
                },
              },
              participants: [],
            },
            bootstrap: {
              projectPath: project.projectPath,
              project: project.project,
              imageRecords: {},
            },
          });
        });
      }

      addEventListener(
        type: string,
        listener: (event: { data?: string }) => void,
      ) {
        const listeners = this.listeners.get(type) ?? [];
        listeners.push(listener);
        this.listeners.set(type, listeners);
      }

      send() {}
      close() {}

      publish(event: unknown) {
        this.emit({ type: "room.event", event });
      }

      private emit(message: unknown) {
        for (const listener of this.listeners.get("message") ?? []) {
          listener({ data: JSON.stringify(message) });
        }
      }
    }
    const imageRecord = {
      fileId: "cli-image",
      assetPath: "assets/cli-image.png",
      sourceType: "generated" as const,
      generationOrigin: "agent-board" as const,
      width: 512,
      height: 512,
      createdAt: "2026-07-30T08:00:00.000Z",
      mimeType: "image/png",
    };
    const imageElement = newImageElement({
      type: "image",
      fileId: "cli-image" as FileId,
      status: "saved",
      scale: [1, 1],
      x: 400,
      y: 300,
      width: 512,
      height: 512,
    });
    window.history.pushState(null, "", "/board/stable-board-id");
    window.sessionStorage.setItem(
      "corestudio:stable-board:stable-board-id:page-nonce",
      "page-a",
    );
    window.localStorage.setItem(
      "corestudio:stable-board:stable-board-id:viewport",
      JSON.stringify({
        version: 1,
        scrollX: -320,
        scrollY: 180,
        zoom: { value: 1.4 },
      }),
    );
    const fetchMock = vi.fn(async (url: string | URL, _init?: RequestInit) => {
      const pathname = new URL(String(url)).pathname;
      const data =
        pathname === AGENT_HTTP_ROUTES.stableBoardIntegrationStatus
          ? readyIntegrationStatus
          : pathname === AGENT_HTTP_ROUTES.stableBoardSessionExchange
          ? {
              launchTicket: "launch-ticket",
              actorResumeToken: "actor-resume-token",
            }
          : pathname === AGENT_HTTP_ROUTES.roomAssets
          ? [
              {
                fileId: "cli-image",
                mimeType: "image/png",
                dataBase64: "aW1hZ2U=",
                width: 512,
                height: 512,
                createdAt: "2026-07-30T08:00:00.000Z",
                rendition: "preview",
              },
            ]
          : [];
      return new Response(JSON.stringify({ ok: true, data }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("WebSocket", LiveRoomWebSocket);

    render(<App />);

    expect(await screen.findByTestId("excalidraw-canvas")).toBeInTheDocument();
    await waitFor(() => {
      expect(mockExcalidrawAPI?.getAppState()).toEqual(
        expect.objectContaining({
          scrollX: -320,
          scrollY: 180,
          zoom: { value: 1.4 },
        }),
      );
    });
    act(() => {
      triggerExcalidrawScrollChange?.({
        scrollX: 0,
        scrollY: 0,
        zoom: { value: 1 },
      });
    });
    expect(
      JSON.parse(
        window.localStorage.getItem(
          "corestudio:stable-board:stable-board-id:viewport",
        ) ?? "null",
      ),
    ).toEqual({
      version: 1,
      scrollX: -320,
      scrollY: 180,
      zoom: { value: 1.4 },
    });
    triggerExcalidrawInitialize?.();
    expect(mockExcalidrawAPI?.getAppState()).toEqual(
      expect.objectContaining({
        scrollX: -320,
        scrollY: 180,
        zoom: { value: 1.4 },
      }),
    );
    expect(mockExcalidrawAPI?.updateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        appState: {
          scrollX: -320,
          scrollY: 180,
          zoom: { value: 1.4 },
        },
      }),
    );
    await waitFor(() => {
      expect(screen.queryByText("正在加载画板…")).not.toBeInTheDocument();
    });

    act(() => {
      triggerExcalidrawScrollChange?.({
        scrollX: -600,
        scrollY: 240,
        zoom: { value: 1.75 },
      });
      activeRoomSocket?.publish({
        type: "assets.updated",
        identity,
        imageRecords: { "cli-image": imageRecord },
      });
      activeRoomSocket?.publish({
        type: "scene.updated",
        identity,
        sequence: 1,
        originSessionId: "cli-session",
        originActorId: "codex:thread-live",
        operationId: "cli-write-1",
        baseSequence: 0,
        elements: [imageElement],
        sharedSceneConfig: {
          scrollX: 0,
          scrollY: 0,
          zoom: { value: 1 },
          viewBackgroundColor: "#f5f5f5",
        },
        acceptedElementIds: [imageElement.id],
        supersededElementIds: [],
      });
    });

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            new URL(String(url)).pathname === AGENT_HTTP_ROUTES.roomAssets &&
            String(init?.body).includes("cli-image"),
        ),
      ).toBe(true);
    });
    await waitFor(() => {
      expect(mockExcalidrawAPI?.replaceFiles).toHaveBeenCalledWith([
        expect.objectContaining({
          id: "cli-image",
          dataURL: "data:image/png;base64,aW1hZ2U=",
        }),
      ]);
    });

    await waitFor(() => {
      expect(mockExcalidrawAPI?.getAppState()).toEqual(
        expect.objectContaining({
          scrollX: -600,
          scrollY: 240,
          zoom: { value: 1.75 },
          viewBackgroundColor: "#f5f5f5",
        }),
      );
    });
    expect(
      JSON.parse(
        window.sessionStorage.getItem(
          "corestudio:stable-board:stable-board-id:page:page-a:viewport",
        ) ?? "null",
      ),
    ).toEqual({
      version: 1,
      scrollX: -600,
      scrollY: 240,
      zoom: { value: 1.75 },
    });
  });

  it("joins the room and asks for a browser refresh when Electron restarts", async () => {
    const project = createMockProjectBundle({
      projectPath: "/tmp/room-project",
      imageRecords: {
        "room-image": {
          fileId: "room-image",
          assetPath: "assets/room-image.png",
          sourceType: "generated",
          generationOrigin: "agent-board",
          prompt: "模块化设备外观方案",
          width: 640,
          height: 480,
          createdAt: "2026-07-24T08:00:00.000Z",
          mimeType: "image/png",
        },
      },
    });
    const roomImage = newImageElement({
      type: "image",
      fileId: "room-image" as FileId,
      status: "saved",
      scale: [1, 1],
      x: 0,
      y: 0,
      width: 640,
      height: 480,
    });
    const identity = {
      projectId: "project-1",
      canonicalProjectPath: project.projectPath,
      roomId: "room-1",
      sessionEpoch: 1,
    };
    const sentMessages: unknown[] = [];
    let socketCount = 0;
    let activeRoomSocket: FakeRoomWebSocket | null = null;
    class FakeRoomWebSocket {
      static readonly OPEN = 1;
      readonly readyState = FakeRoomWebSocket.OPEN;
      private readonly listeners = new Map<
        string,
        Array<(event: { data?: string }) => void>
      >();

      constructor(_url: string) {
        socketCount += 1;
        activeRoomSocket = this;
        queueMicrotask(() => {
          if (socketCount > 1) {
            this.emit("message", {
              data: JSON.stringify({
                type: "room.error",
                error: {
                  code: "AUTH_REQUIRED",
                  message: "A valid project room ticket is required.",
                },
              }),
            });
            return;
          }
          this.emit("message", {
            data: JSON.stringify({
              type: "room.joined",
              sessionId: "board-session",
              resumeToken: "resume-token",
              snapshot: {
                type: "room.snapshot",
                identity,
                sequence: 0,
                persistedSequence: 0,
                projectRevision: "revision-1",
                scene: {
                  elements: [roomImage],
                  sharedSceneConfig: {},
                },
                participants: [
                  {
                    actorId: "codex:thread-1",
                    sessionId: "board-session",
                    transport: "websocket",
                    role: "board-editor",
                    displayLabel: "工业设计探索",
                  },
                ],
              },
              bootstrap: {
                projectPath: project.projectPath,
                project: project.project,
                imageRecords: project.imageRecords,
              },
            }),
          });
        });
      }

      addEventListener(
        type: string,
        listener: (event: { data?: string }) => void,
      ) {
        const listeners = this.listeners.get(type) ?? [];
        listeners.push(listener);
        this.listeners.set(type, listeners);
      }

      send(data: string) {
        sentMessages.push(JSON.parse(data));
      }

      close() {}

      disconnectForRestart() {
        this.emit("close", {});
      }

      private emit(type: string, event: { data?: string }) {
        for (const listener of this.listeners.get(type) ?? []) {
          listener(event);
        }
      }
    }
    window.history.pushState(null, "", "/board/stable-board-id");
    const fetchMock = vi.fn(
      async (url: string | URL) =>
        new Response(
          JSON.stringify({
            ok: true,
            data:
              new URL(String(url)).pathname ===
              AGENT_HTTP_ROUTES.stableBoardIntegrationStatus
                ? readyIntegrationStatus
                : new URL(String(url)).pathname ===
                  AGENT_HTTP_ROUTES.stableBoardSessionExchange
                ? {
                    launchTicket: "launch-ticket",
                    actorResumeToken: "actor-resume-token",
                  }
                : [],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("WebSocket", FakeRoomWebSocket);

    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );

    expect(await screen.findByTestId("excalidraw-canvas")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "图片资产" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "图片资产" }));
    expect(await screen.findByText("模块化设备外观方案")).toBeInTheDocument();
    expect(screen.getByTestId("excalidraw-canvas")).toHaveAttribute(
      "data-has-custom-selected-shape-actions",
      "true",
    );
    await waitFor(() => {
      expect(
        new URL(window.location.href).searchParams.has("resumeToken"),
      ).toBe(false);
    });
    expect(
      fetchMock.mock.calls.map(([url]) => new URL(String(url)).pathname),
    ).toEqual(
      expect.not.arrayContaining([
        AGENT_HTTP_ROUTES.status,
        AGENT_HTTP_ROUTES.desktopBridge,
      ]),
    );
    expect(sentMessages).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "scene.operation",
        }),
      ]),
    );
    expect(socketCount).toBe(1);

    triggerExcalidrawInitialize?.();

    await waitFor(() => {
      expect(mockExcalidrawAPI?.getAppState().collaborators).toEqual(
        new Map([
          [
            "board-session",
            expect.objectContaining({
              id: "codex:thread-1",
              socketId: "board-session",
              username: "Codex · 工业设计探索",
            }),
          ],
        ]),
      );
    });

    act(() => {
      activeRoomSocket?.disconnectForRestart();
    });

    expect(
      await screen.findByRole("alert", { name: "画板连接已断开" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("CoreStudio 重启后，请刷新当前页面恢复画板。"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("重新启动后会自动恢复这个画布"),
    ).not.toBeInTheDocument();
  });
});
