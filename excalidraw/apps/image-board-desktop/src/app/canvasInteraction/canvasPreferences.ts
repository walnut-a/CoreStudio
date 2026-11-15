import { CaptureUpdateAction } from "@excalidraw/element";
import { restoreAppState } from "@excalidraw/excalidraw/data/restore";

import type {
  AppState,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";
import type { DesktopCanvasPreferences } from "../../shared/canvasInteractionSettings";
import type { DesktopBridgeApi } from "../../shared/desktopBridgeTypes";

type PreferencesBridge = Pick<
  DesktopBridgeApi,
  | "loadCanvasInteractionSettings"
  | "saveCanvasPreferences"
  | "onCanvasInteractionSettingsChanged"
>;
const pickPreferences = (
  state: DesktopCanvasPreferences,
): DesktopCanvasPreferences => ({
  fontTopPicks: state.fontTopPicks,
  colorTopPicks: state.colorTopPicks,
  inputDevice: state.inputDevice,
});

/** Project renderers use ephemeral browser partitions. Save personal preferences
 * through the desktop profile, never localStorage or the shared project scene. */
export const bindCanvasPreferences = (
  api: ExcalidrawImperativeAPI,
  bridge: PreferencesBridge,
): (() => void) => {
  if (!bridge.loadCanvasInteractionSettings || !bridge.saveCanvasPreferences) {
    return () => {};
  }
  let active = true;
  let loaded = false;
  let receivedSettings = false;
  let pendingWrites = 0;
  let lastState = pickPreferences(api.getAppState());
  let lastSerialized = JSON.stringify(lastState);
  let pendingRestore: string | null = null;
  const editedDuringLoad = new Set<keyof DesktopCanvasPreferences>();

  const restore = (preferences?: DesktopCanvasPreferences) => {
    if (!preferences) {
      return;
    }
    const normalized = pickPreferences(restoreAppState(preferences, null));
    const serialized = JSON.stringify(normalized);
    lastSerialized = serialized;
    if (serialized !== JSON.stringify(pickPreferences(api.getAppState()))) {
      pendingRestore = serialized;
      api.updateScene({
        appState: normalized,
        captureUpdate: CaptureUpdateAction.NEVER,
      });
    }
  };
  const persist = (preferences: DesktopCanvasPreferences) => {
    pendingWrites++;
    void bridge.saveCanvasPreferences!(preferences)
      .catch((error) => {
        console.error("[canvas-preferences] 保存个人偏好失败", error);
      })
      .finally(() => {
        pendingWrites--;
      });
  };

  const unsubscribe = api.onChange((_elements, state: AppState) => {
    const preferences = pickPreferences(state);
    if (!loaded) {
      for (const key of Object.keys(
        preferences,
      ) as (keyof DesktopCanvasPreferences)[]) {
        if (
          JSON.stringify(preferences[key]) !== JSON.stringify(lastState[key])
        ) {
          editedDuringLoad.add(key);
        }
      }
      lastState = preferences;
      return;
    }
    if (
      !pendingRestore &&
      state.fontTopPicks === lastState.fontTopPicks &&
      state.colorTopPicks === lastState.colorTopPicks &&
      state.inputDevice === lastState.inputDevice
    ) {
      return;
    }
    const serialized = JSON.stringify(preferences);
    if (pendingRestore) {
      if (serialized !== pendingRestore) {
        return;
      }
      pendingRestore = null;
    }
    lastState = preferences;
    if (serialized !== lastSerialized) {
      lastSerialized = serialized;
      persist(preferences);
    }
  });
  const unsubscribeSettings = bridge.onCanvasInteractionSettingsChanged?.(
    (settings) => {
      if (!active || pendingWrites) {
        return;
      }
      receivedSettings = true;
      loaded = true;
      restore(settings.canvasPreferences);
    },
  );
  void bridge
    .loadCanvasInteractionSettings()
    .then((settings) => {
      if (!active || receivedSettings) {
        return;
      }
      const preferences = { ...lastState, ...settings.canvasPreferences };
      for (const key of editedDuringLoad) {
        Object.assign(preferences, { [key]: lastState[key] });
      }
      loaded = true;
      restore(preferences);
      if (editedDuringLoad.size) {
        persist(preferences);
      }
    })
    .catch((error) => {
      loaded = true;
      console.error("[canvas-preferences] 读取个人偏好失败", error);
    });
  return () => {
    active = false;
    unsubscribe();
    unsubscribeSettings?.();
  };
};
