import type { ReactNode } from "react";

import { AppErrorBanners } from "./AppErrorBanners";
import { DesktopButton } from "./DesktopButton";

interface AgentBoardStartupPaneProps {
  heading: string;
  description: ReactNode;
  actionLabel: string;
  startupError?: string | null;
  projectError?: string | null;
  onAction: () => void | Promise<unknown>;
}

export const AgentBoardStartupPane = ({
  heading,
  description,
  actionLabel,
  startupError = null,
  projectError = null,
  onAction,
}: AgentBoardStartupPaneProps) => (
  <div className="image-board-app">
    <div className="welcome-pane">
      <div className="welcome-pane__card welcome-pane__diagnostic">
        <span className="welcome-pane__eyebrow">Agent Bridge</span>
        <h1>{heading}</h1>
        <p>{description}</p>
        <AppErrorBanners
          startupError={startupError}
          projectError={projectError}
          variant="card"
        />
        <div className="welcome-pane__actions">
          <DesktopButton type="button" variant="primary" onClick={onAction}>
            {actionLabel}
          </DesktopButton>
        </div>
      </div>
    </div>
  </div>
);
