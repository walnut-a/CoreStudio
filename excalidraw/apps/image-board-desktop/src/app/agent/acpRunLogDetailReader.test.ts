import { describe, expect, it } from "vitest";

import { readAcpRunLogDetailWithRetry } from "./acpRunLogDetailReader";

import type { AcpRunLogDetail } from "../../shared/acpTypes";

const createRunLogDetail = (): AcpRunLogDetail => ({
  summary: {
    mode: "acp-agent",
    taskId: "task-1",
    threadId: "thread-1",
    projectToken: "project-token",
    projectName: "工业设计助手",
    agentName: "Codex ACP",
    userPrompt: "优化这台 CNC 机器",
    status: "completed",
    startedAt: "2026-07-03T08:00:00.000Z",
    logFile: "/tmp/task-1.jsonl",
  },
  entries: [],
});

describe("readAcpRunLogDetailWithRetry", () => {
  it("fails with a user-readable error when the bridge cannot read run logs", async () => {
    await expect(
      readAcpRunLogDetailWithRetry({
        bridge: {},
        taskId: "task-1",
      }),
    ).rejects.toThrow("当前环境不能读取 ACP Agent 任务记录。");
  });

  it("returns the run log detail without waiting when the first read succeeds", async () => {
    const detail = createRunLogDetail();
    const delays: number[] = [];
    const calls: string[] = [];

    await expect(
      readAcpRunLogDetailWithRetry({
        bridge: {
          readAcpAgentRunLog: async (taskId) => {
            calls.push(taskId);
            return detail;
          },
        },
        taskId: "task-1",
        delays: [0, 80, 240],
        wait: async (delay) => {
          delays.push(delay);
        },
      }),
    ).resolves.toBe(detail);

    expect(calls).toEqual(["task-1"]);
    expect(delays).toEqual([]);
  });

  it("waits before retrying after a failed read", async () => {
    const detail = createRunLogDetail();
    const delays: number[] = [];
    let attempts = 0;

    await expect(
      readAcpRunLogDetailWithRetry({
        bridge: {
          readAcpAgentRunLog: async () => {
            attempts += 1;
            if (attempts === 1) {
              throw new Error("log is not finalized");
            }
            return detail;
          },
        },
        taskId: "task-1",
        delays: [0, 80, 240],
        wait: async (delay) => {
          delays.push(delay);
        },
      }),
    ).resolves.toBe(detail);

    expect(attempts).toBe(2);
    expect(delays).toEqual([80]);
  });

  it("throws the latest read error after exhausting retries", async () => {
    const delays: number[] = [];

    await expect(
      readAcpRunLogDetailWithRetry({
        bridge: {
          readAcpAgentRunLog: async () => {
            throw new Error(`failed-${delays.length}`);
          },
        },
        taskId: "task-1",
        delays: [0, 80, 240],
        wait: async (delay) => {
          delays.push(delay);
        },
      }),
    ).rejects.toThrow("failed-2");

    expect(delays).toEqual([80, 240]);
  });
});
