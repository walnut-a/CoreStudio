import { describe, expect, it, vi } from "vitest";

import {
  applyAcpInitialThreadResetState,
  applyAcpThreadDetailState,
  applyNewAcpThreadState,
  createAcpActiveThreadIdRendererActions,
  createAcpThreadRendererActions,
} from "./acpThreadApplyController";
import { buildNewAcpThreadState } from "./acpThreadState";

import type {
  AcpRunLogDetail,
  AcpRunLogEntry,
  AcpRunSummary,
  AcpThreadDetail,
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

const createThread = (): AcpThreadDetail => {
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
    },
    runs,
    entries: runs.flatMap((run) => run.entries),
  };
};

describe("applyAcpThreadDetailState", () => {
  it("applies a thread detail to the active conversation surface", () => {
    const thread = createThread();
    const setActiveThreadId = vi.fn();
    const setRunLogTaskId = vi.fn();
    const setRunLogSurface = vi.fn();
    const setConversationEntries = vi.fn();
    const setRunLogDetail = vi.fn();
    const setRunLogError = vi.fn();
    const setAgentTask = vi.fn();

    expect(
      applyAcpThreadDetailState({
        detail: thread,
        setActiveThreadId,
        setRunLogTaskId,
        setRunLogSurface,
        setConversationEntries,
        setRunLogDetail,
        setRunLogError,
        setAgentTask,
      }),
    ).toMatchObject({
      activeThreadId: "thread-1",
      runLogTaskId: "task-2",
      shouldUpdateRunLogSurface: true,
      runLogSurface: "conversation",
    });

    expect(setActiveThreadId).toHaveBeenCalledWith("thread-1");
    expect(setRunLogTaskId).toHaveBeenCalledWith("task-2");
    expect(setRunLogSurface).toHaveBeenCalledWith("conversation");
    expect(setConversationEntries).toHaveBeenCalledWith(thread.entries);
    expect(setRunLogDetail).toHaveBeenCalledWith(thread.runs[1]);
    expect(setRunLogError).toHaveBeenCalledWith(null);
    expect(setAgentTask).toHaveBeenCalledWith(null);
  });

  it("can apply the detail without changing the current run log surface", () => {
    const thread = createThread();
    const setRunLogSurface = vi.fn();

    expect(
      applyAcpThreadDetailState({
        detail: thread,
        options: { activateSurface: false },
        setActiveThreadId: vi.fn(),
        setRunLogTaskId: vi.fn(),
        setRunLogSurface,
        setConversationEntries: vi.fn(),
        setRunLogDetail: vi.fn(),
        setRunLogError: vi.fn(),
        setAgentTask: vi.fn(),
      }),
    ).toMatchObject({
      activeThreadId: "thread-1",
      runLogTaskId: "task-2",
      shouldUpdateRunLogSurface: false,
      runLogSurface: null,
    });

    expect(setRunLogSurface).not.toHaveBeenCalled();
  });
});

describe("applyAcpInitialThreadResetState", () => {
  it("applies the initial thread reset state to refs and conversation state", () => {
    const setActiveThreadId = vi.fn();
    const setRunLogTaskId = vi.fn();
    const setConversationEntries = vi.fn();
    const setRunLogDetail = vi.fn();
    const setRunLogSurface = vi.fn();

    applyAcpInitialThreadResetState({
      state: {
        activeThreadId: null,
        runLogTaskId: null,
        conversationEntries: [],
        runLogDetail: null,
        runLogSurface: null,
      },
      setActiveThreadId,
      setRunLogTaskId,
      setConversationEntries,
      setRunLogDetail,
      setRunLogSurface,
    });

    expect(setActiveThreadId).toHaveBeenCalledWith(null);
    expect(setRunLogTaskId).toHaveBeenCalledWith(null);
    expect(setConversationEntries).toHaveBeenCalledWith([]);
    expect(setRunLogDetail).toHaveBeenCalledWith(null);
    expect(setRunLogSurface).toHaveBeenCalledWith(null);
  });
});

describe("applyNewAcpThreadState", () => {
  it("applies a new thread state to active refs and conversation state", () => {
    const state = buildNewAcpThreadState();
    const setActiveThreadId = vi.fn();
    const setActiveTaskId = vi.fn();
    const setRunLogTaskId = vi.fn();
    const setRunLogSurface = vi.fn();
    const setConversationEntries = vi.fn();
    const setRunLogDetail = vi.fn();
    const setRunLogError = vi.fn();
    const setAgentTask = vi.fn();
    const setChatDockOpen = vi.fn();

    expect(
      applyNewAcpThreadState({
        state,
        setActiveThreadId,
        setActiveTaskId,
        setRunLogTaskId,
        setRunLogSurface,
        setConversationEntries,
        setRunLogDetail,
        setRunLogError,
        setAgentTask,
        setChatDockOpen,
      }),
    ).toBe(state);

    expect(setActiveThreadId).toHaveBeenCalledWith(null);
    expect(setActiveTaskId).toHaveBeenCalledWith(null);
    expect(setRunLogTaskId).toHaveBeenCalledWith(null);
    expect(setRunLogSurface).toHaveBeenCalledWith("conversation");
    expect(setConversationEntries).toHaveBeenCalledWith([]);
    expect(setRunLogDetail).toHaveBeenCalledWith(null);
    expect(setRunLogError).toHaveBeenCalledWith(null);
    expect(setAgentTask).toHaveBeenCalledWith(null);
    expect(setChatDockOpen).toHaveBeenCalledWith(true);
  });
});

