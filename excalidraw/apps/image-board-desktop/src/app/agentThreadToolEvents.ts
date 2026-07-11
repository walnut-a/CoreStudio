import type { AcpRunLogEntry } from "../shared/acpTypes";
import type { AgentToolPart } from "./agentThreadTypes";
import {
  createEntryId,
  createRawEntryRef,
  createToolDisplay,
  getNestedRecord,
  getPayloadRecord,
  getPayloadText,
  getRecordValue,
  getToolExplicitId,
  getToolId,
  getToolStatusLabel,
  normalizeToolStatus,
} from "./agentThreadModelUtils";

interface AgentToolContext {
  sessionUpdate: "tool_call" | "tool_call_update";
  title?: string;
  status?: string;
  rawInput?: unknown;
  rawOutput?: unknown;
}

export interface AgentThreadToolState {
  usedIds: Set<string>;
  toolPartsByToolId: Map<string, AgentToolPart>;
  pendingToolContexts: AgentToolContext[];
  lastToolPart?: AgentToolPart;
}

export interface AppendAgentToolEntryResult {
  part: AgentToolPart;
  created: boolean;
}

const getAcpNotificationUpdate = (entry: AcpRunLogEntry) => {
  if (entry.kind !== "acp.notification") {
    return null;
  }
  const record = getPayloadRecord(entry.payload);
  return (
    getNestedRecord(record, ["payload", "params", "update"]) ??
    getNestedRecord(record, ["params", "update"]) ??
    getPayloadRecord(record?.update)
  );
};

export const collectAgentToolContext = (
  state: AgentThreadToolState,
  entry: AcpRunLogEntry,
) => {
  const update = getAcpNotificationUpdate(entry);
  const sessionUpdate = update?.sessionUpdate;
  if (
    !update ||
    (sessionUpdate !== "tool_call" && sessionUpdate !== "tool_call_update")
  ) {
    return;
  }

  state.pendingToolContexts.push({
    sessionUpdate,
    title: typeof update.title === "string" ? update.title : undefined,
    status: typeof update.status === "string" ? update.status : undefined,
    rawInput: update.rawInput,
    rawOutput: update.rawOutput,
  });
};

const consumeToolContext = (
  state: AgentThreadToolState,
  sessionUpdate: AgentToolContext["sessionUpdate"],
) => {
  const index = state.pendingToolContexts.findIndex(
    (context) => context.sessionUpdate === sessionUpdate,
  );
  if (index < 0) {
    return undefined;
  }
  return state.pendingToolContexts.splice(index, 1)[0];
};

const createToolPart = (
  state: AgentThreadToolState,
  entry: AcpRunLogEntry,
): AgentToolPart => {
  const record = getPayloadRecord(entry.payload);
  const status = normalizeToolStatus(record?.status);
  const context = consumeToolContext(state, "tool_call");
  const rawInput =
    getRecordValue(record, ["args", "arguments", "input"]) ??
    context?.rawInput;
  const rawOutput = getRecordValue(record, ["result", "output"]);
  const name =
    getPayloadText(entry.payload, ["name"]) ?? context?.title ?? "tool";
  const rawTitle =
    getPayloadText(entry.payload, ["title", "name"]) ??
    context?.title ??
    "Agent 工具";
  const display = createToolDisplay(name, rawTitle, rawInput);
  const explicitSummary = getPayloadText(entry.payload, [
    "detail",
    "message",
    "summary",
  ]);
  const summary =
    explicitSummary && explicitSummary !== getToolStatusLabel(status)
      ? explicitSummary
      : display.summary;
  const errorMessage =
    getPayloadText(entry.payload, ["errorMessage", "error"]) ?? undefined;

  return {
    id: createEntryId(state.usedIds, entry, "tool"),
    type: "tool",
    tool: {
      id: getToolId(entry),
      name,
      title: display.title,
      status,
      summary,
      args: rawInput,
      result: rawOutput,
      errorMessage,
    },
    rawEntries: [createRawEntryRef(entry)],
  };
};

const mergeToolPart = (
  state: AgentThreadToolState,
  part: AgentToolPart,
  entry: AcpRunLogEntry,
) => {
  const record = getPayloadRecord(entry.payload);
  const status = normalizeToolStatus(record?.status);
  const context = consumeToolContext(state, "tool_call_update");
  const args =
    getRecordValue(record, ["args", "arguments", "input"]) ??
    context?.rawInput;
  const result =
    getRecordValue(record, ["result", "output"]) ?? context?.rawOutput;
  const name =
    getPayloadText(entry.payload, ["name"]) ??
    (context?.title && part.tool.name === "tool" ? context.title : undefined);
  const rawTitle =
    getPayloadText(entry.payload, ["title", "name"]) ?? context?.title;
  const display =
    rawTitle && rawTitle !== "Agent 工具"
      ? createToolDisplay(
          name ?? part.tool.name,
          rawTitle,
          args ?? part.tool.args,
        )
      : null;
  const explicitSummary = getPayloadText(entry.payload, [
    "detail",
    "message",
    "summary",
  ]);
  const summary =
    explicitSummary && explicitSummary !== getToolStatusLabel(status)
      ? explicitSummary
      : display?.summary;
  const errorMessage =
    getPayloadText(entry.payload, ["errorMessage", "error"]) ?? undefined;

  part.tool.status = status;
  if (display?.title) {
    part.tool.title = display.title;
  }
  if (name) {
    part.tool.name = name;
  }
  if (summary) {
    part.tool.summary = summary;
  }
  if (args !== undefined) {
    part.tool.args = args;
  }
  if (result !== undefined) {
    part.tool.result = result;
  }
  if (errorMessage) {
    part.tool.errorMessage = errorMessage;
  }
  part.rawEntries.push(createRawEntryRef(entry));
};

export const appendAgentToolEntry = (
  state: AgentThreadToolState,
  entry: AcpRunLogEntry,
): AppendAgentToolEntryResult => {
  const explicitToolId = getToolExplicitId(entry);
  const toolId = explicitToolId ?? getToolId(entry);
  const existingPart =
    state.toolPartsByToolId.get(toolId) ??
    (entry.kind === "tool.update" && !explicitToolId
      ? state.lastToolPart
      : undefined);

  if (existingPart) {
    mergeToolPart(state, existingPart, entry);
    state.lastToolPart = existingPart;
    return { part: existingPart, created: false };
  }

  const part = createToolPart(state, entry);
  state.toolPartsByToolId.set(toolId, part);
  state.lastToolPart = part;
  return { part, created: true };
};
