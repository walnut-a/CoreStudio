import { CaptureUpdateAction, getCommonBounds } from "@excalidraw/element";
import type { CaptureUpdateActionType } from "@excalidraw/element";
import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { AppState } from "@excalidraw/excalidraw/types";

import { clearTimerRefAction } from "./timerRefController";

export interface WorkspaceBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WorkspaceBoundsOptions {
  viewportCenter: { x: number; y: number };
  defaultWidth?: number;
  defaultHeight?: number;
  padding?: number;
}

export const ENABLE_WORKSPACE_BOUNDS = true;
export const DEFAULT_WORKSPACE_WIDTH = 3600;
export const DEFAULT_WORKSPACE_HEIGHT = 2400;
export const WORKSPACE_BOUNDS_PADDING = 360;
export const WORKSPACE_FIT_ZOOM_VIEWPORT_MARGIN = 0.94;
export const WORKSPACE_ZOOM_GATE_RESET_RATIO = 1.08;
export const WORKSPACE_ZOOM_GATE_EPSILON = 0.001;
export const WORKSPACE_MIN_SOFT_STOP_ZOOM = 0.011;

export interface WorkspaceZoomGateState {
  snappedAtFitZoom: boolean;
  releasedBelowFitZoom: boolean;
}

export interface WorkspaceOverlayState {
  bounds: WorkspaceBounds;
  scrollX: number;
  scrollY: number;
  zoomValue: number;
}

export type WorkspaceFitPulseScheduleResult = {
  status: "scheduled";
  timerId: number;
};

export type WorkspaceFitPulseResetResult = {
  status: "reset";
  zoomGateState: WorkspaceZoomGateState;
};

export interface CreateWorkspaceFitPulseRendererActionsInput {
  delayMs: number;
  getTimerId: () => number | null;
  clearTimer: (timerId: number) => void;
  setTimerId: (timerId: number | null) => void;
  setPulse: (active: boolean) => void;
  setPreviousZoomValue: (zoomValue: number | null) => void;
  setZoomGateState: (state: WorkspaceZoomGateState) => void;
  scheduleTimeout: (callback: () => void, delayMs: number) => number;
}

export interface WorkspaceZoomSnapApi {
  updateScene: (scene: {
    appState: WorkspaceCenteredZoomAppState;
    captureUpdate: CaptureUpdateActionType;
  }) => void;
}

export interface CreateWorkspaceZoomSnapRendererActionsInput {
  getApi: () => WorkspaceZoomSnapApi | null;
  getPreviousZoomValue: () => number | null;
  setPreviousZoomValue: (zoomValue: number | null) => void;
  getZoomGateState: () => WorkspaceZoomGateState;
  setZoomGateState: (state: WorkspaceZoomGateState) => void;
  triggerWorkspaceFitPulse: () => void;
}

export type WorkspaceViewportAppState = Pick<
  AppState,
  "width" | "height" | "scrollX" | "scrollY" | "zoom"
>;

export type WorkspaceCenteredZoomAppState = Pick<
  AppState,
  "scrollX" | "scrollY" | "zoom"
>;

export const createWorkspaceZoomGateState = (): WorkspaceZoomGateState => ({
  snappedAtFitZoom: false,
  releasedBelowFitZoom: false,
});

export const triggerWorkspaceFitPulseAction = ({
  delayMs,
  clearExistingTimer,
  setPulse,
  setTimerId,
  scheduleTimeout,
}: {
  delayMs: number;
  clearExistingTimer: () => void;
  setPulse: (active: boolean) => void;
  setTimerId: (timerId: number | null) => void;
  scheduleTimeout: (callback: () => void, delayMs: number) => number;
}): WorkspaceFitPulseScheduleResult => {
  clearExistingTimer();
  setPulse(true);
  const timerId = scheduleTimeout(() => {
    setTimerId(null);
    setPulse(false);
  }, delayMs);
  setTimerId(timerId);

  return {
    status: "scheduled",
    timerId,
  };
};

