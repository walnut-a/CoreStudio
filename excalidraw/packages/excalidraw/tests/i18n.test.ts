import { describe, expect, it } from "vitest";

import { normalizeImportedLocaleData } from "../i18n";

describe("i18n", () => {
  it("unwraps bundled JSON locale modules", () => {
    const localeData = {
      buttons: {
        exportImage: "导出图片...",
      },
    };

    expect(normalizeImportedLocaleData({ default: localeData })).toBe(
      localeData,
    );
    expect(normalizeImportedLocaleData(localeData)).toBe(localeData);
  });
});
