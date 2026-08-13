import { describe, expect, it, vi } from "vitest";

import {
  buildAgentBrowserBridgeConfig,
  buildAgentBrowserRouteState,
  maybeCreateAgentBrowserDesktopBridge,
} from "./agentBrowserBridge";
import {
  setAgentBrowserRoomResumeToken,
  setStableBoardActorResumeToken,
} from "./agentBrowserRoomCredentials";

describe("buildAgentBrowserRouteState", () => {
  it("does not recognize the removed Agent Board route", () => {
    expect(
      buildAgentBrowserRouteState({
        pathname: "/agent-board",
        href: "http://127.0.0.1:5174/agent-board?projectToken=project-token",
      }),
    ).toEqual({
      isAgentBrowserRoute: false,
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
        pathname: "/board/stable-board-id",
        href: "http://127.0.0.1:60909/board/stable-board-id",
      }),
    ).toEqual({
      isAgentBrowserRoute: true,
      stableBoardId: "stable-board-id",
    });
  });

  it("marks token-bearing Board URLs as invalid", () => {
    expect(
      buildAgentBrowserRouteState({
        pathname: "/board",
        href: "http://127.0.0.1:60909/board?resumeToken=old-token",
      }),
    ).toEqual({
      isAgentBrowserRoute: true,
      invalidAddress: true,
    });
  });

  it("recognizes project selection only on the exact Board route", () => {
    expect(
      buildAgentBrowserRouteState({
        pathname: "/board",
        href: "http://127.0.0.1:60909/board?projectSelectionToken=selection-token",
      }),
    ).toEqual({
      isAgentBrowserRoute: true,
      projectSelectionToken: "selection-token",
    });
    expect(
      buildAgentBrowserRouteState({
        pathname: "/board/stable-board-id",
        href: "http://127.0.0.1:60909/board/stable-board-id?projectSelectionToken=selection-token",
      }),
    ).toEqual({
      isAgentBrowserRoute: true,
      stableBoardId: "stable-board-id",
      invalidAddress: true,
    });
  });

  it("rejects empty, polluted and malformed Board addresses without throwing", () => {
    expect(
      buildAgentBrowserRouteState({
        pathname: "/board/",
        href: "http://127.0.0.1:60909/board/",
      }),
    ).toEqual({
      isAgentBrowserRoute: false,
    });
    expect(
      buildAgentBrowserRouteState({
        pathname: "/board",
        href: "http://127.0.0.1:60909/board?projectSelectionToken=selection-token&unexpected=value",
      }),
    ).toEqual({
      isAgentBrowserRoute: true,
      invalidAddress: true,
    });
    expect(
      buildAgentBrowserRouteState({
        pathname: "/board/%E0%A4%A",
        href: "http://127.0.0.1:60909/board/%E0%A4%A",
      }),
    ).toEqual({
      isAgentBrowserRoute: true,
      invalidAddress: true,
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

  it("uses the page origin for a stable project route", () => {
    expect(
      buildAgentBrowserBridgeConfig({
        pathname: "/board/stable-board-id",
        href: "http://127.0.0.1:60909/board/stable-board-id",
      }),
    ).toEqual({
      bridge: "http://127.0.0.1:60909",
      stableBoardId: "stable-board-id",
    });
  });

  it("uses the page origin for the project-selection route", () => {
    expect(
      buildAgentBrowserBridgeConfig({
        pathname: "/board",
        href: "http://127.0.0.1:60909/board?projectSelectionToken=selection-token",
      }),
    ).toEqual({
      bridge: "http://127.0.0.1:60909",
      projectSelectionToken: "selection-token",
    });
  });

  it("rejects a removed Bridge query even on the canonical route", () => {
    expect(
      buildAgentBrowserBridgeConfig({
        pathname: "/board/stable-board-id",
        href: "http://127.0.0.1:60909/board/stable-board-id?bridge=http%3A%2F%2F127.0.0.1%3A5174",
      }),
    ).toBeNull();
  });

  it("rejects a project-selection token on a stable project route", () => {
    expect(
      buildAgentBrowserBridgeConfig({
        pathname: "/board/stable-board-id",
        href: "http://127.0.0.1:60909/board/stable-board-id?projectSelectionToken=selection-token",
      }),
    ).toBeNull();
  });

  it("rejects a project-selection URL polluted with a legacy project token", () => {
    expect(
      buildAgentBrowserBridgeConfig({
        pathname: "/board",
        href: "http://127.0.0.1:60909/board?projectSelectionToken=selection-token&projectToken=legacy-token",
      }),
    ).toBeNull();
  });
});

describe("room-scoped Agent Browser assets", () => {
  it("does not advertise unavailable system clipboard reading", () => {
    window.history.pushState(null, "", "/board/stable-board-id");

    const bridge = maybeCreateAgentBrowserDesktopBridge();

    expect(bridge?.readClipboardImage).toBeUndefined();
  });

  it("loads recent projects through the scoped selection route", async () => {
    window.history.pushState(
      null,
      "",
      "/board?projectSelectionToken=selection-token",
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
      `${window.location.origin}/v1/board/projects`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer selection-token",
        }),
      }),
    );
  });

  it("opens a scoped project-selection route from a stable Board", async () => {
    window.history.pushState(null, "", "/board/stable-board-id");
    setStableBoardActorResumeToken("stable-board-id", "actor-resume-token");
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              boardUrl: `${window.location.origin}/board`,
              selectionToken: "selection-token",
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const bridge = maybeCreateAgentBrowserDesktopBridge();

    await bridge?.switchAgentBoardProject?.();

    expect(fetchMock).toHaveBeenCalledWith(
      `${window.location.origin}/v1/board/projects/session`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer actor-resume-token",
        }),
        body: expect.stringContaining('"stableBoardId":"stable-board-id"'),
      }),
    );
    expect(window.location.href).toBe(
      `${window.location.origin}/board?projectSelectionToken=selection-token`,
    );
    consoleError.mockRestore();
  });

  it("persists assets through the room route without a project token", async () => {
    window.history.pushState(null, "", "/board/stable-board-id");
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
      `${window.location.origin}/v1/room/assets/persist`,
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