describe("createAcpActiveThreadIdRendererActions", () => {
  it("keeps active thread ref and renderer state in sync", () => {
    let activeThreadRef: string | null = "thread-old";
    const setActiveThreadId = vi.fn();

    const actions = createAcpActiveThreadIdRendererActions({
      setActiveThreadIdRef: (threadId) => {
        activeThreadRef = threadId;
      },
      setActiveThreadId,
    });

    actions.set("thread-next");

    expect(activeThreadRef).toBe("thread-next");
    expect(setActiveThreadId).toHaveBeenCalledWith("thread-next");

    actions.set(null);

    expect(activeThreadRef).toBeNull();
    expect(setActiveThreadId).toHaveBeenLastCalledWith(null);
  });
});

describe("createAcpThreadRendererActions", () => {
  it("loads initial thread state through the shared thread apply wiring", async () => {
    const setActiveThreadId = vi.fn();
    const setRunLogTaskId = vi.fn();
    const setConversationEntries = vi.fn();
    const setRunLogDetail = vi.fn();
    const setRunLogSurface = vi.fn();
    const applyThreadSummariesState = vi.fn();
    const loadInitialThread = vi.fn(async (input) => {
      input.applyInitialThreadResetState({
        activeThreadId: null,
        runLogTaskId: null,
        conversationEntries: [],
        runLogDetail: null,
        runLogSurface: null,
      });
      input.applyThreadSummariesState({
        summaries: [],
        error: null,
        loading: false,
      });
      return { status: "loaded" as const, latestDetailApplied: false };
    });

    const actions = createAcpThreadRendererActions({
      getBridge: () => ({}),
      nextLoadSequence: () => 1,
      isLoadSequenceCurrent: (sequence) => sequence === 1,
      getCurrentProjectToken: () => "project-token",
      getTaskRunning: () => false,
      getActiveThreadId: () => null,
      applyThreadSummariesState,
      setActiveThreadId,
      setActiveTaskId: vi.fn(),
      runLogTargetActions: {
        setTaskId: setRunLogTaskId,
        setSurface: setRunLogSurface,
      },
      setConversationEntries,
      setRunLogDetail,
      setRunLogError: vi.fn(),
      setAgentTask: vi.fn(),
      setChatDockOpen: vi.fn(),
      loadInitialThread,
    });

    await expect(actions.loadInitial()).resolves.toEqual({
      status: "loaded",
      latestDetailApplied: false,
    });

    expect(loadInitialThread).toHaveBeenCalledTimes(1);
    expect(loadInitialThread.mock.calls[0]?.[0].projectToken).toBe(
      "project-token",
    );
    expect(setActiveThreadId).toHaveBeenCalledWith(null);
    expect(setRunLogTaskId).toHaveBeenCalledWith(null);
    expect(setConversationEntries).toHaveBeenCalledWith([]);
    expect(setRunLogDetail).toHaveBeenCalledWith(null);
    expect(setRunLogSurface).toHaveBeenCalledWith(null);
    expect(applyThreadSummariesState).toHaveBeenCalledWith({
      summaries: [],
      error: null,
      loading: false,
    });
  });

  it("starts initial thread loading as a fire-and-forget lifecycle action", () => {
    const loadInitialThread = vi.fn(async () => ({
      status: "loaded" as const,
      latestDetailApplied: false,
    }));

    const actions = createAcpThreadRendererActions({
      getBridge: () => ({}),
      nextLoadSequence: () => 1,
      isLoadSequenceCurrent: (sequence) => sequence === 1,
      getCurrentProjectToken: () => "project-token",
      getTaskRunning: () => false,
      getActiveThreadId: () => null,
      applyThreadSummariesState: vi.fn(),
      setActiveThreadId: vi.fn(),
      setActiveTaskId: vi.fn(),
      runLogTargetActions: {
        setTaskId: vi.fn(),
        setSurface: vi.fn(),
      },
      setConversationEntries: vi.fn(),
      setRunLogDetail: vi.fn(),
      setRunLogError: vi.fn(),
      setAgentTask: vi.fn(),
      setChatDockOpen: vi.fn(),
      loadInitialThread,
    });

    expect(actions.startInitialLoad()).toBeUndefined();
    expect(loadInitialThread).toHaveBeenCalledTimes(1);
    expect(loadInitialThread).toHaveBeenCalledWith(
      expect.objectContaining({ projectToken: "project-token" }),
    );
  });

  it("selects a thread by reading detail and applying the conversation state", async () => {
    const thread = createThread();
    const setActiveThreadId = vi.fn();
    const setRunLogTaskId = vi.fn();
    const setRunLogSurface = vi.fn();
    const setConversationEntries = vi.fn();
    const setRunLogDetail = vi.fn();
    const setRunLogError = vi.fn();
    const setAgentTask = vi.fn();
    const setChatDockOpen = vi.fn();
    const readAcpAgentThread = vi.fn(async () => thread);

    const actions = createAcpThreadRendererActions({
      getBridge: () => ({ readAcpAgentThread }),
      nextLoadSequence: () => 1,
      isLoadSequenceCurrent: () => true,
      getCurrentProjectToken: () => "project-token",
      getTaskRunning: () => false,
      getActiveThreadId: () => null,
      applyThreadSummariesState: vi.fn(),
      setActiveThreadId,
      setActiveTaskId: vi.fn(),
      runLogTargetActions: {
        setTaskId: setRunLogTaskId,
        setSurface: setRunLogSurface,
      },
      setConversationEntries,
      setRunLogDetail,
      setRunLogError,
      setAgentTask,
      setChatDockOpen,
    });

    await expect(actions.selectThread("thread-1")).resolves.toEqual({
      status: "loaded",
    });

    expect(readAcpAgentThread).toHaveBeenCalledWith("thread-1");
    expect(setActiveThreadId).toHaveBeenCalledWith("thread-1");
    expect(setRunLogTaskId).toHaveBeenCalledWith("task-2");
    expect(setRunLogSurface).toHaveBeenCalledWith("conversation");
    expect(setConversationEntries).toHaveBeenCalledWith(thread.entries);
    expect(setRunLogDetail).toHaveBeenCalledWith(thread.runs[1]);
    expect(setRunLogError).toHaveBeenCalledWith(null);
    expect(setAgentTask).toHaveBeenCalledWith(null);
    expect(setChatDockOpen).toHaveBeenCalledWith(true);
  });

  it("selects a conversation thread without leaking the controller result to UI callbacks", async () => {
    const thread = createThread();
    const readAcpAgentThread = vi.fn(async () => thread);

    const actions = createAcpThreadRendererActions({
      getBridge: () => ({ readAcpAgentThread }),
      nextLoadSequence: () => 1,
      isLoadSequenceCurrent: () => true,
      getCurrentProjectToken: () => "project-token",
      getTaskRunning: () => false,
      getActiveThreadId: () => null,
      applyThreadSummariesState: vi.fn(),
      setActiveThreadId: vi.fn(),
      setActiveTaskId: vi.fn(),
      runLogTargetActions: {
        setTaskId: vi.fn(),
        setSurface: vi.fn(),
      },
      setConversationEntries: vi.fn(),
      setRunLogDetail: vi.fn(),
      setRunLogError: vi.fn(),
      setAgentTask: vi.fn(),
      setChatDockOpen: vi.fn(),
    });

    await expect(
      actions.selectThreadForConversation("thread-1"),
    ).resolves.toBeUndefined();

    expect(readAcpAgentThread).toHaveBeenCalledWith("thread-1");
  });

  it("starts a new thread through the shared thread apply wiring", () => {
    const setActiveThreadId = vi.fn();
    const setActiveTaskId = vi.fn();
    const setRunLogTaskId = vi.fn();
    const setRunLogSurface = vi.fn();
    const setConversationEntries = vi.fn();
    const setRunLogDetail = vi.fn();
    const setRunLogError = vi.fn();
    const setAgentTask = vi.fn();
    const setChatDockOpen = vi.fn();

    const actions = createAcpThreadRendererActions({
      getBridge: () => null,
      nextLoadSequence: () => 1,
      isLoadSequenceCurrent: () => true,
      getCurrentProjectToken: () => null,
      getTaskRunning: () => false,
      getActiveThreadId: () => "thread-1",
      applyThreadSummariesState: vi.fn(),
      setActiveThreadId,
      setActiveTaskId,
      runLogTargetActions: {
        setTaskId: setRunLogTaskId,
        setSurface: setRunLogSurface,
      },
      setConversationEntries,
      setRunLogDetail,
      setRunLogError,
      setAgentTask,
      setChatDockOpen,
    });

    expect(actions.startNewThread()).toEqual({ status: "started" });
    expect(setActiveThreadId).toHaveBeenCalledWith(null);
    expect(setActiveTaskId).toHaveBeenCalledWith(null);
    expect(setRunLogTaskId).toHaveBeenCalledWith(null);
    expect(setRunLogSurface).toHaveBeenCalledWith("conversation");
    expect(setConversationEntries).toHaveBeenCalledWith([]);
    expect(setRunLogDetail).toHaveBeenCalledWith(null);
    expect(setRunLogError).toHaveBeenCalledWith(null);
    expect(setAgentTask).toHaveBeenCalledWith(null);
    expect(setChatDockOpen).toHaveBeenCalledWith(true);
  });
});
