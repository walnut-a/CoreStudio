import type { AcpRunLogEntry } from "../shared/acpTypes";
import type {
  AgentMessage,
  AgentMessagePart,
  AgentTextPart,
} from "./agentThreadTypes";
import {
  createEntryId,
  createRawEntryRef,
  getPayloadText,
} from "./agentThreadModelUtils";

export interface AgentThreadTextState {
  usedIds: Set<string>;
  agentMessagesByMessageId: Map<string, AgentMessage>;
  fallbackAssistantMessage?: AgentMessage;
  lastMessage?: AgentMessage;
}

export interface AppendAgentTextEntryInput {
  state: AgentThreadTextState;
  entry: AcpRunLogEntry;
  text: string;
  createAssistantMessage: (parts: AgentMessagePart[]) => AgentMessage;
}

export const createAgentTextPart = (
  state: Pick<AgentThreadTextState, "usedIds">,
  entry: AcpRunLogEntry,
  text: string,
): AgentTextPart => ({
  id: createEntryId(state.usedIds, entry, "text"),
  type: "text",
  text,
  rawEntries: [createRawEntryRef(entry)],
});

const getAgentMessageId = (entry: AcpRunLogEntry) =>
  getPayloadText(entry.payload, ["messageId", "id"]);

const appendTextToPart = (
  part: AgentTextPart,
  entry: AcpRunLogEntry,
  text: string,
) => {
  part.text = `${part.text}${text}`;
  part.rawEntries.push(createRawEntryRef(entry));
};

export const appendAgentTextEntry = ({
  state,
  entry,
  text,
  createAssistantMessage,
}: AppendAgentTextEntryInput) => {
  const messageId = getAgentMessageId(entry);
  if (messageId) {
    const existingMessage = state.agentMessagesByMessageId.get(messageId);
    const existingTextPart = existingMessage?.parts.find(
      (part): part is AgentTextPart => part.type === "text",
    );
    if (existingTextPart) {
      appendTextToPart(existingTextPart, entry, text);
      state.lastMessage = existingMessage;
      return existingMessage;
    }
  }

  const fallbackMessage = state.fallbackAssistantMessage;
  const fallbackTextPart =
    fallbackMessage?.parts.length === 1 &&
    fallbackMessage.parts[0]?.type === "text"
      ? fallbackMessage.parts[0]
      : null;

  if (
    fallbackMessage &&
    state.lastMessage === fallbackMessage &&
    fallbackTextPart
  ) {
    appendTextToPart(fallbackTextPart, entry, text);
    return fallbackMessage;
  }

  const message = createAssistantMessage([
    createAgentTextPart(state, entry, text),
  ]);
  state.fallbackAssistantMessage = message;
  if (messageId) {
    state.agentMessagesByMessageId.set(messageId, message);
  }
  return message;
};
