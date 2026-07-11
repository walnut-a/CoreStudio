import type { Dispatch, SetStateAction, SyntheticEvent } from "react";

import { GenerateComposerActionBar } from "./GenerateComposerActionBar";
import { GenerateComposerSourceSelect } from "./GenerateComposerControls";

import type { GenerationSource } from "../../shared/providerTypes";

interface GenerateDialogComposerActionsSectionProps {
  showAgentSourceSelect: boolean;
  showPromptComposerActions: boolean;
  showPromptTools: boolean;
  promptLibraryOpen: boolean;
  advancedOpen: boolean;
  canSubmit: boolean;
  loading: boolean;
  showGenerationSourceSwitch: boolean;
  agentGenerationSelectable: boolean;
  effectiveGenerationSource: GenerationSource;
  generationSourceLabel: string;
  agentGenerationUnavailableMessage?: string;
  generationSourceResetKey: string | number;
  onSelectGenerationSource: (
    source: GenerationSource,
    event: SyntheticEvent<HTMLElement>,
  ) => void;
  onStopInputEvent: (event: SyntheticEvent<HTMLElement>) => void;
  onCancelGeneration?: (event: SyntheticEvent<HTMLElement>) => void;
  setPromptLibraryOpen: Dispatch<SetStateAction<boolean>>;
  setAdvancedOpen: Dispatch<SetStateAction<boolean>>;
}

export const GenerateDialogComposerActionsSection = ({
  showAgentSourceSelect,
  showPromptComposerActions,
  showPromptTools,
  promptLibraryOpen,
  advancedOpen,
  canSubmit,
  loading,
  showGenerationSourceSwitch,
  agentGenerationSelectable,
  effectiveGenerationSource,
  generationSourceLabel,
  agentGenerationUnavailableMessage,
  generationSourceResetKey,
  onSelectGenerationSource,
  onStopInputEvent,
  onCancelGeneration,
  setPromptLibraryOpen,
  setAdvancedOpen,
}: GenerateDialogComposerActionsSectionProps) => {
  const sourceSelect = (
    <GenerateComposerSourceSelect
      visible={showGenerationSourceSwitch}
      selectable={agentGenerationSelectable}
      effectiveGenerationSource={effectiveGenerationSource}
      label={generationSourceLabel}
      unavailableMessage={agentGenerationUnavailableMessage}
      resetKey={generationSourceResetKey}
      onSelectSource={onSelectGenerationSource}
      onStopInputEvent={onStopInputEvent}
    />
  );

  return (
    <>
      {showAgentSourceSelect ? sourceSelect : null}
      {showPromptComposerActions ? (
        <GenerateComposerActionBar
          showPromptTools={showPromptTools}
          promptLibraryOpen={promptLibraryOpen}
          advancedOpen={advancedOpen}
          canSubmit={canSubmit}
          loading={loading}
          sourceSelect={sourceSelect}
          onTogglePromptLibrary={(event) => {
            onStopInputEvent(event);
            setPromptLibraryOpen((current) => !current);
          }}
          onToggleAdvanced={(event) => {
            onStopInputEvent(event);
            setAdvancedOpen((current) => !current);
          }}
          onCancelGeneration={
            onCancelGeneration
              ? (event) => {
                  onStopInputEvent(event);
                  onCancelGeneration(event);
                }
              : undefined
          }
          onStopInputEvent={onStopInputEvent}
        />
      ) : null}
    </>
  );
};
