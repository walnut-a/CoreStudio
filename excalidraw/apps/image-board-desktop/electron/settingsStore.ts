import fs from "fs/promises";
import path from "path";

import { app } from "electron";

import type {
  PublicProviderSettings,
  SaveProviderSettingsInput,
} from "../src/shared/desktopBridgeTypes";
import {
  isProviderRequestAdapter,
  PROVIDER_IDS,
} from "../src/shared/providerCatalog";
import type {
  ProviderCapabilities,
  ProviderId,
  ProviderSettings,
} from "../src/shared/providerTypes";

type StoredProviderSettings = Record<ProviderId, Partial<ProviderSettings>>;

const SETTINGS_FILE_NAME = "image-board-settings.json";
const SETTINGS_DIRECTORY_NAME = "Excalidraw Image Board";
const KEY_LEGACY_ENCRYPTED_ERROR =
  "之前保存的密钥使用了系统加密存储。当前版本不再读取钥匙串，请重新填写并保存一次。";

const defaultSettings = (): StoredProviderSettings =>
  PROVIDER_IDS.reduce(
    (settings, provider) => ({
      ...settings,
      [provider]: {},
    }),
    {} as StoredProviderSettings,
  );

const getSettingsPath = () =>
  path.join(
    app.getPath("appData"),
    SETTINGS_DIRECTORY_NAME,
    SETTINGS_FILE_NAME,
  );

const getLegacySettingsPath = () =>
  path.join(app.getPath("userData"), SETTINGS_FILE_NAME);

const encodeApiKey = (apiKey: string | undefined) => {
  if (!apiKey) {
    return apiKey;
  }

  return `plain:${apiKey}`;
};

const normalizeStoredApiKey = (apiKey: string | undefined) => {
  if (!apiKey) {
    return {
      apiKey: "",
      formatError: null as string | null,
    };
  }
  if (apiKey.startsWith("enc:")) {
    return {
      apiKey: "",
      formatError: KEY_LEGACY_ENCRYPTED_ERROR,
    };
  }
  if (apiKey.startsWith("plain:")) {
    return {
      apiKey: apiKey.slice(6),
      formatError: null as string | null,
    };
  }
  return {
    apiKey,
    formatError: null as string | null,
  };
};

const getPublicApiKeyState = (apiKey: string | undefined) => {
  if (!apiKey) {
    return {
      isConfigured: false,
      formatError: null as string | null,
    };
  }

  if (apiKey.startsWith("enc:")) {
    return {
      isConfigured: false,
      formatError: KEY_LEGACY_ENCRYPTED_ERROR,
    };
  }

  if (apiKey.startsWith("plain:")) {
    return {
      isConfigured: Boolean(apiKey.slice("plain:".length)),
      formatError: null as string | null,
    };
  }

  return {
    isConfigured: Boolean(apiKey),
    formatError: null as string | null,
  };
};

const normalizeProviderCapabilities = (
  capabilities: Partial<ProviderCapabilities> | undefined,
): ProviderCapabilities | undefined => {
  if (!capabilities) {
    return undefined;
  }

  const maxImageCount =
    Number.isFinite(capabilities.maxImageCount) &&
    Number(capabilities.maxImageCount) > 1
      ? Math.min(4, Math.floor(Number(capabilities.maxImageCount)))
      : 1;

  return {
    supportsNegativePrompt: Boolean(capabilities.supportsNegativePrompt),
    supportsSeed: Boolean(capabilities.supportsSeed),
    supportsImageCount:
      Boolean(capabilities.supportsImageCount) && maxImageCount > 1,
    supportsReferenceImages: Boolean(capabilities.supportsReferenceImages),
    maxImageCount,
    sizeControlMode:
      capabilities.sizeControlMode === "exact" ? "exact" : "aspect-ratio",
  };
};

