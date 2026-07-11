import { describe, expect, it, vi } from "vitest";

import { runAcpThreadSelection } from "./acpThreadSelectionController";

import type {
  AcpRunLogDetail,
  AcpThreadDetail,
  AcpThreadSummary,
} from "../../shared/acpTypes";

const createThreadSummary = (
  patch: Partial<AcpThreadSummary> = {},
): AcpThreadSummary => ({
  threadId: "thread-1",
  projectToken: "project-token",
  projectName: "工业设计助手",
  agentName: "Codex ACP",
  title: "优化桌面 CNC",
  status: "completed",
  createdAt: "2026-07-04T08:00:00.000Z",
  updatedAt: "2026-07-04T08:01:00.000Z",
  taskIds: ["task-1"],
  lastTaskId: "task-1",
  ...patch,
});

const createRunLogDetail = (): AcpRunLogDetail => ({
  summary: {
    mode: "acp-agent",
    taskId: "task-1",
    threadId: "thread-1",
    projectToken: "project-token",
    projectName: "工业设计助手",
    agentName: "Codex ACP",
    userPrompt: "优化桌面 CNC",
    status: "completed",
    startedAt: "2026-07-04T08:00:00.000Z",
    logFile: "/tmp/task-1.ndjson",
  },
  entries: [],
});

const createThreadDetail = (
  patch: Partial<AcpThreadDetail> = {},
): AcpThreadDetail => ({
  summary: createThreadSummary(),
  runs: [createRunLogDetail()],
  entries: [],
  ...patch,
});

const createCallbacks = () => ({
  applyThreadSummariesState: vi.fn(),
  applyThreadDetail: vi.fn(),
  setRunLogError: vi.fn(),
  setChatDockOpen: vi.fn(),
  formatReadError: (error: unknown) =>
    error instanceof Error ? `格式化：${error.message}` : "格式化：未知错误",
});

describe("runAcpThreadSelection", () => {
  it("ignores selection while an ACP task is running", async () => {
    const callbacks = createCallbacks();
    const getTaskRunning = vi.fn(() => true);
    const getActiveThreadId = vi.fn(() => null);

    await expect(
      runAcpThreadSelection({
        bridge: { readAcpAgentThread: vi.fn() },
        threadId: "thread-1",
        getTaskRunning,
        getActiveThreadId,
        ...callbacks,
      }),
    ).resolves.toEqual({ status: "ignored" });

    expect(getTaskRunning).toHaveBeenCalledTimes(1);
    expect(getActiveThreadId).toHaveBeenCalledTimes(1);
    expect(callbacks.applyThreadDetail).not.toHaveBeenCalled();
    expect(callbacks.applyThreadSummariesState).not.toHaveBeenCalled();
    expect(callbacks.setChatDockOpen).not.toHaveBeenCalled();
  });

  it("shows the unavailable error when the bridge cannot read thread detail", async () => {
    const callbacks = createCallbacks();
    const getTaskRunning = vi.fn(() => false);
    const getActiveThreadId = vi.fn(() => null);

    await expect(
      runAcpThreadSelection({
        bridge: {},
        threadId: "thread-1",
        getTaskRunning,
        getActiveThreadId,
        ...callbacks,
      }),
    ).resolves.toEqual({ status: "unavailable" });

    expect(getTaskRunning).toHaveBeenCalledTimes(1);
    expect(getActiveThreadId).toHaveBeenCalledTimes(1);
    expect(callbacks.setRunLogError).toHaveBeenCalledWith(
      "当前环境不能读取 Agent 对话历史。",
    );
    expect(callbacks.applyThreadDetail).not.toHaveBeenCalled();
  });

  it("opens the chat dock when selecting the active thread", async () => {
    const callbacks = createCallbacks();
    const getTaskRunning = vi.fn(() => false);
    const getActiveThreadId = vi.fn(() => "thread-1");

    await expect(
      runAcpThreadSelection({
        bridge: { readAcpAgentThread: vi.fn() },
        threadId: "thread-1",
        getTaskRunning,
        getActiveThreadId,
        ...callbacks,
      }),
    ).resolves.toEqual({ status: "active-thread-shown" });

    expect(getTaskRunning).toHaveBeenCalledTimes(1);
    expect(getActiveThreadId).toHaveBeenCalledTimes(1);
    expect(callbacks.setChatDockOpen).toHaveBeenCalledWith(true);
    expect(callbacks.applyThreadDetail).not.toHaveBeenCalled();
  });

  it("reads a different thread detail and applies the loaded state", async () => {
    const callbacks = createCallbacks();
    const detail = createThreadDetail();
    const readAcpAgentThread = vi.fn(async () => detail);

    await expect(
      runAcpThreadSelection({
        bridge: { readAcpAgentThread },
        threadId: "thread-1",
        getTaskRunning: () => false,
        getActiveThreadId: () => null,
        ...callbacks,
      }),
    ).resolves.toEqual({ status: "loaded" });

    expect(callbacks.applyThreadSummariesState).toHaveBeenNthCalledWith(1, {
      summaries: null,
      error: null,
      loading: true,
    });
    expect(readAcpAgentThread).toHaveBeenCalledWith("thread-1");
    expect(callbacks.applyThreadDetail).toHaveBeenCalledWith(detail);
    expect(callbacks.setChatDockOpen).toHaveBeenCalledWith(true);
    expect(callbacks.applyThreadSummariesState).toHaveBeenLastCalledWith({
      summaries: null,
      error: null,
      loading: false,
    });
  });

  it("formats detail read failures and stops thread list loading", async () => {
    const callbacks = createCallbacks();
    const readError = new Error("thread detail failed");

    await expect(
      runAcpThreadSelection({
        bridge: {
          readAcpAgentThread: vi.fn(async () => {
            throw readError;
          }),
        },
        threadId: "thread-1",
        getTaskRunning: () => false,
        getActiveThreadId: () => null,
        ...callbacks,
      }),
    ).resolves.toEqual({ status: "failed" });

    expect(callbacks.setRunLogError).toHaveBeenLastCalledWith(
      "格式化：thread detail failed",
    );
    expect(callbacks.applyThreadSummariesState).toHaveBeenLastCalledWith({
      summaries: null,
      error: null,
      loading: false,
    });
  });

  it("uses the Agent owner fallback message when no formatter is injected", async () => {
    const callbacks = createCallbacks();

    await expect(
      runAcpThreadSelection({
        bridge: {
          readAcpAgentThread: vi.fn(async () => {
            throw "";
          }),
        },
        threadId: "thread-1",
        getTaskRunning: () => false,
        getActiveThreadId: () => null,
        applyThreadSummariesState: callbacks.applyThreadSummariesState,
        applyThreadDetail: callbacks.applyThreadDetail,
        setRunLogError: callbacks.setRunLogError,
        setChatDockOpen: callbacks.setChatDockOpen,
      }),
    ).resolves.toEqual({ status: "failed" });

    expect(callbacks.setRunLogError).toHaveBeenLastCalledWith(
      "读取 Agent 对话历史失败。",
    );
    expect(callbacks.applyThreadSummariesState).toHaveBeenLastCalledWith({
      summaries: null,
      error: null,
      loading: false,
    });
  });
});
