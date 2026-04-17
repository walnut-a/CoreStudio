import { describe, expect, it, vi } from "vitest";

import type { DesktopBridgeApi, PublicProviderSettings } from "../shared/desktopBridgeTypes";

import { loadProviderSettingsWithRetry } from "./providerSettingsLoader";

const createBridge = (
  loadProviderSettings: DesktopBridgeApi["loadProviderSettings"],
) =>
  ({
    loadProviderSettings,
  }) as DesktopBridgeApi;

const providerSettingsFixture: PublicProviderSettings = {
  gemini: {
    isConfigured: true,
    defaultModel: "imagen-4.0-generate-001",
    lastStatus: "success",
    lastCheckedAt: "2026-04-12T00:00:00.000Z",
    lastError: null,
  },
  zenmux: {
    isConfigured: false,
    defaultModel: "google/gemini-2.5-flash-image",
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
  fal: {
    isConfigured: false,
    defaultModel: "fal-ai/flux/schnell",
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
};

describe("loadProviderSettingsWithRetry", () => {
  it("retries when Electron handlers are not registered yet", async () => {
    const loadProviderSettings = vi
      .fn<DesktopBridgeApi["loadProviderSettings"]>()
      .mockRejectedValueOnce(
        new Error(
          "Error invoking remote method 'image-board:load-provider-settings': Error: No handler registered for 'image-board:load-provider-settings'",
        ),
      )
      .mockResolvedValueOnce(providerSettingsFixture);

    await expect(
      loadProviderSettingsWithRetry(createBridge(loadProviderSettings), {
        retryCount: 2,
        retryDelayMs: 0,
      }),
    ).resolves.toEqual(providerSettingsFixture);

    expect(loadProviderSettings).toHaveBeenCalledTimes(2);
  });

  it("does not swallow unrelated provider loading errors", async () => {
    const loadProviderSettings = vi
      .fn<DesktopBridgeApi["loadProviderSettings"]>()
      .mockRejectedValueOnce(new Error("boom"));

    await expect(
      loadProviderSettingsWithRetry(createBridge(loadProviderSettings), {
        retryCount: 3,
        retryDelayMs: 0,
      }),
    ).rejects.toThrow("boom");

    expect(loadProviderSettings).toHaveBeenCalledTimes(1);
  });
});