export const resetWorkspaceFitPulseAction = ({
  setPreviousZoomValue,
  setZoomGateState,
  setPulse,
}: {
  setPreviousZoomValue: (zoomValue: number | null) => void;
  setZoomGateState: (state: WorkspaceZoomGateState) => void;
  setPulse: (active: boolean) => void;
}): WorkspaceFitPulseResetResult => {
  const zoomGateState = createWorkspaceZoomGateState();
  setPreviousZoomValue(null);
  setZoomGateState(zoomGateState);
  setPulse(false);

  return {
    status: "reset",
    zoomGateState,
  };
};

export const createWorkspaceFitPulseRendererActions = ({
  delayMs,
  getTimerId,
  clearTimer,
  setTimerId,
  setPulse,
  setPreviousZoomValue,
  setZoomGateState,
  scheduleTimeout,
}: CreateWorkspaceFitPulseRendererActionsInput) => {
  const clearTimerRef = () =>
    clearTimerRefAction({
      getTimerId,
      clearTimer,
      setTimerId,
    });

  return {
    trigger: () =>
      triggerWorkspaceFitPulseAction({
        delayMs,
        clearExistingTimer: clearTimerRef,
        setPulse,
        setTimerId,
        scheduleTimeout,
      }),
    reset: () =>
      resetWorkspaceFitPulseAction({
        setPreviousZoomValue,
        setZoomGateState,
        setPulse,
      }),
    clearTimer: clearTimerRef,
  };
};

const WORKSPACE_OVERLAY_STATE_EPSILON = 0.001;

const getFiniteNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const getPositiveFiniteNumber = (value: unknown, fallback: number) => {
  const numberValue = getFiniteNumber(value, fallback);
  return numberValue > 0 ? numberValue : fallback;
};

const areNumbersClose = (left: number, right: number) =>
  Math.abs(left - right) <= WORKSPACE_OVERLAY_STATE_EPSILON;

export const areWorkspaceBoundsEqual = (
  left: WorkspaceBounds,
  right: WorkspaceBounds,
) =>
  areNumbersClose(left.x, right.x) &&
  areNumbersClose(left.y, right.y) &&
  areNumbersClose(left.width, right.width) &&
  areNumbersClose(left.height, right.height);

export const areWorkspaceOverlayStatesEqual = (
  left: WorkspaceOverlayState | null,
  right: WorkspaceOverlayState | null,
) => {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return (
    areWorkspaceBoundsEqual(left.bounds, right.bounds) &&
    areNumbersClose(left.scrollX, right.scrollX) &&
    areNumbersClose(left.scrollY, right.scrollY) &&
    areNumbersClose(left.zoomValue, right.zoomValue)
  );
};

export const buildWorkspaceOverlayStateUpdate = ({
  current,
  next,
}: {
  current: WorkspaceOverlayState | null;
  next: WorkspaceOverlayState | null;
}) => (areWorkspaceOverlayStatesEqual(current, next) ? current : next);

export interface CreateWorkspaceOverlayRendererActionsInput {
  setWorkspaceOverlayState: (
    updater: (
      current: WorkspaceOverlayState | null,
    ) => WorkspaceOverlayState | null,
  ) => void;
}

export const createWorkspaceOverlayRendererActions = ({
  setWorkspaceOverlayState,
}: CreateWorkspaceOverlayRendererActionsInput) => ({
  update: (
    elements: readonly ExcalidrawElement[],
    appState: WorkspaceViewportAppState,
  ): WorkspaceBounds | null => {
    const overlayState = buildWorkspaceOverlayState(elements, appState);
    setWorkspaceOverlayState((current) =>
      buildWorkspaceOverlayStateUpdate({
        current,
        next: overlayState,
      }),
    );
    return overlayState?.bounds ?? null;
  },
});

const isUsableBounds = (bounds: WorkspaceBounds) =>
  Number.isFinite(bounds.x) &&
  Number.isFinite(bounds.y) &&
  Number.isFinite(bounds.width) &&
  Number.isFinite(bounds.height) &&
  bounds.width > 0 &&
  bounds.height > 0;

