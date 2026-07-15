import type {
  AcpRunLogDetail,
  AcpRunLogEntry,
  AcpRunStatus,
  AcpTaskStatus,
} from "../../shared/acpTypes";
import { createAgentThreadFromEntries } from "../agentThreadModel";
import type {
  AgentImageResult,
  AgentThread,
  AgentThreadStatus,
} from "../agentThreadTypes";
import { copy } from "../copy";

export interface AgentConversationEventItem {
  id: string;
  title: string;
  detail?: string;
  tone?: "neutral" | "success" | "danger";
}

export interface AgentConversationTaskState {
  taskId: string;
  status: AcpTaskStatus;
  message: string;
  transcript: string;
  events: AgentConversationEventItem[];
  logPath?: string;
}

export interface AgentConversationGenerationRecord {
  id: string;
  fileId: string;
  title: string;
  thumbnailDataUrl?: string | null;
  prompt?: string;
  meta?: string;
  model?: string;
  sizeLabel?: string;
  statusLabel?: string;
  referenceCount?: number;
  createdAt?: string;
}

interface AgentConversationThreadViewInput {
  task: AgentConversationTaskState | null;
  runLogDetail: AcpRunLogDetail | null;
  threadEntries: AcpRunLogEntry[];
  error: string | null;
  agentResultRecords: readonly AgentConversationGenerationRecord[];
  activeThreadId: string | null;
}

export interface AgentConversationThreadView {
  status: AcpTaskStatus | AcpRunStatus;
  title: string;
  chatEntries: AcpRunLogEntry[];
  hasConversationContext: boolean;
  hasConversationContent: boolean;
  agentThread: AgentThread | null;
}

const getSummaryStatus = (
  task: AgentConversationTaskState | null,
  runLogDetail: AcpRunLogDetail | null,
) => {
  if (runLogDetail) {
    return runLogDetail.summary.status;
  }
  return task?.status ?? "idle";
};

const getEventStatus = (tone?: AgentConversationEventItem["tone"]) => {
  switch (tone) {
    case "success":
      return "completed";
    case "danger":
      return "failed";
    case "neutral":
    default:
      return "in_progress";
  }
};

const buildTaskRunLogEntries = (
  task: AgentConversationTaskState | null,
): AcpRunLogEntry[] => {
  if (!task) {
    return [];
  }

  const timestamp = new Date().toISOString();
  const entries: AcpRunLogEntry[] = [
    {
      version: 1,
      taskId: task.taskId,
      timestamp,
      seq: 1,
      kind: "task.created",
      payload: {
        userPrompt: task.message,
      },
    },
  ];

  if (task.transcript.trim()) {
    entries.push({
      version: 1,
      taskId: task.taskId,
      timestamp,
      seq: entries.length + 1,
      kind: "agent.message",
      payload: {
        text: task.transcript,
      },
    });
  }

  task.events.forEach((item) => {
    entries.push({
      version: 1,
      taskId: task.taskId,
      timestamp,
      seq: entries.length + 1,
      kind: "tool.update",
      payload: {
        title: item.title,
        detail: item.detail,
        status: getEventStatus(item.tone),
      },
    });
  });

  return entries;
};

const mergeThreadEntries = (
  threadEntries: AcpRunLogEntry[],
  taskEntries: AcpRunLogEntry[],
) => {
  const getEntryKey = (entry: AcpRunLogEntry) =>
    `${entry.taskId}:${entry.seq}:${entry.kind}`;
  const threadEntryKeys = new Set(threadEntries.map(getEntryKey));
  const fallbackTaskEntryKeys = new Set<string>();
  const fallbackTaskEntries = taskEntries.filter((entry) => {
    const key = getEntryKey(entry);
    if (threadEntryKeys.has(key) || fallbackTaskEntryKeys.has(key)) {
      return false;
    }
    fallbackTaskEntryKeys.add(key);
    return true;
  });
  return [...threadEntries, ...fallbackTaskEntries];
};

const getThreadTitle = (
  runLogDetail: AcpRunLogDetail | null,
  task: AgentConversationTaskState | null,
) => {
  const prompt = runLogDetail?.summary.userPrompt ?? task?.message;
  if (!prompt) {
    return copy.agentUi.currentConversation;
  }
  return prompt;
};

const getAgentThreadStatus = (
  status: AcpTaskStatus | AcpRunStatus,
): AgentThreadStatus => {
  switch (status) {
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    case "idle":
      return "idle";
    case "connecting":
    case "initializing":
    case "creating-session":
    case "running":
    default:
      return "running";
  }
};

const createAgentImageResultFromRecord = (
  record: AgentConversationGenerationRecord,
): AgentImageResult => ({
  id: record.id,
  fileId: record.fileId,
  title: record.title,
  thumbnailDataUrl: record.thumbnailDataUrl,
  prompt: record.prompt,
  source: "acp-agent",
  meta: record.meta || undefined,
  model: record.model,
  sizeLabel: record.sizeLabel,
  statusLabel: record.statusLabel,
  referenceCount: record.referenceCount,
  createdAt: record.createdAt,
});

export const createAgentConversationThreadView = ({
  task,
  runLogDetail,
  threadEntries,
  error,
  agentResultRecords,
  activeThreadId,
}: AgentConversationThreadViewInput): AgentConversationThreadView => {
  const status = getSummaryStatus(task, runLogDetail);
  const taskEntries = buildTaskRunLogEntries(task);
  const chatEntries = mergeThreadEntries(
    threadEntries.length ? threadEntries : runLogDetail?.entries ?? [],
    taskEntries,
  );
  const title = getThreadTitle(runLogDetail, task);
  const hasConversationContext = Boolean(task || runLogDetail || error);
  const hasConversationContent =
    Boolean(error) || chatEntries.length > 0 || agentResultRecords.length > 0;
  const imageResults = agentResultRecords.map(createAgentImageResultFromRecord);

  if (!chatEntries.length && !imageResults.length) {
    return {
      status,
      title,
      chatEntries,
      hasConversationContext,
      hasConversationContent,
      agentThread: null,
    };
  }

  const now = new Date().toISOString();
  const agentThread = createAgentThreadFromEntries(chatEntries, {
    id:
      activeThreadId ??
      runLogDetail?.summary.threadId ??
      task?.taskId ??
      "agent-thread",
    title,
    status: getAgentThreadStatus(status),
    createdAt:
      runLogDetail?.summary.startedAt ?? chatEntries[0]?.timestamp ?? now,
    updatedAt:
      runLogDetail?.summary.endedAt ?? chatEntries.at(-1)?.timestamp ?? now,
    fallbackUserPrompt: runLogDetail?.summary.userPrompt ?? task?.message,
    imageResults,
  });

  return {
    status,
    title,
    chatEntries,
    hasConversationContext,
    hasConversationContent,
    agentThread,
  };
};
