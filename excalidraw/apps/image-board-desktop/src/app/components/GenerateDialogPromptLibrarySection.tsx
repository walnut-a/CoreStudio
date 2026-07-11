import type {
  KeyboardEvent,
  SyntheticEvent,
} from "react";

import { GeneratePromptLibrary } from "./GeneratePromptLibrary";

import type { SavedPrompt } from "../../shared/desktopBridgeTypes";

interface GenerateDialogPromptLibrarySectionProps {
  visible: boolean;
  savedPrompts: readonly SavedPrompt[];
  search: string;
  currentContent: string;
  canSaveCurrent: boolean;
  onSearchChange: (value: string) => void;
  promptLibraryActions: {
    saveCurrentPrompt: () => void;
    applySavedPrompt: (
      prompt: SavedPrompt,
      mode: "replace" | "append",
    ) => void;
  };
  onDeletePrompt?: (id: string) => void | Promise<void>;
  onTextInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onStopInputEvent: (event: SyntheticEvent<HTMLElement>) => void;
}

export const GenerateDialogPromptLibrarySection = ({
  visible,
  savedPrompts,
  search,
  currentContent,
  canSaveCurrent,
  onSearchChange,
  promptLibraryActions,
  onDeletePrompt,
  onTextInputKeyDown,
  onStopInputEvent,
}: GenerateDialogPromptLibrarySectionProps) => {
  if (!visible) {
    return null;
  }

  return (
    <GeneratePromptLibrary
      savedPrompts={savedPrompts}
      search={search}
      currentContent={currentContent}
      canSaveCurrent={canSaveCurrent}
      onSearchChange={onSearchChange}
      onSaveCurrent={(event) => {
        onStopInputEvent(event);
        promptLibraryActions.saveCurrentPrompt();
      }}
      onApplyPrompt={(savedPrompt, mode, event) => {
        onStopInputEvent(event);
        promptLibraryActions.applySavedPrompt(savedPrompt, mode);
      }}
      onDeletePrompt={(savedPrompt, event) => {
        onStopInputEvent(event);
        void onDeletePrompt?.(savedPrompt.id);
      }}
      onTextInputKeyDown={onTextInputKeyDown}
      onStopInputEvent={onStopInputEvent}
    />
  );
};
