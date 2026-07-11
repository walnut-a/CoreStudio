import { describe, expect, it, vi } from "vitest";

import { scheduleAcpRunLogLiveRefresh } from "./acpRunLogRefreshController";

describe("scheduleAcpRunLogLiveRefresh", () => {
  it("skips scheduling when the requested task is no longer open", () => {
    const clearRefreshTimer = vi.fn();
    const scheduleTimeout = vi.fn();

    expect(
      scheduleAcpRunLogLiveRefresh({
        taskId: "task-1",
        delay: 240,
        getCurrentTaskId: () => "task-2",
        clearRefreshTimer,
        scheduleTimeout,
        setRefreshTimerId: vi.fn(),
        refreshRunLogDetail: vi.fn(),
      }),
    ).toEqual({ status: "skipped" });

    expect(clearRefreshTimer).not.toHaveBeenCalled();
    expect(scheduleTimeout).not.toHaveBeenCalled();
  });

  it("clears the previous timer and refreshes detail when the scheduled timer fires", () => {
    const scheduledCallbacks: Array<() => void> = [];
    const clearRefreshTimer = vi.fn();
    const setRefreshTimerId = vi.fn();
    const refreshRunLogDetail = vi.fn();
    const scheduleTimeout = vi.fn(
      (callback: () => void, delay: number): number => {
        scheduledCallbacks.push(callback);
        expect(delay).toBe(240);
        return 42;
      },
    );

    expect(
      scheduleAcpRunLogLiveRefresh({
        taskId: "task-1",
        delay: 240,
        getCurrentTaskId: () => "task-1",
        clearRefreshTimer,
        scheduleTimeout,
        setRefreshTimerId,
        refreshRunLogDetail,
      }),
    ).toEqual({ status: "scheduled" });

    expect(clearRefreshTimer).toHaveBeenCalledTimes(1);
    expect(setRefreshTimerId).toHaveBeenCalledWith(42);
    expect(refreshRunLogDetail).not.toHaveBeenCalled();

    expect(scheduledCallbacks).toHaveLength(1);
    scheduledCallbacks[0]?.();

    expect(setRefreshTimerId).toHaveBeenLastCalledWith(null);
    expect(refreshRunLogDetail).toHaveBeenCalledWith("task-1");
  });
});
