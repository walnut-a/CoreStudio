import type {
  KeyboardEvent,
  MouseEvent,
  Ref,
} from "react";

import {
  InlinePromptEditor,
  type InlinePromptEditorHandle,
} from "./InlinePromptEditor";

import type {
  GenerationPromptPart,
  GenerationPromptReferencePayload,
  GenerationReferenceItemPayload,
  GenerationReferencePayload,
} from "../../shared/providerTypes";

interface GenerateComposerAgentContextProps {
  items: readonly GenerationReferenceItemPayload[];
}

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

export const GenerateComposerAgentContext = ({
  items,
}: GenerateComposerAgentContextProps) => (
  <section
    className="generate-composer__agent-context"
    role="region"
    aria-label="Agent 上下文"
  >
    <div className="generate-composer__agent-summary">
      <div
        className="generate-composer__agent-items"
        aria-label="当前选区"
        aria-live="polite"
      >
        {items.length ? (
          items.map((item) => (
            <span
              key={item.id}
              className={[
                "generate-composer__agent-item",
                `generate-composer__agent-item--${item.kind}`,
              ].join(" ")}
              title={item.label}
            >
              {item.kind === "image" && item.thumbnailDataUrl ? (
                <span className="generate-composer__agent-thumbnail">
                  <img
                    src={item.thumbnailDataUrl}
                    alt={`${item.label} ${item.index} 缩略图`}
                    draggable={false}
                  />
                </span>
              ) : null}
              <span className="generate-composer__agent-index">
                {item.index}
              </span>
              <span className="generate-composer__agent-label">
                {item.label}
              </span>
            </span>
          ))
        ) : (
          <span className="generate-composer__agent-empty">
            暂无选中元素
          </span>
        )}
      </div>
    </div>
  </section>
);

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
