import { describe, expect, it, vi } from "vitest";

import {
  ACP_RUN_SUMMARY_READ_LIMIT,
  canReadAcpRunSummaries,
  readAcpRunSummaries,
} from "./acpRunSummaryReader";

import type { AcpRunSummary } from "../../shared/acpTypes";

const createRunSummary = (
  overrides: Partial<AcpRunSummary> = {},
): AcpRunSummary => ({
  mode: "acp-agent",
  taskId: "task-1",
  threadId: "thread-1",
  projectToken: "project-token",
  projectName: "工业设计助手",
  agentName: "Codex ACP",
  userPrompt: "优化桌面 CNC",
  status: "completed",
  startedAt: "2026-07-03T08:00:00.000Z",
  logFile: "/tmp/task-1.jsonl",
  ...overrides,
});

describe("readAcpRunSummaries", () => {
  it("reports whether the current bridge can read run summaries", () => {
    expect(canReadAcpRunSummaries(null)).toBe(false);
    expect(canReadAcpRunSummaries({})).toBe(false);
    expect(
      canReadAcpRunSummaries({
        listAcpAgentRunLogs: async () => [],
      }),
    ).toBe(true);
  });

  it("returns an empty list when the bridge cannot list run logs", async () => {
    await expect(readAcpRunSummaries({ bridge: {} })).resolves.toEqual([]);
  });

  it("reads run summaries with the default debug limit", async () => {
    const summaries = [createRunSummary()];
    const listAcpAgentRunLogs = vi.fn(async () => summaries);

    await expect(
      readAcpRunSummaries({
        bridge: { listAcpAgentRunLogs },
      }),
    ).resolves.toBe(summaries);

    expect(listAcpAgentRunLogs).toHaveBeenCalledWith({
      limit: ACP_RUN_SUMMARY_READ_LIMIT,
    });
  });

  it("allows callers to override the read limit", async () => {
    const summaries = [createRunSummary({ taskId: "task-2" })];
    const listAcpAgentRunLogs = vi.fn(async () => summaries);

    await expect(
      readAcpRunSummaries({
        bridge: { listAcpAgentRunLogs },
        limit: 3,
      }),
    ).resolves.toBe(summaries);

    expect(listAcpAgentRunLogs).toHaveBeenCalledWith({ limit: 3 });
  });

  it("propagates read failures so App can render the product error copy", async () => {
    await expect(
      readAcpRunSummaries({
        bridge: {
          listAcpAgentRunLogs: async () => {
            throw new Error("run index is broken");
          },
        },
      }),
    ).rejects.toThrow("run index is broken");
  });
});