const getDefaultWorkspaceSize = ({
  defaultWidth = DEFAULT_WORKSPACE_WIDTH,
  defaultHeight = DEFAULT_WORKSPACE_HEIGHT,
}: Pick<WorkspaceBoundsOptions, "defaultWidth" | "defaultHeight">) => ({
  width: getPositiveFiniteNumber(defaultWidth, DEFAULT_WORKSPACE_WIDTH),
  height: getPositiveFiniteNumber(defaultHeight, DEFAULT_WORKSPACE_HEIGHT),
});

const getDefaultWorkspaceBounds = ({
  viewportCenter,
  defaultWidth,
  defaultHeight,
}: WorkspaceBoundsOptions): WorkspaceBounds => {
  const centerX = getFiniteNumber(viewportCenter.x, 0);
  const centerY = getFiniteNumber(viewportCenter.y, 0);
  const { width, height } = getDefaultWorkspaceSize({
    defaultWidth,
    defaultHeight,
  });

  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  };
};

const padBounds = (
  bounds: WorkspaceBounds,
  padding: number,
): WorkspaceBounds => ({
  x: bounds.x - padding,
  y: bounds.y - padding,
  width: bounds.width + padding * 2,
  height: bounds.height + padding * 2,
});

const expandBoundsToMinimumSize = (
  bounds: WorkspaceBounds,
  minimumSize: Pick<WorkspaceBounds, "width" | "height">,
): WorkspaceBounds => {
  const minimumWidth = getPositiveFiniteNumber(
    minimumSize.width,
    DEFAULT_WORKSPACE_WIDTH,
  );
  const minimumHeight = getPositiveFiniteNumber(
    minimumSize.height,
    DEFAULT_WORKSPACE_HEIGHT,
  );
  const width = Math.max(bounds.width, minimumWidth);
  const height = Math.max(bounds.height, minimumHeight);
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;

  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  };
};

const expandBounds = (
  bounds: WorkspaceBounds,
  rect: WorkspaceBounds,
): WorkspaceBounds => {
  const left = Math.min(bounds.x, rect.x);
  const top = Math.min(bounds.y, rect.y);
  const right = Math.max(bounds.x + bounds.width, rect.x + rect.width);
  const bottom = Math.max(bounds.y + bounds.height, rect.y + rect.height);

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
};

export const expandWorkspaceBoundsForRect = (
  bounds: WorkspaceBounds,
  rect: WorkspaceBounds,
  padding = WORKSPACE_BOUNDS_PADDING,
): WorkspaceBounds => {
  if (!isUsableBounds(bounds) || !isUsableBounds(rect)) {
    return bounds;
  }

  return expandBounds(bounds, padBounds(rect, padding));
};

export const getElementsSceneBounds = (
  elements: readonly ExcalidrawElement[],
) => {
  if (!elements.length) {
    return null;
  }

  const [left, top, right, bottom] = getCommonBounds(elements);
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
};

export const getSceneOccupiedBounds = (
  elements: readonly ExcalidrawElement[],
) =>
  elements.flatMap((element) => {
    if (element.isDeleted) {
      return [];
    }

    const bounds = getElementsSceneBounds([element]);
    return bounds && isUsableBounds(bounds) ? [bounds] : [];
  });

const getElementWorkspaceBounds = (
  element: ExcalidrawElement,
): WorkspaceBounds | null => {
  const bounds = getElementsSceneBounds([element]);

  return bounds && isUsableBounds(bounds) ? bounds : null;
};

export const getWorkspaceBounds = (
  elements: readonly ExcalidrawElement[],
  options: WorkspaceBoundsOptions,
): WorkspaceBounds => {
  const padding = options.padding ?? WORKSPACE_BOUNDS_PADDING;
  const visibleElementBounds = elements.flatMap((element) => {
    if (element.isDeleted) {
      return [];
    }

    const bounds = getElementWorkspaceBounds(element);
    return bounds ? [bounds] : [];
  });

  if (!visibleElementBounds.length) {
    return getDefaultWorkspaceBounds(options);
  }

  const elementsBounds = visibleElementBounds.reduce(expandBounds);
  const paddedElementsBounds = padBounds(elementsBounds, padding);

  return expandBoundsToMinimumSize(
    paddedElementsBounds,
    getDefaultWorkspaceSize(options),
  );
};

