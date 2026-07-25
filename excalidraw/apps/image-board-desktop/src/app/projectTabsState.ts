import type { DesktopProjectBundle } from "../shared/desktopBridgeTypes";
import type { AppState } from "@excalidraw/excalidraw/types";

export interface ProjectTabViewState {
  scrollX: number;
  scrollY: number;
  zoom: AppState["zoom"];
  selectedElementIds: AppState["selectedElementIds"];
}

export interface ProjectTab {
  projectPath: string;
  project: DesktopProjectBundle;
  viewState: ProjectTabViewState | null;
}

export interface ProjectTabsState {
  tabs: ProjectTab[];
  activeProjectPath: string | null;
}

export const createProjectTabsState = (): ProjectTabsState => ({
  tabs: [],
  activeProjectPath: null,
});

export const openProjectTab = (
  state: ProjectTabsState,
  project: DesktopProjectBundle,
): ProjectTabsState => {
  const existingIndex = state.tabs.findIndex(
    (tab) => tab.projectPath === project.projectPath,
  );
  if (existingIndex < 0) {
    return {
      tabs: [
        ...state.tabs,
        {
          projectPath: project.projectPath,
          project,
          viewState: null,
        },
      ],
      activeProjectPath: project.projectPath,
    };
  }

  return {
    tabs: state.tabs.map((tab, index) =>
      index === existingIndex ? { ...tab, project } : tab,
    ),
    activeProjectPath: project.projectPath,
  };
};

export const activateProjectTab = (
  state: ProjectTabsState,
  projectPath: string,
): ProjectTabsState =>
  state.tabs.some((tab) => tab.projectPath === projectPath)
    ? { ...state, activeProjectPath: projectPath }
    : state;

export const showProjectHome = (state: ProjectTabsState): ProjectTabsState => ({
  ...state,
  activeProjectPath: null,
});

export const closeProjectTab = (
  state: ProjectTabsState,
  projectPath: string,
): ProjectTabsState => {
  const closedIndex = state.tabs.findIndex(
    (tab) => tab.projectPath === projectPath,
  );
  if (closedIndex < 0) {
    return state;
  }
  const tabs = state.tabs.filter((tab) => tab.projectPath !== projectPath);
  if (state.activeProjectPath !== projectPath) {
    return { ...state, tabs };
  }

  return {
    tabs,
    activeProjectPath:
      tabs[closedIndex]?.projectPath ??
      tabs[closedIndex - 1]?.projectPath ??
      null,
  };
};

export const getActiveProjectTab = (state: ProjectTabsState) =>
  state.activeProjectPath
    ? state.tabs.find((tab) => tab.projectPath === state.activeProjectPath) ??
      null
    : null;

export const updateProjectTabViewState = (
  state: ProjectTabsState,
  projectPath: string,
  viewState: ProjectTabViewState,
): ProjectTabsState => ({
  ...state,
  tabs: state.tabs.map((tab) =>
    tab.projectPath === projectPath ? { ...tab, viewState } : tab,
  ),
});

export const updateProjectTabBundle = (
  state: ProjectTabsState,
  projectPath: string,
  update: (project: DesktopProjectBundle) => DesktopProjectBundle,
): ProjectTabsState => ({
  ...state,
  tabs: state.tabs.map((tab) =>
    tab.projectPath === projectPath
      ? {
          ...tab,
          project: update(tab.project),
        }
      : tab,
  ),
});
