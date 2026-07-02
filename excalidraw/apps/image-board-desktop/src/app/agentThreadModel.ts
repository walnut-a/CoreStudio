import type {
  AcpRunLogDetail,
  AcpRunLogEntry,
  AcpRunLogKind,
  AcpRunStatus,
  AcpThreadDetail,
  AcpThreadSummary,
} from "../shared/acpTypes";

export type AgentThreadStatus =
  | "idle"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type AgentMessageRole = "user" | "assistant" | "system";
export type AgentToolStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed";

export interface AgentThread {
  id: string;
  title: string;
  status: AgentThreadStatus;
  createdAt: string;
  updatedAt: string;
  messages: AgentMessage[];
}

export interface AgentMessage {
  id: string;
  role: AgentMessageRole;
  createdAt: string;
  taskId?: string;
  parts: AgentMessagePart[];
}

export type AgentMessagePart =
  | AgentTextPart
  | AgentToolPart
  | AgentImageResultPart
  | AgentStatusPart
  | AgentErrorPart;

export interface AgentRawEntryRef {
  taskId: string;
  seq: number;
  kind: AcpRunLogKind;
  payload: unknown;
}

export interface AgentTextPart {
  id: string;
  type: "text";
  text: string;
  rawEntries: AgentRawEntryRef[];
}

export interface AgentToolPart {
  id: string;
  type: "tool";
  tool: AgentToolCall;
  rawEntries: AgentRawEntryRef[];
}

export interface AgentImageResultPart {
  id: string;
  type: "image-result";
  image: AgentImageResult;
}

export interface AgentStatusPart {
  id: string;
  type: "status";
  text: string;
  rawEntries: AgentRawEntryRef[];
}

export interface AgentErrorPart {
  id: string;
  type: "error";
  message: string;
  rawEntries: AgentRawEntryRef[];
}

export interface AgentToolCall {
  id: string;
  name: string;
  title: string;
  status: AgentToolStatus;
  summary?: string;
  args?: unknown;
  result?: unknown;
  errorMessage?: string;
}

export interface AgentImageResult {
  id: string;
  fileId: string;
  title: string;
  thumbnailDataUrl?: string | null;
  prompt?: string;
  source: "acp-agent" | "corestudio" | "unknown";
  meta?: string;
  model?: string;
  sizeLabel?: string;
  statusLabel?: string;
  referenceCount?: number;
  createdAt?: string;
}

export interface CreateAgentThreadOptions {
  imageResults?: AgentImageResult[];
  includeRawEntries?: boolean;
}

export interface CreateAgentThreadFromEntriesOptions
  extends CreateAgentThreadOptions {
  id: string;
  title: string;
  status: AgentThreadStatus;
  createdAt: string;
  updatedAt: string;
  fallbackUserPrompt?: string;
}

interface BuildState {
  messages: AgentMessage[];
  usedIds: Set<string>;
  agentMessagesByMessageId: Map<string, AgentMessage>;
  toolPartsByToolId: Map<string, AgentToolPart>;
  pendingToolContexts: AgentToolContext[];
  lastToolPart?: AgentToolPart;
  fallbackAssistantMessage?: AgentMessage;
  lastMessage?: AgentMessage;
}

interface AgentToolContext {
  sessionUpdate: "tool_call" | "tool_call_update";
  title?: string;
  status?: string;
  rawInput?: unknown;
  rawOutput?: unknown;
}

const RAW_ACP_RUN_LOG_KINDS = new Set<AcpRunLogKind>([
  "acp.request",
  "acp.response",
  "acp.notification",
  "stderr",
]);

const getPayloadRecord = (payload: unknown) =>
  payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : null;

