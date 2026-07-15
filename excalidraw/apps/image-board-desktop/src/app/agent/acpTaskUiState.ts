import type {
  AcpRunLogEntry,
  AcpTaskEvent,
  AcpTaskStatus,
} from "../../shared/acpTypes";
import { copy } from "../copy";

export const MAX_ACP_AGENT_TIMELINE_ITEMS = 24;

export interface AcpAgentTaskTimelineItem {
  id: string;
  title: string;
  detail?: string;
  mergeKey?: string;
  tone?: "neutral" | "success" | "danger";
}

export interface AcpAgentTaskUiState {
  taskId: string;
  status: AcpTaskStatus;
  message: string;
  transcript: string;
  events: AcpAgentTaskTimelineItem[];
  logPath?: string;
}

export interface AcpTaskStartUiState {
  activeTaskId: string;
  activeThreadId: string;
  runLogTaskId: string;
  runLogSurface: "conversation";
  chatDockOpen: true;
  runLogDetail: null;
  runLogError: null;
  runLogRawOpen: false;
  agentTask: AcpAgentTaskUiState;
}

type CreateTimelineItemId = () => string;

const TERMINAL_ACP_TASK_STATUSES = new Set<AcpTaskStatus>([
  "completed",
  "failed",
  "cancelled",
]);

