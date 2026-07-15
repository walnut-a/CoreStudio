import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { setActiveDesktopLocale } from "../copy";
import { GeneralSettingsSection } from "./GeneralSettingsSection";

afterEach(() => {
  setActiveDesktopLocale("zh-CN");
});

describe("GeneralSettingsSection", () => {
  it("offers one shared language preference without branching the UI", () => {
    const onPreferenceChange = vi.fn();
    render(
      <GeneralSettingsSection
        preference="system"
        onPreferenceChange={onPreferenceChange}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "语言" }), {
      target: { value: "en" },
    });

    expect(onPreferenceChange).toHaveBeenCalledWith("en");
  });

  it("renders the same settings surface from the English catalog", () => {
    setActiveDesktopLocale("en");
    render(
      <GeneralSettingsSection
        preference="en"
        onPreferenceChange={() => undefined}
      />,
    );

    expect(screen.getByRole("combobox", { name: "Language" })).toHaveValue(
      "en",
    );
    expect(
      screen.getByText(/CoreStudio and the board interface/),
    ).toBeVisible();
  });
});
