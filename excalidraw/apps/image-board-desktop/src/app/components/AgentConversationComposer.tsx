import { useState, type FormEvent, type KeyboardEvent } from "react";

import { DesktopButton } from "./DesktopButton";
import { sendIcon } from "./CoreStudioIcons";

interface AgentConversationComposerProps {
  canSubmitMessage: boolean;
  disabledReason?: string | null;
  hasConversationContext: boolean;
  hasConversationEntries: boolean;
  onSubmitMessage: (message: string) => Promise<void> | void;
}

export const AgentConversationComposer = ({
  canSubmitMessage,
  disabledReason = null,
  hasConversationContext,
  hasConversationEntries,
  onSubmitMessage,
}: AgentConversationComposerProps) => {
  const [draftMessage, setDraftMessage] = useState("");
  const [submittingMessage, setSubmittingMessage] = useState(false);
  const trimmedDraftMessage = draftMessage.trim();
  const messageInputDisabled = !canSubmitMessage || submittingMessage;
  const canSendMessage =
    Boolean(trimmedDraftMessage) && canSubmitMessage && !submittingMessage;
  const messagePlaceholder = canSubmitMessage
    ? hasConversationContext || hasConversationEntries
      ? "继续对话"
      : "输入任务"
    : disabledReason ?? "Agent 暂不可用";

  const submitDraftMessage = async () => {
    if (!canSendMessage) {
      return;
    }
    setSubmittingMessage(true);
    try {
      await onSubmitMessage(trimmedDraftMessage);
      setDraftMessage("");
    } finally {
      setSubmittingMessage(false);
    }
  };

  const handleComposerSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitDraftMessage();
  };

  const handleComposerKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }
    event.preventDefault();
    void submitDraftMessage();
  };

  return (
    <form
      className="agent-conversation-sidebar__composer"
      onSubmit={handleComposerSubmit}
    >
      <textarea
        value={draftMessage}
        rows={2}
        disabled={messageInputDisabled}
        placeholder={messagePlaceholder}
        aria-label="继续 Agent 对话"
        onChange={(event) => setDraftMessage(event.target.value)}
        onKeyDown={handleComposerKeyDown}
      />
      <DesktopButton
        type="submit"
        variant="primary"
        className="agent-conversation-sidebar__send"
        disabled={!canSendMessage}
        aria-label={submittingMessage ? "发送中" : "发送给 Agent"}
        title={submittingMessage ? "发送中" : "发送给 Agent"}
      >
        {sendIcon}
      </DesktopButton>
    </form>
  );
};
