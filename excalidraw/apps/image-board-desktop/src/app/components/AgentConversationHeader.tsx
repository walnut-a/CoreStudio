import type { AcpRunStatus, AcpTaskStatus } from "../../shared/acpTypes";
import { copy } from "../copy";
import { DesktopButton } from "./DesktopButton";

type AgentConversationStatus = AcpTaskStatus | AcpRunStatus;

const getStatusLabel = (status: AgentConversationStatus) => {
  switch (status) {
    case "completed":
      return copy.agentUi.status.completed;
    case "failed":
      return copy.agentUi.status.failed;
    case "cancelled":
      return copy.agentUi.status.cancelled;
    case "running":
      return copy.agentUi.status.running;
    case "connecting":
      return copy.agentUi.status.connecting;
    case "initializing":
      return copy.agentUi.status.initializing;
    case "creating-session":
      return copy.agentUi.status.creatingSession;
    case "idle":
    default:
      return copy.agentUi.status.idle;
  }
};

interface AgentConversationHeaderActionsProps {
  threadListOpen: boolean;
  disabled: boolean;
  onToggleThreadList: () => void;
  onStartNewThread: () => void;
}

export const AgentConversationHeaderActions = ({
  threadListOpen,
  disabled,
  onToggleThreadList,
  onStartNewThread,
}: AgentConversationHeaderActionsProps) => (
  <>
    <DesktopButton
      type="button"
      disabled={disabled}
      aria-label={
        threadListOpen
          ? copy.agentUi.header.backToConversation
          : copy.agentUi.header.openList
      }
      onClick={onToggleThreadList}
    >
      {threadListOpen ? copy.agentUi.header.back : copy.agentUi.header.list}
    </DesktopButton>
    <DesktopButton
      type="button"
      disabled={disabled}
      aria-label={copy.agentUi.header.startNew}
      onClick={onStartNewThread}
    >
      {copy.agentUi.header.new}
    </DesktopButton>
  </>
);

interface AgentConversationSummaryProps {
  agentName: string;
  title: string;
  status: AgentConversationStatus;
}

export const AgentConversationSummary = ({
  agentName,
  title,
  status,
}: AgentConversationSummaryProps) => (
  <header className="agent-conversation-sidebar__summary">
    <div>
      <span>{agentName}</span>
      <strong>{title}</strong>
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
);
