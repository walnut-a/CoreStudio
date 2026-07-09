export const DEFAULT_PROVIDER_FETCH_TIMEOUT_MS = 300_000;

export type ProviderFetchInit = RequestInit & {
  timeoutMs?: number;
};

const toAbortError = (reason: unknown, fallbackMessage: string) => {
  if (reason instanceof Error) {
    return reason;
  }
  if (typeof reason === "string" && reason.trim()) {
    return new Error(reason);
  }
  return new Error(fallbackMessage);
};

export const providerFetch = async (
  input: Parameters<typeof fetch>[0],
  init: ProviderFetchInit = {},
) => {
  const {
    timeoutMs = DEFAULT_PROVIDER_FETCH_TIMEOUT_MS,
    signal: externalSignal,
    ...fetchInit
  } = init;
  const timeoutDurationMs = Math.max(1, timeoutMs);
  const controller = new AbortController();
  const externalReason = () =>
    (externalSignal as (AbortSignal & { reason?: unknown }) | undefined)
      ?.reason;

  if (externalSignal?.aborted) {
    throw toAbortError(externalReason(), "Provider request was aborted.");
  }

  return new Promise<Response>((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      clearTimeout(timeout);
      externalSignal?.removeEventListener("abort", onExternalAbort);
    };
    const resolveOnce = (response: Response) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve(response);
    };
    const rejectOnce = (error: unknown) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(error);
    };
    const onExternalAbort = () => {
      const reason = externalReason();
      controller.abort(reason);
      rejectOnce(toAbortError(reason, "Provider request was aborted."));
    };
    const timeout = setTimeout(() => {
      const error = new Error(
        `Provider request timed out after ${timeoutDurationMs}ms.`,
      );
      controller.abort(error);
      rejectOnce(error);
    }, timeoutDurationMs);

    externalSignal?.addEventListener("abort", onExternalAbort, { once: true });
    fetch(input, {
      ...fetchInit,
      signal: controller.signal,
    }).then(resolveOnce, rejectOnce);
  });
};
