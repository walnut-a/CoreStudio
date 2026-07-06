import { describe, expect, it, vi } from "vitest";

import {
  canReadAcpInitialThreadState,
  readAcpInitialThreadState,
} from "./acpInitialThreadReader";

import type {
  AcpRunLogDetail,
  AcpThreadDetail,
  AcpThreadSummary,
} from "../../shared/acpTypes";

const createThreadSummary = (
  overrides: Partial<AcpThreadSummary> = {},
): AcpThreadSummary => ({
  threadId: "acp-thread-1",
  projectToken: "project-token",
  projectName: "工业设计助手",
  agentName: "Codex ACP",
  title: "优化桌面 CNC",
  status: "completed",
  createdAt: "2026-07-03T08:00:00.000Z",
  updatedAt: "2026-07-03T08:01:00.000Z",
  taskIds: ["task-1"],
  lastTaskId: "task-1",
  ...overrides,
});

const createRunLogDetail = (): AcpRunLogDetail => ({
  summary: {
    mode: "acp-agent",
    taskId: "task-1",
    threadId: "acp-thread-1",
    projectToken: "project-token",
    projectName: "工业设计助手",
    agentName: "Codex ACP",
    userPrompt: "优化桌面 CNC",
    status: "completed",
    startedAt: "2026-07-03T08:00:00.000Z",
    logFile: "/tmp/task-1.jsonl",
  },
  entries: [],
});

const createThreadDetail = (
  overrides: Partial<AcpThreadDetail> = {},
): AcpThreadDetail => ({
  summary: createThreadSummary(),
  runs: [createRunLogDetail()],
  entries: [],
  ...overrides,
});

describe("acpInitialThreadReader", () => {
  it("reports whether the bridge can read the initial thread state", () => {
    expect(
      canReadAcpInitialThreadState({
        bridge: null,
        projectToken: "project-token",
      }),
    ).toBe(false);
    expect(
      canReadAcpInitialThreadState({
        bridge: {
          listAcpAgentThreads: async () => [],
        },
        projectToken: "project-token",
      }),
    ).toBe(false);
    expect(
      canReadAcpInitialThreadState({
        bridge: {
          readAcpAgentThread: async () => createThreadDetail(),
        },
        projectToken: "project-token",
      }),
    ).toBe(false);
    expect(
      canReadAcpInitialThreadState({
        bridge: {
          listAcpAgentThreads: async () => [],
          readAcpAgentThread: async () => createThreadDetail(),
        },
        projectToken: "",
      }),
    ).toBe(false);
    expect(
      canReadAcpInitialThreadState({
        bridge: {
          listAcpAgentThreads: async () => [],
          readAcpAgentThread: async () => createThreadDetail(),
        },
        projectToken: "project-token",
      }),
    ).toBe(true);
  });

  it("returns empty state when the preconditions are missing", async () => {
    await expect(
      readAcpInitialThreadState({
        bridge: {},
        projectToken: "project-token",
      }),
    ).resolves.toEqual({ summaries: [], latestDetail: null });
  });

  it("reads summaries and the latest thread detail", async () => {
    const summaries = [
      createThreadSummary({ threadId: "acp-thread-latest" }),
      createThreadSummary({ threadId: "acp-thread-older" }),
    ];
    const detail = createThreadDetail({
      summary: createThreadSummary({ threadId: "acp-thread-latest" }),
    });
    const listAcpAgentThreads = vi.fn(async () => summaries);
    const readAcpAgentThread = vi.fn(async () => detail);

    await expect(
      readAcpInitialThreadState({
        bridge: { listAcpAgentThreads, readAcpAgentThread },
        projectToken: "project-token",
      }),
    ).resolves.toEqual({ summaries, latestDetail: detail });

    expect(listAcpAgentThreads).toHaveBeenCalledWith({
      projectToken: "project-token",
      limit: 20,
    });
    expect(readAcpAgentThread).toHaveBeenCalledWith("acp-thread-latest");
  });

  it("does not read a thread detail when there are no summaries", async () => {
    const listAcpAgentThreads = vi.fn(async () => []);
    const readAcpAgentThread = vi.fn(async () => createThreadDetail());

    await expect(
      readAcpInitialThreadState({
        bridge: { listAcpAgentThreads, readAcpAgentThread },
        projectToken: "project-token",
      }),
    ).resolves.toEqual({ summaries: [], latestDetail: null });

    expect(readAcpAgentThread).not.toHaveBeenCalled();
  });

  it("propagates summary read failures", async () => {
    await expect(
      readAcpInitialThreadState({
        bridge: {
          listAcpAgentThreads: async () => {
            throw new Error("summary index is broken");
          },
          readAcpAgentThread: async () => createThreadDetail(),
        },
        projectToken: "project-token",
      }),
    ).rejects.toThrow("summary index is broken");
  });

  it("propagates latest detail read failures", async () => {
    await expect(
      readAcpInitialThreadState({
        bridge: {
          listAcpAgentThreads: async () => [createThreadSummary()],
          readAcpAgentThread: async () => {
            throw new Error("thread detail is broken");
          },
        },
        projectToken: "project-token",
      }),
    ).rejects.toThrow("thread detail is broken");
  });
});
