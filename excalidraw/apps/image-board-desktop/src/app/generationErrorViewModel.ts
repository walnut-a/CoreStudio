import { getProviderDefinition } from "../shared/providerCatalog";
import { copy } from "./copy";

import type { GenerationRequest } from "../shared/providerTypes";

const REMOTE_METHOD_PREFIX = /^Error invoking remote method '[^']+':\s*/;
const REQUEST_PAYLOAD_MARKER = "请求载荷：";

export interface GenerationErrorDetails {
  provider: GenerationRequest["provider"];
  model: string;
  occurredAt: string;
  normalizedMessage: string;
  rawMessage: string;
  stack: string | null;
  requestPayload: string | null;
}

export interface GenerationErrorUiState {
  error: string | null;
  details: GenerationErrorDetails | null;
  detailsOpen: boolean;
  copied: boolean;
}

export interface GenerationErrorDisplayUiState extends GenerationErrorUiState {
  error: string;
  details: GenerationErrorDetails;
}

export interface BuildGenerationErrorUiStateInput {
  request: GenerationRequest;
  error: unknown;
  fallbackMessage: string;
}

interface GenerationTaskErrorRecord {
  status: "pending" | "error";
  provider: GenerationRequest["provider"];
  model: string;
  startedAt: string;
  errorMessage?: string | null;
  rawError?: string | null;
  stack?: string | null;
}

export const splitRequestPayload = (message: string) => {
  const markerIndex = message.indexOf(REQUEST_PAYLOAD_MARKER);
  if (markerIndex === -1) {
    return {
      message: message.trim(),
      requestPayload: null,
    };
  }

  return {
    message: message.slice(0, markerIndex).trim(),
    requestPayload: message
      .slice(markerIndex + REQUEST_PAYLOAD_MARKER.length)
      .trim(),
  };
};

const stringifyUnknownError = (error: unknown) => {
  if (error === null || error === undefined) {
    return "";
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
};

export const formatUnknownErrorMessage = (
  error: unknown,
  fallbackMessage: string,
) => (error instanceof Error ? error.message : String(error || fallbackMessage));

const extractDesktopErrorInfo = (error: unknown) => {
  const rawMessage =
    error instanceof Error
      ? error.message || error.toString()
      : error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message || stringifyUnknownError(error))
      : stringifyUnknownError(error);

  const stack =
    error instanceof Error
      ? error.stack || null
      : error && typeof error === "object" && "stack" in error
      ? String((error as { stack?: unknown }).stack || "") || null
      : null;

  return {
    rawMessage,
    message: rawMessage
      .replace(REMOTE_METHOD_PREFIX, "")
      .replace(/^Error:\s*/, ""),
    stack,
  };
};

export const normalizeDesktopErrorMessage = (
  provider: GenerationRequest["provider"],
  error: unknown,
) => {
  const { message } = extractDesktopErrorInfo(error);
  const { message: sanitizedMessage } = splitRequestPayload(message);

  if (
    /API_KEY_INVALID|API key not valid/i.test(sanitizedMessage) &&
    /generativelanguage\.googleapis\.com|googleapis\.com/i.test(sanitizedMessage)
  ) {
    return "Gemini API Key 无效，请在 Google AI Studio 重新生成并保存。";
  }

  if (/ZenMux API Key/i.test(sanitizedMessage)) {
    return sanitizedMessage;
  }

  if (/gemini API key is not configured/i.test(sanitizedMessage)) {
    return "Gemini API Key 还没配置，请在底部设置里的“连接与自定义模型”保存。";
  }

  if (
    provider === "zenmux" &&
    /reject_no_credit|Credit required|positive balance is required|\"code\":\"402\"/i.test(
      sanitizedMessage,
    )
  ) {
    return "ZenMux 余额不足，这个模型需要账户里有正余额。";
  }

  if (
    provider === "zenmux" &&
    /invalid api key|unauthorized|401|forbidden|403|UNAUTHENTICATED/i.test(
      sanitizedMessage,
    )
  ) {
    return "ZenMux API Key 无效，请检查 ZenMux 后台里的 API Key 和账户状态。";
  }

  if (/zenmux API key is not configured/i.test(sanitizedMessage)) {
    return "ZenMux API Key 还没配置，请在底部设置里的“连接与自定义模型”保存。";
  }

  if (/fal\.ai request failed: 401/i.test(sanitizedMessage)) {
    return "fal API Key 无效，请检查后重新保存。";
  }

  return sanitizedMessage;
};

export const buildGenerationErrorDetails = (
  request: GenerationRequest,
  error: unknown,
  normalizedMessage: string,
): GenerationErrorDetails => {
  const { rawMessage, stack } = extractDesktopErrorInfo(error);
  const { message: sanitizedRawMessage, requestPayload } =
    splitRequestPayload(rawMessage);

  return {
    provider: request.provider,
    model: request.model,
    occurredAt: new Date().toISOString(),
    normalizedMessage,
    rawMessage: sanitizedRawMessage || normalizedMessage,
    stack,
    requestPayload,
  };
};

export const buildGenerationErrorUiState = ({
  request,
  error,
  fallbackMessage,
}: BuildGenerationErrorUiStateInput): GenerationErrorDisplayUiState => {
  const normalizedMessage =
    normalizeDesktopErrorMessage(request.provider, error) || fallbackMessage;

  return {
    error: normalizedMessage,
    details: buildGenerationErrorDetails(request, error, normalizedMessage),
    detailsOpen: false,
    copied: false,
  };
};

export const buildClearGenerationErrorUiState = (): GenerationErrorUiState => ({
  error: null,
  details: null,
  detailsOpen: false,
  copied: false,
});

export const buildGenerationTaskErrorDetails = ({
  task,
  fallbackMessage,
}: {
  task: GenerationTaskErrorRecord | null;
  fallbackMessage: string;
}): GenerationErrorDetails | null => {
  if (!task || task.status !== "error") {
    return null;
  }

  const normalizedMessage = task.errorMessage?.trim() || fallbackMessage;
  const rawMessage =
    task.rawError?.trim() || task.errorMessage?.trim() || fallbackMessage;

  return {
    provider: task.provider,
    model: task.model,
    occurredAt: task.startedAt,
    normalizedMessage,
    rawMessage,
    stack: task.stack?.trim() || null,
    requestPayload: null,
  };
};

export const formatGenerationErrorDebugText = (
  details: GenerationErrorDetails,
) => {
  return [
    `${copy.debugError.provider}：${getProviderDefinition(details.provider).label}`,
    `${copy.debugError.model}：${details.model}`,
    `${copy.debugError.occurredAt}：${new Date(details.occurredAt).toLocaleString("zh-CN")}`,
    "",
    `${copy.debugError.message}：`,
    details.normalizedMessage,
    "",
    `${copy.debugError.raw}：`,
    details.rawMessage,
    ...(details.requestPayload
      ? ["", `${copy.debugError.payload}：`, details.requestPayload]
      : []),
    ...(details.stack
      ? ["", `${copy.debugError.stack}：`, details.stack]
      : []),
  ].join("\n");
};
