export const MIN_ZOOM = 0.72;
export const EXCALIDRAW_MIN_ZOOM = 0.01;
export const MAX_ZOOM = 1.3;
export const ZOOM_STEP = 0.1;
export const CANVAS_FIT_PADDING = 24;
export const CAMERA_TRANSITION_MS = 180;
export const GENERATION_SETTLE_MS = 1200;

export const CAMERA_VIEWS = Object.freeze({
  desktop: Object.freeze({
    overview: Object.freeze({ x: 0, y: 0, zoom: 0.9 }),
    generate: Object.freeze({ x: -360, y: 32, zoom: 1 }),
    agent: Object.freeze({ x: -450, y: -130, zoom: 1.04 }),
  }),
  mobile: Object.freeze({
    overview: Object.freeze({ x: 390, y: -40, zoom: 0.72 }),
    generate: Object.freeze({ x: -350, y: 36, zoom: 0.72 }),
    agent: Object.freeze({ x: -430, y: -80, zoom: 0.8 }),
  }),
});

export const clampZoom = (value, minimumZoom = MIN_ZOOM) =>
  Math.min(MAX_ZOOM, Math.max(minimumZoom, Number(value.toFixed(2))));

export const stepZoom = (current, direction, minimumZoom = MIN_ZOOM) =>
  clampZoom(current + Math.sign(direction) * ZOOM_STEP, minimumZoom);

export const getCanvasMinimumZoom = ({
  isMobile,
  viewportWidth,
  viewportHeight,
  planeWidth,
  planeHeight,
}) => {
  if (
    !isMobile ||
    viewportWidth <= 0 ||
    viewportHeight <= 0 ||
    planeWidth <= 0 ||
    planeHeight <= 0
  ) {
    return MIN_ZOOM;
  }

  const fitZoom = Math.min(
    Math.max(1, viewportWidth - CANVAS_FIT_PADDING) / planeWidth,
    Math.max(1, viewportHeight - CANVAS_FIT_PADDING) / planeHeight
  );
  return clampZoom(Math.min(MIN_ZOOM, fitZoom), EXCALIDRAW_MIN_ZOOM);
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

  const fitZoom = Math.min(
    Math.max(1, viewportWidth - 120) / planeWidth,
    Math.max(1, viewportHeight - 160) / planeHeight
  );

  const zoom = clampZoom(Math.max(baseView.zoom, fitZoom));
  const verticalAir = viewportHeight - planeHeight * zoom;
  const wideScreenLift = Math.max(0, verticalAir - 160) * 0.5;
  const shortScreenPush = Math.max(0, 900 - viewportHeight) * 0.39;

  return {
    ...baseView,
    y: Number((baseView.y + shortScreenPush - wideScreenLift).toFixed(2)),
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
  { state: "generating", at: 0 },
  {
    state: "generated",
    at: reducedMotion ? 0 : GENERATION_SETTLE_MS,
  },
];

export const composeTransform = ({ x, y, zoom }) =>
  `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0) scale(${zoom})`;
