import type { AcpThreadSummary } from "../../shared/acpTypes";
import { copy, DESKTOP_LANG_CODE } from "../copy";

interface AgentThreadListProps {
  summaries: readonly AcpThreadSummary[];
  activeThreadId: string | null;
  loading?: boolean;
  error?: string | null;
  actionsDisabled?: boolean;
  onSelectThread: (threadId: string) => Promise<void> | void;
}

const getThreadStatusLabel = (status: AcpThreadSummary["status"]) => {
  switch (status) {
    case "completed":
      return copy.agentUi.status.completed;
    case "failed":
      return copy.agentUi.status.failed;
    case "cancelled":
      return copy.agentUi.status.cancelled;
    case "running":
    default:
      return copy.agentUi.status.running;
  }
};

const getThreadTimeLabel = (updatedAt: string) => {
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString(DESKTOP_LANG_CODE, {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const AgentThreadList = ({
  summaries,
  activeThreadId,
  loading = false,
  error = null,
  actionsDisabled = false,
  onSelectThread,
}: AgentThreadListProps) => {
  if (error) {
    return <p className="agent-conversation-sidebar__threads-note">{error}</p>;
  }

  if (loading) {
    return (
      <p className="agent-conversation-sidebar__threads-note">
        {copy.agentUi.threadList.syncing}
      </p>
    );
  }

  if (!summaries.length) {
    return (
      <p className="agent-conversation-sidebar__threads-note">
        {copy.agentUi.threadList.empty}
      </p>
    );
  }

  return (
    <div className="agent-conversation-sidebar__thread-list">
      {summaries.map((thread) => {
        const timeLabel = getThreadTimeLabel(thread.updatedAt);
        return (
          <button
            key={thread.threadId}
            type="button"
            className="agent-conversation-sidebar__thread"
            aria-pressed={thread.threadId === activeThreadId}
            disabled={actionsDisabled}
            onClick={() => void onSelectThread(thread.threadId)}
          >
            <strong>{thread.title || copy.agentUi.threadList.untitled}</strong>
            <span>
              {getThreadStatusLabel(thread.status)}
              {timeLabel ? ` · ${timeLabel}` : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
};
