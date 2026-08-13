import { useState } from "react";

import { copy, DESKTOP_LANG_CODE } from "../copy";
import type { RecentProjectEntry } from "../../shared/desktopBridgeTypes";
import type { RecentProjectsLoadStatus } from "../desktopStartupState";
import { DesktopButton } from "./DesktopButton";
import { checkIcon, trashProjectIcon } from "./CoreStudioIcons";
import { useModalFocus } from "./useModalFocus";
import "./WelcomePane.css";

export type ProviderConfigurationStatus =
  | "loading"
  | "configured"
  | "not-configured";

interface WelcomePaneProps {
  loading: boolean;
  onCreateProject: () => void;
  onOpenProject: () => void;
  recentProjects?: RecentProjectEntry[];
  recentProjectsLoadStatus?: RecentProjectsLoadStatus;
  providerConfigurationStatus?: ProviderConfigurationStatus;
  onOpenProviderSettings?: () => void;
  onOpenRecentProject?: (projectPath: string) => void;
  onRemoveRecentProject?: (projectPath: string) => void | Promise<void>;
  onRevealProject?: (projectPath: string) => void | Promise<void>;
  manualProjectActionsVisible?: boolean;
}

export const WelcomePane = ({
  loading,
  onCreateProject,
  onOpenProject,
  recentProjects = [],
  recentProjectsLoadStatus = "loaded",
  providerConfigurationStatus = "loading",
  onOpenProviderSettings,
  onOpenRecentProject,
  onRemoveRecentProject,
  onRevealProject,
  manualProjectActionsVisible = true,
}: WelcomePaneProps) => {
  const [deleteTarget, setDeleteTarget] = useState<RecentProjectEntry | null>(
    null,
  );
  const deleteDialogRef = useModalFocus<HTMLDivElement>({
    open: manualProjectActionsVisible && Boolean(deleteTarget),
    onEscape: () => setDeleteTarget(null),
  });

  const deleteDialogTitleId = "welcome-delete-project-title";
  const showGettingStarted =
    manualProjectActionsVisible &&
    recentProjectsLoadStatus === "loaded" &&
    recentProjects.length === 0;
  const projectSelectionMode = !manualProjectActionsVisible;
  const providerConfigured = providerConfigurationStatus === "configured";
  const providerStatusLabel =
    providerConfigurationStatus === "loading"
      ? copy.welcome.providerChecking
      : providerConfigured
      ? copy.welcome.providerConfigured
      : copy.welcome.providerNotConfigured;

  return (
    <div className="welcome-pane">
      <section className="welcome-pane__card" aria-labelledby="welcome-title">
        <div className="welcome-pane__intro">
          <div className="welcome-pane__copy">
            <span className="welcome-pane__eyebrow">
              {copy.welcome.eyebrow}
            </span>
            {projectSelectionMode ? (
              <>
                <h1 id="welcome-title">{copy.welcome.projectSelectionTitle}</h1>
                <p>{copy.welcome.projectSelectionDescription}</p>
              </>
            ) : (
              <>
                <h1 id="welcome-title">{copy.welcome.title}</h1>
                <p>{copy.welcome.description}</p>
              </>
            )}
          </div>
          {manualProjectActionsVisible ? (
            <div className="welcome-pane__actions">
              <DesktopButton
                type="button"
                variant="primary"
                className="welcome-pane__primary"
                onClick={onCreateProject}
                disabled={loading}
              >
                {loading ? copy.welcome.creating : copy.welcome.newProject}
              </DesktopButton>
              <DesktopButton
                type="button"
                onClick={onOpenProject}
                disabled={loading}
              >
                {loading ? copy.welcome.opening : copy.welcome.openProject}
              </DesktopButton>
            </div>
          ) : null}
        </div>
        <div className="welcome-pane__recent">
          {showGettingStarted ? (
            <section
              className="welcome-pane__getting-started"
              aria-labelledby="welcome-getting-started-title"
            >
              <header className="welcome-pane__getting-started-header">
                <div>
                  <h2 id="welcome-getting-started-title">
                    {copy.welcome.gettingStartedTitle}
                  </h2>
                  <p>{copy.welcome.gettingStartedDescription}</p>
                </div>
              </header>
              <ol className="welcome-pane__steps">
                <li
                  className={[
                    "welcome-pane__step",
                    providerConfigured ? "welcome-pane__step--complete" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span
                    className="welcome-pane__step-marker"
                    aria-hidden="true"
                  >
                    {providerConfigured ? checkIcon : "1"}
                  </span>
                  <div className="welcome-pane__step-copy">
                    <div className="welcome-pane__step-title">
                      <strong>{copy.welcome.setupProviderTitle}</strong>
                      <span
                        className={[
                          "welcome-pane__step-status",
                          providerConfigured
                            ? "welcome-pane__step-status--ready"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {providerStatusLabel}
                      </span>
                    </div>
                    <p>{copy.welcome.setupProviderDescription}</p>
                  </div>
                  <DesktopButton
                    size="small"
                    className="welcome-pane__step-action"
                    onClick={onOpenProviderSettings}
                  >
                    {providerConfigured
                      ? copy.welcome.manageProvider
                      : copy.welcome.configureApiKey}
                  </DesktopButton>
                </li>
                <li className="welcome-pane__step">
                  <span
                    className="welcome-pane__step-marker"
                    aria-hidden="true"
                  >
                    2
                  </span>
                  <div className="welcome-pane__step-copy">
                    <strong>{copy.welcome.createFirstProjectTitle}</strong>
                    <p>{copy.welcome.createFirstProjectDescription}</p>
                  </div>
                </li>
                <li className="welcome-pane__step">
                  <span
                    className="welcome-pane__step-marker"
                    aria-hidden="true"
                  >
                    3
                  </span>
                  <div className="welcome-pane__step-copy">
                    <strong>{copy.welcome.startGeneratingTitle}</strong>
                    <p>{copy.welcome.startGeneratingDescription}</p>
                  </div>
                </li>
              </ol>
            </section>
          ) : (
            <>
              <div className="welcome-pane__recent-header">
                <h2>
                  {projectSelectionMode
                    ? copy.welcome.projectSelectionListTitle
                    : copy.welcome.recentTitle}
                </h2>
              </div>
              {recentProjects.length ? (
                <div className="welcome-pane__recent-list">
                  {recentProjects.map((project) => {
                    const selectionAvailability = projectSelectionMode
                      ? project.selectionAvailability ?? "available"
                      : undefined;
                    const selectionLabel =
                      selectionAvailability === "current"
                        ? copy.welcome.projectCurrent
                        : selectionAvailability === "unavailable"
                        ? copy.welcome.projectUnavailable
                        : copy.welcome.projectAvailable;
                    const projectNotSelectable =
                      selectionAvailability === "current" ||
                      selectionAvailability === "unavailable";
                    return (
                      <div
                        key={project.projectPath}
                        className={[
                          "welcome-pane__recent-item",
                          selectionAvailability
                            ? `welcome-pane__recent-item--${selectionAvailability}`
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <button
                          type="button"
                          className="welcome-pane__recent-open"
                          onClick={() =>
                            onOpenRecentProject?.(project.projectPath)
                          }
                          disabled={loading || projectNotSelectable}
                          aria-current={
                            selectionAvailability === "current"
                              ? "true"
                              : undefined
                          }
                        >
                          <span className="welcome-pane__recent-heading">
                            <span className="welcome-pane__recent-name">
                              {project.name}
                            </span>
                            {selectionAvailability ? (
                              <span
                                className={`welcome-pane__recent-availability welcome-pane__recent-availability--${selectionAvailability}`}
                              >
                                {selectionLabel}
                              </span>
                            ) : null}
                          </span>
                          <span className="welcome-pane__recent-path">
                            {project.projectPath}
                          </span>
                          <time
                            className="welcome-pane__recent-time"
                            dateTime={project.lastOpenedAt}
                          >
                            <span>{copy.welcome.lastOpenedAt}</span>
                            <span>
                              {new Date(project.lastOpenedAt).toLocaleString(
                                DESKTOP_LANG_CODE,
                              )}
                            </span>
                          </time>
                        </button>
                        {manualProjectActionsVisible ? (
                          <button
                            type="button"
                            className="welcome-pane__recent-delete"
                            aria-label={`${copy.welcome.deleteProject}：${project.name}`}
                            title={`${copy.welcome.deleteProject}：${project.name}`}
                            onClick={() => setDeleteTarget(project)}
                            disabled={loading}
                          >
                            {trashProjectIcon}
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="welcome-pane__recent-empty">
                  {recentProjectsLoadStatus === "loading"
                    ? copy.welcome.recentLoading
                    : recentProjectsLoadStatus === "failed"
                    ? copy.welcome.recentLoadFailed
                    : copy.welcome.recentEmpty}
                </p>
              )}
            </>
          )}
        </div>
      </section>
      {manualProjectActionsVisible && deleteTarget ? (
        <div className="dialog-backdrop">
          <div
            ref={deleteDialogRef}
            className="dialog-card welcome-pane__delete-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={deleteDialogTitleId}
            data-corestudio-modal="true"
            tabIndex={-1}
          >
            <div className="dialog-card__header">
              <div>
                <h2 id={deleteDialogTitleId}>{copy.welcome.deleteProject}</h2>
              </div>
              <DesktopButton
                type="button"
                className="dialog-card__close"
                aria-label={copy.welcome.cancelDeleteProject}
                onClick={() => setDeleteTarget(null)}
              >
                {copy.welcome.cancelDeleteProject}
              </DesktopButton>
            </div>
            <div className="welcome-pane__delete-project">
              <strong>{deleteTarget.name}</strong>
              <span>{deleteTarget.projectPath}</span>
            </div>
            <p>{copy.welcome.deleteProjectRecordHint}</p>
            <p>{copy.welcome.deleteProjectManualHint}</p>
            <div className="dialog-card__footer">
              <DesktopButton
                type="button"
                onClick={() => {
                  void onRevealProject?.(deleteTarget.projectPath);
                }}
              >
                {copy.welcome.revealProjectForManualDelete}
              </DesktopButton>
              <DesktopButton
                type="button"
                variant="primary"
                onClick={() => {
                  void onRemoveRecentProject?.(deleteTarget.projectPath);
                  setDeleteTarget(null);
                }}
              >
                {copy.welcome.deleteProjectRecordOnly}
              </DesktopButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
