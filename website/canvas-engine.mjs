export const MIN_ZOOM = 0.72;
export const EXCALIDRAW_MIN_ZOOM = 0.01;
export const MAX_ZOOM = 1.3;
export const ZOOM_STEP = 0.1;
export const CAMERA_TRANSITION_MS = 180;
export const GENERATION_SETTLE_MS = 1200;
export const REFERENCE_SELECTION_SETTLE_MS = 260;

const COMPACT_VIEWPORT_WIDTH = 820;
const NARROW_VIEWPORT_WIDTH = 470;
const DESKTOP_FIT_HORIZONTAL_PADDING = 120;
const COMPACT_FIT_HORIZONTAL_PADDING = 48;
const FIT_VERTICAL_PADDING = 160;
const NARROW_CONTENT_GUTTER = 16;
const NARROW_CONTENT_LEFT = 96;
const NARROW_CONTENT_WIDTH = 1304;
const NARROW_CONTENT_HEIGHT = 804;

export const CAMERA_VIEWS = Object.freeze({
  desktop: Object.freeze({
    overview: Object.freeze({ x: 0, y: 0, zoom: 0.9 }),
    agent: Object.freeze({ x: -450, y: -130, zoom: 1.04 }),
  }),
  mobile: Object.freeze({
    overview: Object.freeze({ x: 390, y: -40, zoom: 0.72 }),
    agent: Object.freeze({ x: -430, y: -80, zoom: 0.8 }),
  }),
});

export const clampZoom = (value, minimumZoom = MIN_ZOOM) =>
  Math.min(MAX_ZOOM, Math.max(minimumZoom, Number(value.toFixed(2))));

export const stepZoom = (current, direction, minimumZoom = MIN_ZOOM) =>
  clampZoom(current + Math.sign(direction) * ZOOM_STEP, minimumZoom);

export const getCanvasMinimumZoom = ({
  viewportWidth,
  viewportHeight,
  planeWidth,
  planeHeight,
}) => {
  if (
    viewportWidth <= 0 ||
    viewportHeight <= 0 ||
    planeWidth <= 0 ||
    planeHeight <= 0
  ) {
    return MIN_ZOOM;
  }

  const horizontalPadding =
    viewportWidth <= COMPACT_VIEWPORT_WIDTH
      ? COMPACT_FIT_HORIZONTAL_PADDING
      : DESKTOP_FIT_HORIZONTAL_PADDING;
  const fitZoom = Math.min(
    Math.max(1, viewportWidth - horizontalPadding) / planeWidth,
    Math.max(1, viewportHeight - FIT_VERTICAL_PADDING) / planeHeight
  );
  return clampZoom(fitZoom, EXCALIDRAW_MIN_ZOOM);
};

export const getResponsiveOverviewView = (
  baseView,
  { viewportWidth, viewportHeight, planeWidth, planeHeight }
) => {
  if (
    viewportWidth <= 0 ||
    viewportHeight <= 0 ||
    planeWidth <= 0 ||
    planeHeight <= 0
  ) {
    return { ...baseView };
  }

  const compact = viewportWidth <= COMPACT_VIEWPORT_WIDTH;
  const narrow = viewportWidth <= NARROW_VIEWPORT_WIDTH;
  const horizontalPadding = narrow
    ? NARROW_CONTENT_GUTTER * 2
    : compact
    ? COMPACT_FIT_HORIZONTAL_PADDING
    : DESKTOP_FIT_HORIZONTAL_PADDING;
  const fitWidth = narrow ? NARROW_CONTENT_WIDTH : planeWidth;
  const fitHeight = narrow ? NARROW_CONTENT_HEIGHT : planeHeight;
  const fitZoom = Math.min(
    Math.max(1, viewportWidth - horizontalPadding) / fitWidth,
    Math.max(1, viewportHeight - FIT_VERTICAL_PADDING) / fitHeight
  );

  const zoom = clampZoom(fitZoom, EXCALIDRAW_MIN_ZOOM);
  const verticalAir = viewportHeight - planeHeight * zoom;
  const wideScreenLift = Math.max(0, verticalAir - 160) * 0.5;
  const x = narrow
    ? Number(
        (
          NARROW_CONTENT_GUTTER +
          (planeWidth * zoom) / 2 -
          viewportWidth / 2 -
          NARROW_CONTENT_LEFT * zoom
        ).toFixed(2)
      )
    : 0;

  return {
    ...baseView,
    x,
    y: Number((-wideScreenLift).toFixed(2)),
    zoom,
  };
};

export const applyCanvasWheelGesture = (
  view,
  { deltaX, deltaY, ctrlKey, metaKey, deltaMode = 0 }
) => {
  if (ctrlKey || metaKey) {
    if (deltaY === 0) {
      return { ...view };
    }
    return {
      ...view,
      zoom: stepZoom(view.zoom, deltaY < 0 ? 1 : -1),
    };
  }

  const deltaScale = deltaMode === 1 ? 16 : deltaMode === 2 ? 100 : 1;
  return {
    ...view,
    x: view.x - deltaX * deltaScale,
    y: view.y - deltaY * deltaScale,
  };
};

export const applyCanvasPanGesture = (view, { deltaX, deltaY }) => ({
  ...view,
  x: view.x + deltaX,
  y: view.y + deltaY,
});

export const applyCanvasPinchGesture = (
  view,
  {
    startCenter,
    currentCenter,
    viewportCenter,
    startDistance,
    currentDistance,
    minimumZoom = MIN_ZOOM,
  }
) => {
  if (
    !Number.isFinite(startDistance) ||
    !Number.isFinite(currentDistance) ||
    startDistance <= 0
  ) {
    return { ...view };
  }

  const zoom = clampZoom(
    view.zoom * Math.max(0, currentDistance / startDistance),
    minimumZoom
  );
  const anchorX = (startCenter.x - viewportCenter.x - view.x) / view.zoom;
  const anchorY = (startCenter.y - viewportCenter.y - view.y) / view.zoom;

  return {
    ...view,
    x: currentCenter.x - viewportCenter.x - anchorX * zoom,
    y: currentCenter.y - viewportCenter.y - anchorY * zoom,
    zoom,
  };
};

export const getZoomControlState = (expanded) => ({
  expanded: Boolean(expanded),
  showIncrementControls: Boolean(expanded),
});

export const getGenerationSequence = (reducedMotion) => [
  { state: "references-selected", at: 0 },
  {
    state: "generating",
    at: reducedMotion ? 0 : REFERENCE_SELECTION_SETTLE_MS,
  },
  {
    state: "generated",
    at: reducedMotion
      ? 0
      : REFERENCE_SELECTION_SETTLE_MS + GENERATION_SETTLE_MS,
  },
];

export const composeTransform = ({ x, y, zoom }) =>
  `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0) scale(${zoom})`;
