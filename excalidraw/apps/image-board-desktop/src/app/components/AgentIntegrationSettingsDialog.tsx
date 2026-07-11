import type {
  AcpAgentConfig,
  AcpAgentPresetId,
  AcpRunSummary,
} from "../../shared/acpTypes";
import type { AgentIntegrationViewModel } from "../agent/agentIntegrationViewModel";
import type { AcpAgentSettingsDraft } from "../agent/useAcpAgentSettingsController";
import { AcpAgentSettingsPanel } from "./AcpAgentSettingsPanel";
import { AcpDebugSettingsPanel } from "./AcpDebugSettingsPanel";
import { AgentIntegrationSettingsSections } from "./AgentIntegrationSettingsSections";
import { DesktopButton } from "./DesktopButton";

export interface AgentIntegrationSettingsDialogProps {
  open: boolean;
  integration: AgentIntegrationViewModel;
  canToggleIntegration: boolean;
  currentProjectPath?: string | null;
  bridgeProjectPath?: string | null;
  acpAgentDraft: AcpAgentSettingsDraft;
  selectedAcpAgent: AcpAgentConfig | null;
  acpAgentEditable: boolean;
  acpAgentSaving: boolean;
  acpDebugOpen: boolean;
  acpRunSummaries: readonly AcpRunSummary[];
  acpRunSummariesLoading: boolean;
  acpRunSummariesError: string | null;
  canReadAcpRunLogs: boolean;
  onClose: () => void;
  onIntegrationEnabledChange: (enabled: boolean) => void;
  onCopyBoardUrl: () => void;
  onOpenBoardUrl: () => void;
  onCopyCliEnvironment: () => void;
  onAcpAgentEnabledChange: (enabled: boolean) => void;
  onAcpAgentPresetChange: (presetId: AcpAgentPresetId) => void;
  onAcpAgentCommandChange: (command: string) => void;
  onAcpAgentArgsChange: (args: string) => void;
  onAcpAgentCwdChange: (cwd: string) => void;
  onAcpTaskInstructionChange: (template: string) => void;
  onSaveAcpAgentSettings: () => void;
  onAcpDebugOpenChange: (open: boolean) => void;
  onRefreshAcpRunSummaries: () => void;
  onOpenAcpRunLog: (taskId: string) => void;
}

const getAcpAgentDefaultCwd = ({
  currentProjectPath,
  bridgeProjectPath,
}: Pick<
  AgentIntegrationSettingsDialogProps,
  "currentProjectPath" | "bridgeProjectPath"
>) => currentProjectPath ?? bridgeProjectPath ?? "当前项目目录";

export const AgentIntegrationSettingsDialog = ({
  open,
  integration,
  canToggleIntegration,
  currentProjectPath,
  bridgeProjectPath,
  acpAgentDraft,
  selectedAcpAgent,
  acpAgentEditable,
  acpAgentSaving,
  acpDebugOpen,
  acpRunSummaries,
  acpRunSummariesLoading,
  acpRunSummariesError,
  canReadAcpRunLogs,
  onClose,
  onIntegrationEnabledChange,
  onCopyBoardUrl,
  onOpenBoardUrl,
  onCopyCliEnvironment,
  onAcpAgentEnabledChange,
  onAcpAgentPresetChange,
  onAcpAgentCommandChange,
  onAcpAgentArgsChange,
  onAcpAgentCwdChange,
  onAcpTaskInstructionChange,
  onSaveAcpAgentSettings,
  onAcpDebugOpenChange,
  onRefreshAcpRunSummaries,
  onOpenAcpRunLog,
}: AgentIntegrationSettingsDialogProps) => {
  if (!open) {
    return null;
  }

  const acpAgentDefaultCwd = getAcpAgentDefaultCwd({
    currentProjectPath,
    bridgeProjectPath,
  });

  return (
    <div className="dialog-backdrop">
      <div
        className="dialog-card dialog-card--settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-settings-title"
      >
        <div className="dialog-card__header">
          <div>
            <span className="dialog-card__eyebrow">设置</span>
            <h2 id="app-settings-title">应用设置</h2>
          </div>
          <DesktopButton
            type="button"
            className="dialog-card__close"
            onClick={onClose}
          >
            关闭
          </DesktopButton>
        </div>

        <AgentIntegrationSettingsSections
          integration={integration}
          canToggleIntegration={canToggleIntegration}
          onIntegrationEnabledChange={onIntegrationEnabledChange}
          onCopyBoardUrl={onCopyBoardUrl}
          onOpenBoardUrl={onOpenBoardUrl}
          onCopyCliEnvironment={onCopyCliEnvironment}
        />

        <AcpAgentSettingsPanel
          draft={acpAgentDraft}
          selectedAgent={selectedAcpAgent}
          editable={acpAgentEditable}
          saving={acpAgentSaving}
          defaultCwd={acpAgentDefaultCwd}
          onEnabledChange={onAcpAgentEnabledChange}
          onPresetChange={onAcpAgentPresetChange}
          onCommandChange={onAcpAgentCommandChange}
          onArgsChange={onAcpAgentArgsChange}
          onCwdChange={onAcpAgentCwdChange}
          onTaskInstructionChange={onAcpTaskInstructionChange}
          onSave={onSaveAcpAgentSettings}
        />

        <AcpDebugSettingsPanel
          open={acpDebugOpen}
          summaries={acpRunSummaries}
          loading={acpRunSummariesLoading}
          error={acpRunSummariesError}
          canReadRunLogs={canReadAcpRunLogs}
          onOpenChange={onAcpDebugOpenChange}
          onRefresh={onRefreshAcpRunSummaries}
          onOpenRunLog={onOpenAcpRunLog}
        />
      </div>
    </div>
  );
};
