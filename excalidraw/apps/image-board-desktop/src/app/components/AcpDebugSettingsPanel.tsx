import type { AcpRunSummary } from "../../shared/acpTypes";
import { DesktopButton } from "./DesktopButton";
import "./AgentSettings.css";

export const getAcpRunStatusLabel = (status: AcpRunSummary["status"]) => {
  switch (status) {
    case "running":
      return "运行中";
    case "completed":
      return "已完成";
    case "failed":
      return "失败";
    case "cancelled":
      return "已取消";
  }
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
        <strong>高级调试</strong>
        <em>排障时查看 ACP 调试记录、协议 JSON 和任务包。</em>
      </span>
    </summary>

    {open ? (
      <div className="acp-run-history">
        <div className="acp-run-history__header">
          <div>
            <strong>ACP 调试记录</strong>
            <span>
              用于排查外部 Agent
              连接、协议消息或写回失败。日常任务过程请在左侧 Agent 对话中查看。
            </span>
          </div>
          <DesktopButton
            type="button"
            disabled={loading || !canReadRunLogs}
            onClick={onRefresh}
          >
            {loading ? "读取中..." : "刷新记录"}
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
                aria-label={`查看调试记录：${summary.userPrompt}`}
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
                    {new Date(summary.startedAt).toLocaleString("zh-CN")}
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
              ? "暂无 ACP 调试记录。"
              : "当前环境暂不支持读取 ACP 调试记录。"}
          </p>
        )}
      </div>
    ) : null}
  </details>
);
