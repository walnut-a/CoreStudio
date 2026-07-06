import { describe, expect, it } from "vitest";

import {
  buildAcpInitialThreadLoadFailureState,
  buildAcpInitialThreadLoadStartState,
  buildAcpInitialThreadLoadSuccessState,
  buildAcpInitialThreadUnavailableState,
  buildAcpThreadDetailApplyState,
  buildAcpThreadSummariesLoadFailureState,
  buildAcpThreadSummariesLoadStartState,
  buildAcpThreadSummariesLoadSuccessState,
  buildAcpThreadSummariesUnavailableState,
  buildAcpThreadSelectionFailureState,
  buildAcpThreadSelectionPlan,
  buildAcpThreadSelectionSuccessState,
  buildNewAcpThreadPlan,
  buildNewAcpThreadState,
} from "./acpThreadState";

import type {
  AcpRunLogDetail,
  AcpRunLogEntry,
  AcpRunSummary,
  AcpThreadDetail,
  AcpThreadSummary,
} from "../../shared/acpTypes";

const createRunSummary = (taskId: string): AcpRunSummary => ({
  taskId,
  threadId: "thread-1",
  agentName: "Codex",
  projectName: "工业设计助手",
  projectToken: "project-token",
  userPrompt: `任务 ${taskId}`,
  mode: "acp-agent",
  status: "completed",
  startedAt: "2026-07-03T00:00:00.000Z",
  endedAt: "2026-07-03T00:00:10.000Z",
  logFile: `${taskId}.jsonl`,
});

const createEntry = (taskId: string, seq: number): AcpRunLogEntry => ({
  version: 1,
  taskId,
  timestamp: "2026-07-03T00:00:00.000Z",
  seq,
  kind: "agent.message",
  payload: { text: `回复 ${seq}` },
});

const createRun = (taskId: string, seq: number): AcpRunLogDetail => ({
  summary: createRunSummary(taskId),
  entries: [createEntry(taskId, seq)],
});

const createThread = (
  overrides: Partial<AcpThreadSummary> = {},
): AcpThreadDetail => {
  const runs = [createRun("task-1", 1), createRun("task-2", 2)];
  return {
    summary: {
      threadId: "thread-1",
      projectToken: "project-token",
      projectName: "工业设计助手",
      agentName: "Codex",
      title: "优化 CNC 机器",
      status: "completed",
      createdAt: "2026-07-03T00:00:00.000Z",
      updatedAt: "2026-07-03T00:00:20.000Z",
      taskIds: ["task-1", "task-2"],
      lastTaskId: "task-2",
      ...overrides,
    },
    runs,
    entries: runs.flatMap((run) => run.entries),
  };
};

describe("buildAcpThreadDetailApplyState", () => {
  it("builds the active conversation state from a thread detail", () => {
    const thread = createThread();

    expect(buildAcpThreadDetailApplyState(thread)).toEqual({
      activeThreadId: "thread-1",
      runLogTaskId: "task-2",
      shouldUpdateRunLogSurface: true,
      runLogSurface: "conversation",
      conversationEntries: thread.entries,
      runLogDetail: thread.runs[1],
      runLogError: null,
      agentTask: null,
    });
  });

  it("falls back to the latest run when the thread summary has no last task id", () => {
    const thread = createThread({ lastTaskId: undefined });

    expect(buildAcpThreadDetailApplyState(thread).runLogTaskId).toBe("task-2");
  });

  it("can apply the detail without activating the conversation surface", () => {
    const thread = createThread();

    expect(
      buildAcpThreadDetailApplyState(thread, { activateSurface: false }),
    ).toMatchObject({
      shouldUpdateRunLogSurface: false,
      runLogSurface: null,
    });
  });
});

