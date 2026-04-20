import fs from "fs/promises";
import path from "path";

import { app, safeStorage } from "electron";

import type {
  PublicProviderSettings,
  SaveProviderSettingsInput,
} from "../src/shared/desktopBridgeTypes";
import { PROVIDER_IDS } from "../src/shared/providerCatalog";
import type {
  ProviderCapabilities,
  ProviderId,
  ProviderSettings,
} from "../src/shared/providerTypes";

type StoredProviderSettings = Record<ProviderId, Partial<ProviderSettings>>;

const SETTINGS_FILE_NAME = "image-board-settings.json";
const SETTINGS_DIRECTORY_NAME = "Excalidraw Image Board";
const KEY_FORMAT_ERROR = "之前保存的密钥无法读取，请重新填写并保存。";
const KEY_ENCRYPTION_UNAVAILABLE_ERROR =
  "系统加密服务暂不可用，请稍后再试或重新登录系统后打开。";

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

const canUseSafeStorage = () => {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
};

const encodeApiKey = (apiKey: string | undefined) => {
  if (!apiKey) {
    return apiKey;
  }

  if (!canUseSafeStorage()) {
    return `plain:${apiKey}`;
  }

  try {
    return `enc:${safeStorage.encryptString(apiKey).toString("base64")}`;
  } catch {
    return `plain:${apiKey}`;
  }
};

const normalizeStoredApiKey = (apiKey: string | undefined) => {
  if (!apiKey) {
    return {
      apiKey: "",
      formatError: null as string | null,
    };
  }
  if (apiKey.startsWith("enc:")) {
    if (!canUseSafeStorage()) {
      return {
        apiKey: "",
        formatError: KEY_ENCRYPTION_UNAVAILABLE_ERROR,
      };
    }
    try {
      return {
        apiKey: safeStorage.decryptString(Buffer.from(apiKey.slice(4), "base64")),
        formatError: null as string | null,
      };
    } catch {
      return {
        apiKey: "",
        formatError: KEY_FORMAT_ERROR,
      };
    }
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

const protectStoredApiKey = (apiKey: string | undefined) => {
  const normalized = normalizeStoredApiKey(apiKey);
  if (!normalized.apiKey || normalized.formatError) {
    return apiKey;
  }

  if (apiKey?.startsWith("enc:") && canUseSafeStorage()) {
    return apiKey;
  }

  return encodeApiKey(normalized.apiKey);
};

const protectStoredApiKeys = (settings: StoredProviderSettings) => {
  return PROVIDER_IDS.reduce((nextSettings, provider) => {
    const providerSettings = settings[provider] ?? {};
    return {
      ...nextSettings,
      [provider]: {
        ...providerSettings,
        apiKey: protectStoredApiKey(providerSettings.apiKey),
      },
    };
  }, {} as StoredProviderSettings);
};

const protectAndPersistSettings = async (settings: StoredProviderSettings) => {
  const protectedSettings = protectStoredApiKeys(settings);
  if (JSON.stringify(protectedSettings) !== JSON.stringify(settings)) {
    await writeSettings(protectedSettings);
  }
  return protectedSettings;
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
    supportsImageCount: Boolean(capabilities.supportsImageCount) && maxImageCount > 1,
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
        ...(capabilities ? { capabilities } : {}),
      };
    });

const toPublicSettings = (
  settings: StoredProviderSettings,
): PublicProviderSettings => {
  return PROVIDER_IDS.reduce((publicSettings, provider) => {
    const providerSettings = settings[provider] ?? {};
    const apiKey = normalizeStoredApiKey(providerSettings.apiKey);
    const customModels = normalizeCustomModels(providerSettings.customModels);

    return {
      ...publicSettings,
      [provider]: {
        defaultModel: providerSettings.defaultModel,
        ...(customModels.length ? { customModels } : {}),
        isConfigured: Boolean(apiKey.apiKey),
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
    return protectAndPersistSettings({
      ...defaultSettings(),
      ...parsed,
    });
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
          return protectAndPersistSettings(migratedSettings);
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
  await fs.writeFile(getSettingsPath(), JSON.stringify(settings, null, 2), "utf8");
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
      : protectStoredApiKey(settings[input.provider].apiKey),
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
  const apiKeyState = normalizeStoredApiKey(settings[provider].apiKey);
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
