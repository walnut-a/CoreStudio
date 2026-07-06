import { describe, expect, it } from "vitest";

import { appendAgentImageResults } from "./agentThreadImageResults";

import type { AcpRunLogEntry } from "../shared/acpTypes";
import type { AgentMessage } from "./agentThreadTypes";

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

const createAssistantMessage = (): AgentMessage => ({
  id: "assistant-message",
  role: "assistant",
  taskId: "task-1",
  createdAt: "2026-06-29T01:00:02.000Z",
  parts: [
    {
      id: "assistant-text",
      type: "text",
      text: "已生成方案。",
      rawEntries: [createEntry(2, "agent.message", { text: "已生成方案。" })],
    },
  ],
});

describe("agentThreadImageResults", () => {
  it("appends image results to the latest assistant message", () => {
    const messages: AgentMessage[] = [
      {
        id: "user-message",
        role: "user",
        taskId: "task-1",
        createdAt: "2026-06-29T01:00:01.000Z",
        parts: [
          {
            id: "user-text",
            type: "text",
            text: "优化桌面 CNC",
            rawEntries: [
              createEntry(1, "task.created", {
                userPrompt: "优化桌面 CNC",
              }),
            ],
          },
        ],
      },
      createAssistantMessage(),
    ];
    const usedIds = new Set(messages.flatMap((message) => [message.id]));

    appendAgentImageResults({
      messages,
      usedIds,
      threadId: "thread-1",
      updatedAt: "2026-06-29T01:02:00.000Z",
      imageResults: [
        {
          id: "image-result-1",
          fileId: "file-1",
          title: "CNC 优化方案",
          source: "acp-agent",
          createdAt: "2026-06-29T01:02:00.000Z",
        },
      ],
    });

    expect(messages).toHaveLength(2);
    expect(messages[1].parts).toMatchObject([
      { type: "text", text: "已生成方案。" },
      {
        type: "image-result",
        image: {
          id: "image-result-1",
          fileId: "file-1",
        },
      },
    ]);
  });

  it("creates a synthetic assistant message when no assistant message exists", () => {
    const messages: AgentMessage[] = [
      {
        id: "user-message",
        role: "user",
        taskId: "task-1",
        createdAt: "2026-06-29T01:00:01.000Z",
        parts: [
          {
            id: "user-text",
            type: "text",
            text: "优化桌面 CNC",
            rawEntries: [
              createEntry(1, "task.created", {
                userPrompt: "优化桌面 CNC",
              }),
            ],
          },
        ],
      },
    ];

    appendAgentImageResults({
      messages,
      usedIds: new Set(["user-message"]),
      threadId: "thread-1",
      updatedAt: "2026-06-29T01:05:00.000Z",
      imageResults: [
        {
          id: "image-result-1",
          fileId: "file-1",
          title: "CNC 优化方案",
          source: "acp-agent",
        },
      ],
    });

    expect(messages).toHaveLength(2);
    expect(messages[1]).toMatchObject({
      role: "assistant",
      taskId: "task-1",
      createdAt: "2026-06-29T01:05:00.000Z",
      parts: [
        {
          type: "image-result",
          image: {
            id: "image-result-1",
            fileId: "file-1",
          },
        },
      ],
    });
  });
});
