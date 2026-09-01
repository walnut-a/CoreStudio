import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { DesktopBridgeApi } from "../shared/desktopBridgeTypes";
import { useAppUpdate } from "./useAppUpdate";

describe("useAppUpdate", () => {
  it("loads availability, follows main-process events, and checks manually", async () => {
    let listener: ((value: any) => void) | null = null;
    const bridge = {
      loadAppUpdateAvailability: vi.fn().mockResolvedValue({
        currentVersion: "1.1.42",
        latestVersion: null,
        hasUnreviewedUpdate: false,
        lastSuccessfulCheckAt: null,
      }),
      onAppUpdateAvailabilityChanged: vi.fn((nextListener) => {
        listener = nextListener;
        return () => {
          listener = null;
        };
      }),
      checkForAppUpdates: vi.fn().mockResolvedValue({
        ok: true,
        result: {
          status: "up-to-date",
          update: {
            version: "1.1.42",
            publishedAt: "2026-08-25T14:20:45.000Z",
            minimumSystemVersion: "14.0",
            downloadPageURL: "https://getcorestudio.com/",
            releaseNotesURL:
              "https://github.com/walnut-a/CoreStudio/releases/tag/v1.1.42",
            summary: { "zh-CN": [], en: [] },
          },
          availability: {
            currentVersion: "1.1.42",
            latestVersion: "1.1.42",
            hasUnreviewedUpdate: false,
            lastSuccessfulCheckAt: "2026-09-01T00:00:00.000Z",
          },
        },
      }),
    } as unknown as DesktopBridgeApi;

    const { result, unmount } = renderHook(() => useAppUpdate(bridge));
    await waitFor(() =>
      expect(result.current.availability?.currentVersion).toBe("1.1.42"),
    );

    act(() => {
      listener?.({
        currentVersion: "1.1.42",
        latestVersion: "1.2.0",
        hasUnreviewedUpdate: true,
        lastSuccessfulCheckAt: "2026-09-01T00:00:00.000Z",
      });
    });
    expect(result.current.availability?.hasUnreviewedUpdate).toBe(true);

    await act(async () => {
      await result.current.checkManually();
    });
    expect(result.current.manualState.status).toBe("complete");
    expect(result.current.availability?.hasUnreviewedUpdate).toBe(false);

    unmount();
    expect(listener).toBeNull();
  });

  it("keeps the main-process failure classification", async () => {
    const bridge = {
      checkForAppUpdates: vi.fn().mockResolvedValue({
        ok: false,
        failure: { code: "service-not-configured", httpStatus: 404 },
      }),
    } as unknown as DesktopBridgeApi;

    const { result } = renderHook(() => useAppUpdate(bridge));
    await act(async () => {
      await result.current.checkManually();
    });

    expect(result.current.manualState).toEqual({
      status: "failure",
      failure: { code: "service-not-configured", httpStatus: 404 },
    });
  });
});
