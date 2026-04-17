import { ToolbarButton } from "@excalidraw/excalidraw";

import { copy } from "../copy";

const generateImageIcon = (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3l1.7 3.8L17.5 8.5l-3.8 1.7L12 14l-1.7-3.8L6.5 8.5l3.8-1.7L12 3Z" />
    <path d="M19 13.5l.8 1.7 1.7.8-1.7.8L19 18.5l-.8-1.7-1.7-.8 1.7-.8.8-1.7Z" />
    <path d="M5 14.5l.5 1.2 1.2.5-1.2.5L5 18l-.5-1.2-1.2-.5 1.2-.5.5-1.3Z" />
  </svg>
);

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
