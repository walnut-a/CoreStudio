import type { AcpRunLogDetail } from "../../shared/acpTypes";
import { copy } from "../copy";
import { AgentRunChatLog } from "./AgentRunChatLog";
import { getAcpRunStatusLabel } from "./AcpDebugSettingsPanel";
import { DesktopButton } from "./DesktopButton";

import "./AcpRunLogDialog.css";

export interface AcpRunLogDialogProps {
  open: boolean;
  loading: boolean;
  error: string | null;
  detail: AcpRunLogDetail | null;
  rawOpen: boolean;
  onRawOpenChange: (open: boolean) => void;
  onClose: () => void;
}

export const AcpRunLogDialog = ({
  open,
  loading,
  error,
  detail,
  rawOpen,
  onRawOpenChange,
  onClose,
}: AcpRunLogDialogProps) => {
  if (!open) {
    return null;
  }

  return (
    <div className="dialog-backdrop">
      <div
        className="dialog-card dialog-card--wide acp-run-log-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="acp-run-log-title"
      >
        <div className="dialog-card__header">
          <div>
            <span className="dialog-card__eyebrow">ACP Agent</span>
            <h2 id="acp-run-log-title">{copy.agentUi.runLog.dialogTitle}</h2>
          </div>
          <DesktopButton
            type="button"
            className="dialog-card__close"
            onClick={onClose}
          >
            {copy.agentUi.runLog.close}
          </DesktopButton>
        </div>

        {loading ? (
          <div className="dialog-card__notice">
            {copy.agentUi.runLog.loading}
          </div>
        ) : null}

        {error ? <div className="dialog-card__error">{error}</div> : null}

        {detail ? (
          <>
            <div className="acp-run-log-dialog__summary">
              <div>
                <span>{copy.agentUi.runLog.task}</span>
                <strong>{detail.summary.taskId}</strong>
              </div>
              <div>
                <span>{copy.agentUi.runLog.agent}</span>
                <strong>{detail.summary.agentName}</strong>
              </div>
              <div>
                <span>{copy.agentUi.runLog.status}</span>
                <strong>{getAcpRunStatusLabel(detail.summary.status)}</strong>
              </div>
              <div>
                <span>{copy.agentUi.runLog.project}</span>
                <strong>{detail.summary.projectName}</strong>
              </div>
            </div>

            <div className="acp-run-log-dialog__chat-actions">
              <DesktopButton
                type="button"
                onClick={() => onRawOpenChange(!rawOpen)}
                aria-expanded={rawOpen}
              >
                {rawOpen
                  ? copy.agentUi.runLog.hideProtocolJson
                  : copy.agentUi.runLog.showProtocolJson}
              </DesktopButton>
            </div>

            <AgentRunChatLog
              entries={detail.entries}
              includeRawEntries={rawOpen}
            />
          </>
        ) : null}
      </div>
    </div>
  );
};
