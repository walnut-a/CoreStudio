import type {
  DesktopLocale,
  DesktopLocalePreference,
  DesktopLocaleSettings,
} from "../src/shared/desktopLocale";

interface LocaleSettingsStore {
  load: () => Promise<DesktopLocaleSettings>;
  save: (preference: DesktopLocalePreference) => Promise<DesktopLocaleSettings>;
}

interface LocaleSettingsControllerOptions {
  store: LocaleSettingsStore;
  onLocaleChanged: (locale: DesktopLocale) => void;
}

export const createLocaleSettingsController = ({
  store,
  onLocaleChanged,
}: LocaleSettingsControllerOptions) => {
  let settings: DesktopLocaleSettings = {
    preference: "system",
    locale: "en",
  };

  const apply = (nextSettings: DesktopLocaleSettings) => {
    settings = nextSettings;
    onLocaleChanged(settings.locale);
    return settings;
  };

  return {
    initialize: async () => apply(await store.load()),
    getSettings: () => settings,
    savePreference: async (preference: DesktopLocalePreference) =>
      apply(await store.save(preference)),
  };
};
