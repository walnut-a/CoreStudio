import {
  AuiProvider,
  ExternalThread,
  MessagePrimitive,
  ThreadPrimitive,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import { useMemo, type FC, type PropsWithChildren } from "react";

import "./AgentRunChatLog.css";

import type { AcpRunLogEntry } from "../../shared/acpTypes";
import type { ExternalThreadMessage } from "@assistant-ui/react";
import { copy, DESKTOP_LANG_CODE } from "../copy";

type AgentRunChatRole = "user" | "assistant" | "tool" | "system";
type AgentRunChatTone = "neutral" | "success" | "danger";

export interface AgentRunChatItem {
  id: string;
  role: AgentRunChatRole;
  title: string;
  detail?: string;
  timestamp: string;
  tone: AgentRunChatTone;
  jsonPayloads: Array<{
    label: string;
    payload: unknown;
  }>;
}

interface AgentRunChatLogProps {
  entries: AcpRunLogEntry[];
  includeRawEntries?: boolean;
}

interface AgentRunThreadMessageCustom {
  agentRunItem: AgentRunChatItem;
  showJsonPayloads: boolean;
}

const RAW_ACP_RUN_LOG_KINDS = new Set<AcpRunLogEntry["kind"]>([
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
    return typeof payload === "string" ? payload : null;
  }

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return null;
};

const getStatusLabel = (status: string) => {
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

const getToolStatusLabel = (status: string) => {
  switch (status) {
    case "pending":
      return copy.agentUi.runLog.toolPending;
    case "in_progress":
      return copy.agentUi.runLog.toolRunning;
    case "completed":
      return copy.agentUi.status.completed;
    case "failed":
      return copy.agentUi.status.failed;
    default:
      return status;
  }
};

const getEntryTone = (entry: AcpRunLogEntry): AgentRunChatTone => {
  const record = getPayloadRecord(entry.payload);
  if (entry.kind === "error" || record?.status === "failed") {
    return "danger";
  }
  if (
    entry.kind === "task.finished" &&
    (record?.status === "completed" || record?.lastMessage)
  ) {
    return "success";
  }
  return "neutral";
};

const getEntryTitle = (entry: AcpRunLogEntry) => {
  const record = getPayloadRecord(entry.payload);
  switch (entry.kind) {
    case "task.created":
      return copy.agentUi.runLog.userTask;
    case "task.package":
      return copy.agentUi.runLog.taskPackage;
    case "status":
      return (
        getPayloadText(entry.payload, ["message"]) ??
        copy.agentUi.runLog.statusUpdate
      );
    case "agent.message":
      return "Agent";
    case "agent.thought":
      return copy.agentUi.runLog.agentThought;
    case "tool.call":
    case "tool.update":
      return (
        getPayloadText(entry.payload, ["title", "name"]) ??
        copy.agentUi.runLog.toolCall
      );
    case "error":
      return copy.agentUi.runLog.taskError;
    case "task.finished":
      return copy.agentUi.runLog.taskFinished;
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
      return "Agent stderr";
  }
};

const getEntryDetail = (entry: AcpRunLogEntry) => {
  const record = getPayloadRecord(entry.payload);
  switch (entry.kind) {
    case "task.created":
      return getPayloadText(entry.payload, ["userPrompt", "projectName"]);
    case "task.package":
      return getPayloadText(entry.payload, ["userPrompt"]);
    case "status":
      return typeof record?.status === "string"
        ? getStatusLabel(record.status)
        : null;
    case "agent.message":
    case "agent.thought":
      return getPayloadText(entry.payload, ["text", "message"]);
    case "tool.call":
    case "tool.update": {
      const status =
        typeof record?.status === "string"
          ? getToolStatusLabel(record.status)
          : null;
      return getPayloadText(entry.payload, ["message", "detail"]) ?? status;
    }
    case "error":
      return getPayloadText(entry.payload, ["message", "error"]);
    case "task.finished":
      return (
        getPayloadText(entry.payload, ["errorMessage", "lastMessage"]) ??
        (typeof record?.status === "string"
          ? getStatusLabel(record.status)
          : null)
      );
    case "acp.request":
    case "acp.response":
    case "acp.notification":
    case "stderr":
      return getPayloadText(entry.payload, ["line", "message"]);
  }
};

const getEntryRole = (entry: AcpRunLogEntry): AgentRunChatRole => {
  switch (entry.kind) {
    case "task.created":
      return "user";
    case "agent.message":
    case "agent.thought":
      return "assistant";
    case "tool.call":
    case "tool.update":
      return "tool";
    default:
      return "system";
  }
};

const shouldMergeAssistantEntry = (
  lastItem: AgentRunChatItem | undefined,
  entry: AcpRunLogEntry,
) =>
  Boolean(
    lastItem &&
      lastItem.role === "assistant" &&
      lastItem.title === getEntryTitle(entry),
  );

const appendAgentMessageChunk = (
  item: AgentRunChatItem,
  entry: AcpRunLogEntry,
  detail: string | undefined,
) => {
  item.detail = `${item.detail ?? ""}${detail ?? ""}`;
  item.jsonPayloads.push({
    label: `#${entry.seq} · ${entry.kind}`,
    payload: entry.payload,
  });
};

const getAgentMessageId = (entry: AcpRunLogEntry) =>
  getPayloadText(entry.payload, ["messageId"]);

export const formatAcpRunLogPayload = (payload: unknown) => {
  if (payload === undefined || payload === null) {
    return "";
  }
  if (typeof payload === "string") {
    return payload;
  }
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
};

export const createAgentRunChatItems = (
  entries: AcpRunLogEntry[],
  { includeRawEntries = false }: { includeRawEntries?: boolean } = {},
): AgentRunChatItem[] => {
  const items: AgentRunChatItem[] = [];
  const usedItemIds = new Set<string>();
  const agentMessageItemsByMessageId = new Map<string, AgentRunChatItem>();
  let fallbackAgentMessageItem: AgentRunChatItem | undefined;
  const createItemId = (entry: AcpRunLogEntry) => {
    const baseId = `${entry.taskId}-${entry.seq}-${entry.kind}`;
    if (!usedItemIds.has(baseId)) {
      usedItemIds.add(baseId);
      return baseId;
    }

    let index = 2;
    while (usedItemIds.has(`${baseId}-${index}`)) {
      index += 1;
    }
    const itemId = `${baseId}-${index}`;
    usedItemIds.add(itemId);
    return itemId;
  };

  for (const entry of entries) {
    if (RAW_ACP_RUN_LOG_KINDS.has(entry.kind) && !includeRawEntries) {
      continue;
    }

    const detail = getEntryDetail(entry) ?? undefined;
    const lastItem = items.at(-1);
    if (entry.kind === "agent.message") {
      const messageId = getAgentMessageId(entry);
      if (messageId) {
        const existingMessageItem = agentMessageItemsByMessageId.get(messageId);
        if (existingMessageItem) {
          appendAgentMessageChunk(existingMessageItem, entry, detail);
          continue;
        }
      } else if (
        fallbackAgentMessageItem &&
        shouldMergeAssistantEntry(fallbackAgentMessageItem, entry)
      ) {
        appendAgentMessageChunk(fallbackAgentMessageItem, entry, detail);
        continue;
      }
      if (shouldMergeAssistantEntry(lastItem, entry)) {
        appendAgentMessageChunk(lastItem!, entry, detail);
        if (messageId) {
          agentMessageItemsByMessageId.set(messageId, lastItem!);
        } else {
          fallbackAgentMessageItem = lastItem!;
        }
        continue;
      }
    }

    const item: AgentRunChatItem = {
      id: createItemId(entry),
      role: getEntryRole(entry),
      title: getEntryTitle(entry),
      detail,
      timestamp: entry.timestamp,
      tone: getEntryTone(entry),
      jsonPayloads: [
        {
          label: `#${entry.seq} · ${entry.kind}`,
          payload: entry.payload,
        },
      ],
    };

    if (entry.kind === "agent.message") {
      const messageId = getAgentMessageId(entry);
      if (messageId) {
        agentMessageItemsByMessageId.set(messageId, item);
      } else {
        fallbackAgentMessageItem = item;
      }
    } else if (!RAW_ACP_RUN_LOG_KINDS.has(entry.kind)) {
      fallbackAgentMessageItem = undefined;
    }

    items.push(item);
  }

  return items;
};

const getThreadMessageRole = (
  role: AgentRunChatRole,
): ExternalThreadMessage["role"] => {
  switch (role) {
    case "user":
      return "user";
    case "assistant":
    case "tool":
      return "assistant";
    case "system":
      return "system";
  }
};

export const createAgentRunThreadMessages = (
  items: AgentRunChatItem[],
  { showJsonPayloads = false }: { showJsonPayloads?: boolean } = {},
): ExternalThreadMessage[] =>
  items.map((item) => {
    const role = getThreadMessageRole(item.role);
    const content = [
      {
        type: "text" as const,
        text: item.detail ?? item.title,
      },
    ] as const;
    const createdAt = new Date(item.timestamp);
    const custom = {
      agentRunItem: item,
      showJsonPayloads,
    };

    if (role === "user") {
      return {
        id: item.id,
        role: "user",
        content,
        createdAt,
        attachments: [],
        metadata: {
          custom,
        },
      };
    }

    if (role === "assistant") {
      return {
        id: item.id,
        role: "assistant",
        content,
        createdAt,
        status: {
          type: "complete",
          reason: "stop",
        },
        metadata: {
          unstable_state: null,
          unstable_annotations: [],
          unstable_data: [],
          steps: [],
          custom,
        },
      };
    }

    return {
      id: item.id,
      role: "system",
      content,
      createdAt,
      metadata: {
        custom,
      },
    };
  });

const AgentRunThreadProvider: FC<
  PropsWithChildren<{
    messages: ExternalThreadMessage[];
  }>
> = ({ children, messages }) => {
  const thread = useMemo(
    () =>
      ExternalThread({
        messages,
        isRunning: false,
        isSendDisabled: true,
      }),
    [messages],
  );
  const aui = useAui({ thread });

  return <AuiProvider value={aui}>{children}</AuiProvider>;
};

const getRoleBadge = (role: AgentRunChatRole) => {
  switch (role) {
    case "assistant":
      return "AI";
    case "user":
      return copy.agentUi.runLog.roleBadge.user;
    case "tool":
      return copy.agentUi.runLog.roleBadge.tool;
    case "system":
      return copy.agentUi.runLog.roleBadge.system;
  }
};

const getTimeLabel = (timestamp: string) =>
  new Date(timestamp).toLocaleTimeString(DESKTOP_LANG_CODE, {
    hour: "2-digit",
    minute: "2-digit",
  });

const getInlineCallLabel = (item: AgentRunChatItem) => {
  if (item.role === "tool") {
    return copy.agentUi.runLog.toolCall;
  }
  if (item.tone === "danger") {
    return copy.agentUi.runLog.inlineError;
  }
  if (item.title.startsWith("ACP")) {
    return "ACP";
  }
  return copy.agentUi.runLog.inlineStatus;
};

const AgentRunJsonList: FC<{ item: AgentRunChatItem }> = ({ item }) => (
  <div className="agent-run-chat__json-list">
    {item.jsonPayloads.map((jsonPayload) => {
      const payloadText = formatAcpRunLogPayload(jsonPayload.payload);
      return payloadText ? (
        <details key={jsonPayload.label} className="agent-run-chat__json">
          <summary>{jsonPayload.label}</summary>
          <pre>{payloadText}</pre>
        </details>
      ) : null;
    })}
  </div>
);

const AgentRunMessage: FC = () => {
  const custom = useAuiState(
    (state) =>
      state.message.metadata.custom as unknown as
        | AgentRunThreadMessageCustom
        | undefined,
  );
  const item = custom?.agentRunItem;
  const showJsonPayloads = Boolean(custom?.showJsonPayloads);

  if (!item) {
    return null;
  }

  const timeLabel = getTimeLabel(item.timestamp);
  const isInlineCall = item.role === "tool" || item.role === "system";

  if (isInlineCall) {
    return (
      <MessagePrimitive.Root
        className={[
          "agent-run-chat__item",
          "agent-run-chat__message",
          "agent-run-chat__item--inline-call",
          `agent-run-chat__item--${item.role}`,
          item.tone !== "neutral" ? `agent-run-chat__item--${item.tone}` : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="agent-run-chat__avatar" aria-hidden="true">
          {getRoleBadge(item.role)}
        </div>
        <div className="agent-run-chat__tool-card">
          <div className="agent-run-chat__tool-meta">
            <span>{getInlineCallLabel(item)}</span>
            <strong>{item.title}</strong>
            <span>{timeLabel}</span>
          </div>
          {item.detail ? (
            <p className="agent-run-chat__tool-content">{item.detail}</p>
          ) : null}
          {showJsonPayloads ? <AgentRunJsonList item={item} /> : null}
        </div>
      </MessagePrimitive.Root>
    );
  }

  return (
    <MessagePrimitive.Root
      className={[
        "agent-run-chat__item",
        "agent-run-chat__message",
        `agent-run-chat__item--${item.role}`,
        item.tone !== "neutral" ? `agent-run-chat__item--${item.tone}` : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="agent-run-chat__avatar" aria-hidden="true">
        {getRoleBadge(item.role)}
      </div>
      <div className="agent-run-chat__bubble">
        <div className="agent-run-chat__meta">
          <strong>{item.title}</strong>
          <span>{timeLabel}</span>
        </div>
        {item.detail ? (
          <p className="agent-run-chat__content">{item.detail}</p>
        ) : null}
        {showJsonPayloads ? <AgentRunJsonList item={item} /> : null}
      </div>
    </MessagePrimitive.Root>
  );
};

export const AgentRunChatLog = ({
  entries,
  includeRawEntries = false,
}: AgentRunChatLogProps) => {
  const items = useMemo(
    () => createAgentRunChatItems(entries, { includeRawEntries }),
    [entries, includeRawEntries],
  );
  const messages = useMemo(
    () =>
      createAgentRunThreadMessages(items, {
        showJsonPayloads: includeRawEntries,
      }),
    [includeRawEntries, items],
  );

  return (
    <AgentRunThreadProvider messages={messages}>
      <ThreadPrimitive.Root
        className="agent-run-chat"
        role="log"
        aria-label={copy.agentUi.runLog.label}
      >
        {messages.length > 0 ? (
          <ThreadPrimitive.Viewport
            className="agent-run-chat__viewport"
            autoScroll={false}
            scrollToBottomOnInitialize={false}
            scrollToBottomOnRunStart={false}
            scrollToBottomOnThreadSwitch={false}
          >
            <ThreadPrimitive.Messages
              components={{ Message: AgentRunMessage }}
            />
          </ThreadPrimitive.Viewport>
        ) : (
          <p className="agent-run-chat__empty">{copy.agentUi.runLog.empty}</p>
        )}
      </ThreadPrimitive.Root>
    </AgentRunThreadProvider>
  );
};
