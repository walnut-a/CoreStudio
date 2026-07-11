import { buildPromptTextWithInlineReferences } from "../shared/promptReferences";

import {
  appendSavedPromptParts,
  createSavedPromptTitle,
  getInitialPromptParts,
} from "./generatePromptRequest";

import type {
  DesktopBridgeApi,
  SavedPrompt,
  SavePromptInput,
} from "../shared/desktopBridgeTypes";
import type {
  GenerationPromptPart,
  GenerationRequest,
} from "../shared/providerTypes";

interface CreateGeneratePromptLibraryActionsInput {
  getCurrentRequest: () => GenerationRequest;
  updatePrompt: (prompt: string) => void;
  replacePromptParts: (parts: GenerationPromptPart[]) => void;
  onSavePrompt?: (input: SavePromptInput) => void | Promise<void>;
  onUsePrompt?: (id: string) => void | Promise<void>;
}

interface LoadSavedPromptLibraryStateActionInput {
  bridge: DesktopBridgeApi | null;
  setSavedPrompts: (prompts: SavedPrompt[]) => void;
}

interface SavedPromptLibraryStateActionInput {
  bridge: DesktopBridgeApi;
  setSavedPrompts: (prompts: SavedPrompt[]) => void;
}

interface SavePromptLibraryStateActionInput
  extends SavedPromptLibraryStateActionInput {
  input: SavePromptInput;
}

interface SavedPromptLibraryItemActionInput
  extends SavedPromptLibraryStateActionInput {
  id: string;
}

interface SavedPromptLibraryRendererActionsInput
  extends SavedPromptLibraryStateActionInput {}

export const loadSavedPromptLibraryStateAction = async ({
  bridge,
  setSavedPrompts,
}: LoadSavedPromptLibraryStateActionInput) => {
  if (!bridge) {
    return;
  }

  try {
    setSavedPrompts(await bridge.loadPromptLibrary());
  } catch {
    setSavedPrompts([]);
  }
};

export const runSavedPromptSaveAction = async ({
  bridge,
  input,
  setSavedPrompts,
}: SavePromptLibraryStateActionInput) => {
  setSavedPrompts(await bridge.savePrompt(input));
};

export const runSavedPromptUseAction = async ({
  bridge,
  id,
  setSavedPrompts,
}: SavedPromptLibraryItemActionInput) => {
  setSavedPrompts(await bridge.markSavedPromptUsed(id));
};

export const runSavedPromptDeleteAction = async ({
  bridge,
  id,
  setSavedPrompts,
}: SavedPromptLibraryItemActionInput) => {
  setSavedPrompts(await bridge.deleteSavedPrompt(id));
};

export const createSavedPromptLibraryRendererActions = ({
  bridge,
  setSavedPrompts,
}: SavedPromptLibraryRendererActionsInput) => ({
  savePrompt: (input: SavePromptInput) =>
    runSavedPromptSaveAction({
      bridge,
      input,
      setSavedPrompts,
    }),
  usePrompt: (id: string) =>
    runSavedPromptUseAction({
      bridge,
      id,
      setSavedPrompts,
    }),
  deletePrompt: (id: string) =>
    runSavedPromptDeleteAction({
      bridge,
      id,
      setSavedPrompts,
    }),
});

export const createGeneratePromptLibraryActions = ({
  getCurrentRequest,
  updatePrompt,
  replacePromptParts,
  onSavePrompt,
  onUsePrompt,
}: CreateGeneratePromptLibraryActionsInput) => {
  const saveCurrentPrompt = () => {
    const content = buildPromptTextWithInlineReferences(
      getCurrentRequest(),
    ).trim();
    if (!content || !onSavePrompt) {
      return false;
    }

    void onSavePrompt({
      title: createSavedPromptTitle(content),
      content,
      tags: [],
    });
    return true;
  };

  const applySavedPrompt = (
    prompt: SavedPrompt,
    mode: "replace" | "append",
  ) => {
    if (mode === "replace") {
      updatePrompt(prompt.content);
      void onUsePrompt?.(prompt.id);
      return;
    }

    const currentRequest = getCurrentRequest();
    const currentParts = currentRequest.promptParts?.length
      ? currentRequest.promptParts
      : getInitialPromptParts(currentRequest);
    replacePromptParts(appendSavedPromptParts(currentParts, prompt.content));
    void onUsePrompt?.(prompt.id);
  };

  return {
    saveCurrentPrompt,
    applySavedPrompt,
  };
};
