import type { AppState, NormalizedZoomValue } from "../types";

import { getNormalizedZoom } from "./normalize";

const WHEEL_ZOOM_SENSITIVITY = 0.0065;
const WHEEL_ZOOM_MAX_ABS_DELTA = 17;

export const getStateForZoom = (
  {
    viewportX,
    viewportY,
    nextZoom,
  }: {
    viewportX: number;
    viewportY: number;
    nextZoom: NormalizedZoomValue;
  },
  appState: AppState,
) => {
  const appLayerX = viewportX - appState.offsetLeft;
  const appLayerY = viewportY - appState.offsetTop;

  const currentZoom = appState.zoom.value;

  // get original scroll position without zoom
  const baseScrollX = appState.scrollX + (appLayerX - appLayerX / currentZoom);
  const baseScrollY = appState.scrollY + (appLayerY - appLayerY / currentZoom);

  // get scroll offsets for target zoom level
  const zoomOffsetScrollX = -(appLayerX - appLayerX / nextZoom);
  const zoomOffsetScrollY = -(appLayerY - appLayerY / nextZoom);

  return {
    scrollX: baseScrollX + zoomOffsetScrollX,
    scrollY: baseScrollY + zoomOffsetScrollY,
    zoom: {
      value: nextZoom,
    },
  };
};

export const getWheelZoomValue = (
  currentZoom: number,
  deltaY: number,
): NormalizedZoomValue => {
  const zoom =
    Number.isFinite(currentZoom) && currentZoom > 0 ? currentZoom : 1;
  const delta = Number.isFinite(deltaY) ? deltaY : 0;
  const cappedDelta =
    Math.sign(delta) * Math.min(Math.abs(delta), WHEEL_ZOOM_MAX_ABS_DELTA);
  const zoomFactor = 1 + Math.log10(Math.max(1, zoom)) * 0.35;

  return getNormalizedZoom(
    zoom * Math.exp(-cappedDelta * WHEEL_ZOOM_SENSITIVITY * zoomFactor),
  );
};
