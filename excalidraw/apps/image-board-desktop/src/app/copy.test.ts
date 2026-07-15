import { describe, expect, it } from "vitest";

import {
  copy,
  getDesktopCopy,
  getImageSourceLabel,
  getProviderStatusLabel,
  getReferenceInlineStatusText,
  getReferenceSummaryText,
  setActiveDesktopLocale,
} from "./copy";

const collectLeafKeys = (value: unknown, prefix = ""): string[] => {
  if (!value || typeof value !== "object") {
    return [prefix];
  }

  return Object.entries(value).flatMap(([key, nested]) =>
    collectLeafKeys(nested, prefix ? `${prefix}.${key}` : key),
  );
};

describe("CoreStudio copy catalogs", () => {
  it("keeps the English catalog structurally aligned with Chinese", () => {
    expect(collectLeafKeys(getDesktopCopy("en"))).toEqual(
      collectLeafKeys(getDesktopCopy("zh-CN")),
    );
  });

  it("switches existing copy consumers without a parallel component tree", () => {
    setActiveDesktopLocale("en");
    expect(copy.welcome.title).toBe("Choose a project to begin");
    expect(copy.applicationSettings.language).toBe("Language");

    setActiveDesktopLocale("zh-CN");
    expect(copy.welcome.title).toBe("选择项目开始");
    expect(copy.applicationSettings.language).toBe("语言");
  });

  it("localizes computed labels through the same catalog", () => {
    setActiveDesktopLocale("en");

    expect(getReferenceSummaryText(3, 1)).toBe(
      "3 elements selected, including 1 text element.",
    );
    expect(getReferenceInlineStatusText(true, 2)).toBe("Referenced: 2");
    expect(getImageSourceLabel("imported")).toBe("Imported");
    expect(getProviderStatusLabel(undefined)).toBe("Not configured");

    setActiveDesktopLocale("zh-CN");
  });
});