export const getViewportCenterFromAppState = (
  appState: WorkspaceViewportAppState,
) => {
  const width = getFiniteNumber(appState.width, 0);
  const height = getFiniteNumber(appState.height, 0);
  const scrollX = getFiniteNumber(appState.scrollX, 0);
  const scrollY = getFiniteNumber(appState.scrollY, 0);
  const zoomValue = Math.max(getFiniteNumber(appState.zoom?.value, 1), 0.0001);

  return {
    x: width / (2 * zoomValue) - scrollX,
    y: height / (2 * zoomValue) - scrollY,
  };
};

export const getViewportZoomValue = (
  appState: Pick<AppState, "zoom">,
) => getFiniteNumber(appState.zoom?.value, 1);

export const buildWorkspaceOverlayState = (
  elements: readonly ExcalidrawElement[],
  appState: WorkspaceViewportAppState,
): WorkspaceOverlayState | null => {
  if (!ENABLE_WORKSPACE_BOUNDS) {
    return null;
  }

  const bounds = getWorkspaceBounds(elements, {
    viewportCenter: getViewportCenterFromAppState(appState),
  });

  return {
    bounds,
    scrollX: getFiniteNumber(appState.scrollX, 0),
    scrollY: getFiniteNumber(appState.scrollY, 0),
    zoomValue: getViewportZoomValue(appState),
  };
};

export const getViewportCenteredZoomState = (
  appState: WorkspaceViewportAppState,
  nextZoomValue: number,
): WorkspaceCenteredZoomAppState => {
  const currentZoom = getViewportZoomValue(appState);
  const nextZoom = getFiniteNumber(nextZoomValue, currentZoom);
  const appLayerX = getFiniteNumber(appState.width, 0) / 2;
  const appLayerY = getFiniteNumber(appState.height, 0) / 2;
  const scrollX = getFiniteNumber(appState.scrollX, 0);
  const scrollY = getFiniteNumber(appState.scrollY, 0);

  const baseScrollX = scrollX + (appLayerX - appLayerX / currentZoom);
  const baseScrollY = scrollY + (appLayerY - appLayerY / currentZoom);
  const zoomOffsetScrollX = -(appLayerX - appLayerX / nextZoom);
  const zoomOffsetScrollY = -(appLayerY - appLayerY / nextZoom);

  return {
    scrollX: baseScrollX + zoomOffsetScrollX,
    scrollY: baseScrollY + zoomOffsetScrollY,
    zoom: {
      value: nextZoom as AppState["zoom"]["value"],
    },
  };
};

export const getWorkspaceFitZoom = (
  bounds: WorkspaceBounds,
  viewport: Pick<AppState, "width" | "height">,
) => {
  if (!isUsableBounds(bounds)) {
    return null;
  }

  const viewportWidth = getFiniteNumber(viewport.width, 0);
  const viewportHeight = getFiniteNumber(viewport.height, 0);

  if (viewportWidth <= 0 || viewportHeight <= 0) {
    return null;
  }

  const fitZoom =
    Math.min(viewportWidth / bounds.width, viewportHeight / bounds.height) *
    WORKSPACE_FIT_ZOOM_VIEWPORT_MARGIN;

  if (fitZoom <= WORKSPACE_MIN_SOFT_STOP_ZOOM) {
    return null;
  }

  return Math.min(1, fitZoom);
};

