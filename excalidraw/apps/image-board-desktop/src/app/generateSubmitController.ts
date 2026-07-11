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
  canCommitPendingReference: boolean;
  commitPendingReference: () => Promise<void> | void;
  clearSubmittedPrompt: () => void;
  onSubmit: (request: GenerationRequest, keepOpen: boolean) => void;
}

export const shouldCommitGenerationPendingReference = ({
  request,
  canCommitPendingReference,
}: {
  request: GenerationRequest;
  canCommitPendingReference: boolean;
}) => Boolean(canCommitPendingReference && request.reference?.enabled);

export const submitGenerationRequest = async (
  input: SubmitGenerationRequestInput,
) =>
  executeGenerationSubmitPlan({
    plan: buildGenerationSubmitPlan({
      isPromptComposerMode: input.isPromptComposerMode,
      canSubmit: input.canSubmit,
      generationSource: input.generationSource,
      hasPendingReferenceToCommit: shouldCommitGenerationPendingReference({
        request: input.requestRef.current,
        canCommitPendingReference: input.canCommitPendingReference,
      }),
    }),
    commitPendingReference: async () => {
      await input.commitPendingReference();
    },
    submitPreparedRequest: () => {
      input.onSubmit(
        prepareGenerationSubmitRequest({
          request: input.requestRef.current,
          generationSource: input.generationSource,
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