describe("buildNewAcpThreadState", () => {
  it("builds the empty conversation state for starting a new thread", () => {
    expect(buildNewAcpThreadState()).toEqual({
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

describe("buildNewAcpThreadPlan", () => {
  it("does not reset the current conversation while an ACP task is running", () => {
    expect(buildNewAcpThreadPlan({ taskRunning: true })).toEqual({
      action: "ignore",
    });
  });

  it("returns the empty conversation state when a new ACP thread can start", () => {
    expect(buildNewAcpThreadPlan({ taskRunning: false })).toEqual({
      action: "start",
      ...buildNewAcpThreadState(),
    });
  });
});

describe("ACP thread summaries load states", () => {
  it("clears summaries and loading when thread summaries cannot be read", () => {
    expect(buildAcpThreadSummariesUnavailableState()).toEqual({
      summaries: [],
      error: null,
      loading: false,
    });
  });

  it("clears stale errors and starts loading only when the caller requests a visible load", () => {
    expect(
      buildAcpThreadSummariesLoadStartState({ showLoading: true }),
    ).toEqual({
      summaries: null,
      error: null,
      loading: true,
    });
    expect(
      buildAcpThreadSummariesLoadStartState({ showLoading: false }),
    ).toEqual({
      summaries: null,
      error: null,
      loading: null,
    });
  });

  it("stores summaries and stops visible loading after a successful read", () => {
    const summaries = [createThread().summary];

    expect(
      buildAcpThreadSummariesLoadSuccessState(summaries, {
        showLoading: true,
      }),
    ).toEqual({
      summaries,
      error: null,
      loading: false,
    });
  });

  it("clears summaries and stores the product error after a failed read", () => {
    expect(
      buildAcpThreadSummariesLoadFailureState("读取 Agent 对话历史失败。", {
        showLoading: true,
      }),
    ).toEqual({
      summaries: [],
      error: "读取 Agent 对话历史失败。",
      loading: false,
    });
  });
});

describe("ACP initial thread load states", () => {
  it("resets conversation state when initial thread reading is unavailable", () => {
    expect(buildAcpInitialThreadUnavailableState()).toEqual({
      activeThreadId: null,
      runLogTaskId: null,
      conversationEntries: [],
      summaries: [],
      summariesError: null,
      summariesLoading: false,
      runLogDetail: null,
      runLogSurface: null,
    });
  });

  it("clears stale errors and enters the initial visible loading state", () => {
    expect(buildAcpInitialThreadLoadStartState()).toEqual({
      summariesError: null,
      summariesLoading: true,
    });
  });

  it("stores summaries without resetting conversation when a latest detail exists", () => {
    const summaries = [createThread().summary];

    expect(
      buildAcpInitialThreadLoadSuccessState({
        summaries,
        hasLatestDetail: true,
      }),
    ).toEqual({
      summaries,
      summariesError: null,
      summariesLoading: false,
      resetConversation: false,
      activeThreadId: null,
      runLogTaskId: null,
      conversationEntries: [],
      runLogDetail: null,
      runLogSurface: null,
    });
  });

  it("stores summaries and resets conversation when there is no latest detail", () => {
    expect(
      buildAcpInitialThreadLoadSuccessState({
        summaries: [],
        hasLatestDetail: false,
      }),
    ).toEqual({
      summaries: [],
      summariesError: null,
      summariesLoading: false,
      resetConversation: true,
      activeThreadId: null,
      runLogTaskId: null,
      conversationEntries: [],
      runLogDetail: null,
      runLogSurface: null,
    });
  });

  it("clears summaries and stores the product error after initial thread load fails", () => {
    expect(
      buildAcpInitialThreadLoadFailureState("读取 Agent 对话历史失败。"),
    ).toEqual({
      summaries: [],
      summariesError: "读取 Agent 对话历史失败。",
      summariesLoading: false,
    });
  });
});

describe("buildAcpThreadSelectionPlan", () => {
  it("does not change state while an ACP task is running", () => {
    expect(
      buildAcpThreadSelectionPlan({
        taskRunning: true,
        canReadDetail: true,
        isActiveThread: false,
      }),
    ).toEqual({ action: "ignore" });
  });

  it("returns a product error when the bridge cannot read thread details", () => {
    expect(
      buildAcpThreadSelectionPlan({
        taskRunning: false,
        canReadDetail: false,
        isActiveThread: false,
      }),
    ).toEqual({
      action: "unavailable",
      runLogError: "当前环境不能读取 Agent 对话历史。",
    });
  });

  it("opens the conversation dock without reading when selecting the active thread", () => {
    expect(
      buildAcpThreadSelectionPlan({
        taskRunning: false,
        canReadDetail: true,
        isActiveThread: true,
      }),
    ).toEqual({
      action: "show-active-thread",
      chatDockOpen: true,
    });
  });

  it("starts a visible detail read for a different thread", () => {
    expect(
      buildAcpThreadSelectionPlan({
        taskRunning: false,
        canReadDetail: true,
        isActiveThread: false,
      }),
    ).toEqual({
      action: "read-thread-detail",
      summariesLoading: true,
      runLogError: null,
    });
  });

  it("opens the conversation dock and stops loading after a successful selection", () => {
    expect(buildAcpThreadSelectionSuccessState()).toEqual({
      chatDockOpen: true,
      summariesLoading: false,
    });
  });

  it("stores the product error and stops loading after a failed selection", () => {
    expect(
      buildAcpThreadSelectionFailureState("读取 Agent 对话历史失败。"),
    ).toEqual({
      runLogError: "读取 Agent 对话历史失败。",
      summariesLoading: false,
    });
  });
});
