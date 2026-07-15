import { describe, expect, it } from "vitest";

import {
  createAgentThreadFromRunLog,
  createAgentThreadFromThreadDetail,
} from "./agentThreadModel";

import type {
  AcpRunLogDetail,
  AcpRunLogEntry,
  AcpRunSummary,
  AcpThreadDetail,
  AcpThreadSummary,
} from "../shared/acpTypes";
import { setActiveDesktopLocale } from "./copy";

const createSummary = (
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
  startedAt: "2026-06-29T01:00:00.000Z",
  endedAt: "2026-06-29T01:02:00.000Z",
  logFile: "/tmp/task-1.jsonl",
  ...overrides,
});

const createThreadSummary = (
  overrides: Partial<AcpThreadSummary> = {},
): AcpThreadSummary => ({
  threadId: "thread-1",
  projectToken: "project-token",
  projectName: "工业设计助手",
  agentName: "Codex ACP",
  title: "连续优化 CNC 方案",
  status: "completed",
  createdAt: "2026-06-29T01:00:00.000Z",
  updatedAt: "2026-06-29T01:05:00.000Z",
  taskIds: ["task-1", "task-2"],
  lastTaskId: "task-2",
  lastMessage: "第二轮完成。",
  ...overrides,
});

const createEntry = (
  seq: number,
  kind: AcpRunLogEntry["kind"],
  payload: unknown,
  taskId = "task-1",
): AcpRunLogEntry => ({
  version: 1,
  taskId,
  timestamp: `2026-06-29T01:00:${String(seq).padStart(2, "0")}.000Z`,
  seq,
  kind,
  payload,
});

const createRunLog = (
  entries: AcpRunLogEntry[],
  summary: AcpRunSummary = createSummary(),
): AcpRunLogDetail => ({
  summary,
  entries,
});

