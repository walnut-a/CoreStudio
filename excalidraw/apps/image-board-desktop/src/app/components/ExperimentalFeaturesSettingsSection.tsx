import "./AgentSettings.css";
import {
  ACP_AGENT_CUSTOM_PRESET_ID,
  ACP_AGENT_PRESETS,
  type AcpAgentPresetId,
} from "../../shared/acpTypes";
import { copy } from "../copy";
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
        <h3>{copy.applicationSettings.experimental}</h3>
        <p>{copy.applicationSettings.experimentalPage.description}</p>
      </div>
    </header>

    <div className="app-settings-section app-settings-section--stacked">
      <div className="app-settings-section__top">
        <div className="app-settings-section__copy">
          <span>{copy.applicationSettings.experimentalPage.externalAgent}</span>
          <p>
            {copy.applicationSettings.experimentalPage.externalAgentDescription}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-label={
            copy.applicationSettings.experimentalPage.enableExternalAgent
          }
          aria-checked={acpEnabled}
          disabled={disabled || saving}
          className="app-settings-section__switch"
          onClick={() => onAcpEnabledChange(!acpEnabled)}
        />
      </div>
      {acpEnabled ? (
        <div className="experimental-acp-options">
          <label>
            <span>{copy.applicationSettings.experimentalPage.agentType}</span>
            <select
              aria-label={copy.applicationSettings.experimentalPage.agentType}
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
              <option value={ACP_AGENT_CUSTOM_PRESET_ID}>
                {copy.applicationSettings.experimentalPage.customCommand}
              </option>
            </select>
          </label>
          <DesktopButton type="button" size="small" onClick={onOpenAdvanced}>
            {copy.applicationSettings.experimentalPage.advancedSettings}
          </DesktopButton>
        </div>
      ) : null}
    </div>
  </section>
);
