import type {
  Dispatch,
  KeyboardEvent,
  Ref,
  SetStateAction,
  SyntheticEvent,
} from "react";

import { GenerateDialogComposerActionsSection } from "./GenerateDialogComposerActionsSection";
import { GenerateDialogComposerContentSection } from "./GenerateDialogComposerContentSection";
import type { InlinePromptEditorHandle } from "./InlinePromptEditor";

import type {
  GenerationPromptPart,
  GenerationPromptReferencePayload,
  GenerationReferencePayload,
} from "../../shared/providerTypes";

interface GenerateDialogComposerSectionProps {
  classNames: readonly string[];
  promptEditorRef: Ref<InlinePromptEditorHandle>;
  promptEditorParts: GenerationPromptPart[];
  promptReferences: GenerationPromptReferencePayload[];
  pendingReference: GenerationReferencePayload | null;
  promptEditorResetKey: number;
  referenceLimitMessage: string | null;
  advancedOpen: boolean;
  canSubmit: boolean;
  onStopInputEvent: (event: SyntheticEvent<HTMLElement>) => void;
  onCommitPendingReference: () => void | Promise<unknown>;
  onPromptChange: (parts: GenerationPromptPart[]) => void;
  onPromptKeyPressCapture: (event: KeyboardEvent<HTMLDivElement>) => void;
  onPromptKeyUpCapture: (event: KeyboardEvent<HTMLDivElement>) => void;
  onPromptKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  setAdvancedOpen: Dispatch<SetStateAction<boolean>>;
}

export const GenerateDialogComposerSection = ({
  classNames,
  promptEditorRef,
  promptEditorParts,
  promptReferences,
  pendingReference,
  promptEditorResetKey,
  referenceLimitMessage,
  advancedOpen,
  canSubmit,
  onStopInputEvent,
  onCommitPendingReference,
  onPromptChange,
  onPromptKeyPressCapture,
  onPromptKeyUpCapture,
  onPromptKeyDown,
  setAdvancedOpen,
}: GenerateDialogComposerSectionProps) => (
  <div className={classNames.join(" ")}>
    <GenerateDialogComposerContentSection
      promptEditorRef={promptEditorRef}
      promptEditorParts={promptEditorParts}
      promptReferences={promptReferences}
      pendingReference={pendingReference}
      promptEditorResetKey={promptEditorResetKey}
      referenceLimitMessage={referenceLimitMessage}
      onStopInputEvent={onStopInputEvent}
      onCommitPendingReference={onCommitPendingReference}
      onPromptChange={onPromptChange}
      onPromptKeyPressCapture={onPromptKeyPressCapture}
      onPromptKeyUpCapture={onPromptKeyUpCapture}
      onPromptKeyDown={onPromptKeyDown}
    />
    <GenerateDialogComposerActionsSection
      advancedOpen={advancedOpen}
      canSubmit={canSubmit}
      onStopInputEvent={onStopInputEvent}
      setAdvancedOpen={setAdvancedOpen}
    />
  </div>
);
