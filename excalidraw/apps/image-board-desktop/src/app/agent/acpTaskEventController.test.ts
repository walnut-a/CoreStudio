import { describe, expect, it, vi } from "vitest";

import { handleAcpTaskEvent } from "./acpTaskEventController";

import type { AcpTaskEvent } from "../../shared/acpTypes";
import type { AcpAgentTaskUiState } from "./acpTaskUiState";

const createStatusEvent = (
  status: Extract<AcpTaskEvent, { type: "status" }>["status"],
  taskId = "task-1",
): AcpTaskEvent => ({
  taskId,
  type: "status",
  status,
  message: status,
});

const createMessageEvent = (taskId = "task-1"): AcpTaskEvent => ({
  taskId,
  type: "agent-message",
  text: "working",
});

describe("handleAcpTaskEvent", () => {
  it("applies terminal events, clears the active task, and schedules history refreshes", () => {
    let taskState: AcpAgentTaskUiState | null = null;
    const updateTaskState = vi.fn(
      (updater: (current: AcpAgentTaskUiState | null) => AcpAgentTaskUiState) => {
        taskState = updater(taskState);
      },
    );
    const clearActiveTask = vi.fn();
    const scheduleTimeout = vi.fn((callback: () => void, delay: number) => {
      expect(delay).toBe(160);
      callback();
      return 1;
    });
    const refreshThreadSummaries = vi.fn();
    const refreshRunSummaries = vi.fn();
    const refreshOpenRunLog = vi.fn();

    expect(
      handleAcpTaskEvent({
        event: createStatusEvent("completed"),
        activeTaskId: "task-1",
        openRunLogTaskId: "task-1",
        projectToken: "project-token",
        appSettingsOpen: true,
        acpDebugOpen: true,
        historyRefreshDelay: 160,
        updateTaskState,
        clearActiveTask,
        scheduleTimeout,
        refreshThreadSummaries,
        refreshRunSummaries,
        refreshOpenRunLog,
      }),
    ).toEqual({ status: "handled" });

    expect(taskState).toMatchObject({
      taskId: "task-1",
      status: "completed",
      message: "completed",
    });
    expect(clearActiveTask).toHaveBeenCalledTimes(1);
    expect(refreshThreadSummaries).toHaveBeenCalledWith("project-token");
    expect(refreshRunSummaries).toHaveBeenCalledTimes(1);
    expect(refreshOpenRunLog).toHaveBeenCalledWith("task-1");
  });

  it("ignores another active task state while still refreshing the matching open run log", () => {
    const updateTaskState = vi.fn();
    const clearActiveTask = vi.fn();
    const scheduleTimeout = vi.fn();
    const refreshThreadSummaries = vi.fn();
    const refreshRunSummaries = vi.fn();
    const refreshOpenRunLog = vi.fn();

    expect(
      handleAcpTaskEvent({
        event: createMessageEvent("task-2"),
        activeTaskId: "task-1",
        openRunLogTaskId: "task-2",
        projectToken: "project-token",
        appSettingsOpen: true,
        acpDebugOpen: true,
        historyRefreshDelay: 160,
        updateTaskState,
        clearActiveTask,
        scheduleTimeout,
        refreshThreadSummaries,
        refreshRunSummaries,
        refreshOpenRunLog,
      }),
    ).toEqual({ status: "handled" });

    expect(updateTaskState).not.toHaveBeenCalled();
    expect(clearActiveTask).not.toHaveBeenCalled();
    expect(scheduleTimeout).not.toHaveBeenCalled();
    expect(refreshThreadSummaries).not.toHaveBeenCalled();
    expect(refreshRunSummaries).not.toHaveBeenCalled();
    expect(refreshOpenRunLog).toHaveBeenCalledWith("task-2");
  });
});
