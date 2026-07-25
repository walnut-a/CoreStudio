import { describe, expect, it, vi } from "vitest";

import {
  buildAgentBrowserBridgeConfig,
  buildAgentBrowserRouteState,
  maybeCreateAgentBrowserDesktopBridge,
} from "./agentBrowserBridge";
import { setAgentBrowserRoomResumeToken } from "./agentBrowserRoomCredentials";

describe("buildAgentBrowserRouteState", () => {
  it("marks the legacy project-token Board route as expired", () => {
    expect(
      buildAgentBrowserRouteState({
        pathname: "/agent-board",
        href: "http://127.0.0.1:5174/agent-board?projectToken=project-token",
      }),
    ).toEqual({
      isAgentBrowserRoute: true,
      legacyUrlExpired: true,
    });
  });

  it("does not parse project tokens outside the Agent Board route", () => {
    expect(
      buildAgentBrowserRouteState({
        pathname: "/",
        href: "http://127.0.0.1:5174/?projectToken=project-token",
      }),
    ).toEqual({
      isAgentBrowserRoute: false,
    });
  });

  it("detects a stable project Agent Board route", () => {
    expect(
      buildAgentBrowserRouteState({
        pathname: "/agent-board/stable-board-id",
        href: "http://127.0.0.1:60909/agent-board/stable-board-id",
      }),
    ).toEqual({
      isAgentBrowserRoute: true,
      stableBoardId: "stable-board-id",
    });
  });

  it("marks token-bearing legacy Board URLs as expired", () => {
    expect(
      buildAgentBrowserRouteState({
        pathname: "/agent-board",
        href: "http://127.0.0.1:60909/agent-board?resumeToken=old-token",
      }),
    ).toEqual({
      isAgentBrowserRoute: true,
      legacyUrlExpired: true,
    });
  });
});

describe("buildAgentBrowserBridgeConfig", () => {
  it("does not create a bridge for a legacy project-token URL", () => {
    expect(
      buildAgentBrowserBridgeConfig({
        pathname: "/agent-board",
        href: "http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909%2F%2F&projectToken=project-token",
      }),
    ).toBeNull();
  });

  it("does not create a bridge config outside the Agent Board route", () => {
    expect(
      buildAgentBrowserBridgeConfig({
        pathname: "/",
        href: "http://127.0.0.1:5174/?bridge=http%3A%2F%2F127.0.0.1%3A60909&projectToken=project-token",
      }),
    ).toBeNull();
  });

  it("uses the page origin for a packaged stable project route", () => {
    expect(
      buildAgentBrowserBridgeConfig({
        pathname: "/agent-board/stable-board-id",
        href: "http://127.0.0.1:60909/agent-board/stable-board-id",
      }),
    ).toEqual({
      bridge: "http://127.0.0.1:60909",
      stableBoardId: "stable-board-id",
    });
  });

  it("requires the local bridge query parameter", () => {
    expect(
      buildAgentBrowserBridgeConfig({
        pathname: "/agent-board",
        href: "http://127.0.0.1:5174/agent-board?projectToken=project-token",
      }),
    ).toBeNull();
  });

  it("rejects a project-selection URL polluted with a legacy project token", () => {
    expect(
      buildAgentBrowserBridgeConfig({
        pathname: "/agent-board",
        href: "http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909&projectSelectionToken=selection-token&projectToken=legacy-token",
      }),
    ).toBeNull();
  });
});

describe("room-scoped Agent Browser assets", () => {
  it("loads recent projects through the scoped selection route", async () => {
    window.history.pushState(
      null,
      "",
      "/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909&projectSelectionToken=selection-token",
    );
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ ok: true, data: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const bridge = maybeCreateAgentBrowserDesktopBridge();

    await bridge?.loadRecentProjects();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:60909/v1/board/projects",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer selection-token",
        }),
      }),
    );
  });

  it("persists assets through the room route without a project token", async () => {
    window.history.pushState(
      null,
      "",
      "/agent-board/stable-board-id?bridge=http%3A%2F%2F127.0.0.1%3A60909",
    );
    setAgentBrowserRoomResumeToken("resume-token");
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ ok: true, data: {} }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const bridge = maybeCreateAgentBrowserDesktopBridge();

    await bridge?.persistImageAssets({
      projectPath: "/projects/project-1",
      files: [
        {
          fileId: "image-1",
          mimeType: "image/png",
          dataBase64: "cG5n",
          width: 40,
          height: 20,
          createdAt: "2026-07-23T08:00:00.000Z",
          sourceType: "imported",
        },
      ],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:60909/v1/room/assets/persist",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer resume-token",
        }),
      }),
    );
    setAgentBrowserRoomResumeToken(null);
  });
});
