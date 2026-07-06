import { describe, expect, it, vi } from "vitest";

import { runAcpNewThread } from "./acpNewThreadController";

describe("runAcpNewThread", () => {
  it("ignores new thread requests while an ACP task is running", () => {
    const getTaskRunning = vi.fn(() => true);
    const applyNewThreadState = vi.fn();

    expect(
      runAcpNewThread({
        getTaskRunning,
        applyNewThreadState,
      }),
    ).toEqual({ status: "ignored" });

    expect(getTaskRunning).toHaveBeenCalledTimes(1);
    expect(applyNewThreadState).not.toHaveBeenCalled();
  });

  it("applies the empty conversation state when a new thread can start", () => {
    const getTaskRunning = vi.fn(() => false);
    const applyNewThreadState = vi.fn();

    expect(
      runAcpNewThread({
        getTaskRunning,
        applyNewThreadState,
      }),
    ).toEqual({ status: "started" });

    expect(getTaskRunning).toHaveBeenCalledTimes(1);
    expect(applyNewThreadState).toHaveBeenCalledTimes(1);
    expect(applyNewThreadState).toHaveBeenCalledWith({
      activeThreadId: null,
      activeTaskId: null,
      runLogTaskId: null,
      runLogSurface: "conversation",
      conversationEntries: [],
      runLogDetail: null,
      runLogError: null,
      agentTask: null,
      chatDockOpen: true,
    });
  });
});
