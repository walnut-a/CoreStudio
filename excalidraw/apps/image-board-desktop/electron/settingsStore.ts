import fs from "fs/promises";
import path from "path";

import { app } from "electron";

import {
  isProviderRequestAdapter,
  PROVIDER_IDS,
} from "../src/shared/providerCatalog";

import type {
  DeleteProviderSettingsInput,
  ProviderConfigurationSnapshot,
  PublicProviderSettings,
  SaveProviderSettingsInput,
} from "../src/shared/desktopBridgeTypes";
import type {
  CustomProviderModel,
  ProviderCapabilities,
  ProviderId,
  ProviderSettings,
} from "../src/shared/providerTypes";

type StoredProviderSettings = Record<ProviderId, Partial<ProviderSettings>>;

interface StoredProviderConfigurationV2 {
  schemaVersion: 2;
  defaultProvider: ProviderId | null;
  providers: StoredProviderSettings;
}

export interface ProviderRuntimeSettings {
  apiKey: string;
  displayName?: string;
  baseUrl?: string;
  customModels: CustomProviderModel[];
}

const SETTINGS_FILE_NAME = "image-board-settings.json";
const SETTINGS_DIRECTORY_NAME = "Excalidraw Image Board";
const SETTINGS_DIRECTORY_MODE = 0o700;
const SETTINGS_FILE_MODE = 0o600;
const KEY_LEGACY_ENCRYPTED_ERROR =
  "之前保存的密钥使用了系统加密存储。当前版本不再读取钥匙串，请重新填写并保存一次。";

const defaultProviders = (): StoredProviderSettings =>
  PROVIDER_IDS.reduce(
    (settings, provider) => ({
      ...settings,
      [provider]: {},
    }),
    {} as StoredProviderSettings,
  );

const defaultConfiguration = (): StoredProviderConfigurationV2 => ({
  schemaVersion: 2,
  defaultProvider: null,
  providers: defaultProviders(),
});

const getSettingsPath = () =>
  path.join(
    app.getPath("appData"),
    SETTINGS_DIRECTORY_NAME,
    SETTINGS_FILE_NAME,
  );

const getLegacySettingsPath = () =>
  path.join(app.getPath("userData"), SETTINGS_FILE_NAME);

