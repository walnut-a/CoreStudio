import { describe, expect, it } from "vitest";

import type { AcpRunSummary } from "../../shared/acpTypes";
import {
  buildAcpRunSummariesLoadFailureState,
  buildAcpRunSummariesLoadStartState,
  buildAcpRunSummariesLoadSuccessState,
  buildAcpRunSummariesUnavailableState,
} from "./acpRunSummaryState";

const createRunSummary = (
  patch: Partial<AcpRunSummary> = {},
): AcpRunSummary => ({
  mode: "acp-agent",
  taskId: "task-1",
  threadId: "thread-1",
  projectToken: "project-token",
  projectName: "工业设计助手",
  agentName: "Codex ACP",
  userPrompt: "优化桌面 CNC",
  status: "completed",
  startedAt: "2026-07-04T08:00:00.000Z",
  logFile: "/tmp/corestudio-agent-runs/task-1.ndjson",
  ...patch,
});

describe("ACP run summary state", () => {
  it("clears debug summaries when the current bridge cannot read run logs", () => {
    expect(buildAcpRunSummariesUnavailableState()).toEqual({
      summaries: [],
      error: null,
      loading: false,
    });
  });

  it("marks the debug summary list as loading without clearing existing summaries", () => {
    expect(buildAcpRunSummariesLoadStartState()).toEqual({
      summaries: null,
      error: null,
      loading: true,
    });
  });

  it("stores the loaded summaries and clears the loading state", () => {
    const summaries = [
      createRunSummary(),
      createRunSummary({ taskId: "task-2" }),
    ];

    expect(buildAcpRunSummariesLoadSuccessState(summaries)).toEqual({
      summaries,
      error: null,
      loading: false,
    });
  });

  it("shows a product-facing error and clears stale summaries after read failure", () => {
    expect(
      buildAcpRunSummariesLoadFailureState("读取 ACP 调试记录失败。"),
    ).toEqual({
      summaries: [],
      error: "读取 ACP 调试记录失败。",
      loading: false,
    });
  });
});
