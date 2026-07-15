import "./AgentSettings.css";
import {
  ACP_AGENT_CUSTOM_PRESET_ID,
  ACP_AGENT_PRESETS,
  type AcpAgentPresetId,
} from "../../shared/acpTypes";
import { DesktopButton } from "./DesktopButton";

export interface ExperimentalFeaturesSettingsSectionProps {
  acpEnabled: boolean;
  disabled: boolean;
  saving: boolean;
  presetId: AcpAgentPresetId;
  onAcpEnabledChange: (enabled: boolean) => void;
  onPresetChange: (presetId: AcpAgentPresetId) => void;
  onOpenAdvanced: () => void;
}

export const ExperimentalFeaturesSettingsSection = ({
  acpEnabled,
  disabled,
  saving,
  presetId,
  onAcpEnabledChange,
  onPresetChange,
  onOpenAdvanced,
}: ExperimentalFeaturesSettingsSectionProps) => (
  <section className="settings-page">
    <header className="settings-page__header">
      <div>
        <h3>实验性功能</h3>
        <p>实验性功能需要手动开启，行为和配置可能继续调整。</p>
      </div>
    </header>

    <div className="app-settings-section app-settings-section--stacked">
      <div className="app-settings-section__top">
        <div className="app-settings-section__copy">
          <span>外部 Agent（ACP）</span>
          <p>从 CoreStudio 内部把任务交给兼容 ACP 的 Agent。默认关闭。</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-label="启用外部 Agent 实验功能"
          aria-checked={acpEnabled}
          disabled={disabled || saving}
          className="app-settings-section__switch"
          onClick={() => onAcpEnabledChange(!acpEnabled)}
        />
      </div>
      {acpEnabled ? (
        <div className="experimental-acp-options">
          <label>
            <span>Agent 类型</span>
            <select
              aria-label="Agent 类型"
              value={presetId}
              disabled={disabled || saving}
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
          <DesktopButton type="button" size="small" onClick={onOpenAdvanced}>
            高级配置
          </DesktopButton>
        </div>
      ) : null}
    </div>
  </section>
);
