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
  it("stores and restores the viewport independently for each stable board", () => {
    const storage = createStorage();

    writeAgentBoardViewportState(
      "board-a",
      {
        scrollX: -320,
        scrollY: 180,
        zoom: zoom(1.4),
      },
      storage,
    );

    expect(readAgentBoardViewportState("board-a", storage)).toEqual({
      scrollX: -320,
      scrollY: 180,
      zoom: { value: 1.4 },
    });
    expect(readAgentBoardViewportState("board-b", storage)).toBeNull();
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

    expect(readAgentBoardViewportState("board-a", storage)).toBeNull();
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
