import type { DesktopAppInfo } from "../../shared/desktopBridgeTypes";
import { copy } from "../copy";
import { DesktopButton } from "./DesktopButton";
import "./AboutDialog.css";

interface AboutDialogProps {
  open: boolean;
  appInfo: DesktopAppInfo | null;
  onClose: () => void;
}

export const AboutDialog = ({ open, appInfo, onClose }: AboutDialogProps) => {
  if (!open) {
    return null;
  }

  return (
    <div className="dialog-backdrop">
      <div
        className="dialog-card dialog-card--about"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-dialog-title"
      >
        <div className="dialog-card__header">
          <div>
            <h2 id="about-dialog-title">{copy.about.title}</h2>
          </div>
          <DesktopButton
            type="button"
            className="dialog-card__close"
            aria-label={copy.about.closeLabel}
            onClick={onClose}
          >
            {copy.about.close}
          </DesktopButton>
        </div>
        <p className="about-dialog__description">{copy.about.description}</p>
        <div className="about-dialog__version">
          {copy.about.versionLabel} {appInfo?.version ?? copy.about.versionUnknown}
        </div>
      </div>
    </div>
  );
};