export const resolveWorkspaceZoomGate = ({
  previousZoomValue,
  currentZoomValue,
  fitZoomValue,
  gateState,
}: {
  previousZoomValue: number | null;
  currentZoomValue: number;
  fitZoomValue: number | null;
  gateState: WorkspaceZoomGateState;
}) => {
  const resetGateState: WorkspaceZoomGateState = {
    snappedAtFitZoom: false,
    releasedBelowFitZoom: false,
  };

  if (
    !Number.isFinite(currentZoomValue) ||
    !fitZoomValue ||
    !Number.isFinite(fitZoomValue)
  ) {
    return {
      shouldSnap: false,
      nextGateState: resetGateState,
    };
  }

  if (currentZoomValue >= fitZoomValue * WORKSPACE_ZOOM_GATE_RESET_RATIO) {
    return {
      shouldSnap: false,
      nextGateState: resetGateState,
    };
  }

  const isBelowFitZoom =
    currentZoomValue < fitZoomValue - WORKSPACE_ZOOM_GATE_EPSILON;

  if (!isBelowFitZoom) {
    return {
      shouldSnap: false,
      nextGateState: gateState,
    };
  }

  if (gateState.releasedBelowFitZoom) {
    return {
      shouldSnap: false,
      nextGateState: gateState,
    };
  }

  if (gateState.snappedAtFitZoom) {
    return {
      shouldSnap: false,
      nextGateState: {
        snappedAtFitZoom: false,
        releasedBelowFitZoom: true,
      },
    };
  }

  if (
    previousZoomValue === null ||
    !Number.isFinite(previousZoomValue) ||
    previousZoomValue <= fitZoomValue - WORKSPACE_ZOOM_GATE_EPSILON
  ) {
    return {
      shouldSnap: false,
      nextGateState: gateState,
    };
  }

  return {
    shouldSnap: true,
    nextGateState: {
      snappedAtFitZoom: true,
      releasedBelowFitZoom: false,
    },
  };
};

export const createWorkspaceZoomSnapRendererActions = ({
  getApi,
  getPreviousZoomValue,
  setPreviousZoomValue,
  getZoomGateState,
  setZoomGateState,
  triggerWorkspaceFitPulse,
}: CreateWorkspaceZoomSnapRendererActionsInput) => ({
  maybeSnap: (
    elements: readonly ExcalidrawElement[],
    appState: WorkspaceViewportAppState,
  ) => {
    if (!ENABLE_WORKSPACE_BOUNDS) {
      return false;
    }

    const api = getApi();
    if (!api) {
      return false;
    }

    const bounds = getWorkspaceBounds(elements, {
      viewportCenter: getViewportCenterFromAppState(appState),
    });
    const fitZoomValue = getWorkspaceFitZoom(bounds, appState);
    const currentZoomValue = getViewportZoomValue(appState);
    const gate = resolveWorkspaceZoomGate({
      previousZoomValue: getPreviousZoomValue(),
      currentZoomValue,
      fitZoomValue,
      gateState: getZoomGateState(),
    });

    setZoomGateState(gate.nextGateState);

    if (!gate.shouldSnap || !fitZoomValue) {
      setPreviousZoomValue(currentZoomValue);
      return false;
    }

    setPreviousZoomValue(fitZoomValue);
    triggerWorkspaceFitPulse();
    api.updateScene({
      appState: getViewportCenteredZoomState(appState, fitZoomValue),
      captureUpdate: CaptureUpdateAction.NEVER,
    });
    return true;
  },
});

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const clampAxis = ({
  viewportSize,
  zoom,
  scroll,
  boundsStart,
  boundsSize,
}: {
  viewportSize: number;
  zoom: number;
  scroll: number;
  boundsStart: number;
  boundsSize: number;
}) => {
  const viewportSceneSize = viewportSize / zoom;
  const boundsEnd = boundsStart + boundsSize;

  if (viewportSceneSize >= boundsSize) {
    const boundsCenter = boundsStart + boundsSize / 2;
    return viewportSceneSize / 2 - boundsCenter;
  }

  const visibleStart = -scroll;
  const clampedVisibleStart = clamp(
    visibleStart,
    boundsStart,
    boundsEnd - viewportSceneSize,
  );
  return -clampedVisibleStart;
};

export const clampViewportToWorkspace = (
  appState: Pick<AppState, "width" | "height" | "zoom" | "scrollX" | "scrollY">,
  bounds: WorkspaceBounds,
) => ({
  scrollX: clampAxis({
    viewportSize: appState.width,
    zoom: appState.zoom.value,
    scroll: appState.scrollX,
    boundsStart: bounds.x,
    boundsSize: bounds.width,
  }),
  scrollY: clampAxis({
    viewportSize: appState.height,
    zoom: appState.zoom.value,
    scroll: appState.scrollY,
    boundsStart: bounds.y,
    boundsSize: bounds.height,
  }),
});
