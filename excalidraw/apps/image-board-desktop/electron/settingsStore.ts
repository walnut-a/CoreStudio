import fs from "fs/promises";
import path from "path";

import { app, safeStorage } from "electron";

import type {
  PublicProviderSettings,
  SaveProviderSettingsInput,
} from "../src/shared/desktopBridgeTypes";
import type { ProviderId, ProviderSettings } from "../src/shared/providerTypes";

type StoredProviderSettings = Record<ProviderId, Partial<ProviderSettings>>;

const SETTINGS_FILE_NAME = "image-board-settings.json";
const SETTINGS_DIRECTORY_NAME = "Excalidraw Image Board";
const KEY_DECRYPTION_ERROR = "当前安装包无法读取已保存的密钥，请重新填写并保存。";

const defaultSettings = (): StoredProviderSettings => ({
  gemini: {},
  zenmux: {},
  fal: {},
});

const getSettingsPath = () =>
  path.join(
    app.getPath("appData"),
    SETTINGS_DIRECTORY_NAME,
    SETTINGS_FILE_NAME,
  );

const getLegacySettingsPath = () =>
  path.join(app.getPath("userData"), SETTINGS_FILE_NAME);

const encryptApiKey = (apiKey: string) => {
  if (!apiKey) {
    return "";
  }
  if (safeStorage.isEncryptionAvailable()) {
    return `enc:${safeStorage.encryptString(apiKey).toString("base64")}`;
  }
  return `plain:${apiKey}`;
};

const decryptApiKey = (apiKey: string | undefined) => {
  if (!apiKey) {
    return "";
  }
  if (apiKey.startsWith("enc:") && safeStorage.isEncryptionAvailable()) {
    return safeStorage.decryptString(Buffer.from(apiKey.slice(4), "base64"));
  }
  if (apiKey.startsWith("plain:")) {
    return apiKey.slice(6);
  }
  return apiKey;
};

const readApiKeyState = (apiKey: string | undefined) => {
  try {
    return {
      apiKey: decryptApiKey(apiKey),
      decryptError: null as string | null,
    };
  } catch {
    return {
      apiKey: "",
      decryptError: KEY_DECRYPTION_ERROR,
    };
  }
};

const toPublicSettings = (
  settings: StoredProviderSettings,
): PublicProviderSettings => {
  const geminiApiKey = readApiKeyState(settings.gemini.apiKey);
  const zenmuxApiKey = readApiKeyState(settings.zenmux.apiKey);
  const falApiKey = readApiKeyState(settings.fal.apiKey);

  return {
    gemini: {
      defaultModel: settings.gemini.defaultModel,
      isConfigured: Boolean(geminiApiKey.apiKey),
      lastStatus: geminiApiKey.decryptError
        ? "error"
        : settings.gemini.lastStatus ?? "unknown",
      lastCheckedAt: settings.gemini.lastCheckedAt ?? null,
      lastError: geminiApiKey.decryptError ?? settings.gemini.lastError ?? null,
    },
    zenmux: {
      defaultModel: settings.zenmux.defaultModel,
      isConfigured: Boolean(zenmuxApiKey.apiKey),
      lastStatus: zenmuxApiKey.decryptError
        ? "error"
        : settings.zenmux.lastStatus ?? "unknown",
      lastCheckedAt: settings.zenmux.lastCheckedAt ?? null,
      lastError: zenmuxApiKey.decryptError ?? settings.zenmux.lastError ?? null,
    },
    fal: {
      defaultModel: settings.fal.defaultModel,
      isConfigured: Boolean(falApiKey.apiKey),
      lastStatus: falApiKey.decryptError
        ? "error"
        : settings.fal.lastStatus ?? "unknown",
      lastCheckedAt: settings.fal.lastCheckedAt ?? null,
      lastError: falApiKey.decryptError ?? settings.fal.lastError ?? null,
    },
  };
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
      ? encryptApiKey(input.apiKey)
      : settings[input.provider].apiKey,
    defaultModel: input.defaultModel,
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  };
  await writeSettings(settings);
  return toPublicSettings(settings);
};

export const getProviderApiKey = async (provider: ProviderId) => {
  const settings = await readSettings();
  const apiKeyState = readApiKeyState(settings[provider].apiKey);
  if (apiKeyState.decryptError) {
    throw new Error(apiKeyState.decryptError);
  }
  return apiKeyState.apiKey;
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
