export const MIN_ZOOM = 0.72;
export const MAX_ZOOM = 1.3;
export const ZOOM_STEP = 0.1;
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

export const clampZoom = (value) =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));

export const stepZoom = (current, direction) =>
  clampZoom(current + Math.sign(direction) * ZOOM_STEP);

export const applyCanvasWheelGesture = (
  view,
  { deltaX, deltaY, ctrlKey, metaKey, deltaMode = 0 },
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

const clampPercent = (value, size) =>
  Math.min(100 - size, Math.max(0, value));

export const getMinimapViewport = ({ x, y, zoom }) => {
  const width = Math.min(84, 42 / zoom);
  const height = Math.min(78, 35 / zoom);
  const centerX = 50 - x / 34;
  const centerY = 50 - y / 24;

  return {
    x: clampPercent(centerX - width / 2, width),
    y: clampPercent(centerY - height / 2, height),
    width,
    height,
  };
};
