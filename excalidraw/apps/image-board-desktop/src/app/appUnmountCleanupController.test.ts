import { describe, expect, it, vi } from "vitest";

import {
  createAppUnmountCleanupRendererActions,
  runAppUnmountCleanupAction,
} from "./appUnmountCleanupController";

describe("runAppUnmountCleanupAction", () => {
  it("clears app-level timers on renderer unmount", () => {
    const clearWorkspaceFitPulseTimer = vi.fn();
    const clearProjectNoticeTimer = vi.fn();
    const clearVisibleImageRenditionLoadTimer = vi.fn();
    const clearAgentBrowserRuntimePublishTimer = vi.fn();

    runAppUnmountCleanupAction({
      clearWorkspaceFitPulseTimer,
      clearProjectNoticeTimer,
      clearVisibleImageRenditionLoadTimer,
      clearAgentBrowserRuntimePublishTimer,
    });

    expect(clearWorkspaceFitPulseTimer).toHaveBeenCalledTimes(1);
    expect(clearProjectNoticeTimer).toHaveBeenCalledTimes(1);
    expect(clearVisibleImageRenditionLoadTimer).toHaveBeenCalledTimes(1);
    expect(clearAgentBrowserRuntimePublishTimer).toHaveBeenCalledTimes(1);
  });
});

describe("createAppUnmountCleanupRendererActions", () => {
  it("creates a stable cleanup entrypoint for App effects", () => {
    const clearWorkspaceFitPulseTimer = vi.fn();
    const actions = createAppUnmountCleanupRendererActions({
      clearWorkspaceFitPulseTimer,
      clearProjectNoticeTimer: vi.fn(),
      clearVisibleImageRenditionLoadTimer: vi.fn(),
      clearAgentBrowserRuntimePublishTimer: vi.fn(),
    });

    actions.cleanup();

    expect(clearWorkspaceFitPulseTimer).toHaveBeenCalledTimes(1);
  });
});
