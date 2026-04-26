import { describe, expect, it, vi } from "vitest";

import { disableRendererPageZoom } from "./windowZoomGuard";

describe("disableRendererPageZoom", () => {
  it("prevents Chromium page zoom while keeping renderer wheel events available", () => {
    const windowListeners = new Map<string, (...args: any[]) => void>();
    const webContentsListeners = new Map<string, (...args: any[]) => void>();
    const webContents = {
      isDestroyed: vi.fn(() => false),
      on: vi.fn((eventName: string, listener: (...args: any[]) => void) => {
        webContentsListeners.set(eventName, listener);
      }),
      setVisualZoomLevelLimits: vi.fn(),
      setZoomFactor: vi.fn(),
    };

    disableRendererPageZoom({
      on: vi.fn((eventName: string, listener: (...args: any[]) => void) => {
        windowListeners.set(eventName, listener);
      }),
      webContents,
    } as unknown as Parameters<typeof disableRendererPageZoom>[0]);

    expect(webContents.setZoomFactor).toHaveBeenCalledWith(1);
    expect(webContents.setVisualZoomLevelLimits).toHaveBeenCalledWith(1, 1);

    const preventDefault = vi.fn();
    webContentsListeners.get("zoom-changed")?.({ preventDefault }, "in");

    expect(preventDefault).toHaveBeenCalled();
    expect(webContents.setZoomFactor).toHaveBeenLastCalledWith(1);

    windowListeners.get("focus")?.();

    expect(webContents.setVisualZoomLevelLimits).toHaveBeenLastCalledWith(1, 1);
    expect(webContents.setZoomFactor).toHaveBeenLastCalledWith(1);
  });
});
