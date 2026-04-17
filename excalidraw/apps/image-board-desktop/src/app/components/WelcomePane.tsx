import { copy } from "../copy";
import type { RecentProjectEntry } from "../../shared/desktopBridgeTypes";
import { DesktopButton } from "./DesktopButton";

interface WelcomePaneProps {
  loading: boolean;
  onCreateProject: () => void;
  onOpenProject: () => void;
  recentProjects?: RecentProjectEntry[];
  onOpenRecentProject?: (projectPath: string) => void;
}

export const WelcomePane = ({
  loading,
  onCreateProject,
  onOpenProject,
  recentProjects = [],
  onOpenRecentProject,
}: WelcomePaneProps) => {
  const latestProject = recentProjects[0] ?? null;

  return (
    <div className="welcome-pane">
      <div className="welcome-pane__card">
        <span className="welcome-pane__eyebrow">{copy.welcome.eyebrow}</span>
        <h1>{copy.welcome.title}</h1>
        <p>{copy.welcome.description}</p>
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
              onClick={() => onOpenRecentProject?.(latestProject.projectPath)}
              disabled={loading}
            >
              {copy.welcome.continueLastProject}
            </DesktopButton>
          ) : null}
        </div>
        <div className="welcome-pane__recent">
          <div className="welcome-pane__recent-header">
            <h2>{copy.welcome.recentTitle}</h2>
          </div>
          {recentProjects.length ? (
            <div className="welcome-pane__recent-list">
              {recentProjects.map((project) => (
                <button
                  key={project.projectPath}
                  type="button"
                  className="welcome-pane__recent-item"
                  onClick={() => onOpenRecentProject?.(project.projectPath)}
                  disabled={loading}
                >
                  <span className="welcome-pane__recent-name">{project.name}</span>
                  <span className="welcome-pane__recent-path">
                    {project.projectPath}
                  </span>
                  <span className="welcome-pane__recent-time">
                    {copy.welcome.lastOpenedAt}{" "}
                    {new Date(project.lastOpenedAt).toLocaleString("zh-CN")}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="welcome-pane__recent-empty">{copy.welcome.recentEmpty}</p>
          )}
        </div>
      </div>
    </div>
  );
};
