import { ToolbarButton } from "@excalidraw/excalidraw";

import { copy } from "../copy";
import { generateImageIcon } from "./CoreStudioIcons";

interface GenerateToolbarButtonProps {
  onFocusGenerate: () => void;
}

export const GenerateToolbarButton = ({
  onFocusGenerate,
}: GenerateToolbarButtonProps) => {
  return (
    <ToolbarButton
      icon={generateImageIcon}
      aria-label={copy.toolbar.generateImage}
      title={copy.toolbar.generateImage}
      selected={false}
      data-testid="toolbar-generate-image"
      onClick={onFocusGenerate}
    />
  );
};
