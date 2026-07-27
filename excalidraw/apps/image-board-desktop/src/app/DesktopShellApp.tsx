import { useCallback, useEffect, useState } from "react";

import type {
  DesktopProjectBundle,
  DesktopProjectTheme,
  DesktopProjectViewsState,
  ProviderConfigurationSnapshot,
  RecentProjectEntry,
} from "../shared/desktopBridgeTypes";
import type { DesktopLocalePreference } from "../shared/desktopLocale";
import { getConfiguredProviderIds } from "../shared/providerCatalog";
import { maybeGetDesktopBridge } from "./desktopBridge";
import { AppProjectEntryScreen } from "./components/AppProjectEntryScreen";
import type { ApplicationSettingsCategory } from "./components/ApplicationSettingsDialog";
import { DesktopButton } from "./components/DesktopButton";
import { DesktopProjectTabs } from "./components/DesktopProjectTabs";
import { ShellApplicationSettings } from "./components/ShellApplicationSettings";
import type { RecentProjectsLoadStatus } from "./desktopStartupState";

const EMPTY_PROJECT_VIEWS_STATE: DesktopProjectViewsState = {
  activeProjectPath: null,
  projects: [],
};

const getInitialShellTheme = (): DesktopProjectTheme =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

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
  const [recentProjectsLoadStatus, setRecentProjectsLoadStatus] =
    useState<RecentProjectsLoadStatus>("loading");
  const [providerConfiguration, setProviderConfiguration] =
    useState<ProviderConfigurationSnapshot | null>(null);
  const [loadingProject, setLoadingProject] = useState(false);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [shellTheme, setShellTheme] =
    useState<DesktopProjectTheme>(getInitialShellTheme);
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
      setRecentProjectsLoadStatus("loaded");
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
        setRecentProjectsLoadStatus("loaded");
      })
      .catch((error) => {
        if (!disposed) {
          setRecentProjectsLoadStatus("failed");
          setStartupError(
            error instanceof Error ? error.message : String(error || ""),
          );
        }
      });
    void bridge
      .loadProviderSettings()
      .then((configuration) => {
        if (!disposed) {
          setProviderConfiguration(configuration);
        }
      })
      .catch(() => undefined);
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

  const activeProject = projectViewsState.activeProjectPath
    ? projectViewsState.projects.find(
        (project) =>
          project.projectPath === projectViewsState.activeProjectPath,
      ) ?? null
    : null;
  const currentShellTheme = activeProject?.theme ?? shellTheme;

  useEffect(() => {
    if (activeProject?.theme) {
      setShellTheme(activeProject.theme);
    }
  }, [activeProject?.theme]);

  if (!bridge) {
    return (
      <div className="image-board-app" data-theme={currentShellTheme}>
        <div className="welcome-pane">
          <p role="alert">CoreStudio 桌面桥接不可用。</p>
        </div>
      </div>
    );
  }

  const titlebar = (
    <DesktopProjectTabs
      tabs={projectViewsState.projects.map((project) => ({
        projectPath: project.projectPath,
        name: project.name,
      }))}
      activeProjectPath={projectViewsState.activeProjectPath}
      theme={currentShellTheme}
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

  const applicationSettings = (
    <ShellApplicationSettings
      bridge={bridge}
      open={appSettingsOpen}
      activeCategory={appSettingsCategory}
      localePreference={localePreference}
      onCategoryChange={setAppSettingsCategory}
      onLocalePreferenceChange={onLocalePreferenceChange}
      onProviderConfigurationChange={setProviderConfiguration}
      onClose={() => setAppSettingsOpen(false)}
    />
  );

  return (
    <>
      <AppProjectEntryScreen
        titlebar={titlebar}
        content={projectFailureContent}
        startupError={startupError}
        projectError={projectError}
        loadingProject={loadingProject}
        recentProjects={recentProjects}
        recentProjectsLoadStatus={recentProjectsLoadStatus}
        providerConfigurationStatus={
          providerConfiguration === null
            ? "loading"
            : getConfiguredProviderIds(providerConfiguration.providers).length
            ? "configured"
            : "not-configured"
        }
        onCreateProject={() => {
          void runProjectAction(() => bridge.createProject());
        }}
        onOpenProject={() => {
          void runProjectAction(() => bridge.openProject());
        }}
        onOpenProviderSettings={() => {
          setAppSettingsCategory("image-generation");
          setAppSettingsOpen(true);
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
              setRecentProjectsLoadStatus("loaded");
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
          setRecentProjectsLoadStatus("loaded");
        }}
        onRevealProject={(projectPath) =>
          bridge.revealProjectInFinder(projectPath)
        }
        manualProjectActionsVisible={true}
        globalDialogs={applicationSettings}
        theme={currentShellTheme}
      />
    </>
  );
};
