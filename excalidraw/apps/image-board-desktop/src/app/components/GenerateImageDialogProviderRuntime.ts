import {
  createGenerateDialogAdvancedSettingsActions,
  createGenerateDialogAdvancedSettingsRuntime,
} from "./GenerateDialogAdvancedSettingsRuntime";
import { useGenerateProviderSettingsController } from "../useGenerateProviderSettingsController";

import type {
  PublicProviderSettings,
  SaveProviderSettingsInput,
} from "../../shared/desktopBridgeTypes";
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
  open: boolean;
  aspectRatioOptions: AdvancedSettingsRuntimeInput["aspectRatioOptions"];
  updateRequest: AdvancedSettingsActionsInput["updateRequest"];
  onModelSelectionChange?: AdvancedSettingsActionsInput["onModelSelectionChange"];
  onSaveProviderSettings?: (
    input: SaveProviderSettingsInput,
  ) => Promise<PublicProviderSettings | void>;
}

export const useGenerateImageDialogProviderRuntime = ({
  request,
  providerSettings,
  providerContext,
  open,
  aspectRatioOptions,
  updateRequest,
  onModelSelectionChange,
  onSaveProviderSettings,
}: UseGenerateImageDialogProviderRuntimeInput) => {
  const providerSettingsController = useGenerateProviderSettingsController({
    provider: request.provider,
    model: request.model,
    open,
    currentProviderSettings: providerContext.currentProviderSettings,
    currentProviderCustomModels: providerContext.currentProviderCustomModels,
    onSaveProviderSettings,
  });

  const advancedSettingsActions = createGenerateDialogAdvancedSettingsActions({
    providerSettings,
    aspectRatioOptions,
    updateRequest,
    onModelSelectionChange,
    addCustomModel: providerSettingsController.addCustomModel,
    updateCustomModelCapabilities:
      providerSettingsController.updateCustomModelCapabilities,
  });

  return {
    providerSettingsController,
    advancedSettingsActions,
    saveProviderSettings: providerSettingsController.saveProviderSettings,
    addCustomModelToRequest: advancedSettingsActions.addCustomModelToRequest,
  };
};

interface CreateGenerateImageDialogProviderAdvancedSettingsRuntimeInput
  extends Omit<
    AdvancedSettingsRuntimeInput,
    | "advancedSettingsActions"
    | "apiKeyDraft"
    | "canAddCustomModel"
    | "canSaveProviderSettings"
    | "customModelAdapter"
    | "customModelAdvancedOpen"
    | "customModelCapabilities"
    | "customModelDraft"
    | "customModelTemplate"
    | "customModelUsageDescription"
    | "providerSaveFeedback"
    | "saveProviderSettings"
    | "setCustomModelAdvancedOpen"
    | "updateApiKeyDraft"
    | "updateCustomModelAdapter"
    | "updateCustomModelCapabilities"
    | "updateCustomModelDraft"
    | "updateCustomModelTemplate"
  > {
  providerRuntime: ReturnType<typeof useGenerateImageDialogProviderRuntime>;
}

export const createGenerateImageDialogProviderAdvancedSettingsRuntime = ({
  providerRuntime,
  ...runtimeInput
}: CreateGenerateImageDialogProviderAdvancedSettingsRuntimeInput) => {
  const {
    providerSettingsController,
    advancedSettingsActions,
  } = providerRuntime;
  const {
    apiKeyDraft,
    customModelDraft,
    customModelTemplate,
    customModelAdapter,
    customModelCapabilities,
    customModelAdvancedOpen,
    providerSaveFeedback,
    selectedCustomModelUsage,
    canSaveProviderSettings,
    canAddCustomModel,
    setCustomModelAdvancedOpen,
    updateApiKeyDraft,
    updateCustomModelDraft,
    updateCustomModelTemplate,
    updateCustomModelAdapter,
    saveProviderSettings,
  } = providerSettingsController;

  return createGenerateDialogAdvancedSettingsRuntime({
    ...runtimeInput,
    advancedSettingsActions,
    apiKeyDraft,
    canAddCustomModel,
    canSaveProviderSettings,
    customModelAdapter,
    customModelAdvancedOpen,
    customModelCapabilities,
    customModelDraft,
    customModelTemplate,
    customModelUsageDescription: selectedCustomModelUsage.description,
    providerSaveFeedback,
    saveProviderSettings,
    setCustomModelAdvancedOpen,
    updateApiKeyDraft,
    updateCustomModelAdapter,
    updateCustomModelDraft,
    updateCustomModelTemplate,
  });
};
