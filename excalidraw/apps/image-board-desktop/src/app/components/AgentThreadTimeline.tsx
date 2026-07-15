import type { AgentThread } from "../agentThreadTypes";
import { copy } from "../copy";
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
        aria-label={copy.agentUi.timeline.empty}
      />
    );
  }

  return (
    <div
      className="agent-thread-timeline"
      role="log"
      aria-label={copy.agentUi.timeline.label}
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
