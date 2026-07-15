import type { ReactNode } from "react";

import {
  DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE,
  type AcpAgentConfig,
} from "../../shared/acpTypes";
import type { AcpAgentSettingsDraft } from "../agent/useAcpAgentSettingsController";
import { DesktopButton } from "./DesktopButton";
import { useApplicationSettingsLeave } from "./ApplicationSettingsDialog";
import "./AgentSettings.css";

export interface AcpAgentSettingsPanelProps {
  draft: AcpAgentSettingsDraft;
  selectedAgent: AcpAgentConfig | null;
  editable: boolean;
  saving: boolean;
  defaultCwd: string;
  onBack: () => void;
  onCommandChange: (command: string) => void;
  onArgsChange: (args: string) => void;
  onCwdChange: (cwd: string) => void;
  onTaskInstructionChange: (template: string) => void;
  onSave: () => void;
  debugContent: ReactNode;
}

export const AcpAgentSettingsPanel = ({
  draft,
  selectedAgent,
  editable,
  saving,
  defaultCwd,
  onBack,
  onCommandChange,
  onArgsChange,
  onCwdChange,
  onTaskInstructionChange,
  onSave,
  debugContent,
}: AcpAgentSettingsPanelProps) => {
  const requestLeave = useApplicationSettingsLeave();

  return (
    <section className="settings-page settings-acp-detail">
      <button
        type="button"
        className="settings-page__back"
        onClick={() => requestLeave(onBack)}
      >
        ← 返回实验性功能
      </button>
      <header className="settings-page__header">
        <div>
          <h3>ACP 高级配置</h3>
          <p>仅在需要自定义启动命令或排查 Agent 任务时修改。</p>
        </div>
      </header>
      <div className="settings-form-card">
        <label>
          <span>命令</span>
          <input
            aria-label="命令"
            value={draft.command}
            placeholder="/usr/local/bin/acp-agent"
            disabled={!editable}
            onChange={(event) => onCommandChange(event.target.value)}
          />
        </label>
        <label>
          <span>参数</span>
          <input
            aria-label="参数"
            value={draft.args}
            placeholder="--stdio"
            disabled={!editable}
            onChange={(event) => onArgsChange(event.target.value)}
          />
        </label>
        <label>
          <span>工作目录</span>
          <input
            aria-label="工作目录"
            value={draft.cwd}
            placeholder={`默认：${defaultCwd}`}
            title={`默认：${defaultCwd}`}
            disabled={!editable}
            onChange={(event) => onCwdChange(event.target.value)}
          />
        </label>
        <label>
          <span>任务说明模板</span>
          <textarea
            className="settings-form-card__long-text"
            aria-label="任务说明模板"
            value={draft.taskInstructionTemplate}
            rows={9}
            placeholder={DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE}
            disabled={!editable}
            onChange={(event) => onTaskInstructionChange(event.target.value)}
          />
        </label>
        <div className="settings-form-card__actions settings-form-card__actions--spread">
          <span>
            {selectedAgent
              ? `当前：${selectedAgent.name} · ${selectedAgent.command}`
              : "尚未保存 Agent 配置"}
          </span>
          <DesktopButton
            type="button"
            size="small"
            variant="primary"
            disabled={saving || !editable}
            onClick={onSave}
          >
            {saving ? "保存中..." : "保存"}
          </DesktopButton>
        </div>
      </div>
      {debugContent}
    </section>
  );
};
