import type { Dispatch, SetStateAction, SyntheticEvent } from "react";

import { GenerateComposerActionBar } from "./GenerateComposerActionBar";

interface GenerateDialogComposerActionsSectionProps {
  advancedOpen: boolean;
  canSubmit: boolean;
  onStopInputEvent: (event: SyntheticEvent<HTMLElement>) => void;
  setAdvancedOpen: Dispatch<SetStateAction<boolean>>;
}

export const GenerateDialogComposerActionsSection = ({
  advancedOpen,
  canSubmit,
  onStopInputEvent,
  setAdvancedOpen,
}: GenerateDialogComposerActionsSectionProps) => (
  <GenerateComposerActionBar
    showPromptTools
    advancedOpen={advancedOpen}
    canSubmit={canSubmit}
    onToggleAdvanced={(event) => {
      onStopInputEvent(event);
      setAdvancedOpen((current) => !current);
    }}
    onStopInputEvent={onStopInputEvent}
  />
);
