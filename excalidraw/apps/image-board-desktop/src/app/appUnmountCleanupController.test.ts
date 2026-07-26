import { describe, expect, it, vi } from "vitest";

import {
  createAppUnmountCleanupRendererActions,
  runAppUnmountCleanupAction,
} from "./appUnmountCleanupController";

describe("runAppUnmountCleanupAction", () => {
  it("clears app-level timers on renderer unmount", () => {
    const clearProjectNoticeTimer = vi.fn();
    const clearVisibleImageRenditionLoadTimer = vi.fn();
    const clearAgentBrowserRuntimePublishTimer = vi.fn();

    runAppUnmountCleanupAction({
      clearProjectNoticeTimer,
      clearVisibleImageRenditionLoadTimer,
      clearAgentBrowserRuntimePublishTimer,
    });

    expect(clearProjectNoticeTimer).toHaveBeenCalledTimes(1);
    expect(clearVisibleImageRenditionLoadTimer).toHaveBeenCalledTimes(1);
    expect(clearAgentBrowserRuntimePublishTimer).toHaveBeenCalledTimes(1);
  });
});

describe("createAppUnmountCleanupRendererActions", () => {
  it("creates a stable cleanup entrypoint for App effects", () => {
    const clearProjectNoticeTimer = vi.fn();
    const actions = createAppUnmountCleanupRendererActions({
      clearProjectNoticeTimer,
      clearVisibleImageRenditionLoadTimer: vi.fn(),
      clearAgentBrowserRuntimePublishTimer: vi.fn(),
    });

    actions.cleanup();

    expect(clearProjectNoticeTimer).toHaveBeenCalledTimes(1);
  });
});
