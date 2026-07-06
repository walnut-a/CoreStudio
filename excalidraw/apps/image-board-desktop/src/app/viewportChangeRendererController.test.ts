import { describe, expect, it, vi } from "vitest";

import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/element/types";

import { createViewportChangeRendererActions } from "./viewportChangeRendererController";
import type { ImageRenditionSceneSnapshot } from "./imageRenditionLoadPlan";

const createScene = (
  overrides: Partial<ImageRenditionSceneSnapshot> = {},
): ImageRenditionSceneSnapshot => ({
  elements: [{ id: "element-a" } as ExcalidrawElement],
  appState: {
    scrollX: 0,
    scrollY: 0,
    zoom: { value: 1 },
  } as AppState,
  files: {} as BinaryFiles,
  ...overrides,
});

describe("createViewportChangeRendererActions", () => {
  it("updates latest scene and runs viewport side effects with the same snapshot", () => {
    const scene = createScene();
    const activeElements = [{ id: "active-element" } as ExcalidrawElement];
    const activeFiles = { "file-a": { id: "file-a" } } as unknown as BinaryFiles;
    const setLatestScene = vi.fn();
    const scheduleVisibleImageRenditionLoad = vi.fn();
    const scheduleAgentBrowserRuntimeStatePublish = vi.fn();
    const updateWorkspaceOverlay = vi.fn();
    const zoom = { value: 1.5 } as AppState["zoom"];

    const actions = createViewportChangeRendererActions({
      getScene: () => scene,
      getSceneReader: () => ({
        getSceneElementsIncludingDeleted: () => activeElements,
        getAppState: () => ({ width: 1200 } as Partial<AppState>),
        getFiles: () => activeFiles,
      }),
      setLatestScene,
      scheduleVisibleImageRenditionLoad,
      scheduleAgentBrowserRuntimeStatePublish,
      updateWorkspaceOverlay,
    });

    expect(actions.changeViewport(12, 24, zoom)).toEqual({
      status: "updated",
    });

    const nextScene = setLatestScene.mock.calls[0]?.[0];
    expect(nextScene).toEqual({
      elements: activeElements,
      appState: expect.objectContaining({
        width: 1200,
        scrollX: 12,
        scrollY: 24,
        zoom,
      }),
      files: activeFiles,
    });
    expect(scheduleVisibleImageRenditionLoad).toHaveBeenCalledWith(nextScene);
    expect(scheduleAgentBrowserRuntimeStatePublish).toHaveBeenCalledWith(
      nextScene,
    );
    expect(updateWorkspaceOverlay).toHaveBeenCalledWith(
      activeElements,
      nextScene.appState,
    );
  });

  it("skips side effects when no scene is loaded", () => {
    const setLatestScene = vi.fn();
    const scheduleVisibleImageRenditionLoad = vi.fn();
    const scheduleAgentBrowserRuntimeStatePublish = vi.fn();
    const updateWorkspaceOverlay = vi.fn();

    const actions = createViewportChangeRendererActions({
      getScene: () => null,
      getSceneReader: () => ({}),
      setLatestScene,
      scheduleVisibleImageRenditionLoad,
      scheduleAgentBrowserRuntimeStatePublish,
      updateWorkspaceOverlay,
    });

    expect(
      actions.changeViewport(12, 24, { value: 1 } as AppState["zoom"]),
    ).toEqual({
      status: "skipped",
      reason: "missing-scene",
    });

    expect(setLatestScene).not.toHaveBeenCalled();
    expect(scheduleVisibleImageRenditionLoad).not.toHaveBeenCalled();
    expect(scheduleAgentBrowserRuntimeStatePublish).not.toHaveBeenCalled();
    expect(updateWorkspaceOverlay).not.toHaveBeenCalled();
  });
});
