import { describe, expect, it, vi } from "vitest";

import {
  buildAgentBrowserBridgeConfig,
  buildAgentBrowserRouteState,
  maybeCreateAgentBrowserDesktopBridge,
} from "./agentBrowserBridge";

describe("buildAgentBrowserRouteState", () => {
  it("detects the Agent Board route without reading legacy project tokens", () => {
    expect(
      buildAgentBrowserRouteState({
        pathname: "/agent-board",
        href: "http://127.0.0.1:5174/agent-board?projectToken=project-token",
      }),
    ).toEqual({
      isAgentBrowserRoute: true,
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
});

describe("buildAgentBrowserBridgeConfig", () => {
  it("normalizes the Agent Bridge URL and ignores project tokens", () => {
    expect(
      buildAgentBrowserBridgeConfig({
        pathname: "/agent-board",
        href: "http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909%2F%2F&projectToken=project-token",
      }),
    ).toEqual({
      bridge: "http://127.0.0.1:60909",
    });
  });

  it("does not create a bridge config outside the Agent Board route", () => {
    expect(
      buildAgentBrowserBridgeConfig({
        pathname: "/",
        href: "http://127.0.0.1:5174/?bridge=http%3A%2F%2F127.0.0.1%3A60909&projectToken=project-token",
      }),
    ).toBeNull();
  });

  it("requires the local bridge query parameter", () => {
    expect(
      buildAgentBrowserBridgeConfig({
        pathname: "/agent-board",
        href: "http://127.0.0.1:5174/agent-board?projectToken=project-token",
      }),
    ).toBeNull();
  });

  it("keeps the scoped project selection token separate from project tokens", () => {
    expect(
      buildAgentBrowserBridgeConfig({
        pathname: "/agent-board",
        href: "http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909&projectSelectionToken=selection-token&projectToken=legacy-token",
      }),
    ).toEqual({
      bridge: "http://127.0.0.1:60909",
      projectSelectionToken: "selection-token",
    });
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
      "/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909&resumeToken=resume-token",
    );
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
  });
});
