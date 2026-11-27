import { ipcMain, type WebContents } from "electron";
import type { DesktopLocalePreference } from "../src/shared/desktopLocale";
import type { TrackpadZoomSpeed } from "../src/shared/canvasInteractionSettings";
import type { createLocaleSettingsController } from "./localeSettingsController";
import type { createCanvasInteractionSettingsController } from "./canvasInteractionSettingsController";
import { IPC_CHANNELS } from "../src/shared/desktopBridgeTypes";

export const registerDesktopSettingsIpc = (
  requireSender: (sender: WebContents) => void,
  locale: () => ReturnType<typeof createLocaleSettingsController> | null,
  interaction: () => ReturnType<
    typeof createCanvasInteractionSettingsController
  > | null,
) => {
  ipcMain.handle(IPC_CHANNELS.loadLocaleSettings, async (event) => {
    requireSender(event.sender);
    return locale()?.getSettings();
  });
  ipcMain.handle(
    IPC_CHANNELS.saveLocalePreference,
    async (event, preference: DesktopLocalePreference) => {
      requireSender(event.sender);
      const localeSettingsController = locale();
      if (!localeSettingsController) {
        throw new Error("Locale settings are not ready.");
      }
      return localeSettingsController.savePreference(preference);
    },
  );
  ipcMain.handle(IPC_CHANNELS.loadCanvasInteractionSettings, async (event) => {
    requireSender(event.sender);
    const canvasInteractionSettingsController = interaction();
    if (!canvasInteractionSettingsController) {
      throw new Error("Canvas interaction settings are not ready.");
    }
    return canvasInteractionSettingsController.getSettings();
  });
  ipcMain.handle(
    IPC_CHANNELS.saveCanvasPreferences,
    async (event, preferences) => {
      requireSender(event.sender);
      const controller = interaction();
      if (!controller) {
        throw new Error("Canvas interaction settings are not ready.");
      }
      return controller.savePreferences(preferences);
    },
  );
  ipcMain.handle(
    IPC_CHANNELS.saveTrackpadZoomSpeed,
    async (event, speed: TrackpadZoomSpeed) => {
      requireSender(event.sender);
      const canvasInteractionSettingsController = interaction();
      if (!canvasInteractionSettingsController) {
        throw new Error("Canvas interaction settings are not ready.");
      }
      return canvasInteractionSettingsController.saveTrackpadZoomSpeed(speed);
    },
  );
};
