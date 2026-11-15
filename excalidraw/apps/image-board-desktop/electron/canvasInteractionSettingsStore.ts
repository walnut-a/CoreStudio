import fs from "fs/promises";
import path from "path";

import {
  DEFAULT_TRACKPAD_ZOOM_SPEED,
  isTrackpadZoomSpeed,
  normalizeCanvasPreferences,
  type DesktopCanvasInteractionSettings,
  type DesktopCanvasPreferences,
  type TrackpadZoomSpeed,
} from "../src/shared/canvasInteractionSettings";

interface CanvasInteractionSettingsStoreOptions {
  settingsPath: string;
}

const readSettings = async (
  settingsPath: string,
): Promise<DesktopCanvasInteractionSettings> => {
  const defaults: DesktopCanvasInteractionSettings = {
    schemaVersion: 1,
    trackpadZoomSpeed: DEFAULT_TRACKPAD_ZOOM_SPEED,
  };
  try {
    const parsed = JSON.parse(await fs.readFile(settingsPath, "utf8"));
    if (parsed?.schemaVersion !== 1) {
      return defaults;
    }
    const canvasPreferences = normalizeCanvasPreferences(
      parsed.canvasPreferences,
    );
    return {
      ...defaults,
      trackpadZoomSpeed: isTrackpadZoomSpeed(parsed.trackpadZoomSpeed)
        ? parsed.trackpadZoomSpeed
        : DEFAULT_TRACKPAD_ZOOM_SPEED,
      ...(canvasPreferences ? { canvasPreferences } : {}),
    };
  } catch {
    return defaults;
  }
};

export const createCanvasInteractionSettingsStore = ({
  settingsPath,
}: CanvasInteractionSettingsStoreOptions) => {
  // Speed and picker updates can arrive from different project windows.
  // Serialize read-modify-write so neither update loses the other's fields.
  let pending: Promise<unknown> = Promise.resolve();
  const update = (patch: Partial<DesktopCanvasInteractionSettings>) => {
    const next = pending.then(async () => {
      const payload = { ...(await readSettings(settingsPath)), ...patch };
      await fs.mkdir(path.dirname(settingsPath), { recursive: true });
      const temporaryPath = `${settingsPath}.tmp`;
      await fs.writeFile(temporaryPath, JSON.stringify(payload, null, 2), {
        encoding: "utf8",
        mode: 0o600,
      });
      await fs.rename(temporaryPath, settingsPath);
      return payload;
    });
    pending = next.catch(() => undefined);
    return next;
  };
  return {
    load: () => readSettings(settingsPath),
    save: (speed: TrackpadZoomSpeed) =>
      update({
        trackpadZoomSpeed: isTrackpadZoomSpeed(speed)
          ? speed
          : DEFAULT_TRACKPAD_ZOOM_SPEED,
      }),
    savePreferences: (preferences: DesktopCanvasPreferences) =>
      update({
        canvasPreferences: normalizeCanvasPreferences(preferences),
      }),
  };
};
