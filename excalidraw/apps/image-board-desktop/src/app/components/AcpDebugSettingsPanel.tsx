import type { AcpRunSummary } from "../../shared/acpTypes";
import { copy, DESKTOP_LANG_CODE } from "../copy";
import { DesktopButton } from "./DesktopButton";
import "./AgentSettings.css";

export const getAcpRunStatusLabel = (status: AcpRunSummary["status"]) => {
  return copy.applicationSettings.acpDebugPage.status[status];
};

export interface AcpDebugSettingsPanelProps {
  open: boolean;
  summaries: readonly AcpRunSummary[];
  loading: boolean;
  error: string | null;
  canReadRunLogs: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
  onOpenRunLog: (taskId: string) => void;
}

export const AcpDebugSettingsPanel = ({
  open,
  summaries,
  loading,
  error,
  canReadRunLogs,
  onOpenChange,
  onRefresh,
  onOpenRunLog,
}: AcpDebugSettingsPanelProps) => (
  <details
    className="app-settings-section app-settings-section--stacked app-settings-advanced"
    open={open}
    onToggle={(event) => {
      onOpenChange(event.currentTarget.open);
    }}
  >
    <summary>
      <span>
        <strong>{copy.applicationSettings.acpDebugPage.title}</strong>
        <em>{copy.applicationSettings.acpDebugPage.summary}</em>
      </span>
    </summary>

    {open ? (
      <div className="acp-run-history">
        <div className="acp-run-history__header">
          <div>
            <strong>
              {copy.applicationSettings.acpDebugPage.historyTitle}
            </strong>
            <span>
              {copy.applicationSettings.acpDebugPage.historyDescription}
            </span>
          </div>
          <DesktopButton
            type="button"
            size="small"
            disabled={loading || !canReadRunLogs}
            onClick={onRefresh}
          >
            {loading
              ? copy.applicationSettings.acpDebugPage.loading
              : copy.applicationSettings.acpDebugPage.refresh}
          </DesktopButton>
        </div>
        {error ? <div className="dialog-card__error">{error}</div> : null}
        {summaries.length > 0 ? (
          <div className="acp-run-history__list">
            {summaries.map((summary) => (
              <button
                key={summary.taskId}
                type="button"
                className="acp-run-history__item"
                aria-label={copy.applicationSettings.acpDebugPage.openRecord(
                  summary.userPrompt,
                )}
                onClick={() => onOpenRunLog(summary.taskId)}
              >
                <span className="acp-run-history__item-project">
                  {summary.projectName}
                </span>
                <strong>{summary.userPrompt}</strong>
                <span className="acp-run-history__item-meta">
                  <span>{summary.agentName}</span>
                  <span className="acp-run-history__item-status">
                    {getAcpRunStatusLabel(summary.status)}
                  </span>
                  <span>
                    {new Date(summary.startedAt).toLocaleString(
                      DESKTOP_LANG_CODE,
                    )}
                  </span>
                </span>
                {summary.lastMessage || summary.errorMessage ? (
                  <span className="acp-run-history__item-message">
                    {summary.errorMessage ?? summary.lastMessage}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        ) : (
          <p className="acp-run-history__empty">
            {canReadRunLogs
              ? copy.applicationSettings.acpDebugPage.empty
              : copy.applicationSettings.acpDebugPage.unsupported}
          </p>
        )}
      </div>
    ) : null}
  </details>
);
