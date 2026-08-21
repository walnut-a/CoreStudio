export const MIN_ZOOM = 0.72;
export const EXCALIDRAW_MIN_ZOOM = 0.01;
export const MAX_ZOOM = 1.3;
export const ZOOM_STEP = 0.1;
export const CANVAS_FIT_PADDING = 24;
export const CAMERA_TRANSITION_MS = 180;
export const GENERATION_SETTLE_MS = 1200;

export const CAMERA_VIEWS = Object.freeze({
  desktop: Object.freeze({
    overview: Object.freeze({ x: 0, y: 8, zoom: 0.9 }),
    generate: Object.freeze({ x: -92, y: 20, zoom: 1 }),
    agent: Object.freeze({ x: -205, y: 70, zoom: 1.08 }),
  }),
  mobile: Object.freeze({
    overview: Object.freeze({ x: 310, y: 34, zoom: 0.8 }),
    generate: Object.freeze({ x: -176, y: 20, zoom: 0.84 }),
    agent: Object.freeze({ x: -238, y: 78, zoom: 0.94 }),
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

export const getZoomControlState = (minimapOpen) => ({
  minimapOpen: Boolean(minimapOpen),
  showIncrementControls: Boolean(minimapOpen),
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
