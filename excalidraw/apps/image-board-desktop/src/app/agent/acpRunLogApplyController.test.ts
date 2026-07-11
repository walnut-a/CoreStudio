import { describe, expect, it, vi } from "vitest";

import {
  applyAcpRunLogDetailLoadFailureState,
  applyAcpRunLogDetailLoadSuccessState,
  applyCloseAcpRunLogState,
  applyDirectGenerationRecordsSurfaceState,
  applyOpenAcpRunLogState,
  createAcpRunLogRendererActions,
  createAcpRunLogTargetRendererActions,
  runDirectGenerationRecordsSurfaceAction,
} from "./acpRunLogApplyController";

import type { AcpRunLogDetail } from "../../shared/acpTypes";
import type {
  AcpRunLogDetailLoadFailureState,
  AcpRunLogDetailLoadSuccessState,
  CloseAcpRunLogState,
  OpenAcpRunLogState,
} from "./acpRunLogState";

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
  entries: [
    {
      version: 1,
      taskId: "task-1",
      timestamp: "2026-07-04T08:00:00.000Z",
      seq: 1,
      kind: "agent.message",
      payload: { text: "done" },
    },
  ],
});

describe("applyOpenAcpRunLogState", () => {
  it("applies an open run log state to refs and visible surfaces", () => {
    const state: OpenAcpRunLogState = {
      taskId: "task-1",
      runLogSurface: "conversation",
      appSettingsOpen: false,
      runLogDialogOpen: false,
      chatDockOpen: true,
      runLogDetail: null,
      runLogError: null,
      runLogRawOpen: false,
    };
    const setRunLogTaskId = vi.fn();
    const setRunLogSurface = vi.fn();
    const setAppSettingsOpen = vi.fn();
    const setRunLogDialogOpen = vi.fn();
    const setChatDockOpen = vi.fn();
    const setRunLogDetail = vi.fn();
    const setRunLogError = vi.fn();
    const setRunLogRawOpen = vi.fn();

    expect(
      applyOpenAcpRunLogState({
        state,
        setRunLogTaskId,
        setRunLogSurface,
        setAppSettingsOpen,
        setRunLogDialogOpen,
        setChatDockOpen,
        setRunLogDetail,
        setRunLogError,
        setRunLogRawOpen,
      }),
    ).toBe(state);

    expect(setRunLogTaskId).toHaveBeenCalledWith("task-1");
    expect(setRunLogSurface).toHaveBeenCalledWith("conversation");
    expect(setAppSettingsOpen).toHaveBeenCalledWith(false);
    expect(setRunLogDialogOpen).toHaveBeenCalledWith(false);
    expect(setChatDockOpen).toHaveBeenCalledWith(true);
    expect(setRunLogDetail).toHaveBeenCalledWith(null);
    expect(setRunLogError).toHaveBeenCalledWith(null);
    expect(setRunLogRawOpen).toHaveBeenCalledWith(false);
  });
});

describe("applyCloseAcpRunLogState", () => {
  it("clears record-surface detail when the close state asks for it", () => {
    const state: CloseAcpRunLogState = {
      runLogTaskId: null,
      runLogSurface: null,
      clearRunLogDetail: true,
      runLogDialogOpen: false,
    };
    const setRunLogTaskId = vi.fn();
    const setRunLogSurface = vi.fn();
    const setRunLogDetail = vi.fn();
    const setRunLogDialogOpen = vi.fn();

    expect(
      applyCloseAcpRunLogState({
        state,
        setRunLogTaskId,
        setRunLogSurface,
        setRunLogDetail,
        setRunLogDialogOpen,
      }),
    ).toBe(state);

    expect(setRunLogTaskId).toHaveBeenCalledWith(null);
    expect(setRunLogSurface).toHaveBeenCalledWith(null);
    expect(setRunLogDetail).toHaveBeenCalledWith(null);
    expect(setRunLogDialogOpen).toHaveBeenCalledWith(false);
  });

  it("keeps conversation detail when closing a record dialog over the dock", () => {
    const state: CloseAcpRunLogState = {
      runLogTaskId: null,
      runLogSurface: "conversation",
      clearRunLogDetail: false,
      runLogDialogOpen: false,
    };
    const setRunLogTaskId = vi.fn();
    const setRunLogSurface = vi.fn();
    const setRunLogDetail = vi.fn();

    applyCloseAcpRunLogState({
      state,
      setRunLogTaskId,
      setRunLogSurface,
      setRunLogDetail,
      setRunLogDialogOpen: vi.fn(),
    });

    expect(setRunLogTaskId).toHaveBeenCalledWith(null);
    expect(setRunLogSurface).toHaveBeenCalledWith("conversation");
    expect(setRunLogDetail).not.toHaveBeenCalled();
  });
});

