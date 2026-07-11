import type {
  CustomProviderModel,
  GenerationRequest,
  ProviderCapabilities,
  ProviderId,
} from "../shared/providerTypes";

type RequestUpdater =
  | GenerationRequest
  | ((current: GenerationRequest) => GenerationRequest);

type CapabilityUpdater =
  | Partial<ProviderCapabilities>
  | ((current: ProviderCapabilities) => ProviderCapabilities);

interface AddCustomModelResult {
  modelId: string;
  customModels: readonly CustomProviderModel[];
}

interface CreateGenerateProviderSettingsActionsInput {
  addCustomModel: () => Promise<AddCustomModelResult | null> | AddCustomModelResult | null;
  updateRequest: (
    updater: RequestUpdater,
    customModels?: readonly CustomProviderModel[],
  ) => GenerationRequest;
  updateCustomModelCapabilities: (patch: CapabilityUpdater) => void;
  onModelSelectionChange?: (selection: {
    provider: ProviderId;
    model: string;
  }) => void;
}

export const createGenerateProviderSettingsActions = ({
  addCustomModel,
  updateRequest,
  updateCustomModelCapabilities,
  onModelSelectionChange,
}: CreateGenerateProviderSettingsActionsInput) => {
  const addCustomModelToRequest = async () => {
    const result = await addCustomModel();
    if (!result) {
      return null;
    }

    const nextRequest = updateRequest(
      (current) => ({
        ...current,
        model: result.modelId,
      }),
      result.customModels,
    );
    onModelSelectionChange?.({
      provider: nextRequest.provider,
      model: nextRequest.model,
    });
    return nextRequest;
  };

  return {
    addCustomModelToRequest,
    changeSupportsReferenceImages: (checked: boolean) => {
      updateCustomModelCapabilities((current) => ({
        ...current,
        supportsReferenceImages: checked,
        maxReferenceImageCount: checked
          ? current.maxReferenceImageCount || 8
          : 0,
      }));
    },
    changeSupportsSeed: (checked: boolean) => {
      updateCustomModelCapabilities({
        supportsSeed: checked,
      });
    },
    changeSizeControlMode: (mode: ProviderCapabilities["sizeControlMode"]) => {
      updateCustomModelCapabilities({
        sizeControlMode: mode,
      });
    },
    changeImageCountMode: (supportsMultiple: boolean) => {
      updateCustomModelCapabilities((current) => ({
        ...current,
        supportsImageCount: supportsMultiple,
        maxImageCount: supportsMultiple ? 4 : 1,
      }));
    },
  };
};
