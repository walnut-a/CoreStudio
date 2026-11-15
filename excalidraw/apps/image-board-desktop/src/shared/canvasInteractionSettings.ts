import type { AppState } from "@excalidraw/excalidraw/types";

export type DesktopCanvasPreferences = Pick<
  AppState,
  "fontTopPicks" | "colorTopPicks" | "inputDevice"
>;

export const normalizeCanvasPreferences = (
  value: unknown,
): DesktopCanvasPreferences | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const preferences = value as Partial<DesktopCanvasPreferences>;
  const colors = (key: keyof DesktopCanvasPreferences["colorTopPicks"]) => {
    const list = preferences.colorTopPicks?.[key];
    return Array.isArray(list)
      ? [
          ...new Set(
            list.filter(
              (color) => typeof color === "string" && color.length <= 128,
            ),
          ),
        ].slice(0, 5)
      : null;
  };
  return {
    fontTopPicks: Array.isArray(preferences.fontTopPicks)
      ? [
          ...new Set(
            preferences.fontTopPicks.filter(
              (font) => Number.isInteger(font) && font > 0,
            ),
          ),
        ].slice(0, 3)
      : null,
    colorTopPicks: {
      elementStroke: colors("elementStroke"),
      elementBackground: colors("elementBackground"),
      bucketFill: colors("bucketFill"),
      stickyNoteStroke: colors("stickyNoteStroke"),
      stickyNoteBackground: colors("stickyNoteBackground"),
    },
    inputDevice:
      preferences.inputDevice === "mouse" ||
      preferences.inputDevice === "trackpad"
        ? preferences.inputDevice
        : "auto",
  };
};

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
  canvasPreferences?: DesktopCanvasPreferences;
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
