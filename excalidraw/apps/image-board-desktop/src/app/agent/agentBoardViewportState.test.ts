import { describe, expect, it } from "vitest";
import type { AppState } from "@excalidraw/excalidraw/types";

import {
  mergeAgentBoardAuthoritativeAppState,
  mergeAgentBoardInitialAppState,
  readAgentBoardViewportState,
  writeAgentBoardViewportState,
} from "./agentBoardViewportState";

const createStorage = () => {
  const entries = new Map<string, string>();
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
  };
};

const zoom = (value: number) => ({ value } as AppState["zoom"]);

describe("agentBoardViewportState", () => {
  it("persists the viewport for the current page with a durable fallback", () => {
    writeAgentBoardViewportState(
      "board-a",
      {
        scrollX: -480,
        scrollY: 260,
        zoom: zoom(1.6),
      },
      { pageNonce: "page-a" },
    );

    expect(
      JSON.parse(
        window.localStorage.getItem(
          "corestudio:stable-board:board-a:viewport",
        ) ?? "null",
      ),
    ).toEqual({
      version: 1,
      scrollX: -480,
      scrollY: 260,
      zoom: { value: 1.6 },
    });
    expect(
      JSON.parse(
        window.sessionStorage.getItem(
          "corestudio:stable-board:board-a:page:page-a:viewport",
        ) ?? "null",
      ),
    ).toEqual({
      version: 1,
      scrollX: -480,
      scrollY: 260,
      zoom: { value: 1.6 },
    });
    expect(
      readAgentBoardViewportState("board-a", { pageNonce: "page-a" }),
    ).toEqual({
      scrollX: -480,
      scrollY: 260,
      zoom: { value: 1.6 },
    });
  });

  it("prefers the current page viewport over another page's durable fallback", () => {
    const sessionStorage = createStorage();
    const persistentStorage = createStorage();

    writeAgentBoardViewportState(
      "board-a",
      {
        scrollX: -320,
        scrollY: 180,
        zoom: zoom(1.4),
      },
      { pageNonce: "page-a", sessionStorage, persistentStorage },
    );
    writeAgentBoardViewportState(
      "board-a",
      {
        scrollX: -700,
        scrollY: 360,
        zoom: zoom(1.8),
      },
      { pageNonce: "page-b", sessionStorage, persistentStorage },
    );

    expect(
      readAgentBoardViewportState("board-a", {
        pageNonce: "page-a",
        sessionStorage,
        persistentStorage,
      }),
    ).toEqual({ scrollX: -320, scrollY: 180, zoom: { value: 1.4 } });
    expect(
      readAgentBoardViewportState("board-a", {
        pageNonce: "page-b",
        sessionStorage,
        persistentStorage,
      }),
    ).toEqual({ scrollX: -700, scrollY: 360, zoom: { value: 1.8 } });
  });

  it("falls back to the durable viewport when the page session was recreated", () => {
    const persistentStorage = createStorage();
    writeAgentBoardViewportState(
      "board-a",
      { scrollX: -320, scrollY: 180, zoom: zoom(1.4) },
      { pageNonce: "old-page", persistentStorage },
    );

    expect(
      readAgentBoardViewportState("board-a", {
        pageNonce: "new-page",
        sessionStorage: createStorage(),
        persistentStorage,
      }),
    ).toEqual({ scrollX: -320, scrollY: 180, zoom: { value: 1.4 } });
  });

  it("still reads the durable fallback when page storage is unavailable", () => {
    const persistentStorage = createStorage();
    writeAgentBoardViewportState(
      "board-a",
      { scrollX: -320, scrollY: 180, zoom: zoom(1.4) },
      { persistentStorage },
    );

    expect(
      readAgentBoardViewportState("board-a", {
        pageNonce: "page-a",
        sessionStorage: {
          getItem: () => {
            throw new Error("session storage disabled");
          },
        },
        persistentStorage,
      }),
    ).toEqual({ scrollX: -320, scrollY: 180, zoom: { value: 1.4 } });
  });

  it("ignores malformed or unsafe stored values", () => {
    const storage = createStorage();
    storage.setItem(
      "corestudio:stable-board:board-a:viewport",
      JSON.stringify({
        version: 1,
        scrollX: "wrong",
        scrollY: 0,
        zoom: { value: Number.POSITIVE_INFINITY },
      }),
    );

    expect(
      readAgentBoardViewportState("board-a", {
        persistentStorage: storage,
      }),
    ).toBeNull();
  });

  it("restores the saved viewport over the room scene configuration", () => {
    expect(
      mergeAgentBoardInitialAppState(
        {
          viewBackgroundColor: "#f5f5f5",
          scrollX: 0,
          scrollY: 0,
          zoom: { value: 1 },
        },
        {
          scrollX: -320,
          scrollY: 180,
          zoom: zoom(1.4),
        },
      ),
    ).toEqual({
      viewBackgroundColor: "#f5f5f5",
      scrollX: -320,
      scrollY: 180,
      zoom: { value: 1.4 },
    });
  });

  it("does not let an authoritative room update move the local viewport", () => {
    expect(
      mergeAgentBoardAuthoritativeAppState(
        {
          scrollX: -320,
          scrollY: 180,
          zoom: zoom(1.4),
          viewBackgroundColor: "#fff",
        } as AppState,
        {
          scrollX: 0,
          scrollY: 0,
          zoom: { value: 1 },
          viewBackgroundColor: "#f5f5f5",
        },
      ),
    ).toEqual({
      scrollX: -320,
      scrollY: 180,
      zoom: { value: 1.4 },
      viewBackgroundColor: "#f5f5f5",
    });
  });
});
