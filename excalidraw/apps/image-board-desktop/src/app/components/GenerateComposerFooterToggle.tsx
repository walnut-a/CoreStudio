import { Tooltip } from "@excalidraw/excalidraw/components/Tooltip";

import { copy } from "../copy";
import { generateImageIcon } from "./CoreStudioIcons";

import "./GenerateComposerFooterToggle.css";

interface GenerateComposerFooterToggleProps {
  expanded: boolean;
  loading: boolean;
  onToggle: () => void;
}

export const GenerateComposerFooterToggle = ({
  expanded,
  loading,
  onToggle,
}: GenerateComposerFooterToggleProps) => {
  const label = expanded
    ? copy.generateDialog.hideComposer
    : copy.generateDialog.showComposer;

  return (
    <div className="generate-composer-footer-toggle-slot">
      <Tooltip label={label}>
        <button
          type="button"
          className="help-icon generate-composer-footer-toggle"
          aria-label={label}
          aria-pressed={expanded}
          aria-busy={loading}
          onClick={onToggle}
        >
          {generateImageIcon}
          {loading ? (
            <span
              className="generate-composer-footer-toggle__activity"
              aria-hidden="true"
            />
          ) : null}
        </button>
      </Tooltip>
    </div>
  );
};
