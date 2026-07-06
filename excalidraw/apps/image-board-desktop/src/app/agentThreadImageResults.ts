import type { AcpRunLogEntry } from "../shared/acpTypes";
import type {
  AgentImageResult,
  AgentImageResultPart,
  AgentMessage,
} from "./agentThreadTypes";
import { createEntryId, createUniqueId } from "./agentThreadModelUtils";

export interface AppendAgentImageResultsInput {
  messages: AgentMessage[];
  usedIds: Set<string>;
  threadId: string;
  updatedAt: string;
  imageResults?: AgentImageResult[];
}

const createImageResultParts = (
  usedIds: Set<string>,
  imageResults: AgentImageResult[],
): AgentImageResultPart[] =>
  imageResults.map((image) => ({
    id: createUniqueId(usedIds, `image-result-${image.id}`),
    type: "image-result",
    image,
  }));

export const appendAgentImageResults = ({
  messages,
  usedIds,
  threadId,
  updatedAt,
  imageResults = [],
}: AppendAgentImageResultsInput) => {
  if (!imageResults.length) {
    return;
  }

  const imageParts = createImageResultParts(usedIds, imageResults);
  const lastAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");

  if (lastAssistantMessage) {
    lastAssistantMessage.parts.push(...imageParts);
    return;
  }

  const createdAt = imageResults[0]?.createdAt ?? updatedAt;
  const syntheticEntry: AcpRunLogEntry = {
    version: 1,
    taskId: messages[0]?.taskId ?? threadId,
    timestamp: createdAt,
    seq: 0,
    kind: "task.finished",
    payload: { imageResults },
  };

  messages.push({
    id: createEntryId(usedIds, syntheticEntry, "message"),
    role: "assistant",
    taskId: syntheticEntry.taskId,
    createdAt,
    parts: imageParts,
  });
};
