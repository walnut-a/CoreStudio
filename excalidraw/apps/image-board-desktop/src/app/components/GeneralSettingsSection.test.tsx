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
    const onTrackpadZoomSpeedChange = vi.fn();
    render(
      <GeneralSettingsSection
        preference="system"
        onPreferenceChange={onPreferenceChange}
        trackpadZoomSpeed="standard"
        onTrackpadZoomSpeedChange={onTrackpadZoomSpeedChange}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "语言" }), {
      target: { value: "en" },
    });

    expect(onPreferenceChange).toHaveBeenCalledWith("en");

    fireEvent.change(screen.getByRole("slider", { name: "触控板缩放速度" }), {
      target: { value: "3" },
    });

    expect(onTrackpadZoomSpeedChange).toHaveBeenCalledWith("fast");
    expect(screen.getByText("标准")).toBeVisible();
  });

  it("renders the same settings surface from the English catalog", () => {
    setActiveDesktopLocale("en");
    render(
      <GeneralSettingsSection
        preference="en"
        onPreferenceChange={() => undefined}
        trackpadZoomSpeed="slow"
        onTrackpadZoomSpeedChange={() => undefined}
      />,
    );

    expect(screen.getByRole("combobox", { name: "Language" })).toHaveValue(
      "en",
    );
    expect(
      screen.getByText(/CoreStudio and the board interface/),
    ).toBeVisible();
    expect(
      screen.getByRole("slider", { name: "Trackpad zoom speed" }),
    ).toHaveValue("1");
  });
});
