import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { copy, setActiveDesktopLocale } from "../copy";
import {
  DesktopLocaleProvider,
  useDesktopLocale,
} from "./DesktopLocaleProvider";

const LocaleProbe = () => {
  const { locale, preference, setPreference } = useDesktopLocale();
  return (
    <div>
      <span>{`${preference}:${locale}:${copy.welcome.title}`}</span>
      <button type="button" onClick={() => void setPreference("zh-CN")}>
        switch
      </button>
    </div>
  );
};

afterEach(() => {
  setActiveDesktopLocale("zh-CN");
  delete (window as typeof window & { imageBoardDesktop?: unknown })
    .imageBoardDesktop;
});

describe("DesktopLocaleProvider", () => {
  it("loads the application locale and updates existing copy consumers", async () => {
    const saveLocalePreference = vi.fn().mockResolvedValue({
      preference: "zh-CN",
      locale: "zh-CN",
    });
    Object.defineProperty(window, "imageBoardDesktop", {
      configurable: true,
      value: {
        loadLocaleSettings: vi.fn().mockResolvedValue({
          preference: "en",
          locale: "en",
        }),
        saveLocalePreference,
      },
    });

    render(
      <DesktopLocaleProvider>
        <LocaleProbe />
      </DesktopLocaleProvider>,
    );

    await screen.findByText("en:en:Choose a project to begin");
    fireEvent.click(screen.getByRole("button", { name: "switch" }));

    await waitFor(() =>
      expect(saveLocalePreference).toHaveBeenCalledWith("zh-CN"),
    );
    expect(screen.getByText("zh-CN:zh-CN:选择项目开始")).toBeInTheDocument();
  });
});
