import { describe, expect, it } from "vitest";

import {
  applyAcpTaskEventToUiState,
  appendAcpAgentTimelineItem,
  buildAcpTaskStartUiState,
  getRunningAcpAgentTaskId,
  isAcpAgentTaskRunning,
  mergeAcpConversationEntries,
} from "./acpTaskUiState";

import type { AcpRunLogEntry, AcpTaskEvent } from "../../shared/acpTypes";
import { setActiveDesktopLocale } from "../copy";

const createRunLogEntry = (
  patch: Partial<AcpRunLogEntry> = {},
): AcpRunLogEntry => ({
  version: 1,
  taskId: "task-1",
  timestamp: "2026-07-03T08:00:00.000Z",
  seq: 1,
  kind: "agent.message",
  payload: { text: "hello" },
  ...patch,
});

const createIdFactory = () => {
  let index = 0;
  return () => {
    index += 1;
    return `event-${index}`;
  };
};

describe("mergeAcpConversationEntries", () => {
  it("replaces entries for incoming task ids and keeps unrelated tasks", () => {
    const merged = mergeAcpConversationEntries(
      [
        createRunLogEntry({ taskId: "task-1", seq: 1 }),
        createRunLogEntry({ taskId: "task-2", seq: 1 }),
      ],
      [
        createRunLogEntry({
          taskId: "task-1",
          seq: 2,
          payload: { text: "new" },
        }),
      ],
    );

    expect(merged.map((entry) => `${entry.taskId}:${entry.seq}`)).toEqual([
      "task-2:1",
      "task-1:2",
    ]);
  });

  it("returns the current array when there are no incoming entries", () => {
    const current = [createRunLogEntry()];

    expect(mergeAcpConversationEntries(current, [])).toBe(current);
  });
});

describe("appendAcpAgentTimelineItem", () => {
  it("merges streamed timeline items with the same merge key", () => {
    const createId = createIdFactory();
    const events = appendAcpAgentTimelineItem({
      current: {
        taskId: "task-1",
        status: "running",
        message: "处理中",
        transcript: "",
        events: [
          {
            id: "event-existing",
            title: "Agent 回复",
            detail: "第一段",
            mergeKey: "agent-message:message-1",
            tone: "neutral",
          },
        ],
      },
      taskId: "task-1",
      item: {
        title: "Agent 回复",
        detail: "第二段",
        mergeKey: "agent-message:message-1",
      },
      createId,
    });

    expect(events).toEqual([
      {
        id: "event-existing",
        title: "Agent 回复",
        detail: "第一段第二段",
        mergeKey: "agent-message:message-1",
        tone: "neutral",
      },
    ]);
  });
});

describe("applyAcpTaskEventToUiState", () => {
  it("localizes timeline chrome while preserving Agent, tool, and error content", () => {
    setActiveDesktopLocale("en");
    const createId = createIdFactory();
    const afterMessage = applyAcpTaskEventToUiState(
      null,
      {
        taskId: "task-1",
        type: "agent-message",
        messageId: "message-1",
        text: "保留中文回复",
      },
      { createId },
    );
    const afterTool = applyAcpTaskEventToUiState(
      afterMessage,
      {
        taskId: "task-1",
        type: "tool",
        title: "读取文件",
        status: "failed",
      },
      { createId },
    );
    const afterError = applyAcpTaskEventToUiState(
      afterTool,
      {
        taskId: "task-1",
        type: "error",
        code: "COMMAND_FAILED",
        message: "原始错误内容",
      },
      { createId },
    );

    expect(afterMessage).toMatchObject({
      message: "Agent is working",
      transcript: "保留中文回复",
      events: [{ title: "Agent reply", detail: "保留中文回复" }],
    });
    expect(afterTool.events[1]).toMatchObject({
      title: "读取文件",
      detail: "Failed",
    });
    expect(afterError.events[2]).toMatchObject({
      title: "Task failed",
      detail: "原始错误内容",
    });
    setActiveDesktopLocale("zh-CN");
  });

  it("creates status timeline items and maps terminal status tones", () => {
    const event: AcpTaskEvent = {
      taskId: "task-1",
      type: "status",
      status: "completed",
      message: "任务已完成",
      logPath: "/tmp/task.jsonl",
    };

    expect(
      applyAcpTaskEventToUiState(null, event, {
        createId: createIdFactory(),
      }),
    ).toEqual({
      taskId: "task-1",
      status: "completed",
      message: "任务已完成",
      transcript: "",
      logPath: "/tmp/task.jsonl",
      events: [
        {
          id: "event-1",
          title: "任务已完成",
          tone: "success",
        },
      ],
    });
  });

  it("combines streaming agent messages into transcript and one timeline item", () => {
    const createId = createIdFactory();
    const first = applyAcpTaskEventToUiState(
      null,
      {
        taskId: "task-1",
        type: "agent-message",
        messageId: "message-1",
        text: "第一段",
      },
      { createId },
    );
    const second = applyAcpTaskEventToUiState(
      first,
      {
        taskId: "task-1",
        type: "agent-message",
        messageId: "message-1",
        text: "第二段",
      },
      { createId },
    );

    expect(second.transcript).toBe("第一段第二段");
    expect(second.events).toEqual([
      {
        id: "event-1",
        title: "Agent 回复",
        detail: "第一段第二段",
        mergeKey: "agent-message:message-1",
      },
    ]);
  });

  it("maps tool and error events into user readable timeline states", () => {
    const createId = createIdFactory();
    const toolEvent: AcpTaskEvent = {
      taskId: "task-1",
      type: "tool",
      title: "读取文件",
      status: "failed",
    };
    const errorEvent: AcpTaskEvent = {
      taskId: "task-1",
      type: "error",
      code: "COMMAND_FAILED",
      message: "命令失败",
    };

    const afterTool = applyAcpTaskEventToUiState(null, toolEvent, { createId });
    const afterError = applyAcpTaskEventToUiState(afterTool, errorEvent, {
      createId,
    });

    expect(afterTool).toMatchObject({
      taskId: "task-1",
      status: "running",
      message: "读取文件",
      events: [
        {
          id: "event-1",
          title: "读取文件",
          detail: "失败",
          tone: "danger",
        },
      ],
    });
    expect(afterError).toMatchObject({
      status: "failed",
      message: "命令失败",
      events: [
        {
          id: "event-1",
          title: "读取文件",
          detail: "失败",
          tone: "danger",
        },
        {
          id: "event-2",
          title: "任务失败",
          detail: "命令失败",
          tone: "danger",
        },
      ],
    });
  });
});

