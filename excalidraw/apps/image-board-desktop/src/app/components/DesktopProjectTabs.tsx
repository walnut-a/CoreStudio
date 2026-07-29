import { useState } from "react";
import type { DragEvent, KeyboardEvent } from "react";

import type { DesktopProjectTheme } from "../../shared/desktopBridgeTypes";
import { closeIcon, homeIcon } from "./CoreStudioIcons";

import "./DesktopProjectTabs.css";

export interface DesktopProjectTabItem {
  projectPath: string;
  name: string;
}

interface DesktopProjectTabsProps {
  tabs: DesktopProjectTabItem[];
  activeProjectPath: string | null;
  theme?: DesktopProjectTheme;
  onShowHome: () => void;
  onActivateProject: (projectPath: string) => void;
  onCloseProject: (projectPath: string) => void;
  onReorderProjects?: (projectPaths: string[]) => void;
}

type ProjectTabDropPosition = "before" | "after";

const buildReorderedProjectPaths = (
  tabs: DesktopProjectTabItem[],
  draggedProjectPath: string,
  targetProjectPath: string,
  position: ProjectTabDropPosition,
) => {
  const remainingProjectPaths = tabs
    .map((tab) => tab.projectPath)
    .filter((projectPath) => projectPath !== draggedProjectPath);
  const targetIndex = remainingProjectPaths.indexOf(targetProjectPath);
  if (targetIndex < 0) {
    return tabs.map((tab) => tab.projectPath);
  }
  remainingProjectPaths.splice(
    targetIndex + (position === "after" ? 1 : 0),
    0,
    draggedProjectPath,
  );
  return remainingProjectPaths;
};

export const DesktopProjectTabs = ({
  tabs,
  activeProjectPath,
  theme = "light",
  onShowHome,
  onActivateProject,
  onCloseProject,
  onReorderProjects,
}: DesktopProjectTabsProps) => {
  const [draggingProjectPath, setDraggingProjectPath] = useState<string | null>(
    null,
  );
  const [dropTarget, setDropTarget] = useState<{
    projectPath: string;
    position: ProjectTabDropPosition;
  } | null>(null);
  const canReorder = Boolean(onReorderProjects && tabs.length > 1);

  const finishDragging = () => {
    setDraggingProjectPath(null);
    setDropTarget(null);
  };

  const reorderByKeyboard = (
    event: KeyboardEvent<HTMLButtonElement>,
    projectPath: string,
  ) => {
    if (
      !canReorder ||
      !event.altKey ||
      (event.key !== "ArrowLeft" && event.key !== "ArrowRight")
    ) {
      return;
    }
    const currentIndex = tabs.findIndex(
      (tab) => tab.projectPath === projectPath,
    );
    const nextIndex = currentIndex + (event.key === "ArrowLeft" ? -1 : 1);
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= tabs.length) {
      return;
    }
    event.preventDefault();
    const projectPaths = tabs.map((tab) => tab.projectPath);
    [projectPaths[currentIndex], projectPaths[nextIndex]] = [
      projectPaths[nextIndex],
      projectPaths[currentIndex],
    ];
    onReorderProjects?.(projectPaths);
  };

  const startDragging = (
    event: DragEvent<HTMLButtonElement>,
    projectPath: string,
  ) => {
    if (!canReorder) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData("text/plain", projectPath);
    setDraggingProjectPath(projectPath);
    setDropTarget(null);
  };

  const updateDropTarget = (
    event: DragEvent<HTMLDivElement>,
    projectPath: string,
  ) => {
    if (!draggingProjectPath || draggingProjectPath === projectPath) {
      return;
    }
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    setDropTarget({
      projectPath,
      position:
        event.clientX < bounds.left + bounds.width / 2 ? "before" : "after",
    });
  };

  const dropProjectTab = (
    event: DragEvent<HTMLDivElement>,
    projectPath: string,
  ) => {
    event.preventDefault();
    if (
      draggingProjectPath &&
      draggingProjectPath !== projectPath &&
      dropTarget?.projectPath === projectPath
    ) {
      onReorderProjects?.(
        buildReorderedProjectPaths(
          tabs,
          draggingProjectPath,
          projectPath,
          dropTarget.position,
        ),
      );
    }
    finishDragging();
  };

  return (
    <header
      className={`desktop-project-tabs desktop-project-tabs--${theme}`}
      data-theme={theme}
      aria-label="打开的项目"
    >
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
          const dragging = tab.projectPath === draggingProjectPath;
          const dropPosition =
            dropTarget?.projectPath === tab.projectPath
              ? dropTarget.position
              : null;
          return (
            <div
              className={[
                "desktop-project-tabs__tab-shell",
                active ? "desktop-project-tabs__tab-shell--active" : "",
                dragging ? "desktop-project-tabs__tab-shell--dragging" : "",
                dropPosition
                  ? `desktop-project-tabs__tab-shell--drop-${dropPosition}`
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={tab.projectPath}
              onDragOver={(event) => updateDropTarget(event, tab.projectPath)}
              onDrop={(event) => dropProjectTab(event, tab.projectPath)}
            >
              <button
                type="button"
                role="tab"
                aria-selected={active}
                aria-keyshortcuts={
                  canReorder ? "Alt+ArrowLeft Alt+ArrowRight" : undefined
                }
                className="desktop-project-tabs__tab"
                draggable={canReorder}
                title={tab.name}
                onClick={() => onActivateProject(tab.projectPath)}
                onDragStart={(event) => startDragging(event, tab.projectPath)}
                onDragEnd={finishDragging}
                onKeyDown={(event) => reorderByKeyboard(event, tab.projectPath)}
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
};
