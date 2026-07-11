import type {
  AcpRunLogEntry,
  AcpTaskEvent,
  AcpTaskStatus,
} from "../../shared/acpTypes";

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
    message: "正在连接 ACP Agent",
    transcript: "",
    events: [
      createAcpAgentTimelineItem(
        {
          title: "正在连接 ACP Agent",
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
  return [
    ...currentEvents,
    createAcpAgentTimelineItem(item, createId),
  ].slice(-MAX_ACP_AGENT_TIMELINE_ITEMS);
};

export const getAcpToolStatusLabel = (
  status: Extract<AcpTaskEvent, { type: "tool" }>["status"],
) => {
  switch (status) {
    case "pending":
      return "等待调用";
    case "in_progress":
      return "调用中";
    case "completed":
      return "已完成";
    case "failed":
      return "失败";
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
        current?.taskId === event.taskId ? current.message : "Agent 正在处理",
      transcript: `${current?.taskId === event.taskId ? current.transcript : ""}${
        event.text
      }`.trim(),
      events: appendAcpAgentTimelineItem({
        current,
        taskId: event.taskId,
        item: {
          title: "Agent 回复",
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
        title: "任务失败",
        detail: event.message,
        tone: "danger",
      },
      createId: options.createId,
    }),
    logPath: current?.taskId === event.taskId ? current.logPath : undefined,
  };
};
