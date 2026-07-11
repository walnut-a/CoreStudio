import { describe, expect, it, vi } from "vitest";

import {
  createAgentBrowserBridgeStatusRetryLoopRendererActions,
  runAgentBrowserBridgeStatusRetryAction,
  startAgentBrowserBridgeStatusRetryLoopAction,
} from "./agentBrowserBridgeStatusRetryController";

import type { DesktopAgentBridgeStatus } from "../../shared/desktopBridgeTypes";

const createStatus = (
  patch: Partial<DesktopAgentBridgeStatus> = {},
): DesktopAgentBridgeStatus => ({
  enabled: true,
  ready: true,
  currentProject: null,
  boardUrl: "http://127.0.0.1:5174/agent-board",
  ...patch,
});

describe("runAgentBrowserBridgeStatusRetryAction", () => {
  it("does not advance attempts or retry when bridge status cannot be read", async () => {
    const scheduleRetry = vi.fn();

    await expect(
      runAgentBrowserBridgeStatusRetryAction({
        attempts: 3,
        refreshConnection: async () => ({
          canReadStatus: false,
          didApply: true,
          nextStatus: null,
          refreshPlan: {
            loadDesktopStartupState: false,
            resetAutoOpenProjectPath: false,
          },
        }),
        scheduleRetry,
      }),
    ).resolves.toEqual({
      attempts: 3,
      canReadStatus: false,
      didApply: true,
      scheduledRetry: false,
    });

    expect(scheduleRetry).not.toHaveBeenCalled();
  });

  it("advances attempts without retrying when the bridge already has a board URL", async () => {
    const scheduleRetry = vi.fn();

    await expect(
      runAgentBrowserBridgeStatusRetryAction({
        attempts: 0,
        refreshConnection: async () => ({
          canReadStatus: true,
          didApply: true,
          nextStatus: createStatus(),
          refreshPlan: {
            loadDesktopStartupState: true,
            resetAutoOpenProjectPath: false,
          },
        }),
        scheduleRetry,
      }),
    ).resolves.toEqual({
      attempts: 1,
      canReadStatus: true,
      didApply: true,
      scheduledRetry: false,
    });

    expect(scheduleRetry).not.toHaveBeenCalled();
  });

  it("schedules a retry while the board URL is still missing", async () => {
    const scheduleRetry = vi.fn();

    await expect(
      runAgentBrowserBridgeStatusRetryAction({
        attempts: 2,
        refreshConnection: async () => ({
          canReadStatus: true,
          didApply: true,
          nextStatus: createStatus({ boardUrl: null }),
          refreshPlan: {
            loadDesktopStartupState: true,
            resetAutoOpenProjectPath: false,
          },
        }),
        scheduleRetry,
      }),
    ).resolves.toEqual({
      attempts: 3,
      canReadStatus: true,
      didApply: true,
      scheduledRetry: true,
    });

    expect(scheduleRetry).toHaveBeenCalledWith(500);
  });

  it("does not schedule a retry after the maximum attempts", async () => {
    const scheduleRetry = vi.fn();

    await expect(
      runAgentBrowserBridgeStatusRetryAction({
        attempts: 19,
        refreshConnection: async () => ({
          canReadStatus: true,
          didApply: true,
          nextStatus: createStatus({ boardUrl: null }),
          refreshPlan: {
            loadDesktopStartupState: true,
            resetAutoOpenProjectPath: false,
          },
        }),
        scheduleRetry,
      }),
    ).resolves.toEqual({
      attempts: 20,
      canReadStatus: true,
      didApply: true,
      scheduledRetry: false,
    });

    expect(scheduleRetry).not.toHaveBeenCalled();
  });
});

describe("startAgentBrowserBridgeStatusRetryLoopAction", () => {
  it("refreshes immediately and passes a live cancellation guard to the refresh action", async () => {
    const canApplyStates: boolean[] = [];

    const cleanup = startAgentBrowserBridgeStatusRetryLoopAction({
      refreshConnection: async ({ canApply }) => {
        canApplyStates.push(canApply());
        return {
          canReadStatus: true,
          didApply: true,
          nextStatus: createStatus(),
          refreshPlan: {
            loadDesktopStartupState: false,
            resetAutoOpenProjectPath: false,
          },
        };
      },
      scheduleTimeout: () => 1,
      clearTimeout: () => undefined,
    });

    await Promise.resolve();

    cleanup();

    expect(canApplyStates).toEqual([true]);
  });

  it("clears the scheduled retry timer when the loop is disposed", async () => {
    const clearedTimerIds: number[] = [];

    const cleanup = startAgentBrowserBridgeStatusRetryLoopAction({
      refreshConnection: async () => ({
        canReadStatus: true,
        didApply: true,
        nextStatus: createStatus({ boardUrl: null }),
        refreshPlan: {
          loadDesktopStartupState: true,
          resetAutoOpenProjectPath: false,
        },
      }),
      scheduleTimeout: () => 88,
      clearTimeout: (timerId) => {
        clearedTimerIds.push(timerId);
      },
    });

    await Promise.resolve();

    cleanup();

    expect(clearedTimerIds).toEqual([88]);
  });

  it("does not schedule a retry when the loop is disposed before an async refresh resolves", async () => {
    const scheduleTimeout = vi.fn();

    const createRefreshResult = async () => ({
      canReadStatus: true,
      didApply: true,
      nextStatus: createStatus({ boardUrl: null }),
      refreshPlan: {
        loadDesktopStartupState: true,
        resetAutoOpenProjectPath: false,
      },
    });
    type RefreshResult = Awaited<ReturnType<typeof createRefreshResult>>;
    const refreshResolvers: Array<(result: RefreshResult) => void> = [];

    const refreshPromise = new Promise<RefreshResult>((resolve) => {
      refreshResolvers.push(resolve);
    });

    const cleanup = startAgentBrowserBridgeStatusRetryLoopAction({
      refreshConnection: async () => refreshPromise,
      scheduleTimeout,
      clearTimeout: () => undefined,
    });

    cleanup();
    expect(refreshResolvers).toHaveLength(1);
    refreshResolvers[0]?.(await createRefreshResult());
    await Promise.resolve();

    expect(scheduleTimeout).not.toHaveBeenCalled();
  });
});

describe("createAgentBrowserBridgeStatusRetryLoopRendererActions", () => {
  it("starts the retry loop with the configured renderer dependencies", async () => {
    const canApplyStates: boolean[] = [];
    const refreshConnection = vi.fn(async ({ canApply }) => {
      canApplyStates.push(canApply());
      return {
        canReadStatus: true,
        didApply: true,
        nextStatus: createStatus(),
        refreshPlan: {
          loadDesktopStartupState: false,
          resetAutoOpenProjectPath: false,
        },
      };
    });
    const scheduleTimeout = vi.fn(() => 12);
    const clearTimeout = vi.fn();

    const actions = createAgentBrowserBridgeStatusRetryLoopRendererActions({
      refreshConnection,
      scheduleTimeout,
      clearTimeout,
    });

    const cleanup = actions.start();
    await Promise.resolve();
    cleanup();

    expect(refreshConnection).toHaveBeenCalledTimes(1);
    expect(canApplyStates).toEqual([true]);
    expect(scheduleTimeout).not.toHaveBeenCalled();
    expect(clearTimeout).not.toHaveBeenCalled();
  });
});
