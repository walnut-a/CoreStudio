import type { AcpRunStatus, AcpTaskStatus } from "../../shared/acpTypes";
import { DesktopButton } from "./DesktopButton";

type AgentConversationStatus = AcpTaskStatus | AcpRunStatus;

const getStatusLabel = (status: AgentConversationStatus) => {
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
      aria-label={threadListOpen ? "返回当前 Agent 对话" : "打开 Agent 对话列表"}
      onClick={onToggleThreadList}
    >
      {threadListOpen ? "返回" : "列表"}
    </DesktopButton>
    <DesktopButton
      type="button"
      disabled={disabled}
      aria-label="开始新的 Agent 对话"
      onClick={onStartNewThread}
    >
      新建
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
