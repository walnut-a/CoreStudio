import type { Dispatch, SetStateAction, SyntheticEvent } from "react";

import { GenerateComposerActionBar } from "./GenerateComposerActionBar";

interface GenerateDialogComposerActionsSectionProps {
  advancedOpen: boolean;
  canSubmit: boolean;
  modelName: string;
  modelShortName: string;
  onStopInputEvent: (event: SyntheticEvent<HTMLElement>) => void;
  setAdvancedOpen: Dispatch<SetStateAction<boolean>>;
}

export const GenerateDialogComposerActionsSection = ({
  advancedOpen,
  canSubmit,
  modelName,
  modelShortName,
  onStopInputEvent,
  setAdvancedOpen,
}: GenerateDialogComposerActionsSectionProps) => (
  <GenerateComposerActionBar
    showPromptTools
    advancedOpen={advancedOpen}
    canSubmit={canSubmit}
    modelName={modelName}
    modelShortName={modelShortName}
    onToggleAdvanced={(event) => {
      onStopInputEvent(event);
      setAdvancedOpen((current) => !current);
    }}
    onStopInputEvent={onStopInputEvent}
  />
);
