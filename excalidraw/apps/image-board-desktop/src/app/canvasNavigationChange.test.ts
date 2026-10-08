import { describe, expect, it } from "vitest";
import { newElement } from "@excalidraw/element";
import { getDefaultAppState } from "@excalidraw/excalidraw/appState";
import { createCanvasNavigationChangeTracker } from "./canvasNavigationChange";

describe("canvas navigation changes", () => {
  const createSnapshot = () => ({
    appState: {
      ...getDefaultAppState(),
      width: 800,
      height: 600,
      offsetLeft: 0,
      offsetTop: 0,
    },
    elements: [
      newElement({ type: "rectangle", x: 0, y: 0, width: 100, height: 100 }),
    ],
    dependencies: [{ project: "one" }, [], {}, new Map()],
  });

  it("skips content work for pan, zoom, viewport resize and zoom settling", () => {
    const tracker = createCanvasNavigationChangeTracker();
    const before = createSnapshot();
    expect(tracker.isNavigationOnly(before)).toBe(false);
    tracker.remember(before);
    const next = {
      ...before,
      appState: {
        ...before.appState,
        scrollX: 200,
        scrollY: -400,
        zoom: { value: 0.05 as typeof before.appState.zoom.value },
        width: 1200,
        height: 800,
        shouldCacheIgnoreZoom: true,
      },
    };
    expect(tracker.isNavigationOnly(next)).toBe(true);
    tracker.remember(next);
    expect(
      tracker.isNavigationOnly({
        ...next,
        appState: { ...next.appState, shouldCacheIgnoreZoom: false },
      }),
    ).toBe(true);
  });

  it("still processes in-place element changes, selection, theme and shared config", () => {
    const tracker = createCanvasNavigationChangeTracker();
    const before = createSnapshot();
    tracker.remember(before);
    Object.assign(before.elements[0], {
      version: before.elements[0].version + 1,
    });
    expect(tracker.isNavigationOnly(before)).toBe(false);
    tracker.remember(before);
    for (const patch of [
      { selectedElementIds: { image: true as const } },
      { selectedGroupIds: { group: true } },
      { theme: "dark" as const },
      { viewBackgroundColor: "#aaaaaa" },
      { croppingElementId: "image" },
    ]) {
      expect(
        tracker.isNavigationOnly({
          ...before,
          appState: { ...before.appState, ...patch },
        }),
      ).toBe(false);
    }
  });

  it("invalidates on project, files, records, task and room readiness changes", () => {
    const tracker = createCanvasNavigationChangeTracker();
    const before = createSnapshot();
    tracker.remember(before);
    for (let index = 0; index < before.dependencies.length; index++) {
      expect(
        tracker.isNavigationOnly({
          ...before,
          dependencies: before.dependencies.map((value, i) =>
            i === index ? {} : value,
          ),
        }),
      ).toBe(false);
    }
    expect(tracker.isNavigationOnly({ ...before, elements: [] })).toBe(false);
  });
  it("detects undo nonces, deletion and ordering without a private scene API", () => {
    const tracker = createCanvasNavigationChangeTracker();
    const before = createSnapshot();
    before.elements.push(
      newElement({ type: "rectangle", x: 0, y: 0, width: 20, height: 20 }),
    );
    tracker.remember(before);
    expect(
      tracker.isNavigationOnly({ ...before, elements: [...before.elements] }),
    ).toBe(true);
    Object.assign(before.elements[0], {
      versionNonce: before.elements[0].versionNonce + 1,
    });
    expect(tracker.isNavigationOnly(before)).toBe(false);
    tracker.remember(before);
    expect(
      tracker.isNavigationOnly({
        ...before,
        elements: [...before.elements].reverse(),
      }),
    ).toBe(false);
    Object.assign(before.elements[0], { isDeleted: true });
    expect(tracker.isNavigationOnly(before)).toBe(false);
  });
});
