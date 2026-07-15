import { useState, type FormEvent, type KeyboardEvent } from "react";

import { copy } from "../copy";
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
      ? copy.agentUi.composer.continueConversation
      : copy.agentUi.composer.enterTask
    : disabledReason ?? copy.agentUi.composer.unavailable;

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

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
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
        aria-label={copy.agentUi.composer.label}
        onChange={(event) => setDraftMessage(event.target.value)}
        onKeyDown={handleComposerKeyDown}
      />
      <DesktopButton
        type="submit"
        variant="primary"
        className="agent-conversation-sidebar__send"
        disabled={!canSendMessage}
        aria-label={
          submittingMessage
            ? copy.agentUi.composer.sending
            : copy.agentUi.composer.send
        }
        title={
          submittingMessage
            ? copy.agentUi.composer.sending
            : copy.agentUi.composer.send
        }
      >
        {sendIcon}
      </DesktopButton>
    </form>
  );
};
