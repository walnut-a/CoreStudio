import type {
  ComponentProps,
  SyntheticEvent,
} from "react";

import type { GenerateDialogAdvancedSettings } from "./GenerateDialogAdvancedSettings";

type GenerateDialogAdvancedSettingsProps = ComponentProps<
  typeof GenerateDialogAdvancedSettings
>;
type AdvancedFieldsProps =
  GenerateDialogAdvancedSettingsProps["advancedFieldsProps"];
type ProviderSettingsProps =
  GenerateDialogAdvancedSettingsProps["providerSettingsProps"];

type BooleanStateToggle = (updater: (current: boolean) => boolean) => void;

interface CreateGenerateDialogAdvancedSettingsPropsInput {
  request: AdvancedFieldsProps["request"];
  providerModels: AdvancedFieldsProps["providerModels"];
  visibleFields: AdvancedFieldsProps["visibleFields"];
  selectedAspectRatio: AdvancedFieldsProps["selectedAspectRatio"];
  aspectRatioOptions: AdvancedFieldsProps["aspectRatioOptions"];
  advancedRequestHandlers: {
    changeProvider: AdvancedFieldsProps["onProviderChange"];
    changeModel: AdvancedFieldsProps["onModelChange"];
    changeNegativePrompt: AdvancedFieldsProps["onNegativePromptChange"];
    changeAspectRatio: AdvancedFieldsProps["onAspectRatioChange"];
    changeWidth: AdvancedFieldsProps["onWidthChange"];
    changeHeight: AdvancedFieldsProps["onHeightChange"];
    changeSeed: AdvancedFieldsProps["onSeedChange"];
    changeImageCount: AdvancedFieldsProps["onImageCountChange"];
  };
  handleTextInputKeyDown: AdvancedFieldsProps["onTextInputKeyDown"];
  apiSettingsOpen: ProviderSettingsProps["open"];
  providerLabel: ProviderSettingsProps["providerLabel"];
  currentProviderStatus: ProviderSettingsProps["providerStatus"];
  currentModelLabel: ProviderSettingsProps["modelLabel"];
  isProviderConfigured: ProviderSettingsProps["isProviderConfigured"];
  apiKeyInputRef: ProviderSettingsProps["apiKeyInputRef"];
  apiKeyDraft: ProviderSettingsProps["apiKeyDraft"];
  savingProviderSettings: ProviderSettingsProps["savingProviderSettings"];
  canSaveProviderSettings: ProviderSettingsProps["canSaveProviderSettings"];
  customModelDraft: ProviderSettingsProps["customModelDraft"];
  customModelTemplate: ProviderSettingsProps["customModelTemplate"];
  customModelUsageDescription: ProviderSettingsProps["customModelUsageDescription"];
  customModelAdvancedOpen: ProviderSettingsProps["customModelAdvancedOpen"];
  customModelCapabilities: ProviderSettingsProps["customModelCapabilities"];
  customModelAdapter: ProviderSettingsProps["customModelAdapter"];
  canAddCustomModel: ProviderSettingsProps["canAddCustomModel"];
  providerSaveFeedback: ProviderSettingsProps["providerSaveFeedback"];
  stopInputEventPropagation: ProviderSettingsProps["onStopInputEvent"];
  setApiSettingsOpen: BooleanStateToggle;
  updateApiKeyDraft: ProviderSettingsProps["onApiKeyChange"];
  handleApiKeyKeyDown: ProviderSettingsProps["onApiKeyKeyDown"];
  saveProviderSettings: () => void | Promise<void>;
  updateCustomModelDraft: ProviderSettingsProps["onCustomModelDraftChange"];
  handleCustomModelKeyDown: ProviderSettingsProps["onCustomModelKeyDown"];
  updateCustomModelTemplate: ProviderSettingsProps["onCustomModelTemplateChange"];
  setCustomModelAdvancedOpen: BooleanStateToggle;
  updateCustomModelAdapter: ProviderSettingsProps["onCustomModelAdapterChange"];
  providerSettingsActions: {
    addCustomModelToRequest: () => void | Promise<unknown>;
    changeSupportsReferenceImages: ProviderSettingsProps["onSupportsReferenceImagesChange"];
    changeSupportsSeed: ProviderSettingsProps["onSupportsSeedChange"];
    changeSizeControlMode: ProviderSettingsProps["onSizeControlModeChange"];
    changeImageCountMode: ProviderSettingsProps["onImageCountModeChange"];
  };
}

