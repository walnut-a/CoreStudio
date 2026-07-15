import type {
  AcpRunLogEntry,
  AcpRunLogKind,
  AcpRunStatus,
} from "../shared/acpTypes";
import type {
  AgentRawEntryRef,
  AgentThreadStatus,
  AgentToolStatus,
} from "./agentThreadTypes";
import { copy } from "./copy";

export const RAW_ACP_RUN_LOG_KINDS = new Set<AcpRunLogKind>([
  "acp.request",
  "acp.response",
  "acp.notification",
  "stderr",
]);

export const getPayloadRecord = (payload: unknown) =>
  payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : null;

export const getPayloadText = (
  payload: unknown,
  keys: readonly string[],
): string | null => {
  const record = getPayloadRecord(payload);
  if (!record) {
    return typeof payload === "string" && payload.trim() ? payload : null;
  }

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return null;
};

export const getRecordValue = <T>(
  record: Record<string, unknown> | null,
  keys: readonly string[],
): T | undefined => {
  if (!record) {
    return undefined;
  }
  for (const key of keys) {
    if (record[key] !== undefined) {
      return record[key] as T;
    }
  }
  return undefined;
};

export const normalizeThreadStatus = (
  status: AcpRunStatus,
): AgentThreadStatus => status;

export const normalizeToolStatus = (status: unknown): AgentToolStatus => {
  switch (status) {
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    case "in_progress":
    case "running":
      return "running";
    case "pending":
    default:
      return "pending";
  }
};

export const getStatusLabel = (status: string) => {
  switch (status) {
    case "running":
      return copy.agentUi.status.running;
    case "completed":
      return copy.agentUi.status.completed;
    case "failed":
      return copy.agentUi.status.failed;
    case "cancelled":
      return copy.agentUi.status.cancelled;
    case "connecting":
      return copy.agentUi.status.connecting;
    case "initializing":
      return copy.agentUi.runLog.initializing;
    case "creating-session":
      return copy.agentUi.status.creatingSession;
    default:
      return status;
  }
};

export const getToolStatusLabel = (status: AgentToolStatus) => {
  switch (status) {
    case "pending":
      return copy.agentUi.runLog.toolPending;
    case "running":
      return copy.agentUi.runLog.toolRunning;
    case "completed":
      return copy.agentUi.status.completed;
    case "failed":
      return copy.agentUi.status.failed;
  }
};

export const createRawEntryRef = (entry: AcpRunLogEntry): AgentRawEntryRef => ({
  taskId: entry.taskId,
  seq: entry.seq,
  kind: entry.kind,
  payload: entry.payload,
});

export const createUniqueId = (usedIds: Set<string>, baseId: string) => {
  if (!usedIds.has(baseId)) {
    usedIds.add(baseId);
    return baseId;
  }

  let index = 2;
  while (usedIds.has(`${baseId}-${index}`)) {
    index += 1;
  }
  const id = `${baseId}-${index}`;
  usedIds.add(id);
  return id;
};

export const createEntryId = (
  usedIds: Set<string>,
  entry: AcpRunLogEntry,
  suffix: string,
) =>
  createUniqueId(
    usedIds,
    `${entry.taskId}-${entry.seq}-${entry.kind}-${suffix}`,
  );

export const getNestedRecord = (
  record: Record<string, unknown> | null,
  keys: readonly string[],
) => {
  let current = record;
  for (const key of keys) {
    current = getPayloadRecord(current?.[key]);
    if (!current) {
      return null;
    }
  }
  return current;
};

export const getToolExplicitId = (entry: AcpRunLogEntry) => {
  const record = getPayloadRecord(entry.payload);
  return getRecordValue<string>(record, ["id", "toolCallId", "callId"]);
};

export const getToolId = (entry: AcpRunLogEntry) =>
  getToolExplicitId(entry) ?? `${entry.taskId}-${entry.seq}-${entry.kind}`;

const getShortPathLabel = (path: string) => {
  const normalized = path.trim();
  const parts = normalized.split(/[\\/]/).filter(Boolean);
  return parts.at(-1) ?? normalized;
};

