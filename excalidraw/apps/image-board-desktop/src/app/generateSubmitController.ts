import type {
  CustomProviderModel,
  GenerationRequest,
} from "../shared/providerTypes";
import {
  buildGenerationSubmitPlan,
  executeGenerationSubmitPlan,
  prepareGenerationSubmitRequest,
} from "./generatePromptRequest";

interface SubmitGenerationRequestInput {
  canSubmit: boolean;
  requestRef: { current: GenerationRequest };
  customModels: readonly CustomProviderModel[];
  clearSubmittedPrompt: () => void;
  onSubmit: (request: GenerationRequest, keepOpen: boolean) => void;
}

export const submitGenerationRequest = async (
  input: SubmitGenerationRequestInput,
) =>
  executeGenerationSubmitPlan({
    plan: buildGenerationSubmitPlan({
      canSubmit: input.canSubmit,
      hasPendingReferenceToCommit: Boolean(
        input.requestRef.current.reference?.enabled,
      ),
    }),
    submitPreparedRequest: () => {
      input.onSubmit(
        prepareGenerationSubmitRequest({
          request: input.requestRef.current,
          generationSource: "builtin",
          customModels: input.customModels,
        }),
        false,
      );
      input.clearSubmittedPrompt();
    },
  });

export const createGenerationSubmitHandler =
  (input: SubmitGenerationRequestInput) => () => {
    void submitGenerationRequest(input);
  };
