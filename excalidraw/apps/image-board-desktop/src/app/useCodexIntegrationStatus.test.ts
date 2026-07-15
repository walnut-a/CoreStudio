import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { setActiveDesktopLocale } from "./copy";
import { useCodexIntegrationStatus } from "./useCodexIntegrationStatus";

describe("useCodexIntegrationStatus", () => {
  it("localizes the owner fallback for failures without a message", async () => {
    setActiveDesktopLocale("en");
    const { result } = renderHook(() =>
      useCodexIntegrationStatus({
        open: true,
        inspect: async () => Promise.reject(null),
      }),
    );

    await waitFor(() => {
      expect(result.current.error).toBe(
        "Could not read the local integration status.",
      );
    });
    setActiveDesktopLocale("zh-CN");
  });
});
