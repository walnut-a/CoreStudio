import { describe, expect, it, vi } from "vitest";

import { createLocaleSettingsController } from "./localeSettingsController";

describe("locale settings controller", () => {
  it("applies the stored locale at startup and after a user change", async () => {
    const store = {
      load: vi.fn().mockResolvedValue({
        preference: "system" as const,
        locale: "zh-CN" as const,
      }),
      save: vi.fn().mockResolvedValue({
        preference: "en" as const,
        locale: "en" as const,
      }),
    };
    const onLocaleChanged = vi.fn();
    const controller = createLocaleSettingsController({
      store,
      onLocaleChanged,
    });

    await expect(controller.initialize()).resolves.toEqual({
      preference: "system",
      locale: "zh-CN",
    });
    expect(onLocaleChanged).toHaveBeenLastCalledWith("zh-CN");

    await expect(controller.savePreference("en")).resolves.toEqual({
      preference: "en",
      locale: "en",
    });
    expect(store.save).toHaveBeenCalledWith("en");
    expect(onLocaleChanged).toHaveBeenLastCalledWith("en");
    expect(controller.getSettings()).toEqual({
      preference: "en",
      locale: "en",
    });
  });
});
