import { createGenerateAdvancedRequestHandlers } from "../generateAdvancedRequestHandlers";
import { createGenerateProviderSettingsActions } from "../generateProviderSettingsActions";
import { createGenerateDialogAdvancedSettingsProps } from "./GenerateDialogAdvancedSettingsProps";

type AdvancedSettingsPropsInput = Parameters<
  typeof createGenerateDialogAdvancedSettingsProps
>[0];
type AdvancedRequestHandlersInput = Parameters<
  typeof createGenerateAdvancedRequestHandlers
>[0];
type ProviderSettingsActionsInput = Parameters<
  typeof createGenerateProviderSettingsActions
>[0];

interface CreateGenerateDialogAdvancedSettingsRuntimeInput
  extends Omit<
    AdvancedSettingsPropsInput,
    "advancedRequestHandlers" | "providerSettingsActions"
  > {
  advancedSettingsActions: GenerateDialogAdvancedSettingsActions;
}

interface CreateGenerateDialogAdvancedSettingsActionsInput {
  providerSettings: AdvancedRequestHandlersInput["providerSettings"];
  aspectRatioOptions: AdvancedRequestHandlersInput["aspectRatioOptions"];
  updateRequest: AdvancedRequestHandlersInput["updateRequest"];
  onModelSelectionChange?: AdvancedRequestHandlersInput["onModelSelectionChange"];
  addCustomModel: ProviderSettingsActionsInput["addCustomModel"];
  updateCustomModelCapabilities: ProviderSettingsActionsInput["updateCustomModelCapabilities"];
}

export const createGenerateDialogAdvancedSettingsActions = ({
  providerSettings,
  aspectRatioOptions,
  updateRequest,
  onModelSelectionChange,
  addCustomModel,
  updateCustomModelCapabilities,
}: CreateGenerateDialogAdvancedSettingsActionsInput) => {
  const advancedRequestHandlers = createGenerateAdvancedRequestHandlers({
    providerSettings,
    aspectRatioOptions,
    updateRequest,
    onModelSelectionChange,
  });

  const providerSettingsActions = createGenerateProviderSettingsActions({
    addCustomModel,
    updateRequest,
    updateCustomModelCapabilities,
    onModelSelectionChange,
  });

  return {
    advancedRequestHandlers,
    providerSettingsActions,
    addCustomModelToRequest: providerSettingsActions.addCustomModelToRequest,
  };
};

type GenerateDialogAdvancedSettingsActions = ReturnType<
  typeof createGenerateDialogAdvancedSettingsActions
>;

export const createGenerateDialogAdvancedSettingsRuntime = ({
  advancedSettingsActions,
  ...propsInput
}: CreateGenerateDialogAdvancedSettingsRuntimeInput) => {
  return {
    advancedSettingsProps: createGenerateDialogAdvancedSettingsProps({
      ...propsInput,
      advancedRequestHandlers: advancedSettingsActions.advancedRequestHandlers,
      providerSettingsActions: advancedSettingsActions.providerSettingsActions,
    }),
    addCustomModelToRequest: advancedSettingsActions.addCustomModelToRequest,
  };
};