describe("buildAcpTaskStartUiState", () => {
  it("localizes the initial task connection state", () => {
    setActiveDesktopLocale("en");

    expect(
      buildAcpTaskStartUiState({
        taskId: "task-1",
        threadId: "thread-1",
        createId: createIdFactory(),
      }).agentTask,
    ).toMatchObject({
      message: "Connecting to ACP Agent",
      events: [{ title: "Connecting to ACP Agent" }],
    });
    setActiveDesktopLocale("zh-CN");
  });

  it("builds the active conversation state for a newly started ACP task", () => {
    expect(
      buildAcpTaskStartUiState({
        taskId: "task-1",
        threadId: "thread-1",
        createId: createIdFactory(),
      }),
    ).toEqual({
      activeTaskId: "task-1",
      activeThreadId: "thread-1",
      runLogTaskId: "task-1",
      runLogSurface: "conversation",
      chatDockOpen: true,
      runLogDetail: null,
      runLogError: null,
      runLogRawOpen: false,
      agentTask: {
        taskId: "task-1",
        status: "connecting",
        message: "正在连接 ACP Agent",
        transcript: "",
        events: [
          {
            id: "event-1",
            title: "正在连接 ACP Agent",
          },
        ],
        logPath: undefined,
      },
    });
  });
});

describe("isAcpAgentTaskRunning", () => {
  it("treats missing and terminal task states as not running", () => {
    expect(isAcpAgentTaskRunning(null)).toBe(false);
    expect(
      isAcpAgentTaskRunning({
        taskId: "task-1",
        status: "completed",
        message: "已完成",
        transcript: "",
        events: [],
      }),
    ).toBe(false);
    expect(
      isAcpAgentTaskRunning({
        taskId: "task-1",
        status: "failed",
        message: "失败",
        transcript: "",
        events: [],
      }),
    ).toBe(false);
    expect(
      isAcpAgentTaskRunning({
        taskId: "task-1",
        status: "cancelled",
        message: "已取消",
        transcript: "",
        events: [],
      }),
    ).toBe(false);
  });

  it("treats connecting and running task states as running", () => {
    expect(
      isAcpAgentTaskRunning({
        taskId: "task-1",
        status: "connecting",
        message: "正在连接",
        transcript: "",
        events: [],
      }),
    ).toBe(true);
    expect(
      isAcpAgentTaskRunning({
        taskId: "task-1",
        status: "running",
        message: "处理中",
        transcript: "",
        events: [],
      }),
    ).toBe(true);
  });
});

describe("getRunningAcpAgentTaskId", () => {
  it("returns the task id only while the ACP Agent task is active", () => {
    expect(getRunningAcpAgentTaskId(null)).toBeNull();
    expect(
      getRunningAcpAgentTaskId({
        taskId: "task-completed",
        status: "completed",
        message: "已完成",
        transcript: "",
        events: [],
      }),
    ).toBeNull();
    expect(
      getRunningAcpAgentTaskId({
        taskId: "task-running",
        status: "running",
        message: "处理中",
        transcript: "",
        events: [],
      }),
    ).toBe("task-running");
  });
});
