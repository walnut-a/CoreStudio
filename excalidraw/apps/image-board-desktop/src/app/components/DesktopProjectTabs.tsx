import { closeIcon, homeIcon } from "./CoreStudioIcons";

import "./DesktopProjectTabs.css";

export interface DesktopProjectTabItem {
  projectPath: string;
  name: string;
}

interface DesktopProjectTabsProps {
  tabs: DesktopProjectTabItem[];
  activeProjectPath: string | null;
  onShowHome: () => void;
  onActivateProject: (projectPath: string) => void;
  onCloseProject: (projectPath: string) => void;
}

export const DesktopProjectTabs = ({
  tabs,
  activeProjectPath,
  onShowHome,
  onActivateProject,
  onCloseProject,
}: DesktopProjectTabsProps) => (
  <header className="desktop-project-tabs" aria-label="打开的项目">
    <button
      type="button"
      className="desktop-project-tabs__home"
      aria-label="项目首页"
      aria-current={activeProjectPath === null ? "page" : undefined}
      title="项目首页"
      onClick={onShowHome}
    >
      {homeIcon}
    </button>
    <div className="desktop-project-tabs__list" role="tablist">
      {tabs.map((tab) => {
        const active = tab.projectPath === activeProjectPath;
        return (
          <div
            className={[
              "desktop-project-tabs__tab-shell",
              active ? "desktop-project-tabs__tab-shell--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            key={tab.projectPath}
          >
            <button
              type="button"
              role="tab"
              aria-selected={active}
              className="desktop-project-tabs__tab"
              title={tab.name}
              onClick={() => onActivateProject(tab.projectPath)}
            >
              <span className="desktop-project-tabs__label">{tab.name}</span>
            </button>
            <button
              type="button"
              className="desktop-project-tabs__close"
              aria-label={`关闭项目 ${tab.name}`}
              title={`关闭“${tab.name}”`}
              onClick={(event) => {
                event.stopPropagation();
                onCloseProject(tab.projectPath);
              }}
            >
              {closeIcon}
            </button>
          </div>
        );
      })}
    </div>
  </header>
);