export const createGenerateDialogAdvancedSettingsProps = ({
  request,
  providerModels,
  visibleFields,
  selectedAspectRatio,
  aspectRatioOptions,
  advancedRequestHandlers,
  handleTextInputKeyDown,
  apiSettingsOpen,
  providerLabel,
  currentProviderStatus,
  currentModelLabel,
  isProviderConfigured,
  apiKeyInputRef,
  apiKeyDraft,
  savingProviderSettings,
  canSaveProviderSettings,
  customModelDraft,
  customModelTemplate,
  customModelUsageDescription,
  customModelAdvancedOpen,
  customModelCapabilities,
  customModelAdapter,
  canAddCustomModel,
  providerSaveFeedback,
  stopInputEventPropagation,
  setApiSettingsOpen,
  updateApiKeyDraft,
  handleApiKeyKeyDown,
  saveProviderSettings,
  updateCustomModelDraft,
  handleCustomModelKeyDown,
  updateCustomModelTemplate,
  setCustomModelAdvancedOpen,
  updateCustomModelAdapter,
  providerSettingsActions,
}: CreateGenerateDialogAdvancedSettingsPropsInput): GenerateDialogAdvancedSettingsProps => ({
  advancedFieldsProps: {
    request,
    providerModels,
    visibleFields,
    selectedAspectRatio,
    aspectRatioOptions,
    onProviderChange: advancedRequestHandlers.changeProvider,
    onModelChange: advancedRequestHandlers.changeModel,
    onNegativePromptChange: advancedRequestHandlers.changeNegativePrompt,
    onAspectRatioChange: advancedRequestHandlers.changeAspectRatio,
    onWidthChange: advancedRequestHandlers.changeWidth,
    onHeightChange: advancedRequestHandlers.changeHeight,
    onSeedChange: advancedRequestHandlers.changeSeed,
    onImageCountChange: advancedRequestHandlers.changeImageCount,
    onTextInputKeyDown: handleTextInputKeyDown,
  },
  providerSettingsProps: {
    open: apiSettingsOpen,
    provider: request.provider,
    providerLabel,
    providerStatus: currentProviderStatus,
    modelLabel: currentModelLabel,
    isProviderConfigured,
    apiKeyInputRef,
    apiKeyDraft,
    savingProviderSettings,
    canSaveProviderSettings,
    customModelDraft,
    customModelTemplate,
    customModelUsageDescription,
    customModelAdvancedOpen,
    customModelCapabilities,
    customModelAdapter,
    canAddCustomModel,
    providerSaveFeedback,
    onToggleOpen: (event: SyntheticEvent<HTMLElement>) => {
      stopInputEventPropagation(event);
      setApiSettingsOpen((current) => !current);
    },
    onApiKeyChange: updateApiKeyDraft,
    onApiKeyKeyDown: handleApiKeyKeyDown,
    onSaveProviderSettings: (event: SyntheticEvent<HTMLElement>) => {
      stopInputEventPropagation(event);
      void saveProviderSettings();
    },
    onCustomModelDraftChange: updateCustomModelDraft,
    onCustomModelKeyDown: handleCustomModelKeyDown,
    onCustomModelTemplateChange: updateCustomModelTemplate,
    onToggleCustomModelAdvanced: (event: SyntheticEvent<HTMLElement>) => {
      stopInputEventPropagation(event);
      setCustomModelAdvancedOpen((current) => !current);
    },
    onSupportsReferenceImagesChange:
      providerSettingsActions.changeSupportsReferenceImages,
    onSupportsSeedChange: providerSettingsActions.changeSupportsSeed,
    onCustomModelAdapterChange: updateCustomModelAdapter,
    onSizeControlModeChange: providerSettingsActions.changeSizeControlMode,
    onImageCountModeChange: providerSettingsActions.changeImageCountMode,
    onAddCustomModel: (event: SyntheticEvent<HTMLElement>) => {
      stopInputEventPropagation(event);
      void providerSettingsActions.addCustomModelToRequest();
    },
    onStopInputEvent: stopInputEventPropagation,
  },
});
