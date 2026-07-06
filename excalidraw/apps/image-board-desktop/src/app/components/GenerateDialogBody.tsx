import type { ReactNode } from "react";

import { copy } from "../copy";

import { DesktopButton } from "./DesktopButton";

interface GenerateDialogBodyProps {
  show: boolean;
  isConfigured: boolean;
  error: string | null;
  onOpenErrorDetails?: () => void;
  advancedOpen: boolean;
  advancedContent: ReactNode;
}

export const GenerateDialogBody = ({
  show,
  isConfigured,
  error,
  onOpenErrorDetails,
  advancedOpen,
  advancedContent,
}: GenerateDialogBodyProps) => {
  if (!show) {
    return null;
  }

  return (
    <div className="generate-panel__body">
      {!isConfigured && (
        <div className="dialog-card__warning">
          {copy.generateDialog.providerWarning}
        </div>
      )}

      {error && (
        <div
          className={[
            "dialog-card__error",
            onOpenErrorDetails ? "dialog-card__error--actionable" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="dialog-card__error-copy">{error}</div>
          {onOpenErrorDetails && (
            <DesktopButton
              type="button"
              className="dialog-card__error-action"
              onClick={onOpenErrorDetails}
            >
              {copy.debugError.view}
            </DesktopButton>
          )}
        </div>
      )}

      {advancedOpen && (
        <div className="dialog-form-grid">
          {advancedContent}
        </div>
      )}
    </div>
  );
};
