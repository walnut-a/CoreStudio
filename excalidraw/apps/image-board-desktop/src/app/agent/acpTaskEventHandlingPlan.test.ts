import { describe, expect, it } from "vitest";

import type { AcpTaskEvent } from "../../shared/acpTypes";
import { buildAcpTaskEventHandlingPlan } from "./acpTaskEventHandlingPlan";

const createStatusEvent = (
  status: Extract<AcpTaskEvent, { type: "status" }>["status"],
  taskId = "task-1",
): AcpTaskEvent => ({
  taskId,
  type: "status",
  status,
  message: status,
});

const createErrorEvent = (taskId = "task-1"): AcpTaskEvent => ({
  taskId,
  type: "error",
  code: "AGENT_FAILED",
  message: "Agent failed",
});

const createMessageEvent = (taskId = "task-1"): AcpTaskEvent => ({
  taskId,
  type: "agent-message",
  text: "working",
});

describe("buildAcpTaskEventHandlingPlan", () => {
  it("ignores events from another active task but refreshes an open matching run log", () => {
    expect(
      buildAcpTaskEventHandlingPlan({
        event: createMessageEvent("task-2"),
        activeTaskId: "task-1",
        openRunLogTaskId: "task-2",
        projectToken: "project-token",
        appSettingsOpen: true,
        acpDebugOpen: true,
      }),
    ).toEqual({
      applyTaskEvent: false,
      clearActiveTask: false,
      refreshOpenRunLogTaskId: "task-2",
      refreshThreadSummariesProjectToken: null,
      refreshRunSummaries: false,
    });
  });

  it("clears the active task and refreshes history for terminal status events", () => {
    expect(
      buildAcpTaskEventHandlingPlan({
        event: createStatusEvent("completed"),
        activeTaskId: "task-1",
        openRunLogTaskId: "task-1",
        projectToken: "project-token",
        appSettingsOpen: true,
        acpDebugOpen: true,
      }),
    ).toEqual({
      applyTaskEvent: true,
      clearActiveTask: true,
      refreshOpenRunLogTaskId: "task-1",
      refreshThreadSummariesProjectToken: "project-token",
      refreshRunSummaries: true,
    });
  });

  it("does not refresh debug summaries when the debug panel is not open", () => {
    expect(
      buildAcpTaskEventHandlingPlan({
        event: createStatusEvent("failed"),
        activeTaskId: "task-1",
        openRunLogTaskId: null,
        projectToken: "project-token",
        appSettingsOpen: true,
        acpDebugOpen: false,
      }).refreshRunSummaries,
    ).toBe(false);
  });

  it("refreshes thread summaries for error events without clearing the active task", () => {
    expect(
      buildAcpTaskEventHandlingPlan({
        event: createErrorEvent(),
        activeTaskId: "task-1",
        openRunLogTaskId: "task-1",
        projectToken: "project-token",
        appSettingsOpen: true,
        acpDebugOpen: true,
      }),
    ).toEqual({
      applyTaskEvent: true,
      clearActiveTask: false,
      refreshOpenRunLogTaskId: "task-1",
      refreshThreadSummariesProjectToken: "project-token",
      refreshRunSummaries: false,
    });
  });

  it("only applies task state and open run log refresh for non-terminal events", () => {
    expect(
      buildAcpTaskEventHandlingPlan({
        event: createMessageEvent(),
        activeTaskId: "task-1",
        openRunLogTaskId: "task-1",
        projectToken: "project-token",
        appSettingsOpen: true,
        acpDebugOpen: true,
      }),
    ).toEqual({
      applyTaskEvent: true,
      clearActiveTask: false,
      refreshOpenRunLogTaskId: "task-1",
      refreshThreadSummariesProjectToken: null,
      refreshRunSummaries: false,
    });
  });
});
