import { describe, expect, it } from "vitest";

import {
  resolveDesktopLocale,
  type DesktopLocalePreference,
} from "./desktopLocale";

describe("desktop locale", () => {
  it("maps Chinese system locales to the shared zh-CN catalog", () => {
    expect(resolveDesktopLocale("system", ["zh-TW", "en-US"])).toBe("zh-CN");
  });

  it("uses English for non-Chinese system locales", () => {
    expect(resolveDesktopLocale("system", ["ja-JP", "en-US"])).toBe("en");
  });

  it.each<DesktopLocalePreference>(["zh-CN", "en"])(
    "keeps an explicit %s preference",
    (preference) => {
      expect(resolveDesktopLocale(preference, ["zh-CN"])).toBe(preference);
    },
  );

  it("treats missing and malformed preferences as system", () => {
    expect(resolveDesktopLocale(undefined, ["zh-CN"])).toBe("zh-CN");
    expect(
      resolveDesktopLocale("fr" as DesktopLocalePreference, ["en-US"]),
    ).toBe("en");
  });
});
