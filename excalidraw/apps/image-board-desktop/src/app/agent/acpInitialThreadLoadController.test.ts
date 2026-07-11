import { describe, expect, it, vi } from "vitest";

import {
  runAcpInitialThreadLoad,
  startAcpInitialThreadLoadAction,
  type AcpInitialThreadLoadControllerInput,
} from "./acpInitialThreadLoadController";

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
  entries: [],
  ...patch,
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
  applyInitialThreadResetState: vi.fn(),
  applyThreadSummariesState: vi.fn(),
  applyThreadDetail: vi.fn(),
  formatReadError: (error: unknown) =>
    error instanceof Error ? `格式化：${error.message}` : "格式化：未知错误",
  onReadError: vi.fn(),
});

describe("runAcpInitialThreadLoad", () => {
  it("applies unavailable reset state when the bridge cannot read initial thread state", async () => {
    const callbacks = createCallbacks();

    await expect(
      runAcpInitialThreadLoad({
        bridge: {},
        projectToken: "project-token",
        isStale: () => false,
        isCurrentProjectToken: () => true,
        ...callbacks,
      }),
    ).resolves.toEqual({ status: "unavailable" });

    expect(callbacks.applyInitialThreadResetState).toHaveBeenCalledWith({
      activeThreadId: null,
      runLogTaskId: null,
      conversationEntries: [],
      runLogDetail: null,
      runLogSurface: null,
      summaries: [],
      summariesError: null,
      summariesLoading: false,
    });
    expect(callbacks.applyThreadSummariesState).toHaveBeenCalledWith({
      summaries: [],
      error: null,
      loading: false,
    });
    expect(callbacks.applyThreadDetail).not.toHaveBeenCalled();
  });

  it("loads summaries and applies the latest thread detail without resetting the conversation", async () => {
    const callbacks = createCallbacks();
    const summaries = [createThreadSummary()];
    const detail = createThreadDetail();

    await expect(
      runAcpInitialThreadLoad({
        bridge: {
          listAcpAgentThreads: vi.fn(async () => summaries),
          readAcpAgentThread: vi.fn(async () => detail),
        },
        projectToken: "project-token",
        isStale: () => false,
        isCurrentProjectToken: () => true,
        ...callbacks,
      }),
    ).resolves.toEqual({ status: "loaded", latestDetailApplied: true });

    expect(callbacks.applyThreadSummariesState).toHaveBeenNthCalledWith(1, {
      summaries: null,
      error: null,
      loading: true,
    });
    expect(callbacks.applyThreadSummariesState).toHaveBeenNthCalledWith(2, {
      summaries,
      error: null,
      loading: false,
    });
    expect(callbacks.applyThreadDetail).toHaveBeenCalledWith(detail, {
      activateSurface: false,
    });
    expect(callbacks.applyInitialThreadResetState).not.toHaveBeenCalled();
  });

  it("resets the conversation when there is no latest thread detail", async () => {
    const callbacks = createCallbacks();

    await expect(
      runAcpInitialThreadLoad({
        bridge: {
          listAcpAgentThreads: vi.fn(async () => []),
          readAcpAgentThread: vi.fn(),
        },
        projectToken: "project-token",
        isStale: () => false,
        isCurrentProjectToken: () => true,
        ...callbacks,
      }),
    ).resolves.toEqual({ status: "loaded", latestDetailApplied: false });

    expect(callbacks.applyThreadSummariesState).toHaveBeenLastCalledWith({
      summaries: [],
      error: null,
      loading: false,
    });
    expect(callbacks.applyInitialThreadResetState).toHaveBeenCalledWith(
      expect.objectContaining({
        activeThreadId: null,
        resetConversation: true,
      }),
    );
    expect(callbacks.applyThreadDetail).not.toHaveBeenCalled();
  });

  it("drops a stale read result without applying summaries or detail", async () => {
    const callbacks = createCallbacks();

    await expect(
      runAcpInitialThreadLoad({
        bridge: {
          listAcpAgentThreads: vi.fn(async () => [createThreadSummary()]),
          readAcpAgentThread: vi.fn(async () => createThreadDetail()),
        },
        projectToken: "project-token",
        isStale: () => true,
        isCurrentProjectToken: () => true,
        ...callbacks,
      }),
    ).resolves.toEqual({ status: "stale" });

    expect(callbacks.applyThreadSummariesState).toHaveBeenCalledTimes(1);
    expect(callbacks.applyInitialThreadResetState).not.toHaveBeenCalled();
    expect(callbacks.applyThreadDetail).not.toHaveBeenCalled();
  });

  it("applies formatted failure state and reports the raw error", async () => {
    const callbacks = createCallbacks();
    const readError = new Error("thread store failed");

    await expect(
      runAcpInitialThreadLoad({
        bridge: {
          listAcpAgentThreads: vi.fn(async () => {
            throw readError;
          }),
          readAcpAgentThread: vi.fn(),
        },
        projectToken: "project-token",
        isStale: () => false,
        isCurrentProjectToken: () => true,
        ...callbacks,
      }),
    ).resolves.toEqual({ status: "failed" });

    expect(callbacks.applyThreadSummariesState).toHaveBeenLastCalledWith({
      summaries: [],
      error: "格式化：thread store failed",
      loading: false,
    });
    expect(callbacks.onReadError).toHaveBeenCalledWith(readError);
  });

  it("uses the Agent owner fallback message when no formatter is injected", async () => {
    const callbacks = createCallbacks();
    const readError = "";

    await expect(
      runAcpInitialThreadLoad({
        bridge: {
          listAcpAgentThreads: vi.fn(async () => {
            throw readError;
          }),
          readAcpAgentThread: vi.fn(),
        },
        projectToken: "project-token",
        isStale: () => false,
        isCurrentProjectToken: () => true,
        applyInitialThreadResetState: callbacks.applyInitialThreadResetState,
        applyThreadSummariesState: callbacks.applyThreadSummariesState,
        applyThreadDetail: callbacks.applyThreadDetail,
        onReadError: callbacks.onReadError,
      }),
    ).resolves.toEqual({ status: "failed" });

    expect(callbacks.applyThreadSummariesState).toHaveBeenLastCalledWith({
      summaries: [],
      error: "读取 Agent 对话历史失败。",
      loading: false,
    });
    expect(callbacks.onReadError).toHaveBeenCalledWith(readError);
  });
});

