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
  discardPendingReference?: () => void;
  onSubmit: (request: GenerationRequest, keepOpen: boolean) => void;
}

export const submitGenerationRequest = async (
  input: SubmitGenerationRequestInput,
) =>
  executeGenerationSubmitPlan({
    plan: buildGenerationSubmitPlan({
      canSubmit: input.canSubmit,
    }),
    submitPreparedRequest: () => {
      const hadPendingReference = Boolean(
        input.requestRef.current.reference?.enabled,
      );
      const requestWithoutPendingReference = {
        ...input.requestRef.current,
        reference: null,
      };
      const preparedRequest = prepareGenerationSubmitRequest({
        request: requestWithoutPendingReference,
        generationSource: "builtin",
        customModels: input.customModels,
      });
      if (hadPendingReference) {
        input.discardPendingReference?.();
      }
      input.onSubmit(preparedRequest, false);
      input.clearSubmittedPrompt();
    },
  });

export const createGenerationSubmitHandler =
  (input: SubmitGenerationRequestInput) => () => {
    void submitGenerationRequest(input);
  };
