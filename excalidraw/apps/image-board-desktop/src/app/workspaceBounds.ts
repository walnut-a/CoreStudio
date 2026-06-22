import { getCommonBounds } from "@excalidraw/element";
import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { AppState } from "@excalidraw/excalidraw/types";

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

const getFiniteNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const getPositiveFiniteNumber = (value: unknown, fallback: number) => {
  const numberValue = getFiniteNumber(value, fallback);
  return numberValue > 0 ? numberValue : fallback;
};

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

const getElementWorkspaceBounds = (
  element: ExcalidrawElement,
): WorkspaceBounds | null => {
  const [left, top, right, bottom] = getCommonBounds([element]);
  const bounds = {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };

  return isUsableBounds(bounds) ? bounds : null;
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
