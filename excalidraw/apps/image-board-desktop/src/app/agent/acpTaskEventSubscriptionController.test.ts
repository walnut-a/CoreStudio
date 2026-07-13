import { describe, expect, it, vi } from "vitest";

import {
  createAcpTaskEventSubscriptionRendererActions,
  startAcpTaskEventSubscriptionAction,
  subscribeAcpTaskEvents,
} from "./acpTaskEventSubscriptionController";

import type { AcpTaskEvent } from "../../shared/acpTypes";
import type { AcpAgentTaskUiState } from "./acpTaskUiState";

const completedEvent: AcpTaskEvent = {
  taskId: "task-1",
  type: "status",
  status: "completed",
  message: "done",
};

describe("subscribeAcpTaskEvents", () => {
  it("returns unavailable when the bridge cannot subscribe to ACP task events", () => {
    expect(
      subscribeAcpTaskEvents({
        bridge: {},
        getActiveTaskId: () => "task-1",
        getOpenRunLogTaskId: () => null,
        getProjectToken: () => "project-token",
        getAppSettingsOpen: () => false,
        getAcpDebugOpen: () => false,
        historyRefreshDelay: 160,
        updateTaskState: vi.fn(),
        clearActiveTask: vi.fn(),
        scheduleTimeout: vi.fn(),
        clearScheduledTimeout: vi.fn(),
        refreshThreadSummaries: vi.fn(),
        refreshRunSummaries: vi.fn(),
        refreshOpenRunLog: vi.fn(),
      }),
    ).toEqual({
      status: "unavailable",
      unsubscribe: null,
    });
  });

  it("subscribes to bridge task events and handles them with the latest state getters", () => {
    const listeners: Array<(event: AcpTaskEvent) => void> = [];
    let taskState: AcpAgentTaskUiState | null = null;
    const unsubscribe = vi.fn();
    const updateTaskState = vi.fn(
      (updater: (current: AcpAgentTaskUiState | null) => AcpAgentTaskUiState) => {
        taskState = updater(taskState);
      },
    );
    const clearActiveTask = vi.fn();
    const refreshThreadSummaries = vi.fn();
    const refreshRunSummaries = vi.fn();
    const refreshOpenRunLog = vi.fn();
    const scheduleTimeout = vi.fn((callback: () => void) => {
      callback();
      return 1;
    });

    const subscription = subscribeAcpTaskEvents({
      bridge: {
        onAcpAgentTaskEvent: (nextListener) => {
          listeners.push(nextListener);
          return unsubscribe;
        },
      },
      getActiveTaskId: () => "task-1",
      getOpenRunLogTaskId: () => "task-1",
      getProjectToken: () => "project-token",
      getAppSettingsOpen: () => true,
      getAcpDebugOpen: () => true,
      historyRefreshDelay: 160,
      updateTaskState,
      clearActiveTask,
      scheduleTimeout,
      clearScheduledTimeout: vi.fn(),
      refreshThreadSummaries,
      refreshRunSummaries,
      refreshOpenRunLog,
    });

    expect(subscription).toEqual({
      status: "subscribed",
      unsubscribe: expect.any(Function),
    });

    const capturedListener = listeners[0];
    if (subscription.status !== "subscribed" || !capturedListener) {
      throw new Error("expected subscription to capture an ACP task listener");
    }

    capturedListener(completedEvent);
    subscription.unsubscribe();

    expect(taskState).toMatchObject({
      taskId: "task-1",
      status: "completed",
      message: "done",
    });
    expect(clearActiveTask).toHaveBeenCalledTimes(1);
    expect(scheduleTimeout).toHaveBeenCalledTimes(2);
    expect(refreshThreadSummaries).toHaveBeenCalledWith("project-token");
    expect(refreshRunSummaries).toHaveBeenCalledTimes(1);
    expect(refreshOpenRunLog).toHaveBeenCalledWith("task-1");
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});

describe("createAcpTaskEventSubscriptionRendererActions", () => {
  it("creates a renderer subscription action using the configured ACP task event deps", () => {
    const listeners: Array<(event: AcpTaskEvent) => void> = [];
    let taskState: AcpAgentTaskUiState | null = null;
    const unsubscribe = vi.fn();
    const updateTaskState = vi.fn(
      (updater: (current: AcpAgentTaskUiState | null) => AcpAgentTaskUiState) => {
        taskState = updater(taskState);
      },
    );
    const refreshThreadSummaries = vi.fn();
    const refreshRunSummaries = vi.fn();
    const refreshOpenRunLog = vi.fn();
    const scheduleTimeout = vi.fn((callback: () => void) => {
      callback();
      return 1;
    });
    const actions = createAcpTaskEventSubscriptionRendererActions({
      bridge: {
        onAcpAgentTaskEvent: (nextListener) => {
          listeners.push(nextListener);
          return unsubscribe;
        },
      },
      getActiveTaskId: () => "task-1",
      getOpenRunLogTaskId: () => "task-1",
      getProjectToken: () => "project-token",
      getAppSettingsOpen: () => true,
      getAcpDebugOpen: () => true,
      historyRefreshDelay: 160,
      updateTaskState,
      clearActiveTask: vi.fn(),
      scheduleTimeout,
      clearScheduledTimeout: vi.fn(),
      refreshThreadSummaries,
      refreshRunSummaries,
      refreshOpenRunLog,
    });

    const subscription = actions.subscribe();

    expect(subscription.status).toBe("subscribed");
    listeners[0]?.(completedEvent);
    expect(taskState).toMatchObject({
      taskId: "task-1",
      status: "completed",
    });
    expect(refreshThreadSummaries).toHaveBeenCalledWith("project-token");
    expect(refreshRunSummaries).toHaveBeenCalledTimes(1);
    expect(refreshOpenRunLog).toHaveBeenCalledWith("task-1");
    if (subscription.status === "subscribed") {
      subscription.unsubscribe();
    }
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("creates a lifecycle start action that returns the unsubscribe cleanup", () => {
    const unsubscribe = vi.fn();
    const actions = createAcpTaskEventSubscriptionRendererActions({
      bridge: {
        onAcpAgentTaskEvent: () => unsubscribe,
      },
      getActiveTaskId: () => "task-1",
      getOpenRunLogTaskId: () => "task-1",
      getProjectToken: () => "project-token",
      getAppSettingsOpen: () => true,
      getAcpDebugOpen: () => true,
      historyRefreshDelay: 160,
      updateTaskState: vi.fn(),
      clearActiveTask: vi.fn(),
      scheduleTimeout: vi.fn(),
      clearScheduledTimeout: vi.fn(),
      refreshThreadSummaries: vi.fn(),
      refreshRunSummaries: vi.fn(),
      refreshOpenRunLog: vi.fn(),
    });

    const cleanup = actions.start();

    expect(cleanup).toEqual(expect.any(Function));
    cleanup?.();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("clears pending history refreshes when the subscription stops", () => {
    const listeners: Array<(event: AcpTaskEvent) => void> = [];
    const unsubscribe = vi.fn();
    const clearScheduledTimeout = vi.fn();
    let nextTimerId = 40;
    const actions = createAcpTaskEventSubscriptionRendererActions({
      bridge: {
        onAcpAgentTaskEvent: (listener) => {
          listeners.push(listener);
          return unsubscribe;
        },
      },
      getActiveTaskId: () => "task-1",
      getOpenRunLogTaskId: () => null,
      getProjectToken: () => "project-token",
      getAppSettingsOpen: () => true,
      getAcpDebugOpen: () => true,
      historyRefreshDelay: 160,
      updateTaskState: vi.fn(),
      clearActiveTask: vi.fn(),
      scheduleTimeout: vi.fn(() => nextTimerId++),
      clearScheduledTimeout,
      refreshThreadSummaries: vi.fn(),
      refreshRunSummaries: vi.fn(),
      refreshOpenRunLog: vi.fn(),
    });

    const cleanup = actions.start();
    listeners[0]?.(completedEvent);
    cleanup?.();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(clearScheduledTimeout).toHaveBeenCalledTimes(2);
    expect(clearScheduledTimeout).toHaveBeenNthCalledWith(1, 40);
    expect(clearScheduledTimeout).toHaveBeenNthCalledWith(2, 41);
  });
});

describe("startAcpTaskEventSubscriptionAction", () => {
  it("returns undefined when ACP task event subscription is unavailable", () => {
    expect(
      startAcpTaskEventSubscriptionAction({
        subscribe: () => ({
          status: "unavailable",
          unsubscribe: null,
        }),
      }),
    ).toBeUndefined();
  });

  it("returns the unsubscribe function when subscribed", () => {
    const unsubscribe = vi.fn();

    expect(
      startAcpTaskEventSubscriptionAction({
        subscribe: () => ({
          status: "subscribed",
          unsubscribe,
        }),
      }),
    ).toBe(unsubscribe);
  });
});