describe("applyAcpRunLogDetailLoadSuccessState", () => {
  it("applies loaded detail and clears the product-facing run log error", () => {
    const detail = createRunLogDetail();
    const state: AcpRunLogDetailLoadSuccessState = {
      runLogDetail: detail,
      conversationEntries: detail.entries,
      runLogError: null,
    };
    const setRunLogDetail = vi.fn();
    const setRunLogError = vi.fn();

    expect(
      applyAcpRunLogDetailLoadSuccessState({
        state,
        setRunLogDetail,
        setRunLogError,
      }),
    ).toBe(state);

    expect(setRunLogDetail).toHaveBeenCalledWith(detail);
    expect(setRunLogError).toHaveBeenCalledWith(null);
  });
});

describe("applyAcpRunLogDetailLoadFailureState", () => {
  it("applies the read error without clearing the previous detail", () => {
    const state: AcpRunLogDetailLoadFailureState = {
      runLogError: "读取 ACP Agent 任务记录失败。",
    };
    const setRunLogError = vi.fn();

    expect(
      applyAcpRunLogDetailLoadFailureState({
        state,
        setRunLogError,
      }),
    ).toBe(state);

    expect(setRunLogError).toHaveBeenCalledWith(
      "读取 ACP Agent 任务记录失败。",
    );
  });
});

describe("applyDirectGenerationRecordsSurfaceState", () => {
  it("clears the conversation run log surface before showing direct generation records", () => {
    const setRunLogSurface = vi.fn();

    expect(
      applyDirectGenerationRecordsSurfaceState({
        currentSurface: "conversation",
        setRunLogSurface,
      }),
    ).toEqual({
      runLogSurface: null,
      shouldUpdateSurface: true,
    });

    expect(setRunLogSurface).toHaveBeenCalledWith(null);
  });

  it("does not change record debug surface when showing direct generation records", () => {
    const setRunLogSurface = vi.fn();

    expect(
      applyDirectGenerationRecordsSurfaceState({
        currentSurface: "record",
        setRunLogSurface,
      }),
    ).toEqual({
      runLogSurface: "record",
      shouldUpdateSurface: false,
    });

    expect(setRunLogSurface).not.toHaveBeenCalled();
  });
});

describe("runDirectGenerationRecordsSurfaceAction", () => {
  it("reads and clears the current conversation surface before showing direct generation records", () => {
    const getCurrentSurface = vi.fn(() => "conversation" as const);
    const setRunLogSurface = vi.fn();

    expect(
      runDirectGenerationRecordsSurfaceAction({
        getCurrentSurface,
        setRunLogSurface,
      }),
    ).toEqual({
      runLogSurface: null,
      shouldUpdateSurface: true,
    });

    expect(getCurrentSurface).toHaveBeenCalledTimes(1);
    expect(setRunLogSurface).toHaveBeenCalledWith(null);
  });

  it("keeps a record surface untouched when showing direct generation records", () => {
    const getCurrentSurface = vi.fn(() => "record" as const);
    const setRunLogSurface = vi.fn();

    expect(
      runDirectGenerationRecordsSurfaceAction({
        getCurrentSurface,
        setRunLogSurface,
      }),
    ).toEqual({
      runLogSurface: "record",
      shouldUpdateSurface: false,
    });

    expect(getCurrentSurface).toHaveBeenCalledTimes(1);
    expect(setRunLogSurface).not.toHaveBeenCalled();
  });
});

describe("createAcpRunLogTargetRendererActions", () => {
  it("keeps run-log refs and visible surface state in sync", () => {
    let runLogTaskId: string | null = null;
    let runLogSurface: "record" | "conversation" | null = null;
    const setRunLogSurface = vi.fn();

    const actions = createAcpRunLogTargetRendererActions({
      setRunLogTaskIdRef: (taskId) => {
        runLogTaskId = taskId;
      },
      setRunLogSurfaceRef: (surface) => {
        runLogSurface = surface;
      },
      setRunLogSurface,
    });

    actions.setTaskId("task-1");
    actions.setSurface("conversation");

    expect(runLogTaskId).toBe("task-1");
    expect(runLogSurface).toBe("conversation");
    expect(setRunLogSurface).toHaveBeenCalledWith("conversation");

    actions.setTaskId(null);
    actions.setSurface(null);

    expect(runLogTaskId).toBeNull();
    expect(runLogSurface).toBeNull();
    expect(setRunLogSurface).toHaveBeenLastCalledWith(null);
  });
});

