import { describe, expect, it, vi } from "vitest";

import type { AcpRunLogEntry } from "../shared/acpTypes";
import type { AgentMessage, AgentMessagePart } from "./agentThreadTypes";
import {
  appendAgentTextEntry,
  type AgentThreadTextState,
} from "./agentThreadTextEvents";

const createState = (): AgentThreadTextState => ({
  usedIds: new Set(),
  agentMessagesByMessageId: new Map(),
});

const createEntry = (
  seq: number,
  payload: unknown,
): AcpRunLogEntry => ({
  version: 1,
  taskId: "task-1",
  timestamp: `2026-06-29T01:00:${String(seq).padStart(2, "0")}.000Z`,
  seq,
  kind: "agent.message",
  payload,
});

const createAssistantMessageFactory = (
  state: AgentThreadTextState,
  messages: AgentMessage[],
) =>
  vi.fn((parts: AgentMessagePart[]): AgentMessage => {
    const message: AgentMessage = {
      id: `message-${messages.length + 1}`,
      role: "assistant",
      createdAt: "2026-06-29T01:00:00.000Z",
      parts,
    };
    messages.push(message);
    state.lastMessage = message;
    return message;
  });

describe("agentThreadTextEvents", () => {
  it("merges text chunks with the same message id", () => {
    const state = createState();
    const messages: AgentMessage[] = [];
    const createAssistantMessage = createAssistantMessageFactory(
      state,
      messages,
    );

    const first = appendAgentTextEntry({
      state,
      entry: createEntry(1, { messageId: "agent-message-1" }),
      text: "你",
      createAssistantMessage,
    });
    const second = appendAgentTextEntry({
      state,
      entry: createEntry(2, { messageId: "agent-message-1" }),
      text: "好",
      createAssistantMessage,
    });

    expect(first).toBe(second);
    expect(createAssistantMessage).toHaveBeenCalledTimes(1);
    expect(messages).toHaveLength(1);
    const part = messages[0]?.parts[0];
    expect(part).toMatchObject({
      type: "text",
      text: "你好",
    });
    expect(part?.type).toBe("text");
    if (part?.type !== "text") {
      throw new Error("Expected text part");
    }
    expect(part.rawEntries).toHaveLength(2);
    expect(state.agentMessagesByMessageId.get("agent-message-1")).toBe(first);
  });

  it("merges adjacent text chunks without a message id into the fallback message", () => {
    const state = createState();
    const messages: AgentMessage[] = [];
    const createAssistantMessage = createAssistantMessageFactory(
      state,
      messages,
    );

    const first = appendAgentTextEntry({
      state,
      entry: createEntry(1, {}),
      text: "流",
      createAssistantMessage,
    });
    const second = appendAgentTextEntry({
      state,
      entry: createEntry(2, {}),
      text: "式",
      createAssistantMessage,
    });

    expect(first).toBe(second);
    expect(createAssistantMessage).toHaveBeenCalledTimes(1);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.parts[0]).toMatchObject({
      type: "text",
      text: "流式",
    });
    expect(state.fallbackAssistantMessage).toBe(first);
  });
});
