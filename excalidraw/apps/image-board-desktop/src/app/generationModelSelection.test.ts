import { afterEach, describe, expect, it, vi } from "vitest";

import type { PublicProviderSettings } from "../shared/desktopBridgeTypes";
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
} satisfies PublicProviderSettings;

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

  it("prefers remembered selection over configured providers", () => {
    const selection = resolvePreferredGenerationModelSelection({
      providerSettings,
      rememberedSelection: {
        provider: "zenmux",
        model: "google/gemini-3-pro-image-preview",
      },
    });

    expect(selection).toEqual({
      provider: "zenmux",
      model: "google/gemini-3-pro-image-preview",
    });
  });

  it("uses the first configured provider when no local memory exists", () => {
    const selection = resolvePreferredGenerationModelSelection({
      providerSettings,
      rememberedSelection: null,
    });

    expect(selection).toEqual({
      provider: "fal",
      model: "fal-ai/nano-banana-2",
    });
  });

  it("falls back to the first provider when nothing is configured", () => {
    const selection = resolvePreferredGenerationModelSelection({
      providerSettings: null,
      rememberedSelection: null,
    });

    expect(selection).toEqual({
      provider: "gemini",
      model: "gemini-2.5-flash-image",
    });
  });

  it("falls back to the provider default when remembered model is no longer listed", () => {
    const selection = resolvePreferredGenerationModelSelection({
      providerSettings,
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
