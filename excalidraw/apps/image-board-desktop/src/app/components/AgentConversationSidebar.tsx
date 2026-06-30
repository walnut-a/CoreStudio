import { useMemo, useState, type FormEvent, type KeyboardEvent } from "react";

import type {
  AcpRunLogDetail,
  AcpRunLogEntry,
  AcpThreadSummary,
  AcpTaskStatus,
} from "../../shared/acpTypes";
import { DesktopButton } from "./DesktopButton";
import { AgentRunChatLog } from "./AgentRunChatLog";
import { sendIcon } from "./CoreStudioIcons";
import { SideDock } from "./SideDock";

interface AgentConversationEventItem {
  id: string;
  title: string;
  detail?: string;
  tone?: "neutral" | "success" | "danger";
}

interface AgentConversationTaskState {
  taskId: string;
  status: AcpTaskStatus;
  message: string;
  transcript: string;
  events: AgentConversationEventItem[];
  logPath?: string;
}

export interface GenerationRecordListItem {
  id: string;
  fileId: string;
  title: string;
  meta: string;
}

interface AgentConversationSidebarProps {
  mode: "direct" | "agent";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generationRecords?: GenerationRecordListItem[];
  onSelectGenerationRecord?: (fileId: string) => void;
  task: AgentConversationTaskState | null;
  runLogDetail: AcpRunLogDetail | null;
  threadEntries: AcpRunLogEntry[];
  error: string | null;
  threadSummaries: AcpThreadSummary[];
  activeThreadId: string | null;
  threadsLoading?: boolean;
  threadsError?: string | null;
  canSubmitMessage: boolean;
  submitMessageDisabledReason?: string | null;
  threadActionsDisabled?: boolean;
  onSelectThread: (threadId: string) => Promise<void> | void;
  onStartNewThread: () => void;
  onSubmitMessage: (message: string) => Promise<void> | void;
}

const getStatusLabel = (status: AcpTaskStatus) => {
  switch (status) {
    case "completed":
      return "已完成";
    case "failed":
      return "失败";
    case "cancelled":
      return "已取消";
    case "running":
      return "运行中";
    case "connecting":
      return "连接中";
    case "initializing":
      return "初始化";
    case "creating-session":
      return "创建会话";
    case "idle":
    default:
      return "空闲";
  }
};

