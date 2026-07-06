import type { AgentThread } from "../agentThreadTypes";
import { AgentThreadMessage } from "./AgentThreadMessage";

interface AgentThreadTimelineProps {
  thread: AgentThread | null;
  onSelectImageResult?: (fileId: string) => void;
}

export const AgentThreadTimeline = ({
  thread,
  onSelectImageResult,
}: AgentThreadTimelineProps) => {
  if (!thread || thread.messages.length === 0) {
    return (
      <div
        className="agent-thread-timeline agent-thread-timeline--empty"
        aria-label="Agent 对话为空"
      />
    );
  }

  return (
    <div
      className="agent-thread-timeline"
      role="log"
      aria-label="Agent 对话时间线"
    >
      <div className="agent-thread-timeline__viewport">
        {thread.messages.map((message) => (
          <AgentThreadMessage
            key={message.id}
            message={message}
            onSelectImageResult={onSelectImageResult}
          />
        ))}
      </div>
    </div>
  );
};