describe("agentThreadModel", () => {
  it("localizes generated fallback labels without changing logged content", () => {
    setActiveDesktopLocale("en");
    const thread = createAgentThreadFromRunLog(
      createRunLog(
        [
          createEntry(1, "task.created", {}),
          createEntry(2, "status", { status: "initializing" }),
          createEntry(3, "error", {}),
          createEntry(4, "task.package", {}),
        ],
        createSummary({ userPrompt: "" }),
      ),
      { includeRawEntries: true },
    );

    expect(JSON.stringify(thread.messages)).toContain("Agent task");
    expect(JSON.stringify(thread.messages)).toContain("Initializing");
    expect(JSON.stringify(thread.messages)).toContain("Task error");
    expect(JSON.stringify(thread.messages)).toContain(
      "CoreStudio task package",
    );
    setActiveDesktopLocale("zh-CN");
  });

  it("builds a user-facing thread with interleaved text, tools, and image results", () => {
    const thread = createAgentThreadFromRunLog(
      createRunLog([
        createEntry(1, "task.created", { userPrompt: "优化桌面 CNC" }),
        createEntry(2, "agent.message", {
          messageId: "message-1",
          text: "我会",
        }),
        createEntry(3, "agent.message", {
          messageId: "message-1",
          text: "先分析。",
        }),
        createEntry(4, "tool.call", {
          id: "tool-read-1",
          name: "read",
          title: "读取参考图",
          status: "pending",
          args: { selection: true },
        }),
        createEntry(5, "tool.update", {
          id: "tool-read-1",
          name: "read",
          title: "读取参考图",
          status: "completed",
          detail: "找到 1 张参考图",
          result: { count: 1 },
        }),
        createEntry(6, "agent.message", { text: "生成一个新方案。" }),
      ]),
      {
        imageResults: [
          {
            id: "image-result-1",
            fileId: "file-1",
            title: "CNC 优化方案",
            prompt: "优化桌面 CNC",
            source: "acp-agent",
            model: "Codex Image",
            sizeLabel: "1024 x 1024",
            referenceCount: 1,
            createdAt: "2026-06-29T01:02:00.000Z",
          },
        ],
      },
    );

    expect(thread).toMatchObject({
      id: "thread-1",
      title: "优化桌面 CNC",
      status: "completed",
      createdAt: "2026-06-29T01:00:00.000Z",
      updatedAt: "2026-06-29T01:02:00.000Z",
    });
    expect(thread.messages.map((message) => message.role)).toEqual([
      "user",
      "assistant",
      "assistant",
      "assistant",
    ]);
    expect(thread.messages[0].parts).toMatchObject([
      { type: "text", text: "优化桌面 CNC" },
    ]);
    expect(thread.messages[1].parts).toMatchObject([
      { type: "text", text: "我会先分析。" },
    ]);
    expect(thread.messages[2].parts).toMatchObject([
      {
        type: "tool",
        tool: {
          id: "tool-read-1",
          name: "read",
          title: "读取参考图",
          status: "completed",
          summary: "找到 1 张参考图",
          args: { selection: true },
          result: { count: 1 },
        },
      },
    ]);
    expect(thread.messages[3].parts).toMatchObject([
      { type: "text", text: "生成一个新方案。" },
      {
        type: "image-result",
        image: {
          fileId: "file-1",
          source: "acp-agent",
          prompt: "优化桌面 CNC",
          referenceCount: 1,
        },
      },
    ]);
  });

  it("keeps tool calls between assistant text chunks", () => {
    const thread = createAgentThreadFromRunLog(
      createRunLog([
        createEntry(1, "task.created", { userPrompt: "优化桌面 CNC" }),
        createEntry(2, "agent.message", { text: "我先读取参考图。" }),
        createEntry(3, "tool.call", {
          id: "tool-1",
          name: "read",
          title: "读取图片路径",
          status: "completed",
        }),
        createEntry(4, "agent.message", { text: "然后生成新方案。" }),
      ]),
    );

    expect(
      thread.messages.flatMap((message) =>
        message.parts.map((part) => part.type),
      ),
    ).toEqual(["text", "text", "tool", "text"]);
    expect(thread.messages[1].parts).toMatchObject([
      { type: "text", text: "我先读取参考图。" },
    ]);
    expect(thread.messages[2].parts).toMatchObject([
      {
        type: "tool",
        tool: {
          id: "tool-1",
          status: "completed",
        },
      },
    ]);
    expect(thread.messages[3].parts).toMatchObject([
      { type: "text", text: "然后生成新方案。" },
    ]);
  });

  it("enriches ACP tool calls from hidden raw notifications and merges id-less updates", () => {
    const thread = createAgentThreadFromRunLog(
      createRunLog([
        createEntry(1, "task.created", { userPrompt: "优化桌面 CNC" }),
        createEntry(2, "acp.notification", {
          payload: {
            params: {
              update: {
                sessionUpdate: "tool_call",
                title:
                  "Read file '/Users/zhaolixing/.codex/skills/corestudio/SKILL.md'",
                rawInput: {
                  path: "/Users/zhaolixing/.codex/skills/corestudio/SKILL.md",
                },
              },
            },
          },
        }),
        createEntry(3, "tool.call", {
          title:
            "Read file '/Users/zhaolixing/.codex/skills/corestudio/SKILL.md'",
          status: "pending",
        }),
        createEntry(4, "acp.notification", {
          payload: {
            params: {
              update: {
                sessionUpdate: "tool_call_update",
                status: "completed",
                rawOutput: {
                  formatted_output: "CoreStudio CLI instructions",
                  exit_code: 0,
                },
              },
            },
          },
        }),
        createEntry(5, "tool.update", {
          title: "Agent 工具",
          status: "completed",
        }),
      ]),
    );

    const toolMessages = thread.messages.filter((message) =>
      message.parts.some((part) => part.type === "tool"),
    );

    expect(toolMessages).toHaveLength(1);
    expect(toolMessages[0].parts).toMatchObject([
      {
        type: "tool",
        tool: {
          title: "读取文件 · SKILL.md",
          status: "completed",
          summary: "路径：/Users/zhaolixing/.codex/skills/corestudio/SKILL.md",
          args: {
            path: "/Users/zhaolixing/.codex/skills/corestudio/SKILL.md",
          },
          result: {
            formatted_output: "CoreStudio CLI instructions",
            exit_code: 0,
          },
        },
      },
    ]);
    expect(
      toolMessages.flatMap((message) =>
        message.parts.map((part) =>
          part.type === "tool" ? part.tool.title : "",
        ),
      ),
    ).not.toContain("Agent 工具");
  });

  it("hides raw ACP protocol entries by default and can expose them for debugging", () => {
    const runLog = createRunLog([
      createEntry(1, "task.created", { userPrompt: "优化桌面 CNC" }),
      createEntry(2, "agent.message", { text: "开始处理。" }),
      createEntry(3, "acp.request", { method: "session/prompt" }),
    ]);

    const defaultThread = createAgentThreadFromRunLog(runLog);
    const debugThread = createAgentThreadFromRunLog(runLog, {
      includeRawEntries: true,
    });

    expect(JSON.stringify(defaultThread.messages)).not.toContain("ACP 请求");
    expect(JSON.stringify(debugThread.messages)).toContain(
      "ACP 请求 · session/prompt",
    );
    expect(JSON.stringify(debugThread.messages)).toContain("session/prompt");
  });

  it("creates stable unique ids when log entries reuse the same task sequence", () => {
    const thread = createAgentThreadFromRunLog(
      createRunLog([
        createEntry(2, "task.package", { userPrompt: "优化桌面 CNC" }),
        createEntry(2, "agent.message", { text: "我会先分析。" }),
      ]),
      { includeRawEntries: true },
    );

    const ids = thread.messages.flatMap((message) => [
      message.id,
      ...message.parts.map((part) => part.id),
    ]);

    expect(ids).toHaveLength(new Set(ids).size);
  });

  it("marks failed runs with an error part", () => {
    const thread = createAgentThreadFromRunLog(
      createRunLog(
        [
          createEntry(1, "task.created", { userPrompt: "优化桌面 CNC" }),
          createEntry(2, "error", {
            code: "ACP_AGENT_FAILED",
            message: "Agent 运行失败",
          }),
        ],
        createSummary({
          status: "failed",
          errorMessage: "Agent 运行失败",
          endedAt: "2026-06-29T01:01:00.000Z",
        }),
      ),
    );

    expect(thread.status).toBe("failed");
    expect(thread.messages.at(-1)?.parts).toMatchObject([
      { type: "error", message: "Agent 运行失败" },
    ]);
  });

  it("builds a continuous thread detail from multiple ACP runs", () => {
    const detail: AcpThreadDetail = {
      summary: createThreadSummary(),
      runs: [
        createRunLog(
          [createEntry(1, "task.created", { userPrompt: "第一轮" })],
          createSummary({ taskId: "task-1", userPrompt: "第一轮" }),
        ),
        createRunLog(
          [createEntry(1, "task.created", { userPrompt: "第二轮" }, "task-2")],
          createSummary({ taskId: "task-2", userPrompt: "第二轮" }),
        ),
      ],
      entries: [
        createEntry(1, "task.created", { userPrompt: "第一轮" }),
        createEntry(2, "agent.message", { text: "第一轮完成。" }),
        createEntry(1, "task.created", { userPrompt: "第二轮" }, "task-2"),
        createEntry(2, "agent.message", { text: "第二轮完成。" }, "task-2"),
      ],
    };

    const thread = createAgentThreadFromThreadDetail(detail);

    expect(thread).toMatchObject({
      id: "thread-1",
      title: "连续优化 CNC 方案",
      updatedAt: "2026-06-29T01:05:00.000Z",
    });
    expect(
      thread.messages
        .filter((message) => message.role === "user")
        .map((message) => message.parts[0]),
    ).toMatchObject([{ text: "第一轮" }, { text: "第二轮" }]);
  });
});
