import type { ComponentProps } from "react";

import { GenerateAdvancedFieldsPanel } from "./GenerateAdvancedFieldsPanel";

interface GenerateDialogAdvancedSettingsProps {
  advancedFieldsProps: ComponentProps<typeof GenerateAdvancedFieldsPanel>;
}

export const GenerateDialogAdvancedSettings = ({
  advancedFieldsProps,
}: GenerateDialogAdvancedSettingsProps) => (
  <GenerateAdvancedFieldsPanel {...advancedFieldsProps} />
);
