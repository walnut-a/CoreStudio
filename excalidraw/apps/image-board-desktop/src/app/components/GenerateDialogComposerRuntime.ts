import type { SyntheticEvent } from "react";

import {
  createGenerateComposerModeSelectionHandlers,
} from "../agent/generateComposerModeActions";
import type {
  GenerateComposerMode,
  GenerateComposerModeSwitchVariant,
} from "../agent/useGenerateComposerController";
import {
  createGenerateComposerEventHandlers,
} from "../generateComposerEvents";
import { createGenerationSubmitHandler } from "../generateSubmitController";

import type {
  CustomProviderModel,
  GenerationRequest,
  GenerationSource,
} from "../../shared/providerTypes";

interface CreateGenerateDialogComposerRuntimeInput {
  isPromptComposerMode: boolean;
  canSubmit: boolean;
  effectiveGenerationSource: GenerationSource;
  requestRef: { current: GenerationRequest };
  currentProviderCustomModels: readonly CustomProviderModel[];
  canCommitPendingReference: boolean;
  commitPendingReference: () => Promise<unknown> | unknown;
  clearSubmittedPrompt: () => void;
  onSubmit: (request: GenerationRequest, keepOpen: boolean) => void;
  saveProviderSettings: () => unknown;
  addCustomModelToRequest: () => unknown;
  modeSwitchVariant: GenerateComposerModeSwitchVariant;
  agentGenerationSelectable: boolean;
  setComposerMode: (mode: GenerateComposerMode) => void;
  setGenerationSource: (source: GenerationSource) => void;
  updateRequest: (
    updater: (current: GenerationRequest) => GenerationRequest,
  ) => GenerationRequest;
}

export const createGenerateDialogComposerRuntime = ({
  isPromptComposerMode,
  canSubmit,
  effectiveGenerationSource,
  requestRef,
  currentProviderCustomModels,
  canCommitPendingReference,
  commitPendingReference,
  clearSubmittedPrompt,
  onSubmit,
  saveProviderSettings,
  addCustomModelToRequest,
  modeSwitchVariant,
  agentGenerationSelectable,
  setComposerMode,
  setGenerationSource,
  updateRequest,
}: CreateGenerateDialogComposerRuntimeInput) => {
  const submitRequest = createGenerationSubmitHandler({
    isPromptComposerMode,
    canSubmit,
    generationSource: effectiveGenerationSource,
    requestRef,
    customModels: currentProviderCustomModels,
    canCommitPendingReference,
    commitPendingReference: async () => {
      await commitPendingReference();
    },
    clearSubmittedPrompt,
    onSubmit,
  });

  const eventHandlers = createGenerateComposerEventHandlers({
    submit: submitRequest,
    saveProviderSettings,
    addCustomModel: addCustomModelToRequest,
  });

  const modeSelectionHandlers =
    createGenerateComposerModeSelectionHandlers<SyntheticEvent<HTMLElement>>({
      modeSwitchVariant,
      agentGenerationSelectable,
      stopInputEventPropagation: eventHandlers.stopInputEventPropagation,
      setComposerMode,
      setGenerationSource,
      updateRequest,
    });

  return {
    ...eventHandlers,
    ...modeSelectionHandlers,
  };
};