const getPayloadText = (
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

const getRecordValue = <T>(
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

const normalizeThreadStatus = (status: AcpRunStatus): AgentThreadStatus =>
  status;

const normalizeToolStatus = (status: unknown): AgentToolStatus => {
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

const getStatusLabel = (status: string) => {
  switch (status) {
    case "running":
      return "运行中";
    case "completed":
      return "已完成";
    case "failed":
      return "失败";
    case "cancelled":
      return "已取消";
    case "connecting":
      return "连接中";
    case "initializing":
      return "初始化中";
    case "creating-session":
      return "创建会话";
    default:
      return status;
  }
};

const getToolStatusLabel = (status: AgentToolStatus) => {
  switch (status) {
    case "pending":
      return "等待调用";
    case "running":
      return "调用中";
    case "completed":
      return "已完成";
    case "failed":
      return "失败";
  }
};

const createRawEntryRef = (entry: AcpRunLogEntry): AgentRawEntryRef => ({
  taskId: entry.taskId,
  seq: entry.seq,
  kind: entry.kind,
  payload: entry.payload,
});

const createUniqueId = (usedIds: Set<string>, baseId: string) => {
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

const createEntryId = (
  usedIds: Set<string>,
  entry: AcpRunLogEntry,
  suffix: string,
) =>
  createUniqueId(
    usedIds,
    `${entry.taskId}-${entry.seq}-${entry.kind}-${suffix}`,
  );

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

const createTextPart = (
  state: BuildState,
  entry: AcpRunLogEntry,
  text: string,
): AgentTextPart => ({
  id: createEntryId(state.usedIds, entry, "text"),
  type: "text",
  text,
  rawEntries: [createRawEntryRef(entry)],
});

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

const appendAgentMessage = (
  state: BuildState,
  entry: AcpRunLogEntry,
  text: string,
) => {
  const messageId = getAgentMessageId(entry);
  if (messageId) {
    const existingMessage = state.agentMessagesByMessageId.get(messageId);
    const existingTextPart = existingMessage?.parts.find(
      (part): part is AgentTextPart => part.type === "text",
    );
    if (existingTextPart) {
      appendTextToPart(existingTextPart, entry, text);
      state.lastMessage = existingMessage;
      return;
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
    return;
  }

  const message = pushMessage(state, "assistant", entry, [
    createTextPart(state, entry, text),
  ]);
  state.fallbackAssistantMessage = message;
  if (messageId) {
    state.agentMessagesByMessageId.set(messageId, message);
  }
};

const getToolExplicitId = (entry: AcpRunLogEntry) => {
  const record = getPayloadRecord(entry.payload);
  return getRecordValue<string>(record, ["id", "toolCallId", "callId"]);
};

const getToolId = (entry: AcpRunLogEntry) =>
  getToolExplicitId(entry) ?? `${entry.taskId}-${entry.seq}-${entry.kind}`;

const getNestedRecord = (
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

const collectToolContext = (state: BuildState, entry: AcpRunLogEntry) => {
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
  state: BuildState,
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

const getToolActionLabel = (name: string, title: string, input: unknown) => {
  if (/[\u4e00-\u9fff]/.test(title) && title !== "Agent 工具") {
    return title;
  }

  const normalized = `${name} ${title} ${getCommandFromValue(input) ?? ""}`
    .trim()
    .toLocaleLowerCase();

  if (normalized.includes("corestudio write")) {
    return "写入画板";
  }
  if (normalized.includes("corestudio read")) {
    return "读取项目";
  }
  if (normalized.includes("corestudio edit")) {
    return "操作画板";
  }
  if (normalized.includes("read file") || /\bread\b/.test(normalized)) {
    return "读取文件";
  }
  if (
    normalized.includes("search for") ||
    normalized.includes("search") ||
    normalized.includes("rg ") ||
    normalized.includes("grep ")
  ) {
    return "搜索内容";
  }
  if (
    normalized.includes("bash") ||
    normalized.includes("shell") ||
    normalized.includes("command")
  ) {
    return "执行命令";
  }
  if (title && title !== "Agent 工具") {
    return title;
  }
  return "Agent 工具";
};

const createToolDisplay = (
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
      ? `路径：${subject.detail}`
      : subject?.kind === "query"
        ? `关键词：${subject.detail}`
        : subject?.kind === "command"
          ? `命令：${subject.detail}`
          : subject?.detail;

  return { title, summary };
};

const createToolPart = (
  state: BuildState,
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
  state: BuildState,
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
  const display = rawTitle && rawTitle !== "Agent 工具"
    ? createToolDisplay(name ?? part.tool.name, rawTitle, args ?? part.tool.args)
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

const appendTool = (state: BuildState, entry: AcpRunLogEntry) => {
  const explicitToolId = getToolExplicitId(entry);
  const toolId = explicitToolId ?? getToolId(entry);
  const existingPart =
    state.toolPartsByToolId.get(toolId) ??
    (entry.kind === "tool.update" && !explicitToolId
      ? state.lastToolPart
      : undefined);
  if (existingPart) {
    mergeToolPart(state, existingPart, entry);
    state.fallbackAssistantMessage = undefined;
    state.lastToolPart = existingPart;
    return;
  }

  const toolPart = createToolPart(state, entry);
  state.toolPartsByToolId.set(toolId, toolPart);
  state.lastToolPart = toolPart;
  pushMessage(state, "assistant", entry, [toolPart]);
  state.fallbackAssistantMessage = undefined;
};

const getRawProtocolLabel = (entry: AcpRunLogEntry) => {
  const record = getPayloadRecord(entry.payload);
  switch (entry.kind) {
    case "acp.request":
      return `ACP 请求${typeof record?.method === "string" ? ` · ${record.method}` : ""}`;
    case "acp.response":
      return "ACP 响应";
    case "acp.notification":
      return `ACP 通知${typeof record?.method === "string" ? ` · ${record.method}` : ""}`;
    case "stderr":
      return getPayloadText(entry.payload, ["line", "message"]) ?? "Agent stderr";
    default:
      return null;
  }
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

const appendImageResults = (
  state: BuildState,
  options: CreateAgentThreadFromEntriesOptions,
) => {
  const imageResults = options.imageResults ?? [];
  if (!imageResults.length) {
    return;
  }

  const lastAssistantMessage = [...state.messages]
    .reverse()
    .find((message) => message.role === "assistant");
  const createdAt = imageResults[0]?.createdAt ?? options.updatedAt;
  const imageParts: AgentImageResultPart[] = imageResults.map((image) => ({
    id: createUniqueId(state.usedIds, `image-result-${image.id}`),
    type: "image-result",
    image,
  }));

  if (lastAssistantMessage) {
    lastAssistantMessage.parts.push(...imageParts);
    return;
  }

  const syntheticEntry: AcpRunLogEntry = {
    version: 1,
    taskId: state.messages[0]?.taskId ?? options.id,
    timestamp: createdAt,
    seq: 0,
    kind: "task.finished",
    payload: { imageResults },
  };
  pushMessage(state, "assistant", syntheticEntry, imageParts);
};

const handleEntry = (
  state: BuildState,
  entry: AcpRunLogEntry,
  options: CreateAgentThreadFromEntriesOptions,
) => {
  if (RAW_ACP_RUN_LOG_KINDS.has(entry.kind)) {
    collectToolContext(state, entry);
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
      pushMessage(state, "user", entry, [createTextPart(state, entry, text)]);
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
    toolPartsByToolId: new Map<string, AgentToolPart>(),
    pendingToolContexts: [],
  };

  for (const entry of entries) {
    handleEntry(state, entry, options);
  }

  appendImageResults(state, options);

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
