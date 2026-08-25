import {
  DEFAULT_TRACKPAD_ZOOM_SPEED,
  type DesktopCanvasInteractionSettings,
  type TrackpadZoomSpeed,
} from "../src/shared/canvasInteractionSettings";

interface CanvasInteractionSettingsStore {
  load: () => Promise<DesktopCanvasInteractionSettings>;
  save: (
    trackpadZoomSpeed: TrackpadZoomSpeed,
  ) => Promise<DesktopCanvasInteractionSettings>;
}

interface CanvasInteractionSettingsControllerOptions {
  store: CanvasInteractionSettingsStore;
  onSettingsChanged: (settings: DesktopCanvasInteractionSettings) => void;
}

export const createCanvasInteractionSettingsController = ({
  store,
  onSettingsChanged,
}: CanvasInteractionSettingsControllerOptions) => {
  let settings: DesktopCanvasInteractionSettings = {
    schemaVersion: 1,
    trackpadZoomSpeed: DEFAULT_TRACKPAD_ZOOM_SPEED,
  };

  const apply = (nextSettings: DesktopCanvasInteractionSettings) => {
    settings = nextSettings;
    onSettingsChanged(settings);
    return settings;
  };

  return {
    initialize: async () => apply(await store.load()),
    getSettings: () => settings,
    saveTrackpadZoomSpeed: async (trackpadZoomSpeed: TrackpadZoomSpeed) =>
      apply(await store.save(trackpadZoomSpeed)),
  };
};
