import { describe, expect, it, vi } from "vitest";

import { clearTimerRefAction } from "./timerRefController";

describe("timerRefController", () => {
  it("clears an active timer and resets the timer id", () => {
    const clearTimer = vi.fn();
    let timerId: number | null = 42;

    const result = clearTimerRefAction({
      getTimerId: () => timerId,
      clearTimer,
      setTimerId: (nextTimerId) => {
        timerId = nextTimerId;
      },
    });

    expect(result).toEqual({
      status: "cleared",
      timerId: 42,
    });
    expect(clearTimer).toHaveBeenCalledWith(42);
    expect(timerId).toBeNull();
  });

  it("skips when there is no active timer", () => {
    const clearTimer = vi.fn();
    let timerId: number | null = null;

    const result = clearTimerRefAction({
      getTimerId: () => timerId,
      clearTimer,
      setTimerId: (nextTimerId) => {
        timerId = nextTimerId;
      },
    });

    expect(result).toEqual({
      status: "skipped",
    });
    expect(clearTimer).not.toHaveBeenCalled();
    expect(timerId).toBeNull();
  });
});