const serializePlainApiKey = (apiKey: string | undefined) => {
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
  const supportsReferenceImages = Boolean(capabilities.supportsReferenceImages);
  const maxReferenceImageCount = supportsReferenceImages
    ? Number.isFinite(capabilities.maxReferenceImageCount) &&
      Number(capabilities.maxReferenceImageCount) > 0
      ? Math.min(14, Math.floor(Number(capabilities.maxReferenceImageCount)))
      : 8
    : 0;

  return {
    supportsNegativePrompt: Boolean(capabilities.supportsNegativePrompt),
    supportsSeed: Boolean(capabilities.supportsSeed),
    supportsImageCount:
      Boolean(capabilities.supportsImageCount) && maxImageCount > 1,
    supportsReferenceImages:
      supportsReferenceImages && maxReferenceImageCount > 0,
    maxImageCount,
    maxReferenceImageCount,
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
        displayName: providerSettings.displayName,
        baseUrl: providerSettings.baseUrl,
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

const getConfiguredProviders = (settings: StoredProviderSettings) =>
  PROVIDER_IDS.filter(
    (provider) => getPublicApiKeyState(settings[provider]?.apiKey).isConfigured,
  );

const normalizeDefaultProvider = (
  settings: StoredProviderSettings,
  defaultProvider: ProviderId | null | undefined,
) => {
  const configuredProviders = getConfiguredProviders(settings);
  return defaultProvider && configuredProviders.includes(defaultProvider)
    ? defaultProvider
    : configuredProviders[0] ?? null;
};

const normalizeConfiguration = (
  parsed: unknown,
): { configuration: StoredProviderConfigurationV2; migrated: boolean } => {
  const candidate = parsed as Partial<StoredProviderConfigurationV2> | null;
  const isV2 =
    candidate?.schemaVersion === 2 &&
    Boolean(candidate.providers) &&
    typeof candidate.providers === "object";
  const providers = {
    ...defaultProviders(),
    ...((isV2 ? candidate?.providers : parsed) as Partial<StoredProviderSettings>),
  };
  const defaultProvider = normalizeDefaultProvider(
    providers,
    isV2 ? candidate?.defaultProvider : null,
  );

  return {
    configuration: {
      schemaVersion: 2,
      defaultProvider,
      providers,
    },
    migrated: !isV2,
  };
};

const toPublicConfiguration = (
  configuration: StoredProviderConfigurationV2,
): ProviderConfigurationSnapshot => ({
  schemaVersion: 2,
  defaultProvider: normalizeDefaultProvider(
    configuration.providers,
    configuration.defaultProvider,
  ),
  providers: toPublicSettings(configuration.providers),
});

const readSettings = async (): Promise<StoredProviderConfigurationV2> => {
  try {
    const contents = await fs.readFile(getSettingsPath(), "utf8");
    const normalized = normalizeConfiguration(JSON.parse(contents));
    if (normalized.migrated) {
      await writeSettings(normalized.configuration);
    }
    return normalized.configuration;
  } catch (error: any) {
    if (error.code === "ENOENT") {
      const legacyPath = getLegacySettingsPath();

      if (legacyPath !== getSettingsPath()) {
        try {
          const contents = await fs.readFile(legacyPath, "utf8");
          const normalized = normalizeConfiguration(JSON.parse(contents));
          await writeSettings(normalized.configuration);
          return normalized.configuration;
        } catch (legacyError: any) {
          if (legacyError.code !== "ENOENT") {
            throw legacyError;
          }
        }
      }

      return defaultConfiguration();
    }
    throw error;
  }
};

const writeSettings = async (settings: StoredProviderConfigurationV2) => {
  const settingsPath = getSettingsPath();
  await fs.mkdir(path.dirname(settingsPath), {
    recursive: true,
    mode: SETTINGS_DIRECTORY_MODE,
  });
  await fs.writeFile(
    settingsPath,
    JSON.stringify(settings, null, 2),
    {
      encoding: "utf8",
      mode: SETTINGS_FILE_MODE,
    },
  );
  if (process.platform !== "win32") {
    await fs.chmod(settingsPath, SETTINGS_FILE_MODE);
  }
};

export const loadProviderSettings = async () => {
  return toPublicConfiguration(await readSettings());
};

const normalizeBaseUrl = (baseUrl: string | undefined) =>
  baseUrl?.trim().replace(/\/+$/, "") || undefined;

const assertValidProviderInput = (
  input: SaveProviderSettingsInput,
  existing: Partial<ProviderSettings>,
) => {
  if (!input.apiKey.trim() && !existing.apiKey) {
    throw new Error("请填写 API Key。");
  }
  if (!input.defaultModel?.trim()) {
    throw new Error("请选择或填写默认模型。");
  }
  if (input.provider !== "openai-compatible") {
    return;
  }
  if (!input.displayName?.trim()) {
    throw new Error("请填写服务名称。");
  }
  let url: URL;
  try {
    url = new URL(input.baseUrl?.trim() || "");
  } catch {
    throw new Error("请填写有效的 Base URL。");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Base URL 必须使用 HTTP 或 HTTPS。");
  }
};

export const saveProviderSettings = async (
  input: SaveProviderSettingsInput,
) => {
  const configuration = await readSettings();
  const existing = configuration.providers[input.provider] ?? {};
  assertValidProviderInput(input, existing);
  configuration.providers[input.provider] = {
    ...existing,
    apiKey: input.apiKey
      ? serializePlainApiKey(input.apiKey)
      : existing.apiKey,
    displayName: input.displayName?.trim() || undefined,
    baseUrl: normalizeBaseUrl(input.baseUrl),
    defaultModel: input.defaultModel?.trim(),
    customModels:
      input.customModels === undefined
        ? existing.customModels
        : normalizeCustomModels(input.customModels),
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  };
  configuration.defaultProvider = normalizeDefaultProvider(
    configuration.providers,
    configuration.defaultProvider,
  );
  await writeSettings(configuration);
  return toPublicConfiguration(configuration);
};

export const deleteProviderSettings = async (
  input: DeleteProviderSettingsInput,
) => {
  const configuration = await readSettings();
  configuration.providers[input.provider] = {};
  configuration.defaultProvider = normalizeDefaultProvider(
    configuration.providers,
    configuration.defaultProvider,
  );
  await writeSettings(configuration);
  return toPublicConfiguration(configuration);
};

export const getProviderApiKey = async (provider: ProviderId) => {
  const settings = await readSettings();
  const storedApiKey = settings.providers[provider].apiKey;
  const apiKeyState = normalizeStoredApiKey(storedApiKey);
  if (apiKeyState.formatError) {
    throw new Error(apiKeyState.formatError);
  }
  return apiKeyState.apiKey;
};

export const getProviderCustomModels = async (provider: ProviderId) => {
  const settings = await readSettings();
  return normalizeCustomModels(settings.providers[provider].customModels);
};

export const getProviderRuntimeSettings = async (
  provider: ProviderId,
): Promise<ProviderRuntimeSettings> => {
  const configuration = await readSettings();
  const settings = configuration.providers[provider] ?? {};
  const apiKeyState = normalizeStoredApiKey(settings.apiKey);
  if (apiKeyState.formatError) {
    throw new Error(apiKeyState.formatError);
  }
  return {
    apiKey: apiKeyState.apiKey,
    displayName: settings.displayName,
    baseUrl: normalizeBaseUrl(settings.baseUrl),
    customModels: normalizeCustomModels(settings.customModels),
  };
};

export const updateProviderStatus = async (
  provider: ProviderId,
  status: "success" | "error",
  errorMessage?: string,
) => {
  const settings = await readSettings();
  settings.providers[provider] = {
    ...settings.providers[provider],
    lastStatus: status,
    lastCheckedAt: new Date().toISOString(),
    lastError: errorMessage ?? null,
  };
  await writeSettings(settings);
};
