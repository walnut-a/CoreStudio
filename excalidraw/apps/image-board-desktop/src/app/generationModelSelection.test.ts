import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  ProviderConfigurationSnapshot,
  PublicProviderSettings,
} from "../shared/desktopBridgeTypes";
import {
  createGenerationModelSelectionRendererActions,
  readRememberedGenerationModelSelection,
  rememberGenerationModelSelection,
  resolvePreferredGenerationModelSelection,
  runGenerationModelSelectionRememberAction,
} from "./generationModelSelection";

const providerSettings = {
  gemini: {
    defaultModel: "gemini-2.5-flash-image",
    isConfigured: false,
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
  zenmux: {
    defaultModel: "google/gemini-3-pro-image-preview",
    isConfigured: false,
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
  fal: {
    defaultModel: "fal-ai/nano-banana-2",
    isConfigured: true,
    lastStatus: "success",
    lastCheckedAt: null,
    lastError: null,
  },
  jimeng: {
    defaultModel: "doubao-seedream-5-0-lite-260128",
    isConfigured: true,
    lastStatus: "success",
    lastCheckedAt: null,
    lastError: null,
  },
  openai: {
    defaultModel: "gpt-image-1.5",
    isConfigured: false,
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
  openrouter: {
    defaultModel: "google/gemini-3.1-flash-image-preview",
    isConfigured: false,
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
} satisfies PublicProviderSettings;

const configuration: ProviderConfigurationSnapshot = {
  schemaVersion: 2,
  defaultProvider: "jimeng",
  providers: providerSettings,
};

afterEach(() => {
  window.localStorage.clear();
});

describe("generationModelSelection", () => {
  it("remembers the last selected provider and model locally", () => {
    rememberGenerationModelSelection({
      provider: "openrouter",
      model: "google/gemini-3.1-flash-image-preview",
    });

    expect(readRememberedGenerationModelSelection()).toEqual({
      provider: "openrouter",
      model: "google/gemini-3.1-flash-image-preview",
    });
  });

  it("applies remembered model selection to renderer refs and storage", () => {
    const selection = {
      provider: "openrouter",
      model: "google/gemini-3.1-flash-image-preview",
    } as const;
    const selectionLockedRef = { current: false };
    const rememberedSelectionRef = {
      current: null as typeof selection | null,
    };
    const rememberSelection = vi.fn();

    const state = runGenerationModelSelectionRememberAction({
      selection,
      selectionLockedRef,
      rememberedSelectionRef,
      rememberSelection,
    });

    expect(state).toEqual({
      selectionLocked: true,
      rememberedSelection: selection,
    });
    expect(selectionLockedRef.current).toBe(true);
    expect(rememberedSelectionRef.current).toBe(selection);
    expect(rememberSelection).toHaveBeenCalledWith(selection);
  });

  it("creates renderer actions for remembering selected provider and model", () => {
    const selection = {
      provider: "openrouter",
      model: "google/gemini-3.1-flash-image-preview",
    } as const;
    const selectionLockedRef = { current: false };
    const rememberedSelectionRef = {
      current: null as typeof selection | null,
    };
    const rememberSelection = vi.fn();
    const actions = createGenerationModelSelectionRendererActions({
      selectionLockedRef,
      rememberedSelectionRef,
      rememberSelection,
    });

    actions.rememberSelection(selection);

    expect(selectionLockedRef.current).toBe(true);
    expect(rememberedSelectionRef.current).toBe(selection);
    expect(rememberSelection).toHaveBeenCalledWith(selection);
  });

  it("prefers a configured remembered selection over the default provider", () => {
    const selection = resolvePreferredGenerationModelSelection({
      configuration,
      rememberedSelection: {
        provider: "fal",
        model: "fal-ai/nano-banana-2",
      },
    });

    expect(selection).toEqual({
      provider: "fal",
      model: "fal-ai/nano-banana-2",
    });
  });

  it("uses the configured default provider when no local memory exists", () => {
    const selection = resolvePreferredGenerationModelSelection({
      configuration,
      rememberedSelection: null,
    });

    expect(selection).toEqual({
      provider: "jimeng",
      model: "doubao-seedream-5-0-lite-260128",
    });
  });

  it("returns null when nothing is configured", () => {
    const selection = resolvePreferredGenerationModelSelection({
      configuration: null,
      rememberedSelection: null,
    });

    expect(selection).toBeNull();
  });

  it("ignores an unconfigured remembered provider", () => {
    const selection = resolvePreferredGenerationModelSelection({
      configuration,
      rememberedSelection: {
        provider: "zenmux",
        model: "google/gemini-3-pro-image-preview",
      },
    });

    expect(selection).toEqual({
      provider: "jimeng",
      model: "doubao-seedream-5-0-lite-260128",
    });
  });

  it("falls back to the provider default when remembered model is no longer listed", () => {
    const selection = resolvePreferredGenerationModelSelection({
      configuration,
      rememberedSelection: {
        provider: "fal",
        model: "removed-model-id",
      },
    });

    expect(selection).toEqual({
      provider: "fal",
      model: "fal-ai/nano-banana-2",
    });
  });
});
