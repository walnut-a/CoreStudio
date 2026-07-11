type AppErrorBannerVariant = "app" | "card";

interface AppErrorBannersProps {
  startupError?: string | null;
  projectError?: string | null;
  variant?: AppErrorBannerVariant;
}

export const AppErrorBanners = ({
  startupError = null,
  projectError = null,
  variant = "app",
}: AppErrorBannersProps) => {
  if (!startupError && !projectError) {
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
    </>
  );
};
