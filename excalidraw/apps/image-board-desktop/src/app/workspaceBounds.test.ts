import { CaptureUpdateAction, newFrameElement } from "@excalidraw/element";
import type { NormalizedZoomValue } from "@excalidraw/excalidraw/types";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_WORKSPACE_HEIGHT,
  DEFAULT_WORKSPACE_WIDTH,
  WORKSPACE_FIT_ZOOM_VIEWPORT_MARGIN,
  areWorkspaceOverlayStatesEqual,
  buildWorkspaceOverlayState,
  buildWorkspaceOverlayStateUpdate,
  clampViewportToWorkspace,
  createWorkspaceFitPulseRendererActions,
  createWorkspaceOverlayRendererActions,
  createWorkspaceZoomSnapRendererActions,
  createWorkspaceZoomGateState,
  getElementsSceneBounds,
  getSceneOccupiedBounds,
  getViewportCenterFromAppState,
  getViewportCenteredZoomState,
  getViewportZoomValue,
  getWorkspaceFitZoom,
  getWorkspaceBounds,
  resolveWorkspaceZoomGate,
  resetWorkspaceFitPulseAction,
  triggerWorkspaceFitPulseAction,
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

  it("does not stretch a populated workspace to a remote saved viewport", () => {
    const contentFrame = newFrameElement({
      x: 100,
      y: 80,
      width: 400,
      height: 300,
    });

    const bounds = getWorkspaceBounds([contentFrame], {
      viewportCenter: { x: 50000, y: -40000 },
    });

    expect(bounds.width).toBe(DEFAULT_WORKSPACE_WIDTH);
    expect(bounds.height).toBe(DEFAULT_WORKSPACE_HEIGHT);
    expect(bounds.x).toBeLessThanOrEqual(100 - 360);
    expect(bounds.x + bounds.width).toBeGreaterThanOrEqual(500 + 360);
    expect(bounds.y).toBeLessThanOrEqual(80 - 360);
    expect(bounds.y + bounds.height).toBeGreaterThanOrEqual(380 + 360);
  });

  it("ignores incomplete element geometry while computing the workspace", () => {
    const bounds = getWorkspaceBounds([{ isDeleted: false } as never], {
      viewportCenter: { x: 0, y: 0 },
    });

    expect(bounds).toEqual({
      x: -DEFAULT_WORKSPACE_WIDTH / 2,
      y: -DEFAULT_WORKSPACE_HEIGHT / 2,
      width: DEFAULT_WORKSPACE_WIDTH,
      height: DEFAULT_WORKSPACE_HEIGHT,
    });
  });

  it("returns combined scene bounds for a group of elements", () => {
    const leftFrame = newFrameElement({
      x: 100,
      y: 80,
      width: 400,
      height: 300,
    });
    const rightFrame = newFrameElement({
      x: 700,
      y: 600,
      width: 120,
      height: 90,
    });

    expect(getElementsSceneBounds([leftFrame, rightFrame])).toEqual({
      x: 100,
      y: 80,
      width: 720,
      height: 610,
    });
    expect(getElementsSceneBounds([])).toBeNull();
  });

  it("returns occupied scene bounds for visible elements only", () => {
    const visibleFrame = newFrameElement({
      x: 100,
      y: 80,
      width: 400,
      height: 300,
    });
    const deletedFrame = {
      ...newFrameElement({
        x: -1000,
        y: -1000,
        width: 300,
        height: 200,
      }),
      isDeleted: true,
    };

    expect(
      getSceneOccupiedBounds([
        visibleFrame,
        deletedFrame,
        { isDeleted: false } as never,
      ]),
    ).toEqual([
      {
        x: 100,
        y: 80,
        width: 400,
        height: 300,
      },
    ]);
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

  it("builds a workspace overlay state from viewport app state", () => {
    const overlay = buildWorkspaceOverlayState([], {
      width: 1000,
      height: 800,
      scrollX: -100,
      scrollY: -200,
      zoom: { value: 2 as NormalizedZoomValue },
    });

    expect(overlay).toEqual({
      bounds: {
        x: 350 - DEFAULT_WORKSPACE_WIDTH / 2,
        y: 400 - DEFAULT_WORKSPACE_HEIGHT / 2,
        width: DEFAULT_WORKSPACE_WIDTH,
        height: DEFAULT_WORKSPACE_HEIGHT,
      },
      scrollX: -100,
      scrollY: -200,
      zoomValue: 2,
    });
  });

  it("compares workspace overlay states with the same epsilon used by the app", () => {
    const base = {
      bounds: {
        x: 1,
        y: 2,
        width: 300,
        height: 200,
      },
      scrollX: -10,
      scrollY: -20,
      zoomValue: 0.5,
    };

    expect(
      areWorkspaceOverlayStatesEqual(base, {
        ...base,
        bounds: {
          ...base.bounds,
          width: base.bounds.width + 0.0005,
        },
        zoomValue: 0.5005,
      }),
    ).toBe(true);
    expect(
      areWorkspaceOverlayStatesEqual(base, {
        ...base,
        scrollX: base.scrollX + 0.01,
      }),
    ).toBe(false);
  });

  it("keeps the current workspace overlay state reference when the next state is unchanged", () => {
    const current = {
      bounds: {
        x: 1,
        y: 2,
        width: 300,
        height: 200,
      },
      scrollX: -10,
      scrollY: -20,
      zoomValue: 0.5,
    };
    const next = {
      ...current,
      bounds: {
        ...current.bounds,
        width: current.bounds.width + 0.0005,
      },
    };

    expect(buildWorkspaceOverlayStateUpdate({ current, next })).toBe(current);
  });

  it("returns the next workspace overlay state when viewport state changed", () => {
    const current = {
      bounds: {
        x: 1,
        y: 2,
        width: 300,
        height: 200,
      },
      scrollX: -10,
      scrollY: -20,
      zoomValue: 0.5,
    };
    const next = {
      ...current,
      scrollX: -12,
    };

    expect(buildWorkspaceOverlayStateUpdate({ current, next })).toBe(next);
  });

  it("creates reusable renderer actions for workspace overlay state", () => {
    let workspaceOverlayState = buildWorkspaceOverlayState([], {
      width: 1000,
      height: 800,
      scrollX: -100,
      scrollY: -200,
      zoom: { value: 2 as NormalizedZoomValue },
    });
    const actions = createWorkspaceOverlayRendererActions({
      setWorkspaceOverlayState: (updater) => {
        workspaceOverlayState = updater(workspaceOverlayState);
      },
    });

    const unchangedState = workspaceOverlayState;
    const unchangedBounds = actions.update([], {
      width: 1000,
      height: 800,
      scrollX: -100,
      scrollY: -200,
      zoom: { value: 2 as NormalizedZoomValue },
    });

    expect(workspaceOverlayState).toBe(unchangedState);
    expect(unchangedBounds).toEqual(unchangedState?.bounds);

    const nextBounds = actions.update([], {
      width: 1000,
      height: 800,
      scrollX: -120,
      scrollY: -200,
      zoom: { value: 2 as NormalizedZoomValue },
    });

    expect(workspaceOverlayState).not.toBe(unchangedState);
    expect(nextBounds).toEqual(workspaceOverlayState?.bounds);
  });

  it("centers a zoom update around the current viewport center", () => {
    const nextState = getViewportCenteredZoomState(
      {
        width: 1000,
        height: 800,
        scrollX: -200,
        scrollY: -100,
        zoom: { value: 1 as NormalizedZoomValue },
      },
      0.5,
    );

    expect(nextState).toEqual({
      scrollX: 300,
      scrollY: 300,
      zoom: {
        value: 0.5,
      },
    });
  });

  it("normalizes the viewport zoom value", () => {
    expect(
      getViewportZoomValue({
        zoom: { value: 0.75 as NormalizedZoomValue },
      }),
    ).toBe(0.75);
    expect(
      getViewportZoomValue({
        zoom: { value: Number.NaN as NormalizedZoomValue },
      }),
    ).toBe(1);
  });

  it("creates the default workspace zoom gate state", () => {
    expect(createWorkspaceZoomGateState()).toEqual({
      snappedAtFitZoom: false,
      releasedBelowFitZoom: false,
    });
  });

  it("triggers a workspace fit pulse and clears it after the timeout", () => {
    const clearExistingTimer = vi.fn();
    const setPulse = vi.fn();
    const setTimerId = vi.fn();
    const scheduledCallbacks: Array<() => void> = [];
    const scheduleTimeout = vi.fn((callback: () => void, delayMs: number) => {
      scheduledCallbacks.push(callback);
      expect(delayMs).toBe(520);
      return 1201;
    });

    expect(
      triggerWorkspaceFitPulseAction({
        delayMs: 520,
        clearExistingTimer,
        setPulse,
        setTimerId,
        scheduleTimeout,
      }),
    ).toEqual({
      status: "scheduled",
      timerId: 1201,
    });

    expect(clearExistingTimer).toHaveBeenCalledTimes(1);
    expect(setPulse).toHaveBeenCalledWith(true);
    expect(setTimerId).toHaveBeenCalledWith(1201);

    expect(scheduledCallbacks).toHaveLength(1);
    scheduledCallbacks[0]?.();

    expect(setTimerId).toHaveBeenLastCalledWith(null);
    expect(setPulse).toHaveBeenLastCalledWith(false);
  });

  it("resets workspace fit pulse state and zoom gate state together", () => {
    const setPreviousZoomValue = vi.fn();
    const setZoomGateState = vi.fn();
    const setPulse = vi.fn();

    expect(
      resetWorkspaceFitPulseAction({
        setPreviousZoomValue,
        setZoomGateState,
        setPulse,
      }),
    ).toEqual({
      status: "reset",
      zoomGateState: {
        snappedAtFitZoom: false,
        releasedBelowFitZoom: false,
      },
    });

    expect(setPreviousZoomValue).toHaveBeenCalledWith(null);
    expect(setZoomGateState).toHaveBeenCalledWith({
      snappedAtFitZoom: false,
      releasedBelowFitZoom: false,
    });
    expect(setPulse).toHaveBeenCalledWith(false);
  });

  it("creates reusable renderer actions for workspace fit pulse state", () => {
    let timerId: number | null = 1200;
    let previousZoomValue: number | null = 2;
    let zoomGateState = {
      snappedAtFitZoom: true,
      releasedBelowFitZoom: true,
    };
    const clearTimer = vi.fn();
    const setTimerId = vi.fn((nextTimerId: number | null) => {
      timerId = nextTimerId;
    });
    const setPulse = vi.fn();
    const setPreviousZoomValue = vi.fn((zoomValue: number | null) => {
      previousZoomValue = zoomValue;
    });
    const setZoomGateState = vi.fn((state) => {
      zoomGateState = state;
    });
    const scheduledCallbacks: Array<() => void> = [];
    const scheduleTimeout = vi.fn((callback: () => void, delayMs: number) => {
      scheduledCallbacks.push(callback);
      expect(delayMs).toBe(520);
      return 1201;
    });
    const actions = createWorkspaceFitPulseRendererActions({
      delayMs: 520,
      getTimerId: () => timerId,
      clearTimer,
      setTimerId,
      setPulse,
      setPreviousZoomValue,
      setZoomGateState,
      scheduleTimeout,
    });

    expect(actions.trigger()).toEqual({
      status: "scheduled",
      timerId: 1201,
    });
    expect(clearTimer).toHaveBeenCalledWith(1200);
    expect(setPulse).toHaveBeenCalledWith(true);
    expect(timerId).toBe(1201);

    scheduledCallbacks[0]?.();
    expect(timerId).toBeNull();
    expect(setPulse).toHaveBeenLastCalledWith(false);

    timerId = 1202;
    expect(actions.clearTimer()).toEqual({
      status: "cleared",
      timerId: 1202,
    });
    expect(clearTimer).toHaveBeenLastCalledWith(1202);
    expect(timerId).toBeNull();

    expect(actions.reset()).toEqual({
      status: "reset",
      zoomGateState: {
        snappedAtFitZoom: false,
        releasedBelowFitZoom: false,
      },
    });
    expect(previousZoomValue).toBeNull();
    expect(zoomGateState).toEqual({
      snappedAtFitZoom: false,
      releasedBelowFitZoom: false,
    });
    expect(setPulse).toHaveBeenLastCalledWith(false);
  });

  it("creates reusable renderer actions for workspace zoom snap state", () => {
    let previousZoomValue: number | null = 0.4;
    let zoomGateState = createWorkspaceZoomGateState();
    const updateScene = vi.fn();
    const triggerWorkspaceFitPulse = vi.fn();
    const actions = createWorkspaceZoomSnapRendererActions({
      getApi: () => ({
        updateScene,
      }),
      getPreviousZoomValue: () => previousZoomValue,
      setPreviousZoomValue: (zoomValue) => {
        previousZoomValue = zoomValue;
      },
      getZoomGateState: () => zoomGateState,
      setZoomGateState: (state) => {
        zoomGateState = state;
      },
      triggerWorkspaceFitPulse,
    });

    const appState = {
      width: 1000,
      height: 800,
      scrollX: 0,
      scrollY: 0,
      zoom: { value: 0.08 as NormalizedZoomValue },
    };
    const snapped = actions.maybeSnap([], appState);
    const fitZoomValue = getWorkspaceFitZoom(
      getWorkspaceBounds([], {
        viewportCenter: getViewportCenterFromAppState(appState),
      }),
      appState,
    );

    expect(snapped).toBe(true);
    expect(previousZoomValue).toBe(fitZoomValue);
    expect(zoomGateState).toEqual({
      snappedAtFitZoom: true,
      releasedBelowFitZoom: false,
    });
    expect(triggerWorkspaceFitPulse).toHaveBeenCalledTimes(1);
    expect(updateScene).toHaveBeenCalledWith({
      appState: getViewportCenteredZoomState(appState, fitZoomValue ?? 1),
      captureUpdate: CaptureUpdateAction.NEVER,
    });
  });
});
