import { describe, expect, it, vi } from "vitest";

import {
  createAppStartupLifecycleRendererActions,
  runAppStartupLifecycleAction,
} from "./appStartupLifecycleController";

describe("runAppStartupLifecycleAction", () => {
  it("notifies renderer readiness, loads desktop startup state, and starts the Agent Board retry loop", () => {
    const cleanup = vi.fn();
    const notifyRendererReady = vi.fn();
    const loadDesktopStartupState = vi.fn();
    const startAgentBrowserBridgeStatusRetryLoop = vi.fn(() => cleanup);

    const result = runAppStartupLifecycleAction({
      notifyRendererReady,
      isAgentBrowserRoute: false,
      loadDesktopStartupState,
      startAgentBrowserBridgeStatusRetryLoop,
    });

    expect(notifyRendererReady).toHaveBeenCalledTimes(1);
    expect(loadDesktopStartupState).toHaveBeenCalledTimes(1);
    expect(startAgentBrowserBridgeStatusRetryLoop).toHaveBeenCalledTimes(1);
    expect(result).toBe(cleanup);
  });

  it("skips desktop startup loading in Agent Browser routes", () => {
    const notifyRendererReady = vi.fn();
    const loadDesktopStartupState = vi.fn();
    const startAgentBrowserBridgeStatusRetryLoop = vi.fn();

    runAppStartupLifecycleAction({
      notifyRendererReady,
      isAgentBrowserRoute: true,
      loadDesktopStartupState,
      startAgentBrowserBridgeStatusRetryLoop,
    });

    expect(notifyRendererReady).toHaveBeenCalledTimes(1);
    expect(loadDesktopStartupState).not.toHaveBeenCalled();
    expect(startAgentBrowserBridgeStatusRetryLoop).toHaveBeenCalledTimes(1);
  });
});

describe("createAppStartupLifecycleRendererActions", () => {
  it("reads route and renderer-ready notifier at start time", () => {
    let isAgentBrowserRoute = false;
    let notifyRendererReady: (() => void) | undefined = vi.fn();
    const loadDesktopStartupState = vi.fn();
    const startAgentBrowserBridgeStatusRetryLoop = vi.fn();
    const actions = createAppStartupLifecycleRendererActions({
      getNotifyRendererReady: () => notifyRendererReady,
      getIsAgentBrowserRoute: () => isAgentBrowserRoute,
      loadDesktopStartupState,
      startAgentBrowserBridgeStatusRetryLoop,
    });

    actions.start();
    isAgentBrowserRoute = true;
    notifyRendererReady = undefined;
    actions.start();

    expect(loadDesktopStartupState).toHaveBeenCalledTimes(1);
    expect(startAgentBrowserBridgeStatusRetryLoop).toHaveBeenCalledTimes(2);
  });
});