describe("startAcpInitialThreadLoadAction", () => {
  it("starts an initial thread load with a sequence-based stale guard", async () => {
    const callbacks = createCallbacks();
    let currentSequence = 0;
    let capturedInput: AcpInitialThreadLoadControllerInput | undefined;
    const getCapturedInput = () => {
      if (!capturedInput) {
        throw new Error("expected initial thread load input to be captured");
      }
      return capturedInput;
    };
    const loadInitialThread = vi.fn(
      async (input: AcpInitialThreadLoadControllerInput) => {
        capturedInput = input;
        return { status: "loaded" as const, latestDetailApplied: false };
      },
    );
    const getCurrentProjectToken = vi.fn(() => "project-token");

    const result = await startAcpInitialThreadLoadAction({
      bridge: {},
      nextLoadSequence: () => {
        currentSequence += 1;
        return currentSequence;
      },
      isLoadSequenceCurrent: (sequence) => currentSequence === sequence,
      getCurrentProjectToken,
      ...callbacks,
      loadInitialThread,
    });

    expect(result).toEqual({
      status: "loaded",
      latestDetailApplied: false,
    });
    expect(getCurrentProjectToken).toHaveBeenCalledTimes(1);
    expect(loadInitialThread).toHaveBeenCalledTimes(1);
    expect(getCapturedInput().projectToken).toBe("project-token");
    expect(getCapturedInput().isStale()).toBe(false);

    currentSequence += 1;
    expect(getCapturedInput().isStale()).toBe(true);
  });

  it("checks loaded project tokens against the latest current project token", async () => {
    const callbacks = createCallbacks();
    let currentProjectToken: string | null = "project-token";
    let capturedInput: AcpInitialThreadLoadControllerInput | undefined;
    const getCapturedInput = () => {
      if (!capturedInput) {
        throw new Error("expected initial thread load input to be captured");
      }
      return capturedInput;
    };

    await startAcpInitialThreadLoadAction({
      bridge: {},
      nextLoadSequence: () => 1,
      isLoadSequenceCurrent: (sequence) => sequence === 1,
      getCurrentProjectToken: () => currentProjectToken,
      ...callbacks,
      loadInitialThread: vi.fn(
        async (input: AcpInitialThreadLoadControllerInput) => {
          capturedInput = input;
          return { status: "stale" as const };
        },
      ),
    });

    expect(getCapturedInput().isCurrentProjectToken("project-token")).toBe(true);
    currentProjectToken = "other-token";
    expect(getCapturedInput().isCurrentProjectToken("project-token")).toBe(false);
    expect(getCapturedInput().isCurrentProjectToken(null)).toBe(false);
  });
});
