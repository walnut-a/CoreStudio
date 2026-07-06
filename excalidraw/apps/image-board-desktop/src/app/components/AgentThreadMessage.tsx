import type { AgentMessage, AgentMessagePart } from "../agentThreadTypes";
import { AgentImageResultPart } from "./AgentImageResultPart";
import {
  AgentThreadErrorPart,
  AgentThreadStatusPart,
  AgentThreadTextPart,
} from "./AgentThreadTextPart";
import { AgentToolCallPart } from "./AgentToolCallPart";

const AgentMessagePartView = ({
  part,
  onSelectImageResult,
}: {
  part: AgentMessagePart;
  onSelectImageResult?: (fileId: string) => void;
}) => {
  switch (part.type) {
    case "text":
      return <AgentThreadTextPart part={part} />;
    case "tool":
      return <AgentToolCallPart part={part} />;
    case "image-result":
      return (
        <AgentImageResultPart
          part={part}
          onSelectImageResult={onSelectImageResult}
        />
      );
    case "status":
      return <AgentThreadStatusPart part={part} />;
    case "error":
      return <AgentThreadErrorPart part={part} />;
  }
};

export const AgentThreadMessage = ({
  message,
  onSelectImageResult,
}: {
  message: AgentMessage;
  onSelectImageResult?: (fileId: string) => void;
}) => (
  <article
    className={[
      "agent-thread-timeline__message",
      `agent-thread-timeline__message--${message.role}`,
    ].join(" ")}
  >
    <div className="agent-thread-timeline__message-body">
      {message.parts.map((part) => (
        <AgentMessagePartView
          key={part.id}
          part={part}
          onSelectImageResult={onSelectImageResult}
        />
      ))}
    </div>
  </article>
);
