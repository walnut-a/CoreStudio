import type {
  KeyboardEvent,
  MouseEvent,
  Ref,
  SyntheticEvent,
} from "react";

import {
  GenerateComposerAgentContext,
  GenerateComposerPromptBody,
} from "./GenerateComposerBody";
import { GenerateComposerModeBar } from "./GenerateComposerControls";
import type { InlinePromptEditorHandle } from "./InlinePromptEditor";
import { copy } from "../copy";

import type { GenerateComposerMode } from "../agent/useGenerateComposerController";
import type {
  GenerationPromptPart,
  GenerationPromptReferencePayload,
  GenerationReferenceItemPayload,
  GenerationReferencePayload,
} from "../../shared/providerTypes";

interface GenerateDialogComposerContentSectionProps {
  showComposerTaskBar: boolean;
  showComposerModeSwitch: boolean;
  showComposerModeIndicator: boolean;
  composerModeOptions: readonly GenerateComposerMode[];
  effectiveComposerMode: GenerateComposerMode;
  isAgentOperationMode: boolean;
  agentSelectionItems: readonly GenerationReferenceItemPayload[];
  promptEditorRef: Ref<InlinePromptEditorHandle>;
  promptEditorParts: GenerationPromptPart[];
  promptReferences: GenerationPromptReferencePayload[];
  pendingReference: GenerationReferencePayload | null;
  promptEditorResetKey: number;
  referenceLimitMessage: string | null;
  onSelectComposerMode: (
    mode: GenerateComposerMode,
    event: SyntheticEvent<HTMLElement>,
  ) => void;
  onStopInputEvent: (event: SyntheticEvent<HTMLElement>) => void;
  onCommitPendingReference: () => void | Promise<unknown>;
  onPromptChange: (parts: GenerationPromptPart[]) => void;
  onPromptKeyPressCapture: (event: KeyboardEvent<HTMLDivElement>) => void;
  onPromptKeyUpCapture: (event: KeyboardEvent<HTMLDivElement>) => void;
  onPromptKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}

export const GenerateDialogComposerContentSection = ({
  showComposerTaskBar,
  showComposerModeSwitch,
  showComposerModeIndicator,
  composerModeOptions,
  effectiveComposerMode,
  isAgentOperationMode,
  agentSelectionItems,
  promptEditorRef,
  promptEditorParts,
  promptReferences,
  pendingReference,
  promptEditorResetKey,
  referenceLimitMessage,
  onSelectComposerMode,
  onStopInputEvent,
  onCommitPendingReference,
  onPromptChange,
  onPromptKeyPressCapture,
  onPromptKeyUpCapture,
  onPromptKeyDown,
}: GenerateDialogComposerContentSectionProps) => {
  const commitPendingReference = () => {
    void onCommitPendingReference();
  };

  const handlePromptMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    onStopInputEvent(event);
    commitPendingReference();
  };

  return (
    <>
      {showComposerTaskBar ? (
        <GenerateComposerModeBar
          showModeSwitch={showComposerModeSwitch}
          showModeIndicator={showComposerModeIndicator}
          composerModeOptions={composerModeOptions}
          effectiveComposerMode={effectiveComposerMode}
          onSelectMode={onSelectComposerMode}
          onStopInputEvent={onStopInputEvent}
        />
      ) : null}
      {isAgentOperationMode ? (
        <GenerateComposerAgentContext items={agentSelectionItems} />
      ) : (
        <GenerateComposerPromptBody
          promptEditorRef={promptEditorRef}
          ariaLabel={copy.generateDialog.prompt}
          placeholder={copy.generateDialog.promptPlaceholder}
          parts={promptEditorParts}
          references={promptReferences}
          pendingReference={pendingReference}
          resetKey={promptEditorResetKey}
          referenceLimitMessage={referenceLimitMessage}
          onChange={onPromptChange}
          onFocusIntent={commitPendingReference}
          onMouseDown={handlePromptMouseDown}
          onKeyPressCapture={onPromptKeyPressCapture}
          onKeyUpCapture={onPromptKeyUpCapture}
          onKeyDown={onPromptKeyDown}
        />
      )}
    </>
  );
};
