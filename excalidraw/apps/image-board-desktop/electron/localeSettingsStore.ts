import fs from "fs/promises";
import path from "path";

import {
  isDesktopLocalePreference,
  resolveDesktopLocale,
  type DesktopLocalePreference,
  type DesktopLocaleSettings,
} from "../src/shared/desktopLocale";

interface LocaleSettingsStoreOptions {
  settingsPath: string;
  getSystemLocales: () => readonly string[];
}

interface StoredLocaleSettings {
  schemaVersion: 1;
  preference: DesktopLocalePreference;
}

const readPreference = async (
  settingsPath: string,
): Promise<DesktopLocalePreference> => {
  try {
    const parsed = JSON.parse(
      await fs.readFile(settingsPath, "utf8"),
    ) as Partial<StoredLocaleSettings>;
    return parsed.schemaVersion === 1 &&
      isDesktopLocalePreference(parsed.preference)
      ? parsed.preference
      : "system";
  } catch {
    return "system";
  }
};

export const createLocaleSettingsStore = ({
  settingsPath,
  getSystemLocales,
}: LocaleSettingsStoreOptions) => {
  const toSettings = (
    preference: DesktopLocalePreference,
  ): DesktopLocaleSettings => ({
    preference,
    locale: resolveDesktopLocale(preference, getSystemLocales()),
  });

  return {
    load: async () => toSettings(await readPreference(settingsPath)),
    save: async (
      preference: DesktopLocalePreference,
    ): Promise<DesktopLocaleSettings> => {
      const safePreference = isDesktopLocalePreference(preference)
        ? preference
        : "system";
      const payload: StoredLocaleSettings = {
        schemaVersion: 1,
        preference: safePreference,
      };
      await fs.mkdir(path.dirname(settingsPath), { recursive: true });
      const temporaryPath = `${settingsPath}.tmp`;
      await fs.writeFile(temporaryPath, JSON.stringify(payload, null, 2), {
        encoding: "utf8",
        mode: 0o600,
      });
      await fs.rename(temporaryPath, settingsPath);
      return toSettings(safePreference);
    },
  };
};
