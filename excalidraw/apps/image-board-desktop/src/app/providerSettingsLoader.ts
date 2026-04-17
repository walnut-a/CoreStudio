import type { DesktopBridgeApi, PublicProviderSettings } from "../shared/desktopBridgeTypes";

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
