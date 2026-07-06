import { describe, expect, it, vi } from "vitest";

import { runAcpRunLogDetailRefresh } from "./acpRunLogDetailController";

import type { AcpRunLogDetail, AcpRunLogEntry } from "../../shared/acpTypes";
import type { AcpRunLogDetailLoadSuccessState } from "./acpRunLogState";

const createRunLogEntry = (
  patch: Partial<AcpRunLogEntry> = {},
): AcpRunLogEntry => ({
  version: 1,
  taskId: "task-1",
  timestamp: "2026-07-04T08:00:00.000Z",
  seq: 1,
  kind: "agent.message",
  payload: { text: "hello" },
  ...patch,
});

const createRunLogDetail = (
  patch: Partial<AcpRunLogDetail> = {},
): AcpRunLogDetail => ({
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
  entries: [createRunLogEntry()],
  ...patch,
});

describe("runAcpRunLogDetailRefresh", () => {
  it("loads the active run log detail and merges conversation entries", async () => {
    const detail = createRunLogDetail({
      entries: [createRunLogEntry({ seq: 2 })],
    });
    let conversationEntries = [
      createRunLogEntry({ taskId: "task-2", seq: 1 }),
      createRunLogEntry({ taskId: "task-1", seq: 1 }),
    ];
    const setLoading = vi.fn();
    const setRunLogError = vi.fn();
    const applySuccessState = vi.fn();
    const applyFailureState = vi.fn();
    const updateConversationEntries = vi.fn(
      (updater: (current: AcpRunLogEntry[]) => AcpRunLogEntry[]) => {
        conversationEntries = updater(conversationEntries);
      },
    );

    await expect(
      runAcpRunLogDetailRefresh({
        bridge: {},
        taskId: "task-1",
        showLoading: true,
        getCurrentTaskId: () => "task-1",
        getSurface: () => "conversation",
        setLoading,
        setRunLogError,
        applySuccessState,
        applyFailureState,
        updateConversationEntries,
        formatReadError: () => "读取失败",
        readRunLogDetail: async () => detail,
      }),
    ).resolves.toEqual({ status: "loaded" });

    expect(setLoading).toHaveBeenNthCalledWith(1, true);
    expect(setRunLogError).toHaveBeenCalledWith(null);
    expect(applySuccessState).toHaveBeenCalledWith({
      runLogDetail: detail,
      conversationEntries: [
        createRunLogEntry({ seq: 2 }),
      ],
      runLogError: null,
    } satisfies AcpRunLogDetailLoadSuccessState);
    expect(updateConversationEntries).toHaveBeenCalledTimes(1);
    expect(conversationEntries).toEqual([
      createRunLogEntry({ taskId: "task-2", seq: 1 }),
      createRunLogEntry({ taskId: "task-1", seq: 2 }),
    ]);
    expect(applyFailureState).not.toHaveBeenCalled();
    expect(setLoading).toHaveBeenLastCalledWith(false);
  });

  it("applies a formatted error when the active run log detail cannot be read", async () => {
    const setLoading = vi.fn();
    const applySuccessState = vi.fn();
    const applyFailureState = vi.fn();
    const updateConversationEntries = vi.fn();

    await expect(
      runAcpRunLogDetailRefresh({
        bridge: {},
        taskId: "task-1",
        showLoading: true,
        getCurrentTaskId: () => "task-1",
        getSurface: () => "record",
        setLoading,
        setRunLogError: vi.fn(),
        applySuccessState,
        applyFailureState,
        updateConversationEntries,
        formatReadError: (error) =>
          error instanceof Error ? `格式化：${error.message}` : "格式化失败",
        readRunLogDetail: async () => {
          throw new Error("boom");
        },
      }),
    ).resolves.toEqual({ status: "failed" });

    expect(applySuccessState).not.toHaveBeenCalled();
    expect(updateConversationEntries).not.toHaveBeenCalled();
    expect(applyFailureState).toHaveBeenCalledWith({
      runLogError: "格式化：boom",
    });
    expect(setLoading).toHaveBeenLastCalledWith(false);
  });

  it("uses the Agent owner fallback message when no formatter is injected", async () => {
    const setLoading = vi.fn();
    const applySuccessState = vi.fn();
    const applyFailureState = vi.fn();
    const updateConversationEntries = vi.fn();

    await expect(
      runAcpRunLogDetailRefresh({
        bridge: {},
        taskId: "task-1",
        showLoading: true,
        getCurrentTaskId: () => "task-1",
        getSurface: () => "record",
        setLoading,
        setRunLogError: vi.fn(),
        applySuccessState,
        applyFailureState,
        updateConversationEntries,
        readRunLogDetail: async () => {
          throw "run detail failed";
        },
      }),
    ).resolves.toEqual({ status: "failed" });

    expect(applySuccessState).not.toHaveBeenCalled();
    expect(updateConversationEntries).not.toHaveBeenCalled();
    expect(applyFailureState).toHaveBeenCalledWith({
      runLogError: "run detail failed",
    });
    expect(setLoading).toHaveBeenLastCalledWith(false);
  });

  it("does not apply stale detail after the active task has changed", async () => {
    let currentTaskId: string | null = "task-1";
    const setLoading = vi.fn();
    const applySuccessState = vi.fn();
    const applyFailureState = vi.fn();
    const updateConversationEntries = vi.fn();

    await expect(
      runAcpRunLogDetailRefresh({
        bridge: {},
        taskId: "task-1",
        showLoading: true,
        getCurrentTaskId: () => currentTaskId,
        getSurface: () => "conversation",
        setLoading,
        setRunLogError: vi.fn(),
        applySuccessState,
        applyFailureState,
        updateConversationEntries,
        formatReadError: () => "读取失败",
        readRunLogDetail: async () => {
          currentTaskId = "task-2";
          return createRunLogDetail();
        },
      }),
    ).resolves.toEqual({ status: "stale" });

    expect(applySuccessState).not.toHaveBeenCalled();
    expect(applyFailureState).not.toHaveBeenCalled();
    expect(updateConversationEntries).not.toHaveBeenCalled();
    expect(setLoading).toHaveBeenCalledTimes(1);
    expect(setLoading).toHaveBeenCalledWith(true);
  });
});
