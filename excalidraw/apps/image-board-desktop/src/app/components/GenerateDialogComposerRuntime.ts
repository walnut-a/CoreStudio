import { createGenerateComposerEventHandlers } from "../generateComposerEvents";
import { createGenerationSubmitHandler } from "../generateSubmitController";

import type {
  CustomProviderModel,
  GenerationRequest,
} from "../../shared/providerTypes";

interface CreateGenerateDialogComposerRuntimeInput {
  canSubmit: boolean;
  requestRef: { current: GenerationRequest };
  currentProviderCustomModels: readonly CustomProviderModel[];
  clearSubmittedPrompt: () => void;
  onSubmit: (request: GenerationRequest, keepOpen: boolean) => void;
}

export const createGenerateDialogComposerRuntime = ({
  canSubmit,
  requestRef,
  currentProviderCustomModels,
  clearSubmittedPrompt,
  onSubmit,
}: CreateGenerateDialogComposerRuntimeInput) =>
  createGenerateComposerEventHandlers({
    submit: createGenerationSubmitHandler({
      canSubmit,
      requestRef,
      customModels: currentProviderCustomModels,
      clearSubmittedPrompt,
      onSubmit,
    }),
  });
