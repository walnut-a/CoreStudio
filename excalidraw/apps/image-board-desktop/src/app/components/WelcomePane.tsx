import { copy } from "../copy";
import type { RecentProjectEntry } from "../../shared/desktopBridgeTypes";
import { DesktopButton } from "./DesktopButton";
import "./WelcomePane.css";

interface WelcomePaneProps {
  loading: boolean;
  onCreateProject: () => void;
  onOpenProject: () => void;
  recentProjects?: RecentProjectEntry[];
  onOpenRecentProject?: (projectPath: string) => void;
  agentAccessEnabled?: boolean;
  onAgentAccessToggle?: (enabled: boolean) => void;
  agentAccessToggleDisabled?: boolean;
  manualProjectActionsVisible?: boolean;
}

export const WelcomePane = ({
  loading,
  onCreateProject,
  onOpenProject,
  recentProjects = [],
  onOpenRecentProject,
  agentAccessEnabled = false,
  onAgentAccessToggle,
  agentAccessToggleDisabled = false,
  manualProjectActionsVisible = true,
}: WelcomePaneProps) => {
  const latestProject = recentProjects[0] ?? null;

  return (
    <div className="welcome-pane">
      <section className="welcome-pane__card" aria-labelledby="welcome-title">
        <div className="welcome-pane__intro">
          <div className="welcome-pane__copy">
            <span className="welcome-pane__eyebrow">{copy.welcome.eyebrow}</span>
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
                  onClick={() => onOpenRecentProject?.(latestProject.projectPath)}
                  disabled={loading}
                >
                  {copy.welcome.continueLastProject}
                </DesktopButton>
              ) : null}
            </div>
          ) : null}
        </div>
        {onAgentAccessToggle ? (
          <div className="welcome-pane__agent-access">
            <div className="welcome-pane__agent-access-copy">
              <strong>Agent 集成</strong>
              <span>允许本机 Agent 通过网页画布和 CLI 连接本地项目。</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-label="启用 Agent 集成"
              aria-checked={agentAccessEnabled}
              disabled={agentAccessToggleDisabled}
              className="app-settings-section__switch"
              onClick={() => onAgentAccessToggle(!agentAccessEnabled)}
            />
          </div>
        ) : null}
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
      </section>
    </div>
  );
};
