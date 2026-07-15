import type { AgentToolCall, AgentToolPart } from "../agentThreadTypes";
import { copy } from "../copy";

const getToolStatusLabel = (status: AgentToolCall["status"]) => {
  switch (status) {
    case "completed":
      return copy.agentUi.status.completed;
    case "failed":
      return copy.agentUi.status.failed;
    case "running":
      return copy.agentUi.tool.running;
    case "pending":
    default:
      return copy.agentUi.status.pending;
  }
};

const formatToolValue = (value: unknown) => {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    try {
      return JSON.stringify(JSON.parse(trimmed), null, 2);
    } catch {
      return trimmed;
    }
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const renderToolDetail = (label: string, value: unknown) => {
  if (value === undefined || value === null) {
    return null;
  }
  const formatted = formatToolValue(value);
  if (!formatted) {
    return null;
  }

  return (
    <div className="agent-thread-timeline__tool-detail">
      <span>{label}</span>
      <pre>{formatted}</pre>
    </div>
  );
};

export const AgentToolCallPart = ({ part }: { part: AgentToolPart }) => {
  const tool = part.tool;
  const hasDetails =
    tool.args !== undefined ||
    tool.result !== undefined ||
    Boolean(tool.errorMessage);

  return (
    <details
      open={tool.status === "failed"}
      className={[
        "agent-thread-timeline__tool",
        `agent-thread-timeline__tool--${tool.status}`,
      ].join(" ")}
    >
      <summary>
        <span className="agent-thread-timeline__tool-dot" aria-hidden="true" />
        <span className="agent-thread-timeline__tool-heading">
          <span className="agent-thread-timeline__tool-title">
            {tool.title || tool.name}
          </span>
          {tool.summary ? (
            <span className="agent-thread-timeline__tool-summary">
              {tool.summary}
            </span>
          ) : null}
        </span>
        <span className="agent-thread-timeline__tool-status">
          {getToolStatusLabel(tool.status)}
        </span>
      </summary>
      {hasDetails ? (
        <div className="agent-thread-timeline__tool-body">
          {renderToolDetail(copy.agentUi.tool.input, tool.args)}
          {renderToolDetail(copy.agentUi.tool.output, tool.result)}
          {tool.errorMessage ? (
            <p className="agent-thread-timeline__tool-error">
              {tool.errorMessage}
            </p>
          ) : null}
        </div>
      ) : null}
    </details>
  );
};
