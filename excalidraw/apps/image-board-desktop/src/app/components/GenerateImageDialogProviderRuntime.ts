import {
  createGenerateDialogAdvancedSettingsActions,
  createGenerateDialogAdvancedSettingsRuntime,
} from "./GenerateDialogAdvancedSettingsRuntime";
import type { PublicProviderSettings } from "../../shared/desktopBridgeTypes";
import type {
  CustomProviderModel,
  GenerationRequest,
  ProviderId,
} from "../../shared/providerTypes";

type AdvancedSettingsRuntimeInput = Parameters<
  typeof createGenerateDialogAdvancedSettingsRuntime
>[0];
type AdvancedSettingsActionsInput = Parameters<
  typeof createGenerateDialogAdvancedSettingsActions
>[0];

interface GenerateImageDialogProviderContext {
  currentProviderSettings: PublicProviderSettings[ProviderId] | undefined;
  currentProviderCustomModels: readonly CustomProviderModel[];
  isConfigured: boolean;
}

export const getGenerateImageDialogProviderContext = ({
  provider,
  providerSettings,
}: {
  provider: ProviderId;
  providerSettings: PublicProviderSettings | null;
}): GenerateImageDialogProviderContext => {
  const currentProviderSettings = providerSettings?.[provider];
  return {
    currentProviderSettings,
    currentProviderCustomModels: currentProviderSettings?.customModels ?? [],
    isConfigured: currentProviderSettings?.isConfigured ?? false,
  };
};

interface UseGenerateImageDialogProviderRuntimeInput {
  request: GenerationRequest;
  providerSettings: PublicProviderSettings | null;
  providerContext: GenerateImageDialogProviderContext;
  aspectRatioOptions: AdvancedSettingsRuntimeInput["aspectRatioOptions"];
  updateRequest: AdvancedSettingsActionsInput["updateRequest"];
  onModelSelectionChange?: AdvancedSettingsActionsInput["onModelSelectionChange"];
}

export const useGenerateImageDialogProviderRuntime = ({
  request,
  providerSettings,
  providerContext,
  aspectRatioOptions,
  updateRequest,
  onModelSelectionChange,
}: UseGenerateImageDialogProviderRuntimeInput) => {
  const advancedSettingsActions = createGenerateDialogAdvancedSettingsActions({
    providerSettings,
    aspectRatioOptions,
    updateRequest,
    onModelSelectionChange,
  });

  return {
    advancedSettingsActions,
  };
};

interface CreateGenerateImageDialogProviderAdvancedSettingsRuntimeInput
  extends Omit<AdvancedSettingsRuntimeInput, "advancedSettingsActions"> {
  providerRuntime: ReturnType<typeof useGenerateImageDialogProviderRuntime>;
}

export const createGenerateImageDialogProviderAdvancedSettingsRuntime = ({
  providerRuntime,
  ...runtimeInput
}: CreateGenerateImageDialogProviderAdvancedSettingsRuntimeInput) => {
  const { advancedSettingsActions } = providerRuntime;

  return createGenerateDialogAdvancedSettingsRuntime({
    ...runtimeInput,
    advancedSettingsActions,
  });
};
