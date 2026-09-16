import type { ReactNode, SyntheticEvent } from "react";

import { DesktopButton } from "./DesktopButton";
import { sendIcon, settingsSlidersIcon } from "./CoreStudioIcons";
import { copy } from "../copy";

interface GenerateComposerActionBarProps {
  showPromptTools: boolean;
  advancedOpen: boolean;
  canSubmit: boolean;
  modelName: string;
  modelShortName: string;
  sourceSelect?: ReactNode;
  onToggleAdvanced: (event: SyntheticEvent<HTMLElement>) => void;
  onStopInputEvent: (event: SyntheticEvent<HTMLElement>) => void;
}

export const GenerateComposerActionBar = ({
  showPromptTools,
  advancedOpen,
  canSubmit,
  modelName,
  modelShortName,
  sourceSelect,
  onToggleAdvanced,
  onStopInputEvent,
}: GenerateComposerActionBarProps) => {
  const settingsLabel = advancedOpen
    ? copy.generateDialog.collapseSettings
    : copy.generateDialog.expandSettings;

  return (
    <div className="generate-composer__controls">
      {showPromptTools ? (
        <>
          <DesktopButton
            type="button"
            className={[
              "generate-composer__icon",
              "generate-composer__model-button",
              advancedOpen ? "generate-composer__icon--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-label={`${settingsLabel}，当前模型：${modelName}`}
            title={modelName}
            onMouseDown={onStopInputEvent}
            onClick={onToggleAdvanced}
          >
            {settingsSlidersIcon}
            <span className="generate-composer__model-button-label">
              {modelShortName}
            </span>
          </DesktopButton>
          {sourceSelect}
        </>
      ) : null}
      <DesktopButton
        type="submit"
        variant="primary"
        className="generate-composer__action"
        aria-label={copy.generateDialog.generate}
        title={copy.generateDialog.generate}
        disabled={!canSubmit}
        onMouseDown={onStopInputEvent}
        onClick={onStopInputEvent}
      >
        {sendIcon}
      </DesktopButton>
    </div>
  );
};
