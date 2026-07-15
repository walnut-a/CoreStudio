export const DESKTOP_LOCALES = ["zh-CN", "en"] as const;

export type DesktopLocale = typeof DESKTOP_LOCALES[number];
export type DesktopLocalePreference = DesktopLocale | "system";

export interface DesktopLocaleSettings {
  preference: DesktopLocalePreference;
  locale: DesktopLocale;
}

export const isDesktopLocalePreference = (
  value: unknown,
): value is DesktopLocalePreference =>
  value === "system" || value === "zh-CN" || value === "en";

const resolveSystemLocale = (systemLocales: readonly string[]): DesktopLocale =>
  systemLocales.some((locale) => locale.toLowerCase().startsWith("zh"))
    ? "zh-CN"
    : "en";

export const resolveDesktopLocale = (
  preference: DesktopLocalePreference | undefined,
  systemLocales: readonly string[],
): DesktopLocale => {
  if (preference === "zh-CN" || preference === "en") {
    return preference;
  }

  return resolveSystemLocale(systemLocales);
};
