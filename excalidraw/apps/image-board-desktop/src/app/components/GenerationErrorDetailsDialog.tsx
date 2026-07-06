import { getProviderDefinition } from "../../shared/providerCatalog";
import { copy } from "../copy";
import type { GenerationErrorDetails } from "../generationErrorViewModel";
import { DesktopButton } from "./DesktopButton";
import "./GenerationErrorDetailsDialog.css";

interface GenerationErrorDetailsDialogProps {
  open: boolean;
  details: GenerationErrorDetails | null;
  copied: boolean;
  onCopyDetails: () => void;
  onClose: () => void;
}

export const GenerationErrorDetailsDialog = ({
  open,
  details,
  copied,
  onCopyDetails,
  onClose,
}: GenerationErrorDetailsDialogProps) => {
  if (!open || !details) {
    return null;
  }

  return (
    <div className="dialog-backdrop">
      <div
        aria-labelledby="generation-error-details-title"
        aria-modal="true"
        className="dialog-card dialog-card--wide"
        role="dialog"
      >
        <div className="dialog-card__header">
          <div>
            <span className="dialog-card__eyebrow">
              {copy.debugError.eyebrow}
            </span>
            <h2 id="generation-error-details-title">{copy.debugError.title}</h2>
          </div>
          <DesktopButton
            type="button"
            className="dialog-card__close"
            onClick={onClose}
          >
            {copy.debugError.close}
          </DesktopButton>
        </div>

        <div className="debug-error-dialog">
          <div className="debug-error-dialog__meta">
            <div>
              <span>{copy.debugError.provider}</span>
              <strong>{getProviderDefinition(details.provider).label}</strong>
            </div>
            <div>
              <span>{copy.debugError.model}</span>
              <strong>{details.model}</strong>
            </div>
            <div>
              <span>{copy.debugError.occurredAt}</span>
              <strong>
                {new Date(details.occurredAt).toLocaleString("zh-CN")}
              </strong>
            </div>
          </div>

          <section className="debug-error-dialog__section">
            <h3>{copy.debugError.message}</h3>
            <p>{details.normalizedMessage}</p>
          </section>

          <section className="debug-error-dialog__section">
            <h3>{copy.debugError.raw}</h3>
            <pre className="debug-error-dialog__pre">{details.rawMessage}</pre>
          </section>

          {details.requestPayload && (
            <section className="debug-error-dialog__section">
              <h3>{copy.debugError.payload}</h3>
              <pre className="debug-error-dialog__pre">
                {details.requestPayload}
              </pre>
            </section>
          )}

          {details.stack && (
            <section className="debug-error-dialog__section">
              <h3>{copy.debugError.stack}</h3>
              <pre className="debug-error-dialog__pre">{details.stack}</pre>
            </section>
          )}
        </div>

        <div className="dialog-card__footer">
          <DesktopButton type="button" onClick={onCopyDetails}>
            {copied ? copy.debugError.copied : copy.debugError.copy}
          </DesktopButton>
          <DesktopButton type="button" variant="primary" onClick={onClose}>
            {copy.debugError.close}
          </DesktopButton>
        </div>
      </div>
    </div>
  );
};
