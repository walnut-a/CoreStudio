import {
  getDefaultModel,
  getProviderModels,
  PROVIDER_IDS,
} from "../shared/providerCatalog";
import type { PublicProviderSettings } from "../shared/desktopBridgeTypes";
import type { ProviderId } from "../shared/providerTypes";

const STORAGE_KEY = "corestudio.generation-model-selection.v1";

export interface GenerationModelSelection {
  provider: ProviderId;
  model: string;
}

const isProviderId = (value: unknown): value is ProviderId =>
  typeof value === "string" &&
  PROVIDER_IDS.includes(value as ProviderId);

const getStorage = () => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

const getDefaultModelForProvider = (
  provider: ProviderId,
  providerSettings: PublicProviderSettings | null,
) => providerSettings?.[provider]?.defaultModel || getDefaultModel(provider);

const getKnownModelForProvider = (
  provider: ProviderId,
  model: string | undefined,
  providerSettings: PublicProviderSettings | null,
) => {
  const fallbackModel = getDefaultModelForProvider(provider, providerSettings);
  if (!model) {
    return fallbackModel;
  }

  const providerModels = getProviderModels(
    provider,
    providerSettings?.[provider]?.customModels ?? [],
  );

  return providerModels[model] ? model : fallbackModel;
};

export const readRememberedGenerationModelSelection =
  (): GenerationModelSelection | null => {
    const storage = getStorage();
    if (!storage) {
      return null;
    }

    try {
      const parsed = JSON.parse(storage.getItem(STORAGE_KEY) || "null") as {
        provider?: unknown;
        model?: unknown;
      } | null;

      if (!parsed || !isProviderId(parsed.provider)) {
        return null;
      }

      return {
        provider: parsed.provider,
        model:
          typeof parsed.model === "string"
            ? parsed.model
            : getDefaultModel(parsed.provider),
      };
    } catch {
      return null;
    }
  };

export const rememberGenerationModelSelection = (
  selection: GenerationModelSelection,
) => {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(selection));
  } catch {
    // Local storage can be unavailable in restricted renderer contexts.
  }
};

export const resolvePreferredGenerationModelSelection = ({
  providerSettings,
  rememberedSelection,
}: {
  providerSettings: PublicProviderSettings | null;
  rememberedSelection: GenerationModelSelection | null;
}): GenerationModelSelection => {
  if (rememberedSelection?.provider) {
    return {
      provider: rememberedSelection.provider,
      model: getKnownModelForProvider(
        rememberedSelection.provider,
        rememberedSelection.model,
        providerSettings,
      ),
    };
  }

  const configuredProvider =
    PROVIDER_IDS.find((provider) => providerSettings?.[provider]?.isConfigured) ??
    PROVIDER_IDS[0];

  return {
    provider: configuredProvider,
    model: getDefaultModelForProvider(configuredProvider, providerSettings),
  };
};
