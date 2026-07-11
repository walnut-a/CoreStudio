import {
  ACP_AGENT_CUSTOM_PRESET_ID,
  ACP_AGENT_PRESETS,
  DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE,
  type AcpAgentConfig,
  type AcpAgentPresetId,
} from "../../shared/acpTypes";
import type { AcpAgentSettingsDraft } from "../agent/useAcpAgentSettingsController";
import { DesktopButton } from "./DesktopButton";
import "./AgentSettings.css";

export interface AcpAgentSettingsPanelProps {
  draft: AcpAgentSettingsDraft;
  selectedAgent: AcpAgentConfig | null;
  editable: boolean;
  saving: boolean;
  defaultCwd: string;
  onEnabledChange: (enabled: boolean) => void;
  onPresetChange: (presetId: AcpAgentPresetId) => void;
  onCommandChange: (command: string) => void;
  onArgsChange: (args: string) => void;
  onCwdChange: (cwd: string) => void;
  onTaskInstructionChange: (template: string) => void;
  onSave: () => void;
}

export const AcpAgentSettingsPanel = ({
  draft,
  selectedAgent,
  editable,
  saving,
  defaultCwd,
  onEnabledChange,
  onPresetChange,
  onCommandChange,
  onArgsChange,
  onCwdChange,
  onTaskInstructionChange,
  onSave,
}: AcpAgentSettingsPanelProps) => (
  <section className="app-settings-section app-settings-section--stacked">
    <div className="app-settings-section__copy">
      <strong>ACP Agent</strong>
      <p>
        用于从 CoreStudio 主动发起复杂任务给外部 Agent。它和直接输入不同：
        直接输入偏向单次生成，ACP Agent 偏向带上下文的连续任务。CoreStudio
        负责发送任务包和展示过程；结果写回仍要求 Agent 使用 CLI / Local Bridge。
      </p>
    </div>
    <div className="app-settings-form">
      <div className="app-settings-form__header">
        <span>{draft.enabled ? "已启用" : "未启用"}</span>
        <button
          type="button"
          role="switch"
          aria-label="启用 ACP Agent"
          aria-checked={draft.enabled}
          disabled={!editable}
          className="app-settings-section__switch"
          onClick={() => onEnabledChange(!draft.enabled)}
        />
      </div>
      <label>
        Agent 类型
        <select
          value={draft.presetId}
          disabled={!editable}
          onChange={(event) =>
            onPresetChange(event.target.value as AcpAgentPresetId)
          }
        >
          {ACP_AGENT_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
          <option value={ACP_AGENT_CUSTOM_PRESET_ID}>自定义命令</option>
        </select>
      </label>
      <label>
        命令
        <input
          value={draft.command}
          placeholder="/usr/local/bin/acp-agent"
          disabled={!editable}
          onChange={(event) => onCommandChange(event.target.value)}
        />
      </label>
      <label>
        参数
        <input
          value={draft.args}
          placeholder="--stdio"
          disabled={!editable}
          onChange={(event) => onArgsChange(event.target.value)}
        />
      </label>
      <label>
        工作目录
        <input
          value={draft.cwd}
          placeholder={`默认：${defaultCwd}`}
          title={`默认：${defaultCwd}`}
          disabled={!editable}
          onChange={(event) => onCwdChange(event.target.value)}
        />
      </label>
      <label className="app-settings-form__wide-field">
        任务说明模板
        <textarea
          aria-label="任务说明模板"
          value={draft.taskInstructionTemplate}
          rows={7}
          placeholder={DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE}
          disabled={!editable}
          onChange={(event) => onTaskInstructionChange(event.target.value)}
        />
        <span>
          会作为任务首段文本发送给 Agent；项目、选区、图片 ID、Bridge
          地址和写回规则会另附为结构化任务包。
        </span>
      </label>
      <div className="app-settings-form__actions">
        <span>
          {selectedAgent
            ? `当前：${selectedAgent.name} · ${selectedAgent.command}`
            : "尚未配置 ACP Agent"}
        </span>
        <DesktopButton
          type="button"
          disabled={saving || !editable}
          onClick={onSave}
        >
          {saving ? "保存中..." : "保存"}
        </DesktopButton>
      </div>
    </div>
  </section>
);
