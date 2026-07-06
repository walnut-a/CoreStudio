import { createGeneratePromptLibraryActions } from "../generatePromptLibraryActions";

import type {
  KeyboardEvent,
  SyntheticEvent,
} from "react";
import type {
  SavedPrompt,
  SavePromptInput,
} from "../../shared/desktopBridgeTypes";
import type {
  GenerationPromptPart,
  GenerationRequest,
} from "../../shared/providerTypes";
import type { GenerateComposerMode } from "../agent/useGenerateComposerController";
import type { GenerateDialogPromptLibrarySection } from "./GenerateDialogPromptLibrarySection";

type PromptLibrarySectionProps = Parameters<
  typeof GenerateDialogPromptLibrarySection
>[0];

interface CreateGenerateDialogPromptLibraryRuntimeInput {
  effectiveComposerMode: GenerateComposerMode;
  promptLibraryOpen: boolean;
  savedPrompts: readonly SavedPrompt[];
  promptLibrarySearch: string;
  promptLibraryCurrentContent: string;
  getCurrentRequest: () => GenerationRequest;
  updatePrompt: (prompt: string) => void;
  replacePromptParts: (parts: GenerationPromptPart[]) => void;
  onSavePrompt?: (input: SavePromptInput) => void | Promise<void>;
  onUsePrompt?: (id: string) => void | Promise<void>;
  onDeletePrompt?: (id: string) => void | Promise<void>;
  setPromptLibrarySearch: (value: string) => void;
  handleTextInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  stopInputEventPropagation: (event: SyntheticEvent<HTMLElement>) => void;
}

export const createGenerateDialogPromptLibraryRuntime = ({
  effectiveComposerMode,
  promptLibraryOpen,
  savedPrompts,
  promptLibrarySearch,
  promptLibraryCurrentContent,
  getCurrentRequest,
  updatePrompt,
  replacePromptParts,
  onSavePrompt,
  onUsePrompt,
  onDeletePrompt,
  setPromptLibrarySearch,
  handleTextInputKeyDown,
  stopInputEventPropagation,
}: CreateGenerateDialogPromptLibraryRuntimeInput) => {
  const promptLibraryActions = createGeneratePromptLibraryActions({
    getCurrentRequest,
    updatePrompt,
    replacePromptParts,
    onSavePrompt,
    onUsePrompt,
  });

  const promptLibrarySectionProps: PromptLibrarySectionProps = {
    visible: effectiveComposerMode === "direct" && promptLibraryOpen,
    savedPrompts,
    search: promptLibrarySearch,
    currentContent: promptLibraryCurrentContent,
    canSaveCurrent: Boolean(onSavePrompt),
    onSearchChange: setPromptLibrarySearch,
    promptLibraryActions,
    onDeletePrompt,
    onTextInputKeyDown: handleTextInputKeyDown,
    onStopInputEvent: stopInputEventPropagation,
  };

  return {
    promptLibrarySectionProps,
  };
};
