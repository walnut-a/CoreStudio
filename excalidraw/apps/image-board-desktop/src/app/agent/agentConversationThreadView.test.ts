import { describe, expect, it } from "vitest";

import type { AcpRunLogEntry } from "../../shared/acpTypes";
import { createAgentConversationThreadView } from "./agentConversationThreadView";
import { setActiveDesktopLocale } from "../copy";

describe("createAgentConversationThreadView", () => {
  it("localizes the empty current-conversation title", () => {
    setActiveDesktopLocale("en");

    expect(
      createAgentConversationThreadView({
        activeThreadId: null,
        runLogDetail: null,
        threadEntries: [],
        error: null,
        agentResultRecords: [],
        task: null,
      }).title,
    ).toBe("Current conversation");
    setActiveDesktopLocale("zh-CN");
  });

  it("builds a thread from the active task without requiring React state", () => {
    const view = createAgentConversationThreadView({
      activeThreadId: null,
      runLogDetail: null,
      threadEntries: [],
      error: null,
      agentResultRecords: [],
      task: {
        taskId: "task-1",
        status: "running",
        message: "优化 CNC 外观",
        transcript: "我会先读取参考图。",
        events: [
          {
            id: "event-1",
            title: "读取参考图",
            detail: "找到 1 张图片",
            tone: "success",
          },
        ],
      },
    });

    expect(view.status).toBe("running");
    expect(view.title).toBe("优化 CNC 外观");
    expect(view.chatEntries).toHaveLength(3);
    expect(view.agentThread?.id).toBe("task-1");
    expect(view.agentThread?.messages[0]?.parts[0]).toMatchObject({
      type: "text",
      text: "优化 CNC 外观",
    });
    expect(view.agentThread?.messages.at(-1)?.parts[0]).toMatchObject({
      type: "tool",
      tool: {
        title: "读取参考图",
        status: "completed",
      },
    });
  });

  it("prefers real thread entries and de-duplicates active task fallback entries", () => {
    const existingEntry: AcpRunLogEntry = {
      version: 1,
      taskId: "task-1",
      timestamp: "2026-06-29T01:00:00.000Z",
      seq: 1,
      kind: "task.created",
      payload: {
        userPrompt: "真实 thread 任务",
      },
    };

    const view = createAgentConversationThreadView({
      activeThreadId: "thread-1",
      runLogDetail: null,
      threadEntries: [existingEntry],
      error: null,
      agentResultRecords: [],
      task: {
        taskId: "task-1",
        status: "running",
        message: "真实 thread 任务",
        transcript: "",
        events: [],
      },
    });

    expect(view.chatEntries).toHaveLength(1);
    expect(view.agentThread?.id).toBe("thread-1");
    expect(view.agentThread?.messages[0]?.parts[0]).toMatchObject({
      type: "text",
      text: "真实 thread 任务",
    });
  });

  it("keeps real thread entries when the run log reuses task sequence keys", () => {
    const firstChunk: AcpRunLogEntry = {
      version: 1,
      taskId: "task-1",
      timestamp: "2026-06-29T01:00:02.000Z",
      seq: 2,
      kind: "agent.message",
      payload: {
        text: "第一段回复。",
      },
    };
    const secondChunk: AcpRunLogEntry = {
      ...firstChunk,
      payload: {
        text: "第二段回复。",
      },
    };

    const view = createAgentConversationThreadView({
      activeThreadId: "thread-1",
      runLogDetail: null,
      threadEntries: [firstChunk, secondChunk],
      error: null,
      agentResultRecords: [],
      task: null,
    });

    const text = JSON.stringify(view.agentThread?.messages);
    expect(text).toContain("第一段回复。");
    expect(text).toContain("第二段回复。");
    const ids =
      view.agentThread?.messages.flatMap((message) => [
        message.id,
        ...message.parts.map((part) => part.id),
      ]) ?? [];
    expect(ids).toHaveLength(new Set(ids).size);
  });

  it("attaches ACP image results even when the text timeline is empty", () => {
    const view = createAgentConversationThreadView({
      activeThreadId: "thread-2",
      runLogDetail: null,
      threadEntries: [],
      error: null,
      task: null,
      agentResultRecords: [
        {
          id: "record-1",
          fileId: "file-1",
          title: "苹果风 CNC",
          thumbnailDataUrl: "data:image/png;base64,abc",
          prompt: "让桌面 CNC 更简洁",
          meta: "1024 x 1024",
          model: "Codex Image",
          statusLabel: "已上画板",
          referenceCount: 1,
          createdAt: "2026-06-29T01:02:00.000Z",
        },
      ],
    });

    expect(view.hasConversationContent).toBe(true);
    expect(view.agentThread?.messages[0]?.parts[0]).toMatchObject({
      type: "image-result",
      image: {
        fileId: "file-1",
        source: "acp-agent",
        prompt: "让桌面 CNC 更简洁",
        meta: "1024 x 1024",
        model: "Codex Image",
        referenceCount: 1,
        createdAt: "2026-06-29T01:02:00.000Z",
      },
    });
  });
});
