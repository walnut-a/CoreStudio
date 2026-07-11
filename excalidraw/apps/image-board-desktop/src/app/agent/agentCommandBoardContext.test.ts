import { describe, expect, it } from "vitest";

import type { AppState } from "@excalidraw/excalidraw/types";

import {
  buildSceneWithSelectedElementIds,
  getAgentBoardSelectedElementIds,
  getPlacementViewportFromAgentBoardContext,
  parseAgentBoardCommandContext,
} from "./agentCommandBoardContext";
import type { AgentCommandSceneSnapshot } from "./agentCommandRuntimeTypes";

describe("agentCommandBoardContext", () => {
  it("parses only Agent Board command context payloads", () => {
    const context = {
      browserRuntime: { source: "agent-board" },
      scene: {
        selectedElementIds: ["element-1"],
      },
    };

    expect(
      parseAgentBoardCommandContext({ agentBoardContext: context }),
    ).toBe(context);
    expect(
      parseAgentBoardCommandContext({
        agentBoardContext: { browserRuntime: { source: "desktop" } },
      }),
    ).toBeNull();
    expect(parseAgentBoardCommandContext({})).toBeNull();
  });

  it("deduplicates selected element ids from Agent Board context", () => {
    expect(
      getAgentBoardSelectedElementIds({
        browserRuntime: { source: "agent-board" },
        scene: {
          selectedElementIds: ["element-1", "", "element-2", "element-1"],
        },
      } as never),
    ).toEqual(["element-1", "element-2"]);
  });

  it("converts Agent Board viewport into placement viewport", () => {
    expect(
      getPlacementViewportFromAgentBoardContext({
        browserRuntime: { source: "agent-board" },
        scene: {
          viewport: {
            width: 1200,
            height: 800,
            zoom: 2,
            scrollX: -50,
            scrollY: -100,
          },
        },
      } as never),
    ).toEqual({
      viewportCenter: {
        x: 350,
        y: 300,
      },
      viewportSize: {
        width: 1200,
        height: 800,
      },
      zoomValue: 2,
    });
  });

  it("builds a scene snapshot with selected element ids", () => {
    const scene: AgentCommandSceneSnapshot = {
      elements: [],
      files: {},
      appState: ({
        selectedElementIds: {},
        selectedGroupIds: { group: true },
        viewBackgroundColor: "#ffffff",
      } as unknown) as AppState,
    };

    expect(buildSceneWithSelectedElementIds(scene, ["element-1"])).toMatchObject(
      {
        appState: {
          selectedElementIds: {
            "element-1": true,
          },
          selectedGroupIds: {},
          viewBackgroundColor: "#ffffff",
        },
      },
    );
    expect(buildSceneWithSelectedElementIds(scene, [])).toBeNull();
  });
});
