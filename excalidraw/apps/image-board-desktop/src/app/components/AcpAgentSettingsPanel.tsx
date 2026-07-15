import type { ReactNode } from "react";

import {
  DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE,
  type AcpAgentConfig,
} from "../../shared/acpTypes";
import type { AcpAgentSettingsDraft } from "../agent/useAcpAgentSettingsController";
import { copy } from "../copy";
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
        {copy.applicationSettings.acpAdvancedPage.back}
      </button>
      <header className="settings-page__header">
        <div>
          <h3>{copy.applicationSettings.acpAdvancedPage.title}</h3>
          <p>{copy.applicationSettings.acpAdvancedPage.description}</p>
        </div>
      </header>
      <div className="settings-form-card">
        <label>
          <span>{copy.applicationSettings.acpAdvancedPage.command}</span>
          <input
            aria-label={copy.applicationSettings.acpAdvancedPage.command}
            value={draft.command}
            placeholder="/usr/local/bin/acp-agent"
            disabled={!editable}
            onChange={(event) => onCommandChange(event.target.value)}
          />
        </label>
        <label>
          <span>{copy.applicationSettings.acpAdvancedPage.arguments}</span>
          <input
            aria-label={copy.applicationSettings.acpAdvancedPage.arguments}
            value={draft.args}
            placeholder="--stdio"
            disabled={!editable}
            onChange={(event) => onArgsChange(event.target.value)}
          />
        </label>
        <label>
          <span>
            {copy.applicationSettings.acpAdvancedPage.workingDirectory}
          </span>
          <input
            aria-label={
              copy.applicationSettings.acpAdvancedPage.workingDirectory
            }
            value={draft.cwd}
            placeholder={copy.applicationSettings.acpAdvancedPage.defaultWorkingDirectory(
              defaultCwd,
            )}
            title={copy.applicationSettings.acpAdvancedPage.defaultWorkingDirectory(
              defaultCwd,
            )}
            disabled={!editable}
            onChange={(event) => onCwdChange(event.target.value)}
          />
        </label>
        <label>
          <span>
            {copy.applicationSettings.acpAdvancedPage.taskInstructionTemplate}
          </span>
          <textarea
            className="settings-form-card__long-text"
            aria-label={
              copy.applicationSettings.acpAdvancedPage.taskInstructionTemplate
            }
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
              ? copy.applicationSettings.acpAdvancedPage.currentAgent(
                  selectedAgent.name,
                  selectedAgent.command,
                )
              : copy.applicationSettings.acpAdvancedPage.unsavedAgent}
          </span>
          <DesktopButton
            type="button"
            size="small"
            variant="primary"
            disabled={saving || !editable}
            onClick={onSave}
          >
            {saving
              ? copy.applicationSettings.acpAdvancedPage.saving
              : copy.applicationSettings.acpAdvancedPage.save}
          </DesktopButton>
        </div>
      </div>
      {debugContent}
    </section>
  );
};
