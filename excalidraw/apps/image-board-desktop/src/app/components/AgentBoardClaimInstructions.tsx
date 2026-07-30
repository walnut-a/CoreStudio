import { useState } from "react";

import { copyPlainTextToClipboard } from "../clipboardText";
import { copy } from "../copy";
import { DesktopButton } from "./DesktopButton";

interface AgentBoardClaimInstructionsProps {
  stableBoardId: string;
  pageNonce: string;
  copyText?: (text: string) => Promise<boolean>;
}

export const buildAgentBoardClaimInstruction = ({
  stableBoardId,
  pageNonce,
  instruction,
}: {
  stableBoardId: string;
  pageNonce: string;
  instruction: string;
}) =>
  [
    instruction,
    '<corestudio-board-claim version="1">',
    JSON.stringify({
      source: "agent-board",
      mode: "claim",
      stableBoardId,
      pageNonce,
    }),
    "</corestudio-board-claim>",
  ].join("\n");

export const AgentBoardClaimInstructions = ({
  stableBoardId,
  pageNonce,
  copyText = copyPlainTextToClipboard,
}: AgentBoardClaimInstructionsProps) => {
  const [copying, setCopying] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const claimCopy = copy.agentBoard.connectionClaim;

  const copyClaimInstruction = async () => {
    if (copying) {
      return;
    }
    setCopying(true);
    setFeedback(null);
    try {
      const copied = await copyText(
        buildAgentBoardClaimInstruction({
          stableBoardId,
          pageNonce,
          instruction: claimCopy.clipboardInstruction,
        }),
      );
      setFeedback(copied ? claimCopy.copySucceeded : claimCopy.copyFailed);
    } catch {
      setFeedback(claimCopy.copyFailed);
    } finally {
      setCopying(false);
    }
  };

  return (
    <section
      className="welcome-pane__card welcome-pane__diagnostic welcome-pane__claim"
      aria-labelledby="agent-board-claim-title"
    >
      <span className="welcome-pane__eyebrow">Agent Board</span>
      <div className="welcome-pane__claim-copy">
        <h1 id="agent-board-claim-title">{claimCopy.title}</h1>
        <div className="welcome-pane__claim-steps">
          <section>
            <h2>{claimCopy.currentStateTitle}</h2>
            <p>{claimCopy.currentStateDescription}</p>
          </section>
          <section>
            <h2>{claimCopy.nextStepTitle}</h2>
            <p>{claimCopy.nextStepDescription}</p>
          </section>
          <section>
            <h2>{claimCopy.completionTitle}</h2>
            <p>{claimCopy.completionDescription}</p>
          </section>
        </div>
      </div>
      <div className="welcome-pane__claim-actions">
        <DesktopButton
          variant="primary"
          onClick={() => void copyClaimInstruction()}
          disabled={copying}
        >
          {copying ? claimCopy.copying : claimCopy.copyAction}
        </DesktopButton>
        {feedback ? (
          <p
            className="welcome-pane__claim-feedback"
            role="status"
            aria-live="polite"
          >
            {feedback}
          </p>
        ) : null}
      </div>
    </section>
  );
};