const compactText = (text: string, maxLength = 42) => {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1)}…`;
};

const getCommandFromValue = (value: unknown) => {
  const record = getPayloadRecord(value);
  if (!record) {
    return typeof value === "string" ? value : null;
  }
  const command = getRecordValue<string>(record, [
    "command",
    "cmd",
    "shellCommand",
  ]);
  if (command) {
    return command;
  }
  const args = getRecordValue<string[]>(record, ["args", "argv"]);
  if (args?.length) {
    return args.join(" ");
  }
  return null;
};

const extractQuotedText = (text: string) => {
  const match = text.match(/'([^']+)'|"([^"]+)"/);
  return match?.[1] ?? match?.[2] ?? null;
};

const extractToolSubject = (title: string, input: unknown) => {
  const command = getCommandFromValue(input);
  const quotedTitle = extractQuotedText(title);
  if (/read file/i.test(title) && quotedTitle) {
    return {
      kind: "path" as const,
      label: getShortPathLabel(quotedTitle),
      detail: quotedTitle,
    };
  }
  if (/search for/i.test(title) && quotedTitle) {
    return {
      kind: "query" as const,
      label: quotedTitle,
      detail: quotedTitle,
    };
  }
  if (command) {
    return {
      kind: "command" as const,
      label: compactText(command),
      detail: command,
    };
  }
  if (quotedTitle) {
    return {
      kind: "text" as const,
      label: quotedTitle,
      detail: quotedTitle,
    };
  }
  return null;
};

const isGenericAgentToolTitle = (title: string) =>
  title === "Agent 工具" || title === "Agent tool";

const getToolActionLabel = (name: string, title: string, input: unknown) => {
  const labels = copy.agentUi.toolDisplay;
  if (/^[\u4e00-\u9fff]/.test(title) && !isGenericAgentToolTitle(title)) {
    return title;
  }

  const normalized = `${name} ${title} ${getCommandFromValue(input) ?? ""}`
    .trim()
    .toLocaleLowerCase();

  if (normalized.includes("corestudio write")) {
    return labels.writeBoard;
  }
  if (normalized.includes("corestudio read")) {
    return labels.readProject;
  }
  if (normalized.includes("corestudio edit")) {
    return labels.operateBoard;
  }
  if (normalized.includes("read file") || /\bread\b/.test(normalized)) {
    return labels.readFile;
  }
  if (
    normalized.includes("search for") ||
    normalized.includes("search") ||
    normalized.includes("rg ") ||
    normalized.includes("grep ")
  ) {
    return labels.searchContent;
  }
  if (
    normalized.includes("bash") ||
    normalized.includes("shell") ||
    normalized.includes("command")
  ) {
    return labels.runCommand;
  }
  if (title && !isGenericAgentToolTitle(title)) {
    return title;
  }
  return labels.agentTool;
};

export const createToolDisplay = (
  rawName: string,
  rawTitle: string,
  input: unknown,
) => {
  const subject = extractToolSubject(rawTitle, input);
  const action = getToolActionLabel(rawName, rawTitle, input);
  const title = subject?.label
    ? `${action} · ${compactText(subject.label, 30)}`
    : action;
  const summary =
    subject?.kind === "path"
      ? copy.agentUi.toolDisplay.path(subject.detail)
      : subject?.kind === "query"
      ? copy.agentUi.toolDisplay.query(subject.detail)
      : subject?.kind === "command"
      ? copy.agentUi.toolDisplay.command(subject.detail)
      : subject?.detail;

  return { title, summary };
};

export const getRawProtocolLabel = (entry: AcpRunLogEntry) => {
  const record = getPayloadRecord(entry.payload);
  switch (entry.kind) {
    case "acp.request":
      return copy.agentUi.runLog.acpRequest(
        typeof record?.method === "string" ? record.method : "",
      );
    case "acp.response":
      return copy.agentUi.runLog.acpResponse;
    case "acp.notification":
      return copy.agentUi.runLog.acpNotification(
        typeof record?.method === "string" ? record.method : "",
      );
    case "stderr":
      return (
        getPayloadText(entry.payload, ["line", "message"]) ?? "Agent stderr"
      );
    default:
      return null;
  }
};
