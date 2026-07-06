import type { ComponentProps } from "react";

import { GenerateAdvancedFieldsPanel } from "./GenerateAdvancedFieldsPanel";
import { GenerateProviderSettingsPanel } from "./GenerateProviderSettingsPanel";

interface GenerateDialogAdvancedSettingsProps {
  advancedFieldsProps: ComponentProps<typeof GenerateAdvancedFieldsPanel>;
  providerSettingsProps: ComponentProps<typeof GenerateProviderSettingsPanel>;
}

export const GenerateDialogAdvancedSettings = ({
  advancedFieldsProps,
  providerSettingsProps,
}: GenerateDialogAdvancedSettingsProps) => (
  <>
    <GenerateAdvancedFieldsPanel {...advancedFieldsProps} />
    <GenerateProviderSettingsPanel {...providerSettingsProps} />
  </>
);
