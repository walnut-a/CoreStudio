import fs from "fs/promises";
import path from "path";

import {
  DEFAULT_TRACKPAD_ZOOM_SPEED,
  isTrackpadZoomSpeed,
  type DesktopCanvasInteractionSettings,
  type TrackpadZoomSpeed,
} from "../src/shared/canvasInteractionSettings";

interface CanvasInteractionSettingsStoreOptions {
  settingsPath: string;
}

const toSettings = (
  trackpadZoomSpeed: TrackpadZoomSpeed,
): DesktopCanvasInteractionSettings => ({
  schemaVersion: 1,
  trackpadZoomSpeed,
});

const readTrackpadZoomSpeed = async (
  settingsPath: string,
): Promise<TrackpadZoomSpeed> => {
  try {
    const parsed = JSON.parse(
      await fs.readFile(settingsPath, "utf8"),
    ) as Partial<DesktopCanvasInteractionSettings>;
    return parsed.schemaVersion === 1 &&
      isTrackpadZoomSpeed(parsed.trackpadZoomSpeed)
      ? parsed.trackpadZoomSpeed
      : DEFAULT_TRACKPAD_ZOOM_SPEED;
  } catch {
    return DEFAULT_TRACKPAD_ZOOM_SPEED;
  }
};

export const createCanvasInteractionSettingsStore = ({
  settingsPath,
}: CanvasInteractionSettingsStoreOptions) => ({
  load: async () => toSettings(await readTrackpadZoomSpeed(settingsPath)),
  save: async (
    trackpadZoomSpeed: TrackpadZoomSpeed,
  ): Promise<DesktopCanvasInteractionSettings> => {
    const safeSpeed = isTrackpadZoomSpeed(trackpadZoomSpeed)
      ? trackpadZoomSpeed
      : DEFAULT_TRACKPAD_ZOOM_SPEED;
    const payload = toSettings(safeSpeed);
    await fs.mkdir(path.dirname(settingsPath), { recursive: true });
    const temporaryPath = `${settingsPath}.tmp`;
    await fs.writeFile(temporaryPath, JSON.stringify(payload, null, 2), {
      encoding: "utf8",
      mode: 0o600,
    });
    await fs.rename(temporaryPath, settingsPath);
    return payload;
  },
});
