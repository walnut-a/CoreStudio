import { normalizeGenerationRequest } from "../shared/providerCatalog";
import type {
  DesktopBridgeApi,
  PublicProviderSettings,
  SaveProviderSettingsInput,
} from "../shared/desktopBridgeTypes";
import type { GenerationRequest } from "../shared/providerTypes";
import { copy } from "./copy";
import { resolvePreferredGenerationModelSelection } from "./generationModelSelection";

const NO_HANDLER_REGISTERED_FRAGMENT = "No handler registered";

const delay = (ms: number) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

const shouldRetryProviderSettingsLoad = (error: unknown) => {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return message.includes(NO_HANDLER_REGISTERED_FRAGMENT);
};

export const loadProviderSettingsWithRetry = async (
  bridge: DesktopBridgeApi,
  {
    retryCount = 4,
    retryDelayMs = 120,
  }: {
    retryCount?: number;
    retryDelayMs?: number;
  } = {},
): Promise<PublicProviderSettings> => {
  let lastError: unknown;

  for (let attempt = 0; attempt < retryCount; attempt += 1) {
    try {
      return await bridge.loadProviderSettings();
    } catch (error) {
      lastError = error;
      if (!shouldRetryProviderSettingsLoad(error) || attempt === retryCount - 1) {
        throw error;
      }
      await delay(retryDelayMs);
    }
  }

  throw lastError;
};

const formatProviderSettingsLoadError = (error: unknown) =>
  error instanceof Error
    ? error.message || copy.startup.providerLoadFailed
    : copy.startup.providerLoadFailed;

type SetGenerateRequest = (
  updater: (current: GenerationRequest) => GenerationRequest,
) => void;

export const runProviderSettingsLoadAction = async ({
  bridge,
  isGenerationModelSelectionLocked,
  setProviderSettings,
  setGenerateRequest,
  setStartupError,
  retryCount,
  retryDelayMs,
}: {
  bridge: DesktopBridgeApi | null | undefined;
  isGenerationModelSelectionLocked: () => boolean;
  setProviderSettings: (settings: PublicProviderSettings) => void;
  setGenerateRequest: SetGenerateRequest;
  setStartupError: (message: string | null) => void;
  retryCount?: number;
  retryDelayMs?: number;
}) => {
  if (!bridge) {
    return { status: "skipped" as const };
  }

  try {
    const nextProviderSettings = await loadProviderSettingsWithRetry(bridge, {
      retryCount,
      retryDelayMs,
    });
    setProviderSettings(nextProviderSettings);

    if (!isGenerationModelSelectionLocked()) {
      const selection = resolvePreferredGenerationModelSelection({
        providerSettings: nextProviderSettings,
        rememberedSelection: null,
      });
      setGenerateRequest((current) =>
        normalizeGenerationRequest(
          {
            ...current,
            provider: selection.provider,
            model: selection.model,
          },
          {
            customModels:
              nextProviderSettings[selection.provider]?.customModels ?? [],
          },
        ),
      );
    }

    setStartupError(null);
    return {
      status: "loaded" as const,
      providerSettings: nextProviderSettings,
    };
  } catch (error) {
    const errorMessage = formatProviderSettingsLoadError(error);
    setStartupError(errorMessage);
    return {
      status: "failed" as const,
      errorMessage,
    };
  }
};

export const runProviderSettingsSaveAction = async ({
  saveProviderSettings,
  input,
  setProviderSettings,
  setSavingProviders,
}: {
  saveProviderSettings: (
    input: SaveProviderSettingsInput,
  ) => Promise<PublicProviderSettings>;
  input: SaveProviderSettingsInput;
  setProviderSettings: (settings: PublicProviderSettings) => void;
  setSavingProviders: (saving: boolean) => void;
}) => {
  setSavingProviders(true);
  try {
    const nextSettings = await saveProviderSettings(input);
    setProviderSettings(nextSettings);
    return {
      status: "saved" as const,
      providerSettings: nextSettings,
    };
  } finally {
    setSavingProviders(false);
  }
};

export const createProviderSettingsRendererActions = ({
  saveProviderSettings,
  setProviderSettings,
  setSavingProviders,
}: {
  saveProviderSettings: (
    input: SaveProviderSettingsInput,
  ) => Promise<PublicProviderSettings>;
  setProviderSettings: (settings: PublicProviderSettings) => void;
  setSavingProviders: (saving: boolean) => void;
}) => ({
  saveSettings: async (input: SaveProviderSettingsInput) => {
    await runProviderSettingsSaveAction({
      saveProviderSettings,
      input,
      setProviderSettings,
      setSavingProviders,
    });
  },
});