const normalizeCustomModels = (
  customModels: Partial<ProviderSettings>["customModels"],
) =>
  (customModels || [])
    .filter((model) => model?.id?.trim() && model?.capabilityTemplate)
    .map((model) => {
      const capabilities = normalizeProviderCapabilities(model.capabilities);
      return {
        id: model.id.trim(),
        label: model.label?.trim() || model.id.trim(),
        capabilityTemplate: model.capabilityTemplate,
        ...(isProviderRequestAdapter(model.adapter)
          ? { adapter: model.adapter }
          : {}),
        ...(capabilities ? { capabilities } : {}),
      };
    });

const toPublicSettings = (
  settings: StoredProviderSettings,
): PublicProviderSettings => {
  return PROVIDER_IDS.reduce((publicSettings, provider) => {
    const providerSettings = settings[provider] ?? {};
    const apiKey = getPublicApiKeyState(providerSettings.apiKey);
    const customModels = normalizeCustomModels(providerSettings.customModels);

    return {
      ...publicSettings,
      [provider]: {
        defaultModel: providerSettings.defaultModel,
        ...(customModels.length ? { customModels } : {}),
        isConfigured: apiKey.isConfigured,
        lastStatus: apiKey.formatError
          ? "error"
          : providerSettings.lastStatus ?? "unknown",
        lastCheckedAt: providerSettings.lastCheckedAt ?? null,
        lastError: apiKey.formatError ?? providerSettings.lastError ?? null,
      },
    };
  }, {} as PublicProviderSettings);
};

const readSettings = async (): Promise<StoredProviderSettings> => {
  try {
    const contents = await fs.readFile(getSettingsPath(), "utf8");
    const parsed = JSON.parse(contents) as StoredProviderSettings;
    return {
      ...defaultSettings(),
      ...parsed,
    };
  } catch (error: any) {
    if (error.code === "ENOENT") {
      const legacyPath = getLegacySettingsPath();

      if (legacyPath !== getSettingsPath()) {
        try {
          const contents = await fs.readFile(legacyPath, "utf8");
          const parsed = JSON.parse(contents) as StoredProviderSettings;
          const migratedSettings = {
            ...defaultSettings(),
            ...parsed,
          };
          await writeSettings(migratedSettings);
          return migratedSettings;
        } catch (legacyError: any) {
          if (legacyError.code !== "ENOENT") {
            throw legacyError;
          }
        }
      }

      return defaultSettings();
    }
    throw error;
  }
};

const writeSettings = async (settings: StoredProviderSettings) => {
  await fs.mkdir(path.dirname(getSettingsPath()), { recursive: true });
  await fs.writeFile(
    getSettingsPath(),
    JSON.stringify(settings, null, 2),
    "utf8",
  );
};

export const loadProviderSettings = async () => {
  return toPublicSettings(await readSettings());
};

export const saveProviderSettings = async (
  input: SaveProviderSettingsInput,
) => {
  const settings = await readSettings();
  settings[input.provider] = {
    ...settings[input.provider],
    apiKey: input.apiKey
      ? encodeApiKey(input.apiKey)
      : settings[input.provider].apiKey,
    defaultModel: input.defaultModel,
    customModels:
      input.customModels === undefined
        ? settings[input.provider].customModels
        : normalizeCustomModels(input.customModels),
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  };
  await writeSettings(settings);
  return toPublicSettings(settings);
};

export const getProviderApiKey = async (provider: ProviderId) => {
  const settings = await readSettings();
  const storedApiKey = settings[provider].apiKey;
  const apiKeyState = normalizeStoredApiKey(storedApiKey);
  if (apiKeyState.formatError) {
    throw new Error(apiKeyState.formatError);
  }
  return apiKeyState.apiKey;
};

export const getProviderCustomModels = async (provider: ProviderId) => {
  const settings = await readSettings();
  return normalizeCustomModels(settings[provider].customModels);
};

export const updateProviderStatus = async (
  provider: ProviderId,
  status: "success" | "error",
  errorMessage?: string,
) => {
  const settings = await readSettings();
  settings[provider] = {
    ...settings[provider],
    lastStatus: status,
    lastCheckedAt: new Date().toISOString(),
    lastError: errorMessage ?? null,
  };
  await writeSettings(settings);
};
