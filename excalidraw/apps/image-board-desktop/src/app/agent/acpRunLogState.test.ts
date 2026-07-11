import { describe, expect, it } from "vitest";

import {
  buildCloseAcpRunLogState,
  buildAcpRunLogDetailLoadFailureState,
  buildAcpRunLogDetailLoadSuccessState,
  buildOpenAcpRunLogState,
} from "./acpRunLogState";

import type { AcpRunLogDetail, AcpRunLogEntry } from "../../shared/acpTypes";

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

describe("buildOpenAcpRunLogState", () => {
  it("opens a run log in the conversation dock when requested and a project is open", () => {
    expect(
      buildOpenAcpRunLogState({
        taskId: "task-1",
        openInConversationDock: true,
        hasCurrentProject: true,
        hasInitialData: true,
      }),
    ).toEqual({
      taskId: "task-1",
      runLogSurface: "conversation",
      appSettingsOpen: false,
      runLogDialogOpen: false,
      chatDockOpen: true,
      runLogDetail: null,
      runLogError: null,
      runLogRawOpen: false,
    });
  });

  it("falls back to the record dialog when conversation dock cannot be used", () => {
    expect(
      buildOpenAcpRunLogState({
        taskId: "task-1",
        openInConversationDock: true,
        hasCurrentProject: false,
        hasInitialData: true,
      }),
    ).toMatchObject({
      runLogSurface: "record",
      runLogDialogOpen: true,
      chatDockOpen: false,
    });
  });

  it("uses the record dialog by default", () => {
    expect(
      buildOpenAcpRunLogState({
        taskId: "task-1",
        hasCurrentProject: true,
        hasInitialData: true,
      }),
    ).toMatchObject({
      runLogSurface: "record",
      runLogDialogOpen: true,
      chatDockOpen: false,
    });
  });
});

describe("buildAcpRunLogDetailLoadSuccessState", () => {
  it("stores the loaded detail and clears the run log error on record surface", () => {
    const detail = createRunLogDetail();

    expect(
      buildAcpRunLogDetailLoadSuccessState({
        detail,
        surface: "record",
        currentConversationEntries: [createRunLogEntry({ taskId: "task-2" })],
      }),
    ).toEqual({
      runLogDetail: detail,
      conversationEntries: null,
      runLogError: null,
    });
  });

  it("merges the loaded run entries into the conversation surface", () => {
    const currentConversationEntries = [
      createRunLogEntry({ taskId: "task-1", seq: 1 }),
      createRunLogEntry({ taskId: "task-2", seq: 1 }),
    ];
    const detail = createRunLogDetail({
      entries: [createRunLogEntry({ taskId: "task-1", seq: 2 })],
    });

    expect(
      buildAcpRunLogDetailLoadSuccessState({
        detail,
        surface: "conversation",
        currentConversationEntries,
      }),
    ).toEqual({
      runLogDetail: detail,
      conversationEntries: [
        createRunLogEntry({ taskId: "task-2", seq: 1 }),
        createRunLogEntry({ taskId: "task-1", seq: 2 }),
      ],
      runLogError: null,
    });
  });
});

describe("buildAcpRunLogDetailLoadFailureState", () => {
  it("returns the product-facing run log error", () => {
    expect(
      buildAcpRunLogDetailLoadFailureState(
        "读取 ACP Agent 任务记录失败。",
      ),
    ).toEqual({
      runLogError: "读取 ACP Agent 任务记录失败。",
    });
  });
});

describe("buildCloseAcpRunLogState", () => {
  it("clears record-surface detail when closing the run log dialog", () => {
    expect(buildCloseAcpRunLogState("record")).toEqual({
      runLogTaskId: null,
      runLogSurface: null,
      clearRunLogDetail: true,
      runLogDialogOpen: false,
    });
  });

  it("preserves the conversation surface when closing the record dialog", () => {
    expect(buildCloseAcpRunLogState("conversation")).toEqual({
      runLogTaskId: null,
      runLogSurface: "conversation",
      clearRunLogDetail: false,
      runLogDialogOpen: false,
    });
  });
});
