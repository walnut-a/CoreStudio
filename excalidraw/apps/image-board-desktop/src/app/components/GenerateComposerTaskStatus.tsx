import type { SyntheticEvent } from "react";

import type { GenerateComposerConfig } from "../agent/useGenerateComposerController";

type GenerateComposerAgentTaskStatus = NonNullable<
  GenerateComposerConfig["agentTaskStatus"]
>;

type GenerateComposerAgentTaskEvent = NonNullable<
  GenerateComposerAgentTaskStatus["events"]
>[number];

interface GenerateComposerTaskStatusProps {
  status: GenerateComposerConfig["agentTaskStatus"];
  events: readonly GenerateComposerAgentTaskEvent[];
  onOpenAgentRunLog?: (taskId: string) => void;
  onStopInputEvent: (event: SyntheticEvent<HTMLElement>) => void;
}

export const GenerateComposerTaskStatus = ({
  status,
  events,
  onOpenAgentRunLog,
  onStopInputEvent,
}: GenerateComposerTaskStatusProps) => {
  if (!status) {
    return null;
  }

  const canOpenTaskLog = Boolean(status.taskId && onOpenAgentRunLog);
  const openTaskLog = (event: SyntheticEvent<HTMLElement>) => {
    onStopInputEvent(event);
    if (!status.taskId) {
      return;
    }
    onOpenAgentRunLog?.(status.taskId);
  };

  return (
    <div
      className={[
        "generate-composer__agent-task",
        `generate-composer__agent-task--${status.status}`,
      ].join(" ")}
      role="status"
      aria-live="polite"
    >
      <div className="generate-composer__agent-task-summary">
        <strong>{status.message}</strong>
        {status.transcript ? <span>{status.transcript}</span> : null}
        {status.logPath ? (
          <span title={status.logPath}>日志已保存</span>
        ) : null}
        {status.logPath && canOpenTaskLog ? (
          <button
            type="button"
            className="generate-composer__agent-task-toggle"
            aria-label="查看保存日志"
            onMouseDown={onStopInputEvent}
            onClick={openTaskLog}
          >
            日志
          </button>
        ) : null}
        {events.length && canOpenTaskLog ? (
          <button
            type="button"
            className="generate-composer__agent-task-toggle"
            aria-label="查看任务过程"
            onMouseDown={onStopInputEvent}
            onClick={openTaskLog}
          >
            过程
          </button>
        ) : null}
      </div>
    </div>
  );
};
