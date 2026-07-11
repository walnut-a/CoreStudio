import type {
  KeyboardEvent,
  SyntheticEvent,
} from "react";

import { copy } from "../copy";
import { DesktopButton } from "./DesktopButton";

import type { SavedPrompt } from "../../shared/desktopBridgeTypes";

interface GeneratePromptLibraryProps {
  savedPrompts: readonly SavedPrompt[];
  search: string;
  currentContent: string;
  canSaveCurrent: boolean;
  onSearchChange: (value: string) => void;
  onSaveCurrent: (event: SyntheticEvent<HTMLElement>) => void;
  onApplyPrompt: (
    prompt: SavedPrompt,
    mode: "replace" | "append",
    event: SyntheticEvent<HTMLElement>,
  ) => void;
  onDeletePrompt?: (
    prompt: SavedPrompt,
    event: SyntheticEvent<HTMLElement>,
  ) => void;
  onTextInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onStopInputEvent: (event: SyntheticEvent<HTMLElement>) => void;
}

const getVisibleSavedPrompts = (
  savedPrompts: readonly SavedPrompt[],
  search: string,
) => {
  const normalizedSearch = search.trim().toLowerCase();
  if (!normalizedSearch) {
    return savedPrompts;
  }

  return savedPrompts.filter((prompt) =>
    [prompt.title, prompt.content, ...prompt.tags]
      .join("\n")
      .toLowerCase()
      .includes(normalizedSearch),
  );
};

export const GeneratePromptLibrary = ({
  savedPrompts,
  search,
  currentContent,
  canSaveCurrent,
  onSearchChange,
  onSaveCurrent,
  onApplyPrompt,
  onDeletePrompt,
  onTextInputKeyDown,
  onStopInputEvent,
}: GeneratePromptLibraryProps) => {
  const visibleSavedPrompts = getVisibleSavedPrompts(savedPrompts, search);

  return (
    <div className="generate-prompt-library">
      <div className="generate-prompt-library__header">
        <strong>{copy.generateDialog.promptLibrary}</strong>
        <DesktopButton
          type="button"
          className="generate-prompt-library__save"
          disabled={!currentContent || !canSaveCurrent}
          onMouseDown={onStopInputEvent}
          onClick={onSaveCurrent}
        >
          {copy.generateDialog.promptLibrarySaveCurrent}
        </DesktopButton>
      </div>
      <input
        className="generate-prompt-library__search"
        value={search}
        placeholder={copy.generateDialog.promptLibrarySearch}
        onMouseDown={onStopInputEvent}
        onKeyDown={onTextInputKeyDown}
        onChange={(event) => {
          onSearchChange(event.target.value);
        }}
      />
      <div className="generate-prompt-library__list">
        {visibleSavedPrompts.length ? (
          visibleSavedPrompts.map((savedPrompt) => (
            <article
              key={savedPrompt.id}
              className="generate-prompt-library__item"
            >
              <div className="generate-prompt-library__item-main">
                <strong>{savedPrompt.title}</strong>
                <p>{savedPrompt.content}</p>
                {savedPrompt.tags.length ? (
                  <span>{savedPrompt.tags.join(" / ")}</span>
                ) : null}
              </div>
              <div className="generate-prompt-library__item-actions">
                <button
                  type="button"
                  aria-label={`${copy.generateDialog.promptLibraryReplace}：${savedPrompt.title}`}
                  onMouseDown={onStopInputEvent}
                  onClick={(event) => {
                    onApplyPrompt(savedPrompt, "replace", event);
                  }}
                >
                  {copy.generateDialog.promptLibraryReplace}
                </button>
                <button
                  type="button"
                  aria-label={`${copy.generateDialog.promptLibraryAppend}：${savedPrompt.title}`}
                  onMouseDown={onStopInputEvent}
                  onClick={(event) => {
                    onApplyPrompt(savedPrompt, "append", event);
                  }}
                >
                  {copy.generateDialog.promptLibraryAppend}
                </button>
                <button
                  type="button"
                  aria-label={`${copy.generateDialog.promptLibraryDelete}：${savedPrompt.title}`}
                  onMouseDown={onStopInputEvent}
                  onClick={(event) => {
                    onDeletePrompt?.(savedPrompt, event);
                  }}
                >
                  {copy.generateDialog.promptLibraryDelete}
                </button>
              </div>
            </article>
          ))
        ) : (
          <p className="generate-prompt-library__empty">
            {savedPrompts.length
              ? copy.generateDialog.promptLibraryNoResults
              : copy.generateDialog.promptLibraryEmpty}
          </p>
        )}
      </div>
    </div>
  );
};
