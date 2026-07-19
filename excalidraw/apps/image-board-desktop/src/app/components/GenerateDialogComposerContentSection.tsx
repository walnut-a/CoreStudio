import type { KeyboardEvent, MouseEvent, Ref, SyntheticEvent } from "react";

import { GenerateComposerPromptBody } from "./GenerateComposerBody";
import type { InlinePromptEditorHandle } from "./InlinePromptEditor";
import { copy } from "../copy";

import type {
  GenerationPromptPart,
  GenerationPromptReferencePayload,
  GenerationReferencePayload,
} from "../../shared/providerTypes";

interface GenerateDialogComposerContentSectionProps {
  promptEditorRef: Ref<InlinePromptEditorHandle>;
  promptEditorParts: GenerationPromptPart[];
  promptReferences: GenerationPromptReferencePayload[];
  pendingReference: GenerationReferencePayload | null;
  promptEditorResetKey: number;
  referenceLimitMessage: string | null;
  onStopInputEvent: (event: SyntheticEvent<HTMLElement>) => void;
  onCommitPendingReference: () => void | Promise<unknown>;
  onPromptChange: (parts: GenerationPromptPart[]) => void;
  onPromptKeyPressCapture: (event: KeyboardEvent<HTMLDivElement>) => void;
  onPromptKeyUpCapture: (event: KeyboardEvent<HTMLDivElement>) => void;
  onPromptKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}

export const GenerateDialogComposerContentSection = ({
  promptEditorRef,
  promptEditorParts,
  promptReferences,
  pendingReference,
  promptEditorResetKey,
  referenceLimitMessage,
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
  );
};
