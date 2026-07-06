import { describe, expect, it, vi } from "vitest";

import {
  ACP_THREAD_SUMMARY_READ_LIMIT,
  canReadAcpThreadSummaries,
  readAcpThreadSummaries,
} from "./acpThreadSummaryReader";

import type { AcpThreadSummary } from "../../shared/acpTypes";

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

describe("readAcpThreadSummaries", () => {
  it("reports whether the current bridge can read project thread summaries", () => {
    expect(
      canReadAcpThreadSummaries({ bridge: null, projectToken: "project-token" }),
    ).toBe(false);
    expect(
      canReadAcpThreadSummaries({ bridge: {}, projectToken: "project-token" }),
    ).toBe(false);
    expect(
      canReadAcpThreadSummaries({
        bridge: { listAcpAgentThreads: async () => [] },
        projectToken: "",
      }),
    ).toBe(false);
    expect(
      canReadAcpThreadSummaries({
        bridge: { listAcpAgentThreads: async () => [] },
        projectToken: "project-token",
      }),
    ).toBe(true);
  });

  it("returns an empty list when the project token is missing", async () => {
    const listAcpAgentThreads = vi.fn();

    await expect(
      readAcpThreadSummaries({
        bridge: { listAcpAgentThreads },
        projectToken: "",
      }),
    ).resolves.toEqual([]);

    expect(listAcpAgentThreads).not.toHaveBeenCalled();
  });

  it("returns an empty list when the bridge cannot list threads", async () => {
    await expect(
      readAcpThreadSummaries({
        bridge: {},
        projectToken: "project-token",
      }),
    ).resolves.toEqual([]);
  });

  it("reads thread summaries with the default project scoped limit", async () => {
    const summaries = [createThreadSummary()];
    const listAcpAgentThreads = vi.fn(async () => summaries);

    await expect(
      readAcpThreadSummaries({
        bridge: { listAcpAgentThreads },
        projectToken: "project-token",
      }),
    ).resolves.toBe(summaries);

    expect(listAcpAgentThreads).toHaveBeenCalledWith({
      projectToken: "project-token",
      limit: ACP_THREAD_SUMMARY_READ_LIMIT,
    });
  });

  it("allows callers to override the read limit", async () => {
    const summaries = [createThreadSummary({ threadId: "acp-thread-2" })];
    const listAcpAgentThreads = vi.fn(async () => summaries);

    await expect(
      readAcpThreadSummaries({
        bridge: { listAcpAgentThreads },
        projectToken: "project-token",
        limit: 5,
      }),
    ).resolves.toBe(summaries);

    expect(listAcpAgentThreads).toHaveBeenCalledWith({
      projectToken: "project-token",
      limit: 5,
    });
  });

  it("propagates read failures so App can render the product error copy", async () => {
    await expect(
      readAcpThreadSummaries({
        bridge: {
          listAcpAgentThreads: async () => {
            throw new Error("thread index is broken");
          },
        },
        projectToken: "project-token",
      }),
    ).rejects.toThrow("thread index is broken");
  });
});
