import type { KeyboardEvent, MouseEvent, Ref } from "react";

import {
  InlinePromptEditor,
  type InlinePromptEditorHandle,
} from "./InlinePromptEditor";

import type {
  GenerationPromptPart,
  GenerationPromptReferencePayload,
  GenerationReferencePayload,
} from "../../shared/providerTypes";

interface GenerateComposerPromptBodyProps {
  promptEditorRef: Ref<InlinePromptEditorHandle>;
  ariaLabel: string;
  placeholder: string;
  parts: GenerationPromptPart[];
  references: GenerationPromptReferencePayload[];
  pendingReference: GenerationReferencePayload | null;
  resetKey: number;
  referenceLimitMessage: string | null;
  onChange: (parts: GenerationPromptPart[]) => void;
  onFocusIntent: () => void;
  onMouseDown: (event: MouseEvent<HTMLDivElement>) => void;
  onKeyPressCapture: (event: KeyboardEvent<HTMLDivElement>) => void;
  onKeyUpCapture: (event: KeyboardEvent<HTMLDivElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}

export const GenerateComposerPromptBody = ({
  promptEditorRef,
  ariaLabel,
  placeholder,
  parts,
  references,
  pendingReference,
  resetKey,
  referenceLimitMessage,
  onChange,
  onFocusIntent,
  onMouseDown,
  onKeyPressCapture,
  onKeyUpCapture,
  onKeyDown,
}: GenerateComposerPromptBodyProps) => (
  <>
    <div className="generate-composer__field">
      <InlinePromptEditor
        ref={promptEditorRef}
        ariaLabel={ariaLabel}
        placeholder={placeholder}
        parts={parts}
        references={references}
        pendingReference={pendingReference}
        resetKey={resetKey}
        onChange={onChange}
        onFocusIntent={onFocusIntent}
        onMouseDown={onMouseDown}
        onKeyPressCapture={onKeyPressCapture}
        onKeyUpCapture={onKeyUpCapture}
        onKeyDown={onKeyDown}
      />
    </div>
    {referenceLimitMessage ? (
      <div className="generate-composer__notice" role="status">
        {referenceLimitMessage}
      </div>
    ) : null}
  </>
);
