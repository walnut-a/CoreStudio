import type { NormalizedZoomValue } from "../types";

import { getNormalizedZoom } from "./normalize";

const WHEEL_ZOOM_SENSITIVITY = 0.0065;
const WHEEL_ZOOM_MAX_ABS_DELTA = 17;

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
