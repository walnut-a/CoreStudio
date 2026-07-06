import type { ReactNode, SyntheticEvent } from "react";

import { DesktopButton } from "./DesktopButton";
import {
  promptLibraryIcon,
  sendIcon,
  settingsSlidersIcon,
} from "./CoreStudioIcons";
import { copy } from "../copy";

interface GenerateComposerActionBarProps {
  showPromptTools: boolean;
  promptLibraryOpen: boolean;
  advancedOpen: boolean;
  canSubmit: boolean;
  sourceSelect?: ReactNode;
  onTogglePromptLibrary: (event: SyntheticEvent<HTMLElement>) => void;
  onToggleAdvanced: (event: SyntheticEvent<HTMLElement>) => void;
  onStopInputEvent: (event: SyntheticEvent<HTMLElement>) => void;
}

export const GenerateComposerActionBar = ({
  showPromptTools,
  promptLibraryOpen,
  advancedOpen,
  canSubmit,
  sourceSelect,
  onTogglePromptLibrary,
  onToggleAdvanced,
  onStopInputEvent,
}: GenerateComposerActionBarProps) => {
  return (
    <div className="generate-composer__controls">
      {showPromptTools ? (
        <>
          <DesktopButton
            type="button"
            className={[
              "generate-composer__icon",
              promptLibraryOpen ? "generate-composer__icon--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-label={copy.generateDialog.promptLibrary}
            title={copy.generateDialog.promptLibrary}
            onMouseDown={onStopInputEvent}
            onClick={onTogglePromptLibrary}
          >
            {promptLibraryIcon}
          </DesktopButton>
          <DesktopButton
            type="button"
            className={[
              "generate-composer__icon",
              advancedOpen ? "generate-composer__icon--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-label={
              advancedOpen
                ? copy.generateDialog.collapseSettings
                : copy.generateDialog.expandSettings
            }
            title={
              advancedOpen
                ? copy.generateDialog.collapseSettings
                : copy.generateDialog.expandSettings
            }
            onMouseDown={onStopInputEvent}
            onClick={onToggleAdvanced}
          >
            {settingsSlidersIcon}
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