describe("createAcpRunLogRendererActions", () => {
  it("centralizes run-log open, detail refresh, close, and direct-record surface wiring", async () => {
    const detail = createRunLogDetail();
    const bridge = {};
    let runLogTaskId: string | null = null;
    let runLogSurface: "record" | "conversation" | null = null;
    let conversationEntries: AcpRunLogDetail["entries"] = [];

    const setRunLogTaskId = vi.fn((taskId: string | null) => {
      runLogTaskId = taskId;
    });
    const setRunLogSurface = vi.fn((surface) => {
      runLogSurface = surface;
    });
    const setAppSettingsOpen = vi.fn();
    const setRunLogDialogOpen = vi.fn();
    const setChatDockOpen = vi.fn();
    const setRunLogDetail = vi.fn();
    const setRunLogError = vi.fn();
    const setRunLogRawOpen = vi.fn();
    const setLoading = vi.fn();
    let timerId: number | null = 31;
    const clearTimer = vi.fn(() => {
      timerId = null;
    });
    const updateConversationEntries = vi.fn(
      (updater: (current: AcpRunLogDetail["entries"]) => AcpRunLogDetail["entries"]) => {
        conversationEntries = updater(conversationEntries);
      },
    );

    const actions = createAcpRunLogRendererActions({
      getBridge: () => bridge,
      getCurrentTaskId: () => runLogTaskId,
      getSurface: () => runLogSurface,
      hasCurrentProject: () => true,
      hasInitialData: () => true,
      getRefreshTimerId: () => timerId,
      clearTimer,
      setRefreshTimerId: (nextTimerId) => {
        timerId = nextTimerId;
      },
      setLoading,
      runLogTargetActions: {
        setTaskId: setRunLogTaskId,
        setSurface: setRunLogSurface,
      },
      setAppSettingsOpen,
      setRunLogDialogOpen,
      setChatDockOpen,
      setRunLogDetail,
      setRunLogError,
      setRunLogRawOpen,
      updateConversationEntries,
      readRunLogDetail: async () => detail,
    });

    await expect(
      actions.open("task-1", { openInConversationDock: true }),
    ).resolves.toEqual({ status: "opened" });
    expect(runLogTaskId).toBe("task-1");
    expect(runLogSurface).toBe("conversation");
    expect(clearTimer).toHaveBeenCalledWith(31);
    expect(timerId).toBeNull();
    expect(setRunLogDialogOpen).toHaveBeenCalledWith(false);
    expect(setChatDockOpen).toHaveBeenCalledWith(true);
    expect(setLoading).toHaveBeenNthCalledWith(1, true);
    expect(setRunLogDetail).toHaveBeenCalledWith(detail);
    expect(setRunLogError).toHaveBeenLastCalledWith(null);
    expect(updateConversationEntries).toHaveBeenCalledTimes(1);
    expect(conversationEntries).toEqual(detail.entries);

    expect(actions.showDirectGenerationRecords()).toEqual({
      runLogSurface: null,
      shouldUpdateSurface: true,
    });
    expect(runLogSurface).toBeNull();

    timerId = 32;
    expect(actions.close()).toEqual({ status: "closed" });
    expect(clearTimer).toHaveBeenLastCalledWith(32);
    expect(timerId).toBeNull();
    expect(setRunLogTaskId).toHaveBeenLastCalledWith(null);
    expect(setRunLogDialogOpen).toHaveBeenLastCalledWith(false);
  });

  it("schedules live refresh through the shared run-log renderer actions", () => {
    const scheduledCallbacks: Array<() => void> = [];
    let runLogTaskId: string | null = "task-1";
    let timerId: number | null = 13;
    const clearTimer = vi.fn(() => {
      timerId = null;
    });
    const setLoading = vi.fn();
    const readRunLogDetail = vi.fn(async () => createRunLogDetail());
    const scheduleTimeout = vi.fn((callback: () => void, delay: number) => {
      expect(delay).toBe(320);
      scheduledCallbacks.push(callback);
      return 42;
    });

    const actions = createAcpRunLogRendererActions({
      getBridge: () => ({}),
      getCurrentTaskId: () => runLogTaskId,
      getSurface: () => "conversation",
      hasCurrentProject: () => true,
      hasInitialData: () => true,
      getRefreshTimerId: () => timerId,
      clearTimer,
      setLoading,
      runLogTargetActions: {
        setTaskId: (taskId) => {
          runLogTaskId = taskId;
        },
        setSurface: vi.fn(),
      },
      setAppSettingsOpen: vi.fn(),
      setRunLogDialogOpen: vi.fn(),
      setChatDockOpen: vi.fn(),
      setRunLogDetail: vi.fn(),
      setRunLogError: vi.fn(),
      setRunLogRawOpen: vi.fn(),
      updateConversationEntries: vi.fn(),
      setRefreshTimerId: (nextTimerId) => {
        timerId = nextTimerId;
      },
      scheduleTimeout,
      readRunLogDetail,
    });

    expect(actions.scheduleLiveRefresh("task-1", 320)).toEqual({
      status: "scheduled",
    });
    expect(clearTimer).toHaveBeenCalledTimes(1);
    expect(clearTimer).toHaveBeenCalledWith(13);
    expect(timerId).toBe(42);
    expect(readRunLogDetail).not.toHaveBeenCalled();

    scheduledCallbacks[0]?.();

    expect(timerId).toBeNull();
    expect(readRunLogDetail).toHaveBeenCalledTimes(1);
    expect(readRunLogDetail).toHaveBeenCalledWith({
      bridge: {},
      taskId: "task-1",
    });
    expect(setLoading).not.toHaveBeenCalled();
  });

  it("does not schedule live refresh for a task that is no longer open", () => {
    const clearTimer = vi.fn();
    const scheduleTimeout = vi.fn();

    const actions = createAcpRunLogRendererActions({
      getBridge: () => ({}),
      getCurrentTaskId: () => "task-2",
      getSurface: () => "conversation",
      hasCurrentProject: () => true,
      hasInitialData: () => true,
      getRefreshTimerId: () => 12,
      clearTimer,
      setLoading: vi.fn(),
      runLogTargetActions: {
        setTaskId: vi.fn(),
        setSurface: vi.fn(),
      },
      setAppSettingsOpen: vi.fn(),
      setRunLogDialogOpen: vi.fn(),
      setChatDockOpen: vi.fn(),
      setRunLogDetail: vi.fn(),
      setRunLogError: vi.fn(),
      setRunLogRawOpen: vi.fn(),
      updateConversationEntries: vi.fn(),
      setRefreshTimerId: vi.fn(),
      scheduleTimeout,
    });

    expect(actions.scheduleLiveRefresh("task-1", 320)).toEqual({
      status: "skipped",
    });
    expect(clearTimer).not.toHaveBeenCalled();
    expect(scheduleTimeout).not.toHaveBeenCalled();
  });

  it("creates a clearTimer action from the current refresh timer ref", () => {
    let timerId: number | null = 51;
    const clearedTimerIds: number[] = [];

    const actions = createAcpRunLogRendererActions({
      getBridge: () => ({}),
      getCurrentTaskId: () => "task-1",
      getSurface: () => "conversation",
      hasCurrentProject: () => true,
      hasInitialData: () => true,
      getRefreshTimerId: () => timerId,
      clearTimer: (clearedTimerId) => {
        clearedTimerIds.push(clearedTimerId);
      },
      setRefreshTimerId: (nextTimerId) => {
        timerId = nextTimerId;
      },
      setLoading: vi.fn(),
      runLogTargetActions: {
        setTaskId: vi.fn(),
        setSurface: vi.fn(),
      },
      setAppSettingsOpen: vi.fn(),
      setRunLogDialogOpen: vi.fn(),
      setChatDockOpen: vi.fn(),
      setRunLogDetail: vi.fn(),
      setRunLogError: vi.fn(),
      setRunLogRawOpen: vi.fn(),
      updateConversationEntries: vi.fn(),
    });

    expect(actions.clearTimer()).toEqual({
      status: "cleared",
      timerId: 51,
    });
    expect(clearedTimerIds).toEqual([51]);
    expect(timerId).toBeNull();
  });
});