const getThreadStatusLabel = (status: AcpThreadSummary["status"]) => {
  switch (status) {
    case "completed":
      return "已完成";
    case "failed":
      return "失败";
    case "cancelled":
      return "已取消";
    case "running":
    default:
      return "运行中";
  }
};

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
  const seen = new Set<string>();
  return [...threadEntries, ...taskEntries].filter((entry) => {
    const key = `${entry.taskId}:${entry.seq}:${entry.kind}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const getThreadTimeLabel = (updatedAt: string) => {
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const AgentConversationSidebar = ({
  mode,
  open,
  onOpenChange,
  generationRecords = [],
  onSelectGenerationRecord,
  task,
  runLogDetail,
  threadEntries,
  error,
  threadSummaries,
  activeThreadId,
  threadsLoading = false,
  threadsError = null,
  canSubmitMessage,
  submitMessageDisabledReason,
  threadActionsDisabled = false,
  onSelectThread,
  onStartNewThread,
  onSubmitMessage,
}: AgentConversationSidebarProps) => {
  const [draftMessage, setDraftMessage] = useState("");
  const [submittingMessage, setSubmittingMessage] = useState(false);
  const status = getSummaryStatus(task, runLogDetail);
  const taskEntries = useMemo(() => buildTaskRunLogEntries(task), [task]);
  const chatEntries = mergeThreadEntries(
    threadEntries.length ? threadEntries : runLogDetail?.entries ?? [],
    taskEntries,
  );
  const hasConversationContext = Boolean(task || runLogDetail || error);
  const hasThreadSummaries = threadSummaries.length > 0;
  const showThreadShelf =
    Boolean(threadsError) || threadsLoading || hasThreadSummaries;
  const isAgentMode = mode === "agent";
  const dockTitle = isAgentMode ? "Agent 对话" : "生成记录";
  const trimmedDraftMessage = draftMessage.trim();
  const messageInputDisabled = !canSubmitMessage || submittingMessage;
  const canSendMessage =
    Boolean(trimmedDraftMessage) && canSubmitMessage && !submittingMessage;
  const messagePlaceholder = canSubmitMessage
    ? hasConversationContext || chatEntries.length > 0
      ? "继续对话"
      : "输入任务"
    : submitMessageDisabledReason ?? "Agent 暂不可用";
  const submitDraftMessage = async () => {
    if (!canSendMessage) {
      return;
    }
    setSubmittingMessage(true);
    try {
      await onSubmitMessage(trimmedDraftMessage);
      setDraftMessage("");
    } finally {
      setSubmittingMessage(false);
    }
  };
  const handleComposerSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitDraftMessage();
  };
  const handleComposerKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }
    event.preventDefault();
    void submitDraftMessage();
  };

  return (
    <SideDock
      side="left"
      title={dockTitle}
      open={open}
      onOpenChange={onOpenChange}
    >
      <div
        className={[
          "agent-conversation-sidebar",
          isAgentMode
            ? "agent-conversation-sidebar--agent"
            : "agent-conversation-sidebar--direct",
        ].join(" ")}
      >
        {!isAgentMode ? (
          <div className="generation-record-sidebar">
            {generationRecords.length > 0 ? (
              <div
                className="generation-record-sidebar__list"
                aria-label="生成任务列表"
              >
                {generationRecords.map((record) => (
                  <button
                    key={record.id}
                    type="button"
                    className="generation-record-sidebar__item"
                    disabled={!onSelectGenerationRecord}
                    onClick={() => onSelectGenerationRecord?.(record.fileId)}
                  >
                    <strong>{record.title}</strong>
                    <span>{record.meta}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <>
        {showThreadShelf ? (
          <section
            className="agent-conversation-sidebar__threads"
            aria-label="Agent 历史对话"
          >
            <div className="agent-conversation-sidebar__threads-header">
              <strong>最近对话</strong>
              {hasThreadSummaries ? (
                <DesktopButton
                  type="button"
                  disabled={threadActionsDisabled}
                  aria-label="开始新的 Agent 对话"
                  onClick={onStartNewThread}
                >
                  新建
                </DesktopButton>
              ) : null}
            </div>
            {threadsError ? (
              <p className="agent-conversation-sidebar__threads-note">
                {threadsError}
              </p>
            ) : threadsLoading ? (
              <p className="agent-conversation-sidebar__threads-note">同步中</p>
            ) : hasThreadSummaries ? (
              <div className="agent-conversation-sidebar__thread-list">
                {threadSummaries.slice(0, 6).map((thread) => (
                  <button
                    key={thread.threadId}
                    type="button"
                    className="agent-conversation-sidebar__thread"
                    aria-pressed={thread.threadId === activeThreadId}
                    disabled={threadActionsDisabled}
                    onClick={() => onSelectThread(thread.threadId)}
                  >
                    <strong>{thread.title || "未命名对话"}</strong>
                    <span>
                      {getThreadStatusLabel(thread.status)}
                      {getThreadTimeLabel(thread.updatedAt)
                        ? ` · ${getThreadTimeLabel(thread.updatedAt)}`
                        : ""}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {hasConversationContext ? (
          <header className="agent-conversation-sidebar__summary">
            <div>
              <span>{runLogDetail?.summary.agentName ?? "ACP Agent"}</span>
              <strong>
                {runLogDetail?.summary.userPrompt ??
                  task?.message ??
                  "当前对话"}
              </strong>
            </div>
            <span
              className={[
                "agent-conversation-sidebar__status",
                `agent-conversation-sidebar__status--${status}`,
              ].join(" ")}
            >
              {getStatusLabel(status)}
            </span>
          </header>
        ) : null}

        <div className="agent-conversation-sidebar__body">
          {error ? (
            <div className="agent-conversation-sidebar__error">{error}</div>
          ) : null}

          <div className="agent-conversation-sidebar__content">
            {chatEntries.length > 0 ? (
              <AgentRunChatLog entries={chatEntries} />
            ) : null}
          </div>
        </div>

        <form
          className="agent-conversation-sidebar__composer"
          onSubmit={handleComposerSubmit}
        >
          <textarea
            value={draftMessage}
            rows={2}
            disabled={messageInputDisabled}
            placeholder={messagePlaceholder}
            aria-label="继续 Agent 对话"
            onChange={(event) => setDraftMessage(event.target.value)}
            onKeyDown={handleComposerKeyDown}
          />
          <DesktopButton
            type="submit"
            variant="primary"
            className="agent-conversation-sidebar__send"
            disabled={!canSendMessage}
            aria-label={submittingMessage ? "发送中" : "发送给 Agent"}
            title={submittingMessage ? "发送中" : "发送给 Agent"}
          >
            {sendIcon}
          </DesktopButton>
        </form>
          </>
        )}
      </div>
    </SideDock>
  );
};
