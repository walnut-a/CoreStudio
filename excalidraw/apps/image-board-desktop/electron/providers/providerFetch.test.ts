import { afterEach, describe, expect, it, vi } from "vitest";

import { providerFetch } from "./providerFetch";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("providerFetch", () => {
  it("aborts provider requests after the configured timeout", async () => {
    vi.useFakeTimers();
    const abortSignals: AbortSignal[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((_url, init?: RequestInit) => {
        abortSignals.push(init?.signal as AbortSignal);
        return new Promise<Response>(() => undefined);
      }),
    );

    const request = providerFetch("https://provider.example/generate", {
      timeoutMs: 1000,
    });
    const expectation = expect(request).rejects.toThrow(
      "Provider request timed out after 1000ms.",
    );

    await vi.advanceTimersByTimeAsync(1000);

    await expectation;
    expect(abortSignals[0]?.aborted).toBe(true);
  });

  it("forwards an external abort signal", async () => {
    const externalController = new AbortController();
    const abortSignals: AbortSignal[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((_url, init?: RequestInit) => {
        abortSignals.push(init?.signal as AbortSignal);
        return new Promise<Response>(() => undefined);
      }),
    );

    const request = providerFetch("https://provider.example/generate", {
      signal: externalController.signal,
      timeoutMs: 60_000,
    });
    const expectation = expect(request).rejects.toThrow("user canceled");
    externalController.abort(new Error("user canceled"));

    await expectation;
    expect(abortSignals[0]?.aborted).toBe(true);
  });
});
