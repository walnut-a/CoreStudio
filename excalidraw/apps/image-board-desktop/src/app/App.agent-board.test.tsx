import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";

import { AGENT_HTTP_ROUTES } from "../shared/agentBridgeTypes";
import {
  App,
  createMockProjectBundle,
  fireEvent,
  mockExcalidrawAPI,
  newImageElement,
  render,
  screen,
  triggerExcalidrawInitialize,
  waitFor,
} from "./App.testSupport";
import type { FileId } from "./App.testSupport";

describe("App Agent Board room route", () => {
  it("shows recent project candidates when opened without an active project", async () => {
    window.history.pushState(
      null,
      "",
      "/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909&projectSelectionToken=selection-token",
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
  });

  it("shows a room connection state instead of the project picker while joining", () => {
    class PendingRoomWebSocket {
      static readonly OPEN = 1;
      readonly readyState = 0;
      addEventListener() {}
      send() {}
      close() {}
    }
    window.history.pushState(
      null,
      "",
      "/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909&launchTicket=launch-ticket",
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

    window.history.pushState(
      null,
      "",
      "/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909&resumeToken=expired-token",
    );
    vi.stubGlobal("WebSocket", ExpiredRoomWebSocket);

    render(<App />);

    expect(
      await screen.findByRole("heading", {
        name: "这个内置画布连接已失效",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "CoreStudio 重新启动或切换项目后，之前的画布链接不能继续使用。请回到当前 Codex 对话，重新打开 CoreStudio 内置画布。",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("A valid project room ticket is required."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "选择项目开始" }),
    ).not.toBeInTheDocument();
  });

  it("joins the room without starting the retired Agent Board bridge", async () => {
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
    class FakeRoomWebSocket {
      static readonly OPEN = 1;
      readonly readyState = FakeRoomWebSocket.OPEN;
      private readonly listeners = new Map<
        string,
        Array<(event: { data?: string }) => void>
      >();

      constructor(_url: string) {
        socketCount += 1;
        queueMicrotask(() => {
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

      private emit(type: string, event: { data?: string }) {
        for (const listener of this.listeners.get(type) ?? []) {
          listener(event);
        }
      }
    }
    window.history.pushState(
      null,
      "",
      "/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909&launchTicket=launch-ticket",
    );
    const fetchMock = vi.fn(
      async (_url: string | URL) =>
        new Response(JSON.stringify({ ok: true, data: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
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
        new URL(window.location.href).searchParams.get("resumeToken"),
      ).toBe("resume-token");
    });
    expect(
      fetchMock.mock.calls.map(([url]) => new URL(String(url)).pathname),
    ).toEqual(
      expect.not.arrayContaining([
        AGENT_HTTP_ROUTES.status,
        AGENT_HTTP_ROUTES.browserState,
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
              username: "工业设计探索",
            }),
          ],
        ]),
      );
    });
  });
});
