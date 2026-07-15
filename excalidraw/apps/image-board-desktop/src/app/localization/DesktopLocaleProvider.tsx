import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  resolveDesktopLocale,
  type DesktopLocalePreference,
  type DesktopLocaleSettings,
} from "../../shared/desktopLocale";
import { setActiveDesktopLocale } from "../copy";

interface DesktopLocaleContextValue extends DesktopLocaleSettings {
  setPreference: (preference: DesktopLocalePreference) => Promise<void>;
}

const DesktopLocaleContext = createContext<DesktopLocaleContextValue | null>(
  null,
);

const getSystemLocales = () =>
  typeof navigator === "undefined"
    ? []
    : navigator.languages?.length
    ? navigator.languages
    : [navigator.language];

const getInitialSettings = (): DesktopLocaleSettings => ({
  preference: "system",
  locale: resolveDesktopLocale("system", getSystemLocales()),
});

export const DesktopLocaleProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [settings, setSettings] =
    useState<DesktopLocaleSettings>(getInitialSettings);

  setActiveDesktopLocale(settings.locale);

  useEffect(() => {
    let active = true;
    void window.imageBoardDesktop
      ?.loadLocaleSettings?.()
      .then((loadedSettings) => {
        if (active) {
          setSettings(loadedSettings);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<DesktopLocaleContextValue>(
    () => ({
      ...settings,
      setPreference: async (preference) => {
        const savedSettings = window.imageBoardDesktop?.saveLocalePreference
          ? await window.imageBoardDesktop.saveLocalePreference(preference)
          : {
              preference,
              locale: resolveDesktopLocale(preference, getSystemLocales()),
            };
        setSettings(savedSettings);
      },
    }),
    [settings],
  );

  return (
    <DesktopLocaleContext.Provider value={value}>
      {children}
    </DesktopLocaleContext.Provider>
  );
};

export const useDesktopLocale = () => {
  const value = useContext(DesktopLocaleContext);
  if (!value) {
    throw new Error(
      "useDesktopLocale must be used inside DesktopLocaleProvider",
    );
  }
  return value;
};
