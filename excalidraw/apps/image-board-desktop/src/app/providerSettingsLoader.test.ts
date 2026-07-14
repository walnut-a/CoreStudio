import { describe, expect, it, vi } from "vitest";

import type {
  DeleteProviderSettingsInput,
  DesktopBridgeApi,
  ProviderConfigurationSnapshot,
  PublicProviderSettings,
  SaveProviderSettingsInput,
} from "../shared/desktopBridgeTypes";
import type { GenerationRequest } from "../shared/providerTypes";

import {
  createProviderSettingsRendererActions,
  loadProviderSettingsWithRetry,
  runProviderSettingsLoadAction,
  runProviderSettingsDeleteAction,
  runProviderSettingsSaveAction,
} from "./providerSettingsLoader";

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
  jimeng: {
    isConfigured: false,
    defaultModel: "doubao-seedream-5-0-lite-260128",
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
  openai: {
    isConfigured: false,
    defaultModel: "gpt-image-1.5",
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
  openrouter: {
    isConfigured: false,
    defaultModel: "google/gemini-3.1-flash-image-preview",
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
  "openai-compatible": {
    isConfigured: false,
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
};

const providerConfigurationFixture: ProviderConfigurationSnapshot = {
  schemaVersion: 2,
  defaultProvider: "gemini",
  providers: providerSettingsFixture,
};

const createRequest = (
  patch: Partial<GenerationRequest> = {},
): GenerationRequest => ({
  provider: "zenmux",
  model: "google/gemini-2.5-flash-image",
  prompt: "生成一台桌面 CNC",
  negativePrompt: "",
  aspectRatio: null,
  width: 1024,
  height: 1024,
  seed: null,
  imageCount: 1,
  reference: null,
  ...patch,
});

describe("loadProviderSettingsWithRetry", () => {
  it("retries when Electron handlers are not registered yet", async () => {
    const loadProviderSettings = vi
      .fn<DesktopBridgeApi["loadProviderSettings"]>()
      .mockRejectedValueOnce(
        new Error(
          "Error invoking remote method 'image-board:load-provider-settings': Error: No handler registered for 'image-board:load-provider-settings'",
        ),
      )
      .mockResolvedValueOnce(providerConfigurationFixture);

    await expect(
      loadProviderSettingsWithRetry(createBridge(loadProviderSettings), {
        retryCount: 2,
        retryDelayMs: 0,
      }),
    ).resolves.toEqual(providerConfigurationFixture);

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

describe("runProviderSettingsLoadAction", () => {
  it("loads settings and updates the preferred generation model when selection is not locked", async () => {
    const bridge = createBridge(
      vi.fn().mockResolvedValue(providerConfigurationFixture),
    );
    const setProviderSettings = vi.fn();
    const setStartupError = vi.fn();
    const setGenerateRequest = vi.fn();

    await expect(
      runProviderSettingsLoadAction({
        bridge,
        isGenerationModelSelectionLocked: () => false,
        setProviderSettings,
        setGenerateRequest,
        setStartupError,
        retryDelayMs: 0,
      }),
    ).resolves.toEqual({
      status: "loaded",
      providerConfiguration: providerConfigurationFixture,
    });

    expect(setProviderSettings).toHaveBeenCalledWith(
      providerConfigurationFixture,
    );
    expect(setStartupError).toHaveBeenCalledWith(null);
    expect(setGenerateRequest).toHaveBeenCalledTimes(1);

    const updateRequest = setGenerateRequest.mock.calls[0]?.[0] as (
      current: GenerationRequest,
    ) => GenerationRequest;
    expect(updateRequest(createRequest())).toMatchObject({
      provider: "gemini",
      model: "imagen-4.0-generate-001",
    });
  });

  it("keeps the current generation request when model selection is locked", async () => {
    const bridge = createBridge(
      vi.fn().mockResolvedValue(providerConfigurationFixture),
    );
    const setGenerateRequest = vi.fn();

    await runProviderSettingsLoadAction({
      bridge,
      isGenerationModelSelectionLocked: () => true,
      setProviderSettings: vi.fn(),
      setGenerateRequest,
      setStartupError: vi.fn(),
      retryDelayMs: 0,
    });

    expect(setGenerateRequest).not.toHaveBeenCalled();
  });

  it("writes a readable startup error when provider settings cannot be loaded", async () => {
    const bridge = createBridge(vi.fn().mockRejectedValue(null));
    const setStartupError = vi.fn();

    await expect(
      runProviderSettingsLoadAction({
        bridge,
        isGenerationModelSelectionLocked: () => false,
        setProviderSettings: vi.fn(),
        setGenerateRequest: vi.fn(),
        setStartupError,
        retryDelayMs: 0,
      }),
    ).resolves.toEqual({
      status: "failed",
      errorMessage: "桌面连接异常，暂时无法读取模型服务配置。",
    });

    expect(setStartupError).toHaveBeenCalledWith(
      "桌面连接异常，暂时无法读取模型服务配置。",
    );
  });
});

describe("runProviderSettingsSaveAction", () => {
  const input: SaveProviderSettingsInput = {
    provider: "gemini",
    apiKey: "sk-test",
    defaultModel: "imagen-4.0-generate-001",
  };

  it("saves settings and applies the returned provider settings", async () => {
    const saveProviderSettings = vi
      .fn()
      .mockResolvedValue(providerConfigurationFixture);
    const setSavingProviders = vi.fn();
    const setProviderSettings = vi.fn();

    await expect(
      runProviderSettingsSaveAction({
        saveProviderSettings,
        input,
        setProviderSettings,
        setSavingProviders,
      }),
    ).resolves.toEqual({
      status: "saved",
      providerConfiguration: providerConfigurationFixture,
    });

    expect(saveProviderSettings).toHaveBeenCalledWith(input);
    expect(setSavingProviders).toHaveBeenNthCalledWith(1, true);
    expect(setProviderSettings).toHaveBeenCalledWith(
      providerConfigurationFixture,
    );
    expect(setSavingProviders).toHaveBeenLastCalledWith(false);
  });

  it("turns off the saving state when saving settings fails", async () => {
    const saveProviderSettings = vi
      .fn()
      .mockRejectedValue(new Error("save failed"));
    const setSavingProviders = vi.fn();
    const setProviderSettings = vi.fn();

    await expect(
      runProviderSettingsSaveAction({
        saveProviderSettings,
        input,
        setProviderSettings,
        setSavingProviders,
      }),
    ).rejects.toThrow("save failed");

    expect(setSavingProviders).toHaveBeenNthCalledWith(1, true);
    expect(setProviderSettings).not.toHaveBeenCalled();
    expect(setSavingProviders).toHaveBeenLastCalledWith(false);
  });
});

describe("createProviderSettingsRendererActions", () => {
  const input: SaveProviderSettingsInput = {
    provider: "gemini",
    apiKey: "sk-test",
    defaultModel: "imagen-4.0-generate-001",
  };

  it("creates a save handler for provider settings persistence", async () => {
    const saveProviderSettings = vi
      .fn()
      .mockResolvedValue(providerConfigurationFixture);
    const setSavingProviders = vi.fn();
    const setProviderSettings = vi.fn();
    const actions = createProviderSettingsRendererActions({
      saveProviderSettings,
      deleteProviderSettings: vi.fn(),
      setProviderSettings,
      setSavingProviders,
    });

    await expect(actions.saveSettings(input)).resolves.toBeUndefined();

    expect(saveProviderSettings).toHaveBeenCalledWith(input);
    expect(setSavingProviders).toHaveBeenNthCalledWith(1, true);
    expect(setProviderSettings).toHaveBeenCalledWith(
      providerConfigurationFixture,
    );
    expect(setSavingProviders).toHaveBeenLastCalledWith(false);
  });

  it("creates a delete handler and applies the returned configuration", async () => {
    const input: DeleteProviderSettingsInput = { provider: "gemini" };
    const nextConfiguration = {
      ...providerConfigurationFixture,
      defaultProvider: null,
      providers: {
        ...providerSettingsFixture,
        gemini: {
          ...providerSettingsFixture.gemini,
          isConfigured: false,
        },
      },
    } satisfies ProviderConfigurationSnapshot;
    const deleteProviderSettings = vi.fn().mockResolvedValue(nextConfiguration);
    const setProviderSettings = vi.fn();

    await expect(
      runProviderSettingsDeleteAction({
        deleteProviderSettings,
        input,
        setProviderSettings,
      }),
    ).resolves.toEqual({
      status: "deleted",
      providerConfiguration: nextConfiguration,
    });
    expect(setProviderSettings).toHaveBeenCalledWith(nextConfiguration);
  });
});
