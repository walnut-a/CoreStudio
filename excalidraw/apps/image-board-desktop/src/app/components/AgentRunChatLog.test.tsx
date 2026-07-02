import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  AgentRunChatLog,
  createAgentRunChatItems,
  createAgentRunThreadMessages,
  formatAcpRunLogPayload,
} from "./AgentRunChatLog";

import type { AcpRunLogEntry } from "../../shared/acpTypes";

const createEntry = (
  seq: number,
  kind: AcpRunLogEntry["kind"],
  payload: unknown,
): AcpRunLogEntry => ({
  version: 1,
  taskId: "task-1",
  timestamp: `2026-06-29T01:00:${String(seq).padStart(2, "0")}.000Z`,
  seq,
  kind,
  payload,
});

describe("AgentRunChatLog", () => {
  it("formats payload JSON with indentation", () => {
    expect(formatAcpRunLogPayload({ method: "session/prompt" })).toBe(
      '{\n  "method": "session/prompt"\n}',
    );
  });

  it("converts run entries into chat items and merges agent chunks", () => {
    const items = createAgentRunChatItems([
      createEntry(1, "task.created", { userPrompt: "优化这台机器" }),
      createEntry(2, "agent.message", { text: "我会" }),
      createEntry(3, "agent.message", { text: "先分析。" }),
      createEntry(4, "tool.update", {
        title: "write image",
        status: "completed",
      }),
      createEntry(5, "acp.request", { method: "session/prompt" }),
    ]);

    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({
      role: "user",
      title: "用户任务",
      detail: "优化这台机器",
    });
    expect(items[1]).toMatchObject({
      role: "assistant",
      title: "Agent",
      detail: "我会先分析。",
    });
    expect(items[2]).toMatchObject({
      role: "tool",
      title: "write image",
      detail: "已完成",
    });
  });

  it("groups streamed agent chunks without message ids when raw traffic is shown", () => {
    const items = createAgentRunChatItems(
      [
        createEntry(1, "task.created", { userPrompt: "优化这台机器" }),
        createEntry(2, "agent.message", {
          text: "于",
        }),
        createEntry(3, "acp.notification", { method: "session/update" }),
        createEntry(4, "agent.message", {
          text: "这张图",
        }),
      ],
      { includeRawEntries: true },
    );

    const agentItems = items.filter((item) => item.role === "assistant");

    expect(agentItems).toHaveLength(1);
    expect(agentItems[0]).toMatchObject({
      title: "Agent",
      detail: "于这张图",
    });
    expect(agentItems[0].jsonPayloads.map((payload) => payload.label))
      .toEqual(["#2 · agent.message", "#4 · agent.message"]);
  });

  it("keeps tool calls interleaved between assistant messages", () => {
    const items = createAgentRunChatItems([
      createEntry(1, "task.created", { userPrompt: "优化这台机器" }),
      createEntry(2, "agent.message", { text: "我先读取参考图。" }),
      createEntry(3, "tool.call", {
        title: "read image",
        status: "completed",
      }),
      createEntry(4, "agent.message", { text: "然后写回新方案。" }),
    ]);

    expect(items.map((item) => item.role)).toEqual([
      "user",
      "assistant",
      "tool",
      "assistant",
    ]);
    expect(items[1]).toMatchObject({
      detail: "我先读取参考图。",
    });
    expect(items[2]).toMatchObject({
      title: "read image",
      detail: "已完成",
    });
    expect(items[3]).toMatchObject({
      detail: "然后写回新方案。",
    });
  });

  it("converts chat items into assistant-ui external thread messages", () => {
    const items = createAgentRunChatItems([
      createEntry(1, "task.created", { userPrompt: "优化这台机器" }),
      createEntry(2, "tool.update", {
        title: "write image",
        status: "completed",
      }),
    ]);

    const messages = createAgentRunThreadMessages(items);

    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      id: "task-1-1-task.created",
      role: "user",
      attachments: [],
    });
    expect(messages[1]).toMatchObject({
      id: "task-1-2-tool.update",
      role: "assistant",
      status: {
        type: "complete",
      },
    });
    expect(messages[1].metadata.custom.agentRunItem).toMatchObject({
      role: "tool",
      title: "write image",
    });
  });

  it("keeps entries with the same task sequence as unique thread messages", () => {
    const items = createAgentRunChatItems([
      createEntry(2, "task.package", { userPrompt: "优化这台机器" }),
      createEntry(2, "agent.message", { text: "我会先分析。" }),
    ]);

    const messages = createAgentRunThreadMessages(items);

    expect(messages.map((message) => message.id)).toEqual([
      "task-1-2-task.package",
      "task-1-2-agent.message",
    ]);
  });

  it("renders protocol JSON only when raw entries are enabled", () => {
    const entries = [
      createEntry(1, "task.created", { userPrompt: "优化这台机器" }),
      createEntry(2, "agent.message", { text: "已完成。" }),
      createEntry(3, "acp.request", { method: "session/prompt" }),
    ];

    const { rerender, container } = render(
      <AgentRunChatLog entries={entries} />,
    );

    expect(screen.getByText("用户任务")).toBeInTheDocument();
    expect(screen.getByText("已完成。")).toBeInTheDocument();
    expect(screen.queryByText(/ACP 请求/)).toBeNull();
    expect(container.querySelector('[data-message-id="task-1-1-task.created"]'))
      .not.toBeNull();

    rerender(<AgentRunChatLog entries={entries} includeRawEntries />);

    expect(screen.getByText(/ACP 请求/)).toBeInTheDocument();
    const rawEntry = screen.getByText(/ACP 请求/).closest("[data-message-id]");
    expect(rawEntry).not.toBeNull();
    expect(within(rawEntry as HTMLElement).getByText("#3 · acp.request"))
      .toBeInTheDocument();
    expect(container.textContent).toContain('"method": "session/prompt"');
  });

  it("renders tool calls as inline cards in the same message stream", () => {
    const { container } = render(
      <AgentRunChatLog
        entries={[
          createEntry(1, "task.created", { userPrompt: "优化这台机器" }),
          createEntry(2, "agent.message", { text: "我会先读取图片。" }),
          createEntry(3, "tool.update", {
            title: "read image",
            status: "completed",
          }),
        ]}
      />,
    );

    expect(screen.getByText("工具调用")).toBeInTheDocument();
    expect(screen.getByText("read image")).toBeInTheDocument();
    expect(container.querySelector(".agent-run-chat__tool-card"))
      .not.toBeNull();
    expect(container.querySelector(".agent-run-chat__event")).toBeNull();
  });
});
