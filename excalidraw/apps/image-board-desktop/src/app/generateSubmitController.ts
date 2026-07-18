import type {
  CustomProviderModel,
  GenerationRequest,
  GenerationSource,
} from "../shared/providerTypes";
import {
  buildGenerationSubmitPlan,
  executeGenerationSubmitPlan,
  prepareGenerationSubmitRequest,
} from "./generatePromptRequest";

interface SubmitGenerationRequestInput {
  isPromptComposerMode: boolean;
  canSubmit: boolean;
  generationSource: GenerationSource;
  requestRef: {
    current: GenerationRequest;
  };
  customModels: readonly CustomProviderModel[];
  clearSubmittedPrompt: () => void;
  onSubmit: (request: GenerationRequest, keepOpen: boolean) => void;
}

export const submitGenerationRequest = async (
  input: SubmitGenerationRequestInput,
) =>
  executeGenerationSubmitPlan({
    plan: buildGenerationSubmitPlan({
      isPromptComposerMode: input.isPromptComposerMode,
      canSubmit: input.canSubmit,
      generationSource: input.generationSource,
      hasPendingReferenceToCommit: Boolean(
        input.requestRef.current.reference?.enabled,
      ),
    }),
    submitPreparedRequest: () => {
      input.onSubmit(
        prepareGenerationSubmitRequest({
          request: input.requestRef.current,
          generationSource: input.generationSource,
          customModels: input.customModels,
        }),
        false,
      );
      if (input.generationSource === "builtin") {
        input.clearSubmittedPrompt();
      }
    },
  });

export const createGenerationSubmitHandler =
  (input: SubmitGenerationRequestInput) => () => {
    void submitGenerationRequest(input);
  };
