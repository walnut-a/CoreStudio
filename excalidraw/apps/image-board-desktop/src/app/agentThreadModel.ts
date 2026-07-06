import type {
  AcpRunLogDetail,
  AcpRunLogEntry,
  AcpThreadDetail,
  AcpThreadSummary,
} from "../shared/acpTypes";
import type {
  AgentErrorPart,
  AgentMessage,
  AgentMessagePart,
  AgentMessageRole,
  AgentStatusPart,
  AgentThread,
  CreateAgentThreadFromEntriesOptions,
  CreateAgentThreadOptions,
} from "./agentThreadTypes";
import type { AgentThreadTextState } from "./agentThreadTextEvents";
import {
  appendAgentTextEntry,
  createAgentTextPart,
} from "./agentThreadTextEvents";
import type { AgentThreadToolState } from "./agentThreadToolEvents";
import {
  appendAgentToolEntry,
  collectAgentToolContext,
} from "./agentThreadToolEvents";
import { appendAgentImageResults } from "./agentThreadImageResults";
import {
  RAW_ACP_RUN_LOG_KINDS,
  createEntryId,
  createRawEntryRef,
  getPayloadRecord,
  getPayloadText,
  getRawProtocolLabel,
  getStatusLabel,
  normalizeThreadStatus,
} from "./agentThreadModelUtils";

export type {
  AgentErrorPart,
  AgentImageResult,
  AgentImageResultPart,
  AgentMessage,
  AgentMessagePart,
  AgentMessageRole,
  AgentRawEntryRef,
  AgentStatusPart,
  AgentTextPart,
  AgentThread,
  AgentThreadStatus,
  AgentToolCall,
  AgentToolPart,
  AgentToolStatus,
  CreateAgentThreadFromEntriesOptions,
  CreateAgentThreadOptions,
} from "./agentThreadTypes";

interface BuildState extends AgentThreadTextState, AgentThreadToolState {
  messages: AgentMessage[];
}

const pushMessage = (
  state: BuildState,
  role: AgentMessageRole,
  entry: AcpRunLogEntry,
  parts: AgentMessagePart[],
): AgentMessage => {
  const message: AgentMessage = {
    id: createEntryId(state.usedIds, entry, "message"),
    role,
    taskId: entry.taskId,
    createdAt: entry.timestamp,
    parts,
  };
  state.messages.push(message);
  state.lastMessage = message;
  return message;
};

const createStatusPart = (
  state: BuildState,
  entry: AcpRunLogEntry,
  text: string,
): AgentStatusPart => ({
  id: createEntryId(state.usedIds, entry, "status"),
  type: "status",
  text,
  rawEntries: [createRawEntryRef(entry)],
});

const createErrorPart = (
  state: BuildState,
  entry: AcpRunLogEntry,
  message: string,
): AgentErrorPart => ({
  id: createEntryId(state.usedIds, entry, "error"),
  type: "error",
  message,
  rawEntries: [createRawEntryRef(entry)],
});

const appendAgentMessage = (
  state: BuildState,
  entry: AcpRunLogEntry,
  text: string,
) =>
  appendAgentTextEntry({
    state,
    entry,
    text,
    createAssistantMessage: (parts) =>
      pushMessage(state, "assistant", entry, parts),
  });

const appendTool = (state: BuildState, entry: AcpRunLogEntry) => {
  const result = appendAgentToolEntry(state, entry);
  if (result.created) {
    pushMessage(state, "assistant", entry, [result.part]);
  }
  state.fallbackAssistantMessage = undefined;
};

const appendSystemStatus = (
  state: BuildState,
  entry: AcpRunLogEntry,
  text: string,
) => {
  pushMessage(state, "system", entry, [createStatusPart(state, entry, text)]);
  state.fallbackAssistantMessage = undefined;
};

const appendSystemError = (
  state: BuildState,
  entry: AcpRunLogEntry,
  message: string,
) => {
  pushMessage(state, "system", entry, [createErrorPart(state, entry, message)]);
  state.fallbackAssistantMessage = undefined;
};

