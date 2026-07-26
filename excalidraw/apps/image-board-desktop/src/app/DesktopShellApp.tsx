import { useCallback, useEffect, useState } from "react";

import type {
  DesktopProjectBundle,
  DesktopProjectViewsState,
  RecentProjectEntry,
} from "../shared/desktopBridgeTypes";
import type { DesktopLocalePreference } from "../shared/desktopLocale";
import { maybeGetDesktopBridge } from "./desktopBridge";
import { AppProjectEntryScreen } from "./components/AppProjectEntryScreen";
import type { ApplicationSettingsCategory } from "./components/ApplicationSettingsDialog";
import { DesktopButton } from "./components/DesktopButton";
import { DesktopProjectTabs } from "./components/DesktopProjectTabs";
import { ShellApplicationSettings } from "./components/ShellApplicationSettings";

const EMPTY_PROJECT_VIEWS_STATE: DesktopProjectViewsState = {
  activeProjectPath: null,
  projects: [],
};

export interface DesktopShellAppProps {
  localePreference?: DesktopLocalePreference;
  onLocalePreferenceChange?: (
    preference: DesktopLocalePreference,
  ) => Promise<void> | void;
}

export const DesktopShellApp = ({
  localePreference = "system",
  onLocalePreferenceChange = () => undefined,
}: DesktopShellAppProps = {}) => {
  const bridge = maybeGetDesktopBridge();
  const [projectViewsState, setProjectViewsState] =
    useState<DesktopProjectViewsState>(EMPTY_PROJECT_VIEWS_STATE);
  const [recentProjects, setRecentProjects] = useState<RecentProjectEntry[]>(
    [],
  );
  const [loadingProject, setLoadingProject] = useState(false);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [appSettingsOpen, setAppSettingsOpen] = useState(false);
  const [appSettingsCategory, setAppSettingsCategory] =
    useState<ApplicationSettingsCategory>("image-generation");

  const applyOpenedBundle = useCallback(
    async (bundle: DesktopProjectBundle | null) => {
      if (!bundle || !bridge?.openProjectView) {
        return;
      }
      setProjectViewsState(
        await bridge.openProjectView(
          bundle.projectPath,
          bundle.safeMode ? { safeMode: true } : undefined,
        ),
      );
      setRecentProjects(await bridge.loadRecentProjects());
    },
    [bridge],
  );

  const runProjectAction = useCallback(
    async (action: () => Promise<DesktopProjectBundle | null>) => {
      setLoadingProject(true);
      setProjectError(null);
      try {
        await applyOpenedBundle(await action());
      } catch (error) {
        setProjectError(
          error instanceof Error ? error.message : String(error || ""),
        );
      } finally {
        setLoadingProject(false);
      }
    },
    [applyOpenedBundle],
  );

  const runProjectViewAction = useCallback(
    async (action: () => Promise<DesktopProjectViewsState> | undefined) => {
      setProjectError(null);
      try {
        const nextState = await action();
        if (nextState) {
          setProjectViewsState(nextState);
        }
      } catch (error) {
        setProjectError(
          error instanceof Error ? error.message : String(error || ""),
        );
      }
    },
    [],
  );

  useEffect(() => {
    if (!bridge?.loadProjectViewsState) {
      setStartupError("当前 CoreStudio 版本缺少项目视图能力。");
      return;
    }
    let disposed = false;
    void Promise.all([
      bridge.loadProjectViewsState(),
      bridge.loadRecentProjects(),
    ])
      .then(([nextProjectViewsState, nextRecentProjects]) => {
        if (disposed) {
          return;
        }
        setProjectViewsState(nextProjectViewsState);
        setRecentProjects(nextRecentProjects);
      })
      .catch((error) => {
        if (!disposed) {
          setStartupError(
            error instanceof Error ? error.message : String(error || ""),
          );
        }
      });
    const unsubscribeProjectViews =
      bridge.onProjectViewsState?.(setProjectViewsState);
    const unsubscribeMenu = bridge.onMenuAction((event) => {
      if (event.action === "project-opened" && event.projectBundle) {
        void applyOpenedBundle(event.projectBundle);
      } else if (event.action === "project-open-failed") {
        setProjectError(event.errorMessage ?? "项目打开失败。");
      } else if (event.action === "app-settings") {
        setAppSettingsCategory("image-generation");
        setAppSettingsOpen(true);
      } else if (event.action === "show-about") {
        setAppSettingsCategory("about");
        setAppSettingsOpen(true);
      }
    });
    bridge.notifyRendererReady?.();
    return () => {
      disposed = true;
      unsubscribeProjectViews?.();
      unsubscribeMenu();
    };
  }, [applyOpenedBundle, bridge]);

  if (!bridge) {
    return (
      <div className="image-board-app">
        <div className="welcome-pane">
          <p role="alert">CoreStudio 桌面桥接不可用。</p>
        </div>
      </div>
    );
  }

  const activeProject = projectViewsState.activeProjectPath
    ? projectViewsState.projects.find(
        (project) =>
          project.projectPath === projectViewsState.activeProjectPath,
      ) ?? null
    : null;
  const titlebar = (
    <DesktopProjectTabs
      tabs={projectViewsState.projects.map((project) => ({
        projectPath: project.projectPath,
        name: project.name,
      }))}
      activeProjectPath={projectViewsState.activeProjectPath}
      theme={activeProject?.theme ?? "light"}
      onShowHome={() => {
        void runProjectViewAction(() => bridge.activateProjectView?.(null));
      }}
      onActivateProject={(projectPath) => {
        void runProjectViewAction(() =>
          bridge.activateProjectView?.(projectPath),
        );
      }}
      onCloseProject={(projectPath) => {
        void runProjectViewAction(() => bridge.closeProjectView?.(projectPath));
      }}
    />
  );
  const projectFailureContent =
    activeProject?.status === "crashed" ? (
      <div className="welcome-pane">
        <section
          className="welcome-pane__card welcome-pane__diagnostic"
          aria-labelledby="project-renderer-crashed-title"
        >
          <span className="welcome-pane__eyebrow">项目恢复</span>
          <h1 id="project-renderer-crashed-title">项目画布需要重新载入</h1>
          <p>
            “{activeProject.name}”的画布进程已停止。其他已打开项目不受影响。
          </p>
          <div className="welcome-pane__actions">
            <DesktopButton
              type="button"
              variant="primary"
              onClick={() => {
                void runProjectViewAction(() =>
                  bridge.recoverProjectView?.(activeProject.projectPath),
                );
              }}
            >
              重新载入{activeProject.name}
            </DesktopButton>
          </div>
        </section>
      </div>
    ) : undefined;

  return (
    <>
      <AppProjectEntryScreen
        titlebar={titlebar}
        content={projectFailureContent}
        startupError={startupError}
        projectError={projectError}
        loadingProject={loadingProject}
        recentProjects={recentProjects}
        onCreateProject={() => {
          void runProjectAction(() => bridge.createProject());
        }}
        onOpenProject={() => {
          void runProjectAction(() => bridge.openProject());
        }}
        onOpenRecentProject={(projectPath) => {
          if (!bridge.openProjectView) {
            return;
          }
          setLoadingProject(true);
          setProjectError(null);
          void bridge
            .openProjectView(projectPath)
            .then(async (state) => {
              setProjectViewsState(state);
              setRecentProjects(await bridge.loadRecentProjects());
            })
            .catch((error) => {
              setProjectError(
                error instanceof Error ? error.message : String(error || ""),
              );
            })
            .finally(() => {
              setLoadingProject(false);
            });
        }}
        onRemoveRecentProject={async (projectPath) => {
          if (!bridge.removeRecentProject) {
            return;
          }
          setRecentProjects(await bridge.removeRecentProject(projectPath));
        }}
        onRevealProject={(projectPath) =>
          bridge.revealProjectInFinder(projectPath)
        }
        manualProjectActionsVisible={true}
        globalDialogs={null}
      />
      <ShellApplicationSettings
        bridge={bridge}
        open={appSettingsOpen}
        activeCategory={appSettingsCategory}
        localePreference={localePreference}
        onCategoryChange={setAppSettingsCategory}
        onLocalePreferenceChange={onLocalePreferenceChange}
        onClose={() => setAppSettingsOpen(false)}
      />
    </>
  );
};
