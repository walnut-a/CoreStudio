import { describe, expect, it, vi } from "vitest";

import {
  canReadAcpThreadDetail,
  readAcpThreadDetail,
} from "./acpThreadDetailReader";

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

describe("readAcpThreadDetail", () => {
  it("reports whether the current bridge can read thread details", () => {
    expect(canReadAcpThreadDetail(null)).toBe(false);
    expect(canReadAcpThreadDetail({})).toBe(false);
    expect(
      canReadAcpThreadDetail({
        readAcpAgentThread: async () => createThreadDetail(),
      }),
    ).toBe(true);
  });

  it("fails with a user-readable error when the bridge cannot read threads", async () => {
    await expect(
      readAcpThreadDetail({
        bridge: {},
        threadId: "acp-thread-1",
      }),
    ).rejects.toThrow("当前环境不能读取 Agent 对话历史。");
  });

  it("reads the thread detail by thread id", async () => {
    const detail = createThreadDetail();
    const readAcpAgentThread = vi.fn(async () => detail);

    await expect(
      readAcpThreadDetail({
        bridge: { readAcpAgentThread },
        threadId: "acp-thread-1",
      }),
    ).resolves.toBe(detail);

    expect(readAcpAgentThread).toHaveBeenCalledWith("acp-thread-1");
  });

  it("propagates read failures so App can render the product error copy", async () => {
    await expect(
      readAcpThreadDetail({
        bridge: {
          readAcpAgentThread: async () => {
            throw new Error("thread log is broken");
          },
        },
        threadId: "acp-thread-1",
      }),
    ).rejects.toThrow("thread log is broken");
  });
});
