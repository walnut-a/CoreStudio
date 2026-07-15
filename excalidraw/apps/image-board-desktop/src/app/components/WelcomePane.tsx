import { useState } from "react";

import { copy, DESKTOP_LANG_CODE } from "../copy";
import type { RecentProjectEntry } from "../../shared/desktopBridgeTypes";
import { DesktopButton } from "./DesktopButton";
import { trashProjectIcon } from "./CoreStudioIcons";
import "./WelcomePane.css";

interface WelcomePaneProps {
  loading: boolean;
  onCreateProject: () => void;
  onOpenProject: () => void;
  recentProjects?: RecentProjectEntry[];
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
  onOpenRecentProject,
  onRemoveRecentProject,
  onRevealProject,
  manualProjectActionsVisible = true,
}: WelcomePaneProps) => {
  const latestProject = recentProjects[0] ?? null;
  const [deleteTarget, setDeleteTarget] = useState<RecentProjectEntry | null>(
    null,
  );

  const deleteDialogTitleId = "welcome-delete-project-title";

  return (
    <div className="welcome-pane">
      <section className="welcome-pane__card" aria-labelledby="welcome-title">
        <div className="welcome-pane__intro">
          <div className="welcome-pane__copy">
            <span className="welcome-pane__eyebrow">
              {copy.welcome.eyebrow}
            </span>
            <h1 id="welcome-title">{copy.welcome.title}</h1>
            <p>{copy.welcome.description}</p>
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
              {latestProject ? (
                <DesktopButton
                  type="button"
                  onClick={() =>
                    onOpenRecentProject?.(latestProject.projectPath)
                  }
                  disabled={loading}
                >
                  {copy.welcome.continueLastProject}
                </DesktopButton>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="welcome-pane__recent">
          <div className="welcome-pane__recent-header">
            <h2>{copy.welcome.recentTitle}</h2>
          </div>
          {recentProjects.length ? (
            <div className="welcome-pane__recent-list">
              {recentProjects.map((project) => (
                <div
                  key={project.projectPath}
                  className="welcome-pane__recent-item"
                >
                  <button
                    type="button"
                    className="welcome-pane__recent-open"
                    onClick={() => onOpenRecentProject?.(project.projectPath)}
                    disabled={loading}
                  >
                    <span className="welcome-pane__recent-name">
                      {project.name}
                    </span>
                    <span className="welcome-pane__recent-path">
                      {project.projectPath}
                    </span>
                    <span className="welcome-pane__recent-time">
                      {copy.welcome.lastOpenedAt}{" "}
                      {new Date(project.lastOpenedAt).toLocaleString(
                        DESKTOP_LANG_CODE,
                      )}
                    </span>
                  </button>
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
                </div>
              ))}
            </div>
          ) : (
            <p className="welcome-pane__recent-empty">
              {copy.welcome.recentEmpty}
            </p>
          )}
        </div>
      </section>
      {deleteTarget ? (
        <div className="dialog-backdrop">
          <div
            className="dialog-card welcome-pane__delete-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={deleteDialogTitleId}
          >
            <div className="dialog-card__header">
              <div>
                <span className="dialog-card__eyebrow">
                  {copy.welcome.recentTitle}
                </span>
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
