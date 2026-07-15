import { normalizeGenerationRequest } from "../shared/providerCatalog";
import type {
  DeleteProviderSettingsInput,
  DesktopBridgeApi,
  ProviderConfigurationSnapshot,
  SaveProviderSettingsInput,
} from "../shared/desktopBridgeTypes";
import type { GenerationRequest } from "../shared/providerTypes";
import { copy } from "./copy";
import { resolvePreferredGenerationModelSelection } from "./generationModelSelection";
import type { GenerationModelSelection } from "./generationModelSelection";

const NO_HANDLER_REGISTERED_FRAGMENT = "No handler registered";

const delay = (ms: number) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

const shouldRetryProviderSettingsLoad = (error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
      ? error
      : "";
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
): Promise<ProviderConfigurationSnapshot> => {
  let lastError: unknown;

  for (let attempt = 0; attempt < retryCount; attempt += 1) {
    try {
      return await bridge.loadProviderSettings();
    } catch (error) {
      lastError = error;
      if (
        !shouldRetryProviderSettingsLoad(error) ||
        attempt === retryCount - 1
      ) {
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
  getRememberedGenerationModelSelection = () => null,
  setProviderSettings,
  setGenerateRequest,
  setStartupError,
  retryCount,
  retryDelayMs,
}: {
  bridge: DesktopBridgeApi | null | undefined;
  isGenerationModelSelectionLocked: () => boolean;
  getRememberedGenerationModelSelection?: () => GenerationModelSelection | null;
  setProviderSettings: (settings: ProviderConfigurationSnapshot) => void;
  setGenerateRequest: SetGenerateRequest;
  setStartupError: (message: string | null) => void;
  retryCount?: number;
  retryDelayMs?: number;
}) => {
  if (!bridge) {
    return { status: "skipped" as const };
  }

  try {
    const nextProviderConfiguration = await loadProviderSettingsWithRetry(
      bridge,
      {
        retryCount,
        retryDelayMs,
      },
    );
    setProviderSettings(nextProviderConfiguration);

    if (!isGenerationModelSelectionLocked()) {
      const selection = resolvePreferredGenerationModelSelection({
        configuration: nextProviderConfiguration,
        rememberedSelection: getRememberedGenerationModelSelection(),
      });
      if (selection) {
        setGenerateRequest((current) =>
          normalizeGenerationRequest(
            {
              ...current,
              provider: selection.provider,
              model: selection.model,
            },
            {
              customModels:
                nextProviderConfiguration.providers[selection.provider]
                  ?.customModels ?? [],
            },
          ),
        );
      }
    }

    setStartupError(null);
    return {
      status: "loaded" as const,
      providerConfiguration: nextProviderConfiguration,
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
  ) => Promise<ProviderConfigurationSnapshot>;
  input: SaveProviderSettingsInput;
  setProviderSettings: (settings: ProviderConfigurationSnapshot) => void;
  setSavingProviders: (saving: boolean) => void;
}) => {
  setSavingProviders(true);
  try {
    const nextSettings = await saveProviderSettings(input);
    setProviderSettings(nextSettings);
    return {
      status: "saved" as const,
      providerConfiguration: nextSettings,
    };
  } finally {
    setSavingProviders(false);
  }
};

export const runProviderSettingsDeleteAction = async ({
  deleteProviderSettings,
  input,
  setProviderSettings,
}: {
  deleteProviderSettings: (
    input: DeleteProviderSettingsInput,
  ) => Promise<ProviderConfigurationSnapshot>;
  input: DeleteProviderSettingsInput;
  setProviderSettings: (settings: ProviderConfigurationSnapshot) => void;
}) => {
  const nextConfiguration = await deleteProviderSettings(input);
  setProviderSettings(nextConfiguration);
  return {
    status: "deleted" as const,
    providerConfiguration: nextConfiguration,
  };
};

export const createProviderSettingsRendererActions = ({
  saveProviderSettings,
  deleteProviderSettings,
  setProviderSettings,
  setSavingProviders,
}: {
  saveProviderSettings: (
    input: SaveProviderSettingsInput,
  ) => Promise<ProviderConfigurationSnapshot>;
  deleteProviderSettings: (
    input: DeleteProviderSettingsInput,
  ) => Promise<ProviderConfigurationSnapshot>;
  setProviderSettings: (settings: ProviderConfigurationSnapshot) => void;
  setSavingProviders: (saving: boolean) => void;
}) => ({
  saveSettings: async (input: SaveProviderSettingsInput) => {
    return runProviderSettingsSaveAction({
      saveProviderSettings,
      input,
      setProviderSettings,
      setSavingProviders,
    });
  },
  deleteSettings: async (input: DeleteProviderSettingsInput) =>
    runProviderSettingsDeleteAction({
      deleteProviderSettings,
      input,
      setProviderSettings,
    }),
});
