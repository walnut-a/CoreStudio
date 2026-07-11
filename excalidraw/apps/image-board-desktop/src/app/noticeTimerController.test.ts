import { describe, expect, it, vi } from "vitest";

import {
  clearTimedNoticeAction,
  createTimedNoticeRendererActions,
  showTimedNoticeAction,
} from "./noticeTimerController";

describe("noticeTimerController", () => {
  it("shows a notice, replaces the previous timer, and clears it after the timeout", () => {
    const clearExistingTimer = vi.fn();
    const setNotice = vi.fn();
    const setTimerId = vi.fn();
    const scheduledCallbacks: Array<() => void> = [];
    const scheduleTimeout = vi.fn((callback: () => void, delayMs: number) => {
      scheduledCallbacks.push(callback);
      expect(delayMs).toBe(4200);
      return 91;
    });

    expect(
      showTimedNoticeAction({
        message: "已复制链接",
        delayMs: 4200,
        clearExistingTimer,
        setNotice,
        setTimerId,
        scheduleTimeout,
      }),
    ).toEqual({
      status: "scheduled",
      timerId: 91,
    });

    expect(clearExistingTimer).toHaveBeenCalledTimes(1);
    expect(setNotice).toHaveBeenCalledWith("已复制链接");
    expect(setTimerId).toHaveBeenCalledWith(91);

    expect(scheduledCallbacks).toHaveLength(1);
    scheduledCallbacks[0]?.();

    expect(setTimerId).toHaveBeenLastCalledWith(null);
    expect(setNotice).toHaveBeenLastCalledWith(null);
  });

  it("clears the existing notice and timer immediately", () => {
    const clearExistingTimer = vi.fn();
    const setNotice = vi.fn();

    expect(
      clearTimedNoticeAction({
        clearExistingTimer,
        setNotice,
      }),
    ).toEqual({
      status: "cleared",
    });

    expect(clearExistingTimer).toHaveBeenCalledTimes(1);
    expect(setNotice).toHaveBeenCalledWith(null);
  });

  it("creates reusable renderer actions for showing and clearing notices", () => {
    let timerId: number | null = 12;
    const clearTimer = vi.fn();
    const setTimerId = vi.fn((nextTimerId: number | null) => {
      timerId = nextTimerId;
    });
    const setNotice = vi.fn();
    const scheduledCallbacks: Array<() => void> = [];
    const scheduleTimeout = vi.fn((callback: () => void, delayMs: number) => {
      scheduledCallbacks.push(callback);
      expect(delayMs).toBe(4200);
      return 91;
    });
    const actions = createTimedNoticeRendererActions({
      delayMs: 4200,
      getTimerId: () => timerId,
      clearTimer,
      setTimerId,
      setNotice,
      scheduleTimeout,
    });

    expect(actions.show("已复制链接")).toEqual({
      status: "scheduled",
      timerId: 91,
    });
    expect(clearTimer).toHaveBeenCalledWith(12);
    expect(setNotice).toHaveBeenCalledWith("已复制链接");
    expect(timerId).toBe(91);

    scheduledCallbacks[0]?.();
    expect(timerId).toBeNull();
    expect(setNotice).toHaveBeenLastCalledWith(null);

    timerId = 23;
    expect(actions.clear()).toEqual({
      status: "cleared",
    });
    expect(clearTimer).toHaveBeenLastCalledWith(23);
    expect(setNotice).toHaveBeenLastCalledWith(null);
  });
});
