import { createGenerateAdvancedRequestHandlers } from "../generateAdvancedRequestHandlers";
import { createGenerateDialogAdvancedSettingsProps } from "./GenerateDialogAdvancedSettingsProps";

type AdvancedSettingsPropsInput = Parameters<
  typeof createGenerateDialogAdvancedSettingsProps
>[0];
type AdvancedRequestHandlersInput = Parameters<
  typeof createGenerateAdvancedRequestHandlers
>[0];
interface CreateGenerateDialogAdvancedSettingsRuntimeInput
  extends Omit<AdvancedSettingsPropsInput, "advancedRequestHandlers"> {
  advancedSettingsActions: GenerateDialogAdvancedSettingsActions;
}

interface CreateGenerateDialogAdvancedSettingsActionsInput {
  providerSettings: AdvancedRequestHandlersInput["providerSettings"];
  aspectRatioOptions: AdvancedRequestHandlersInput["aspectRatioOptions"];
  updateRequest: AdvancedRequestHandlersInput["updateRequest"];
  onModelSelectionChange?: AdvancedRequestHandlersInput["onModelSelectionChange"];
}

export const createGenerateDialogAdvancedSettingsActions = ({
  providerSettings,
  aspectRatioOptions,
  updateRequest,
  onModelSelectionChange,
}: CreateGenerateDialogAdvancedSettingsActionsInput) => {
  const advancedRequestHandlers = createGenerateAdvancedRequestHandlers({
    providerSettings,
    aspectRatioOptions,
    updateRequest,
    onModelSelectionChange,
  });

  return {
    advancedRequestHandlers,
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
    }),
  };
};
