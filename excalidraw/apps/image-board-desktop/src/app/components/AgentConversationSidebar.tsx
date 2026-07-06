import { useMemo, useState } from "react";

import "./AgentConversation.css";

import type {
  AcpRunLogDetail,
  AcpRunLogEntry,
  AcpThreadSummary,
} from "../../shared/acpTypes";
import {
  createAgentConversationThreadView,
  type AgentConversationEventItem,
  type AgentConversationTaskState,
} from "../agent/agentConversationThreadView";
import {
  AgentConversationHeaderActions,
  AgentConversationSummary,
} from "./AgentConversationHeader";
import { AgentConversationComposer } from "./AgentConversationComposer";
import { AgentThreadList } from "./AgentThreadList";
import { AgentThreadTimeline } from "./AgentThreadTimeline";
import {
  GenerationRecordSidebar,
  type GenerationRecordListItem,
} from "./GenerationRecordSidebar";
import { SideDock } from "./SideDock";

export type { GenerationRecordListItem } from "./GenerationRecordSidebar";

interface AgentConversationSidebarProps {
  mode: "direct" | "agent";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generationRecords?: GenerationRecordListItem[];
  agentResultRecords?: GenerationRecordListItem[];
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

export const AgentConversationSidebar = ({
  mode,
  open,
  onOpenChange,
  generationRecords = [],
  agentResultRecords = [],
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
  const [threadListOpen, setThreadListOpen] = useState(false);
  const conversationView = useMemo(
    () =>
      createAgentConversationThreadView({
        task,
        runLogDetail,
        threadEntries,
        error,
        agentResultRecords,
        activeThreadId,
      }),
    [
      activeThreadId,
      agentResultRecords,
      error,
      runLogDetail,
      task,
      threadEntries,
    ],
  );
  const {
    agentThread,
    chatEntries,
    hasConversationContext,
    status,
    title,
  } = conversationView;
  const isAgentMode = mode === "agent";
  const dockTitle = isAgentMode ? "Agent 对话" : "生成记录";
  const handleSelectThread = async (threadId: string) => {
    await onSelectThread(threadId);
    setThreadListOpen(false);
  };
  const handleStartNewThread = () => {
    onStartNewThread();
    setThreadListOpen(false);
  };
  const agentHeaderActions = isAgentMode ? (
    <AgentConversationHeaderActions
      threadListOpen={threadListOpen}
      disabled={threadActionsDisabled}
      onToggleThreadList={() => setThreadListOpen((current) => !current)}
      onStartNewThread={handleStartNewThread}
    />
  ) : null;

  return (
    <SideDock
      side="left"
      title={dockTitle}
      open={open}
      onOpenChange={onOpenChange}
      headerActions={agentHeaderActions}
    >
      <div
        className={[
          "agent-conversation-sidebar",
          isAgentMode
            ? "agent-conversation-sidebar--agent"
            : "agent-conversation-sidebar--direct",
          threadListOpen ? "agent-conversation-sidebar--thread-list" : "",
        ].join(" ")}
      >
        {!isAgentMode ? (
          <GenerationRecordSidebar
            records={generationRecords}
            onSelectRecord={onSelectGenerationRecord}
          />
        ) : (
          <>
            {threadListOpen ? (
              <section
                className="agent-conversation-sidebar__threads"
                aria-label="Agent 历史对话"
              >
                <AgentThreadList
                  summaries={threadSummaries}
                  activeThreadId={activeThreadId}
                  loading={threadsLoading}
                  error={threadsError}
                  actionsDisabled={threadActionsDisabled}
                  onSelectThread={handleSelectThread}
                />
              </section>
            ) : (
              <>
                {hasConversationContext ? (
                  <AgentConversationSummary
                    agentName={runLogDetail?.summary.agentName ?? "ACP Agent"}
                    title={title}
                    status={status}
                  />
                ) : null}

                <div className="agent-conversation-sidebar__body">
                  {error ? (
                    <div className="agent-conversation-sidebar__error">
                      {error}
                    </div>
                  ) : null}

                  <div className="agent-conversation-sidebar__content">
                    <AgentThreadTimeline
                      thread={agentThread}
                      onSelectImageResult={onSelectGenerationRecord}
                    />
                  </div>
                </div>

                <AgentConversationComposer
                  canSubmitMessage={canSubmitMessage}
                  disabledReason={submitMessageDisabledReason}
                  hasConversationContext={hasConversationContext}
                  hasConversationEntries={chatEntries.length > 0}
                  onSubmitMessage={onSubmitMessage}
                />
              </>
            )}
          </>
        )}
      </div>
    </SideDock>
  );
};
