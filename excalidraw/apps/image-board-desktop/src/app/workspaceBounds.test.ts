import { newFrameElement } from "@excalidraw/element";
import type { NormalizedZoomValue } from "@excalidraw/excalidraw/types";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_WORKSPACE_HEIGHT,
  DEFAULT_WORKSPACE_WIDTH,
  WORKSPACE_FIT_ZOOM_VIEWPORT_MARGIN,
  clampViewportToWorkspace,
  getWorkspaceFitZoom,
  getWorkspaceBounds,
  resolveWorkspaceZoomGate,
} from "./workspaceBounds";

describe("workspaceBounds", () => {
  it("creates a default workspace around the viewport center when the scene is empty", () => {
    const bounds = getWorkspaceBounds([], {
      viewportCenter: { x: 200, y: 120 },
    });

    expect(bounds).toEqual({
      x: 200 - DEFAULT_WORKSPACE_WIDTH / 2,
      y: 120 - DEFAULT_WORKSPACE_HEIGHT / 2,
      width: DEFAULT_WORKSPACE_WIDTH,
      height: DEFAULT_WORKSPACE_HEIGHT,
    });
  });

  it("expands the workspace to include elements outside the default area", () => {
    const remoteFrame = newFrameElement({
      x: 9000,
      y: 5000,
      width: 640,
      height: 480,
    });

    const bounds = getWorkspaceBounds([remoteFrame], {
      viewportCenter: { x: 0, y: 0 },
      padding: 800,
    });

    expect(bounds.x + bounds.width).toBeGreaterThanOrEqual(10440);
    expect(bounds.y + bounds.height).toBeGreaterThanOrEqual(6280);
  });

  it("ignores incomplete element geometry while computing the workspace", () => {
    const bounds = getWorkspaceBounds(
      [{ isDeleted: false } as never],
      {
        viewportCenter: { x: 0, y: 0 },
      },
    );

    expect(bounds).toEqual({
      x: -DEFAULT_WORKSPACE_WIDTH / 2,
      y: -DEFAULT_WORKSPACE_HEIGHT / 2,
      width: DEFAULT_WORKSPACE_WIDTH,
      height: DEFAULT_WORKSPACE_HEIGHT,
    });
  });

  it("clamps the viewport to the workspace when panning into empty space", () => {
    const clamped = clampViewportToWorkspace(
      {
        width: 1000,
        height: 800,
        zoom: { value: 0.1 as NormalizedZoomValue },
        scrollX: -100000,
        scrollY: -100000,
      },
      {
        x: -6000,
        y: -4000,
        width: 12000,
        height: 8000,
      },
    );

    expect(clamped.scrollX).toBe(4000);
    expect(clamped.scrollY).toBe(4000);
  });

  it("calculates the zoom where the current workspace fits the viewport", () => {
    const fitZoom = getWorkspaceFitZoom(
      {
        x: -6000,
        y: -4000,
        width: 12000,
        height: 8000,
      },
      {
        width: 1440,
        height: 900,
      },
    );

    expect(fitZoom).toBeCloseTo(0.1125 * WORKSPACE_FIT_ZOOM_VIEWPORT_MARGIN);
  });

  it("snaps once at the workspace fit zoom, then allows a second zoom-out", () => {
    const firstGate = resolveWorkspaceZoomGate({
      previousZoomValue: 0.2,
      currentZoomValue: 0.08,
      fitZoomValue: 0.1,
      gateState: {
        snappedAtFitZoom: false,
        releasedBelowFitZoom: false,
      },
    });

    expect(firstGate.shouldSnap).toBe(true);

    const secondGate = resolveWorkspaceZoomGate({
      previousZoomValue: 0.1,
      currentZoomValue: 0.08,
      fitZoomValue: 0.1,
      gateState: firstGate.nextGateState,
    });

    expect(secondGate.shouldSnap).toBe(false);
    expect(secondGate.nextGateState.releasedBelowFitZoom).toBe(true);
  });

  it("resets the zoom gate after zooming back into the workspace", () => {
    const gate = resolveWorkspaceZoomGate({
      previousZoomValue: 0.08,
      currentZoomValue: 0.12,
      fitZoomValue: 0.1,
      gateState: {
        snappedAtFitZoom: false,
        releasedBelowFitZoom: true,
      },
    });

    expect(gate.nextGateState).toEqual({
      snappedAtFitZoom: false,
      releasedBelowFitZoom: false,
    });
  });
});
