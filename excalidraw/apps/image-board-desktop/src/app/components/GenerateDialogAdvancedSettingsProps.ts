import type { ComponentProps } from "react";

import type { GenerateDialogAdvancedSettings } from "./GenerateDialogAdvancedSettings";

type GenerateDialogAdvancedSettingsProps = ComponentProps<
  typeof GenerateDialogAdvancedSettings
>;
type AdvancedFieldsProps =
  GenerateDialogAdvancedSettingsProps["advancedFieldsProps"];
interface CreateGenerateDialogAdvancedSettingsPropsInput {
  request: AdvancedFieldsProps["request"];
  providerModels: AdvancedFieldsProps["providerModels"];
  visibleFields: AdvancedFieldsProps["visibleFields"];
  selectedAspectRatio: AdvancedFieldsProps["selectedAspectRatio"];
  aspectRatioOptions: AdvancedFieldsProps["aspectRatioOptions"];
  configuredProviders: AdvancedFieldsProps["configuredProviders"];
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
}

export const createGenerateDialogAdvancedSettingsProps = ({
  request,
  providerModels,
  visibleFields,
  selectedAspectRatio,
  aspectRatioOptions,
  configuredProviders,
  advancedRequestHandlers,
  handleTextInputKeyDown,
}: CreateGenerateDialogAdvancedSettingsPropsInput): GenerateDialogAdvancedSettingsProps => ({
  advancedFieldsProps: {
    request,
    providerModels,
    visibleFields,
    selectedAspectRatio,
    aspectRatioOptions,
    configuredProviders,
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
});
