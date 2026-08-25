import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_TRACKPAD_ZOOM_SPEED,
  type DesktopCanvasInteractionSettings,
  type TrackpadZoomSpeed,
} from "../../shared/canvasInteractionSettings";

interface CanvasInteractionSettingsContextValue
  extends DesktopCanvasInteractionSettings {
  setTrackpadZoomSpeed: (speed: TrackpadZoomSpeed) => Promise<void>;
}

const CanvasInteractionSettingsContext =
  createContext<CanvasInteractionSettingsContextValue | null>(null);

const DEFAULT_SETTINGS: DesktopCanvasInteractionSettings = {
  schemaVersion: 1,
  trackpadZoomSpeed: DEFAULT_TRACKPAD_ZOOM_SPEED,
};

export const CanvasInteractionSettingsProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [settings, setSettings] =
    useState<DesktopCanvasInteractionSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let active = true;
    const unsubscribe =
      window.imageBoardDesktop?.onCanvasInteractionSettingsChanged?.(
        (nextSettings) => {
          if (active) {
            setSettings(nextSettings);
          }
        },
      );
    void window.imageBoardDesktop
      ?.loadCanvasInteractionSettings?.()
      .then((loadedSettings) => {
        if (active) {
          setSettings(loadedSettings);
        }
      });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const value = useMemo<CanvasInteractionSettingsContextValue>(
    () => ({
      ...settings,
      setTrackpadZoomSpeed: async (speed) => {
        const savedSettings =
          await window.imageBoardDesktop?.saveTrackpadZoomSpeed?.(speed);
        setSettings(
          savedSettings ?? {
            schemaVersion: 1,
            trackpadZoomSpeed: speed,
          },
        );
      },
    }),
    [settings],
  );

  return (
    <CanvasInteractionSettingsContext.Provider value={value}>
      {children}
    </CanvasInteractionSettingsContext.Provider>
  );
};

export const useCanvasInteractionSettings = () => {
  const value = useContext(CanvasInteractionSettingsContext);
  if (!value) {
    throw new Error(
      "useCanvasInteractionSettings must be used inside CanvasInteractionSettingsProvider",
    );
  }
  return value;
};
