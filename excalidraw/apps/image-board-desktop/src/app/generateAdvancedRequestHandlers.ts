import {
  ASPECT_RATIO_AUTO_ID,
  getDefaultModel,
} from "../shared/providerCatalog";

import type { PublicProviderSettings } from "../shared/desktopBridgeTypes";
import type {
  AspectRatioOption,
  CustomProviderModel,
  GenerationRequest,
  ProviderId,
} from "../shared/providerTypes";

type RequestUpdater =
  | GenerationRequest
  | ((current: GenerationRequest) => GenerationRequest);

interface CreateGenerateAdvancedRequestHandlersInput {
  providerSettings: PublicProviderSettings | null;
  aspectRatioOptions: readonly AspectRatioOption[];
  updateRequest: (
    updater: RequestUpdater,
    customModels?: readonly CustomProviderModel[],
  ) => GenerationRequest;
  onModelSelectionChange?: (selection: {
    provider: ProviderId;
    model: string;
  }) => void;
}

export const createGenerateAdvancedRequestHandlers = ({
  providerSettings,
  aspectRatioOptions,
  updateRequest,
  onModelSelectionChange,
}: CreateGenerateAdvancedRequestHandlersInput) => {
  const notifyModelSelection = (request: GenerationRequest) => {
    onModelSelectionChange?.({
      provider: request.provider,
      model: request.model,
    });
  };

  const changeProvider = (provider: ProviderId) => {
    const nextCustomModels = providerSettings?.[provider]?.customModels ?? [];
    const nextRequest = updateRequest(
      (current) => ({
        ...current,
        provider,
        model:
          providerSettings?.[provider]?.defaultModel || getDefaultModel(provider),
      }),
      nextCustomModels,
    );
    notifyModelSelection(nextRequest);
  };

  const changeModel = (model: string) => {
    const nextRequest = updateRequest((current) => ({
      ...current,
      model,
    }));
    notifyModelSelection(nextRequest);
  };

  const changeAspectRatio = (aspectRatio: string) => {
    if (aspectRatio === ASPECT_RATIO_AUTO_ID) {
      updateRequest((current) => ({
        ...current,
        aspectRatio: null,
      }));
      return;
    }

    const option = aspectRatioOptions.find((item) => item.id === aspectRatio);
    if (!option) {
      return;
    }

    updateRequest((current) => ({
      ...current,
      aspectRatio: option.id,
      width: option.width,
      height: option.height,
    }));
  };

  return {
    changeProvider,
    changeModel,
    changeNegativePrompt: (negativePrompt: string) => {
      updateRequest((current) => ({
        ...current,
        negativePrompt,
      }));
    },
    changeAspectRatio,
    changeWidth: (width: number) => {
      updateRequest((current) => ({
        ...current,
        width,
      }));
    },
    changeHeight: (height: number) => {
      updateRequest((current) => ({
        ...current,
        height,
      }));
    },
    changeSeed: (seed: number | null) => {
      updateRequest((current) => ({
        ...current,
        seed,
      }));
    },
    changeImageCount: (imageCount: number) => {
      updateRequest((current) => ({
        ...current,
        imageCount,
      }));
    },
  };
};
