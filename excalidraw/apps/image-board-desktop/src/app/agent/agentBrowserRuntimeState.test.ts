import { describe, expect, it } from "vitest";

import {
  buildAgentBrowserRuntimePublishPlan,
  buildAgentBrowserRuntimeState,
  buildAgentBrowserRuntimeViewport,
  getRuntimeSelectedElementIds,
} from "./agentBrowserRuntimeState";

describe("getRuntimeSelectedElementIds", () => {
  it("keeps selected element ids and drops false selections", () => {
    expect(
      getRuntimeSelectedElementIds({
        selectedElementIds: {
          "image-1": true,
          "shape-1": false,
          "text-1": true,
        },
      }),
    ).toEqual(["image-1", "text-1"]);
  });

  it("returns an empty list when selection state is missing", () => {
    expect(getRuntimeSelectedElementIds({ selectedElementIds: undefined })).toEqual([]);
  });
});

describe("buildAgentBrowserRuntimeViewport", () => {
  it("maps Excalidraw app state viewport fields into Agent Board runtime state", () => {
    expect(
      buildAgentBrowserRuntimeViewport({
        scrollX: -120,
        scrollY: 240,
        zoom: { value: 1.25 },
        width: 1440,
        height: 900,
      }),
    ).toEqual({
      scrollX: -120,
      scrollY: 240,
      zoom: 1.25,
      width: 1440,
      height: 900,
    });
  });

  it("leaves zoom undefined when Excalidraw has no zoom object", () => {
    expect(
      buildAgentBrowserRuntimeViewport({
        scrollX: 0,
        scrollY: 0,
        zoom: undefined,
        width: 800,
        height: 600,
      }),
    ).toEqual({
      scrollX: 0,
      scrollY: 0,
      zoom: undefined,
      width: 800,
      height: 600,
    });
  });
});

describe("buildAgentBrowserRuntimeState", () => {
  it("builds the Agent Board runtime payload from project, selection, scene and generation state", () => {
    expect(
      buildAgentBrowserRuntimeState({
        projectPath: "/Users/example/CoreStudio/工业设计助手",
        updatedAt: "2026-07-03T08:00:00.000Z",
        selection: {
          items: [{ id: "image-1", kind: "image" }],
        },
        appState: {
          selectedElementIds: {
            "image-1": true,
            "shape-1": false,
          },
          scrollX: -20,
          scrollY: 40,
          zoom: { value: 2 },
          width: 1280,
          height: 720,
        },
        generationSource: "agent",
      }),
    ).toEqual({
      source: "agent-board",
      projectPath: "/Users/example/CoreStudio/工业设计助手",
      updatedAt: "2026-07-03T08:00:00.000Z",
      selection: {
        items: [{ id: "image-1", kind: "image" }],
      },
      scene: {
        selectedElementIds: ["image-1"],
        viewport: {
          scrollX: -20,
          scrollY: 40,
          zoom: 2,
          width: 1280,
          height: 720,
        },
      },
      generation: {
        source: "agent",
      },
    });
  });
});

describe("buildAgentBrowserRuntimePublishPlan", () => {
  it("builds a publish plan for the Agent Board route with an active project", () => {
    expect(
      buildAgentBrowserRuntimePublishPlan({
        enabled: true,
        projectPath: "/Users/example/CoreStudio/工业设计助手",
        updatedAt: "2026-07-04T06:00:00.000Z",
        selection: {
          selected: true,
          reference: {
            items: [{ id: "image-1", kind: "image" }],
          },
        },
        appState: {
          selectedElementIds: {
            "image-1": true,
          },
          scrollX: 12,
          scrollY: -24,
          zoom: { value: 0.8 },
          width: 1024,
          height: 768,
        },
        generationSource: "builtin",
      }),
    ).toEqual({
      action: "publish",
      state: {
        source: "agent-board",
        projectPath: "/Users/example/CoreStudio/工业设计助手",
        updatedAt: "2026-07-04T06:00:00.000Z",
        selection: {
          selected: true,
          reference: {
            items: [{ id: "image-1", kind: "image" }],
          },
        },
        scene: {
          selectedElementIds: ["image-1"],
          viewport: {
            scrollX: 12,
            scrollY: -24,
            zoom: 0.8,
            width: 1024,
            height: 768,
          },
        },
        generation: {
          source: "builtin",
        },
      },
    });
  });

  it("skips publishing outside the Agent Board route or without an active project", () => {
    const baseInput = {
      updatedAt: "2026-07-04T06:00:00.000Z",
      selection: { selected: false },
      appState: {},
      generationSource: "agent" as const,
    };

    expect(
      buildAgentBrowserRuntimePublishPlan({
        ...baseInput,
        enabled: false,
        projectPath: "/Users/example/CoreStudio/工业设计助手",
      }),
    ).toEqual({ action: "skip" });

    expect(
      buildAgentBrowserRuntimePublishPlan({
        ...baseInput,
        enabled: true,
        projectPath: null,
      }),
    ).toEqual({ action: "skip" });
  });
});
