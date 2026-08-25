export const TRACKPAD_ZOOM_SPEEDS = [
  "slowest",
  "slow",
  "standard",
  "fast",
  "fastest",
] as const;

export type TrackpadZoomSpeed = typeof TRACKPAD_ZOOM_SPEEDS[number];

export interface DesktopCanvasInteractionSettings {
  schemaVersion: 1;
  trackpadZoomSpeed: TrackpadZoomSpeed;
}

export const DEFAULT_TRACKPAD_ZOOM_SPEED: TrackpadZoomSpeed = "standard";

const TRACKPAD_ZOOM_SENSITIVITY: Record<TrackpadZoomSpeed, number> = {
  slowest: 0.0035,
  slow: 0.005,
  standard: 0.0065,
  fast: 0.0085,
  fastest: 0.011,
};

export const isTrackpadZoomSpeed = (
  value: unknown,
): value is TrackpadZoomSpeed =>
  typeof value === "string" &&
  TRACKPAD_ZOOM_SPEEDS.includes(value as TrackpadZoomSpeed);

export const getTrackpadZoomSensitivity = (speed: TrackpadZoomSpeed) =>
  TRACKPAD_ZOOM_SENSITIVITY[speed];