const createDefaultTimelineItemId = () =>
  `acp-task-event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const mergeAcpConversationEntries = (
  current: AcpRunLogEntry[],
  incoming: AcpRunLogEntry[],
) => {
  if (!incoming.length) {
    return current;
  }

  const incomingTaskIds = new Set(incoming.map((entry) => entry.taskId));
  return [
    ...current.filter((entry) => !incomingTaskIds.has(entry.taskId)),
    ...incoming,
  ];
};

export const isAcpAgentTaskRunning = (
  task: AcpAgentTaskUiState | null | undefined,
): task is AcpAgentTaskUiState =>
  Boolean(task && !TERMINAL_ACP_TASK_STATUSES.has(task.status));

export const getRunningAcpAgentTaskId = (
  task: AcpAgentTaskUiState | null | undefined,
) => {
  if (!isAcpAgentTaskRunning(task)) {
    return null;
  }
  return task.taskId;
};

export const getAcpAgentTimelineStatusTone = (
  status: AcpTaskStatus,
): AcpAgentTaskTimelineItem["tone"] => {
  if (status === "completed") {
    return "success";
  }
  if (status === "failed" || status === "cancelled") {
    return "danger";
  }
  return "neutral";
};

export const createAcpAgentTimelineItem = (
  item: Omit<AcpAgentTaskTimelineItem, "id">,
  createId: CreateTimelineItemId = createDefaultTimelineItemId,
): AcpAgentTaskTimelineItem => ({
  id: createId(),
  ...item,
});

export const buildAcpTaskStartUiState = ({
  taskId,
  threadId,
  createId,
}: {
  taskId: string;
  threadId: string;
  createId?: CreateTimelineItemId;
}): AcpTaskStartUiState => ({
  activeTaskId: taskId,
  activeThreadId: threadId,
  runLogTaskId: taskId,
  runLogSurface: "conversation",
  chatDockOpen: true,
  runLogDetail: null,
  runLogError: null,
  runLogRawOpen: false,
  agentTask: {
    taskId,
    status: "connecting",
    message: copy.agentUi.acpTask.connecting,
    transcript: "",
    events: [
      createAcpAgentTimelineItem(
        {
          title: copy.agentUi.acpTask.connecting,
        },
        createId,
      ),
    ],
    logPath: undefined,
  },
});

export const appendAcpAgentTimelineItem = ({
  current,
  taskId,
  item,
  createId,
}: {
  current: AcpAgentTaskUiState | null;
  taskId: string;
  item: Omit<AcpAgentTaskTimelineItem, "id">;
  createId?: CreateTimelineItemId;
}) => {
  const currentEvents = current?.taskId === taskId ? current.events : [];
  if (item.mergeKey) {
    const existingItemIndex = currentEvents.findIndex(
      (eventItem) => eventItem.mergeKey === item.mergeKey,
    );
    if (existingItemIndex >= 0) {
      return currentEvents.map((eventItem, index) => {
        if (index !== existingItemIndex) {
          return eventItem;
        }
        return {
          ...eventItem,
          title: item.title,
          detail: `${eventItem.detail ?? ""}${item.detail ?? ""}` || undefined,
          tone: item.tone ?? eventItem.tone,
        };
      });
    }
  }
  return [...currentEvents, createAcpAgentTimelineItem(item, createId)].slice(
    -MAX_ACP_AGENT_TIMELINE_ITEMS,
  );
};

export const getAcpToolStatusLabel = (
  status: Extract<AcpTaskEvent, { type: "tool" }>["status"],
) => {
  switch (status) {
    case "pending":
      return copy.agentUi.runLog.toolPending;
    case "in_progress":
      return copy.agentUi.runLog.toolRunning;
    case "completed":
      return copy.agentUi.status.completed;
    case "failed":
      return copy.agentUi.status.failed;
  }
};

export const applyAcpTaskEventToUiState = (
  current: AcpAgentTaskUiState | null,
  event: AcpTaskEvent,
  options: {
    createId?: CreateTimelineItemId;
  } = {},
): AcpAgentTaskUiState => {
  if (event.type === "status") {
    return {
      taskId: event.taskId,
      status: event.status,
      message: event.message,
      transcript: current?.taskId === event.taskId ? current.transcript : "",
      events: appendAcpAgentTimelineItem({
        current,
        taskId: event.taskId,
        item: {
          title: event.message,
          tone: getAcpAgentTimelineStatusTone(event.status),
        },
        createId: options.createId,
      }),
      logPath:
        event.logPath ??
        (current?.taskId === event.taskId ? current.logPath : undefined),
    };
  }

  if (event.type === "agent-message") {
    return {
      taskId: event.taskId,
      status: current?.taskId === event.taskId ? current.status : "running",
      message:
        current?.taskId === event.taskId
          ? current.message
          : copy.agentUi.acpTask.agentWorking,
      transcript: `${
        current?.taskId === event.taskId ? current.transcript : ""
      }${event.text}`.trim(),
      events: appendAcpAgentTimelineItem({
        current,
        taskId: event.taskId,
        item: {
          title: copy.agentUi.acpTask.agentReply,
          detail: event.text,
          mergeKey: `agent-message:${event.messageId ?? event.taskId}`,
        },
        createId: options.createId,
      }),
      logPath: current?.taskId === event.taskId ? current.logPath : undefined,
    };
  }

  if (event.type === "tool") {
    return {
      taskId: event.taskId,
      status: current?.taskId === event.taskId ? current.status : "running",
      message: event.title,
      transcript: current?.taskId === event.taskId ? current.transcript : "",
      events: appendAcpAgentTimelineItem({
        current,
        taskId: event.taskId,
        item: {
          title: event.title,
          detail: getAcpToolStatusLabel(event.status),
          tone: event.status === "failed" ? "danger" : "neutral",
        },
        createId: options.createId,
      }),
      logPath: current?.taskId === event.taskId ? current.logPath : undefined,
    };
  }

  return {
    taskId: event.taskId,
    status: "failed",
    message: event.message,
    transcript: current?.taskId === event.taskId ? current.transcript : "",
    events: appendAcpAgentTimelineItem({
      current,
      taskId: event.taskId,
      item: {
        title: copy.agentUi.acpTask.taskFailed,
        detail: event.message,
        tone: "danger",
      },
      createId: options.createId,
    }),
    logPath: current?.taskId === event.taskId ? current.logPath : undefined,
  };
};
