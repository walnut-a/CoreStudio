import "./AgentSettings.css";

export interface ExperimentalFeaturesSettingsSectionProps {
  acpEnabled: boolean;
  disabled: boolean;
  saving: boolean;
  onAcpEnabledChange: (enabled: boolean) => void;
}

export const ExperimentalFeaturesSettingsSection = ({
  acpEnabled,
  disabled,
  saving,
  onAcpEnabledChange,
}: ExperimentalFeaturesSettingsSectionProps) => (
  <section className="app-settings-section app-settings-section--stacked">
    <div className="app-settings-section__copy">
      <strong>实验性功能</strong>
      <p>实验性功能需要手动开启，行为和配置可能继续调整。</p>
    </div>
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
  </section>
);
