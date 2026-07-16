type AppErrorBannerVariant = "app" | "card";

interface AppErrorBannersProps {
  startupError?: string | null;
  projectError?: string | null;
  projectRecovery?: {
    message: string;
    actionLabel: string;
    actionPendingLabel: string;
    pending: boolean;
    onAction: () => void;
  } | null;
  variant?: AppErrorBannerVariant;
}

export const AppErrorBanners = ({
  startupError = null,
  projectError = null,
  projectRecovery = null,
  variant = "app",
}: AppErrorBannersProps) => {
  if (!startupError && !projectError && !projectRecovery) {
    return null;
  }

  if (variant === "card") {
    return (
      <>
        {startupError ? (
          <div className="dialog-card__error welcome-pane__error">
            {startupError}
          </div>
        ) : null}
        {projectError ? (
          <div className="dialog-card__error welcome-pane__error">
            {projectError}
          </div>
        ) : null}
      </>
    );
  }

  return (
    <>
      {startupError ? (
        <div className="app-startup-error">{startupError}</div>
      ) : null}
      {projectError ? (
        <div className="app-canvas-error-toast" role="alert">
          {projectError}
        </div>
      ) : null}
      {projectRecovery ? (
        <div
          className="app-canvas-error-toast app-canvas-error-toast--actionable"
          role="alert"
        >
          <span>{projectRecovery.message}</span>
          <button
            type="button"
            className="app-canvas-error-toast__action"
            disabled={projectRecovery.pending}
            onClick={projectRecovery.onAction}
          >
            {projectRecovery.pending
              ? projectRecovery.actionPendingLabel
              : projectRecovery.actionLabel}
          </button>
        </div>
      ) : null}
    </>
  );
};
