import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";

import { AGENT_HTTP_ROUTES } from "../shared/agentBridgeTypes";
import {
  App,
  createMockProjectBundle,
  render,
  screen,
  waitFor,
} from "./App.testSupport";

describe("App Agent Board room route", () => {
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

  it("joins the room without starting the retired Agent Board bridge", async () => {
    const project = createMockProjectBundle({
      projectPath: "/tmp/room-project",
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
                  elements: [],
                  sharedSceneConfig: {},
                },
                participants: [],
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
  });
});
