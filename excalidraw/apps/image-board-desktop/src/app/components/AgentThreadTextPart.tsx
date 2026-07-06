import type {
  AgentErrorPart,
  AgentStatusPart,
  AgentTextPart,
} from "../agentThreadTypes";
import {
  AgentThreadMarkdownBlocks,
  renderInlineAgentMarkdown,
} from "./AgentThreadMarkdown";

export const AgentThreadTextPart = ({ part }: { part: AgentTextPart }) => (
  <AgentThreadMarkdownBlocks text={part.text} idPrefix={part.id} />
);

export const AgentThreadStatusPart = ({
  part,
}: {
  part: AgentStatusPart;
}) => (
  <p className="agent-thread-timeline__status-line">
    {renderInlineAgentMarkdown(part.text, part.id)}
  </p>
);

export const AgentThreadErrorPart = ({ part }: { part: AgentErrorPart }) => (
  <p className="agent-thread-timeline__error-line">
    {renderInlineAgentMarkdown(part.message, part.id)}
  </p>
);