const handleEntry = (
  state: BuildState,
  entry: AcpRunLogEntry,
  options: CreateAgentThreadFromEntriesOptions,
) => {
  if (RAW_ACP_RUN_LOG_KINDS.has(entry.kind)) {
    collectAgentToolContext(state, entry);
    if (options.includeRawEntries) {
      const label = getRawProtocolLabel(entry);
      if (label) {
        appendSystemStatus(state, entry, label);
      }
    }
    return;
  }

  switch (entry.kind) {
    case "task.created": {
      const text =
        getPayloadText(entry.payload, ["userPrompt", "prompt"]) ??
        options.fallbackUserPrompt ??
        "Agent 任务";
      pushMessage(state, "user", entry, [
        createAgentTextPart(state, entry, text),
      ]);
      state.fallbackAssistantMessage = undefined;
      return;
    }
    case "agent.message":
    case "agent.thought": {
      const text = getPayloadText(entry.payload, ["text", "message"]);
      if (text) {
        appendAgentMessage(state, entry, text);
      }
      return;
    }
    case "tool.call":
    case "tool.update":
      appendTool(state, entry);
      return;
    case "status": {
      const record = getPayloadRecord(entry.payload);
      const text =
        getPayloadText(entry.payload, ["message"]) ??
        (typeof record?.status === "string"
          ? getStatusLabel(record.status)
          : "状态更新");
      appendSystemStatus(state, entry, text);
      return;
    }
    case "error": {
      const message =
        getPayloadText(entry.payload, ["message", "error"]) ?? "任务错误";
      appendSystemError(state, entry, message);
      return;
    }
    case "task.finished": {
      const record = getPayloadRecord(entry.payload);
      const status =
        typeof record?.status === "string" ? record.status : options.status;
      if (status === "failed") {
        appendSystemError(
          state,
          entry,
          getPayloadText(entry.payload, ["errorMessage", "message", "error"]) ??
            "任务失败",
        );
      }
      return;
    }
    case "task.package":
      if (options.includeRawEntries) {
        appendSystemStatus(state, entry, "CoreStudio 任务包");
      }
      return;
  }
};

export const createAgentThreadFromEntries = (
  entries: AcpRunLogEntry[],
  options: CreateAgentThreadFromEntriesOptions,
): AgentThread => {
  const state: BuildState = {
    messages: [],
    usedIds: new Set<string>(),
    agentMessagesByMessageId: new Map<string, AgentMessage>(),
    toolPartsByToolId: new Map(),
    pendingToolContexts: [],
  };

  for (const entry of entries) {
    handleEntry(state, entry, options);
  }

  appendAgentImageResults({
    messages: state.messages,
    usedIds: state.usedIds,
    threadId: options.id,
    updatedAt: options.updatedAt,
    imageResults: options.imageResults,
  });

  return {
    id: options.id,
    title: options.title,
    status: options.status,
    createdAt: options.createdAt,
    updatedAt: options.updatedAt,
    messages: state.messages,
  };
};

export const createAgentThreadFromRunLog = (
  runLog: AcpRunLogDetail,
  options: CreateAgentThreadOptions = {},
): AgentThread => {
  const lastEntry = runLog.entries.at(-1);
  return createAgentThreadFromEntries(runLog.entries, {
    id: runLog.summary.threadId,
    title: runLog.summary.userPrompt || runLog.summary.projectName,
    status: normalizeThreadStatus(runLog.summary.status),
    createdAt: runLog.summary.startedAt,
    updatedAt:
      runLog.summary.endedAt ??
      lastEntry?.timestamp ??
      runLog.summary.startedAt,
    fallbackUserPrompt: runLog.summary.userPrompt,
    ...options,
  });
};

export const createAgentThreadFromThreadDetail = (
  detail: AcpThreadDetail,
  options: CreateAgentThreadOptions = {},
): AgentThread => {
  const lastEntry = detail.entries.at(-1);
  return createAgentThreadFromEntries(detail.entries, {
    id: detail.summary.threadId,
    title: detail.summary.title,
    status: normalizeThreadStatus(detail.summary.status),
    createdAt: detail.summary.createdAt,
    updatedAt: detail.summary.updatedAt ?? lastEntry?.timestamp,
    fallbackUserPrompt: detail.summary.title,
    ...options,
  });
};

export const getAgentThreadSummary = (summary: AcpThreadSummary) => ({
  id: summary.threadId,
  title: summary.title,
  status: normalizeThreadStatus(summary.status),
  createdAt: summary.createdAt,
  updatedAt: summary.updatedAt,
});
