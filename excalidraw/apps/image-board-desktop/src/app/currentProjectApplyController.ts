import type {
  DesktopProjectBundle,
  ProjectAssetPayload,
  ProjectHealthReport,
} from "../shared/desktopBridgeTypes";
import { unmarkMissingRecentProjectMessage } from "../shared/recentProjectErrors";
import {
  buildEditorInitializingUpdatePlan,
  buildCurrentProjectUpdateState,
  getNextProjectOpenSequence,
  isProjectOpenSequenceCurrent,
  scheduleEditorInitializingFallbackClearAction,
  scheduleEditorReadyInitializingClearAction,
  shouldHideEditorLoading,
  type CurrentProjectUpdateState,
} from "./currentProjectState";
import type { ProjectRepairReport } from "./project/projectMaintenanceController";
import type { AcpThreadSummariesLoadState } from "./agent/acpThreadState";
import type { AcpRunLogTargetRendererActions } from "./agent/acpRunLogApplyController";
import {
  prepareProjectBundleOpenData,
  type ProjectBundleOpenAssetReadInput,
  type ProjectBundleOpenData,
  type ProjectBundleOpenLatestScene,
} from "./currentProjectOpenData";
import type { ProjectThumbnailMaintenanceResult } from "./project/projectMaintenanceController";

interface CurrentProjectClearableRef<T> {
  current: T;
}

interface CurrentProjectMutableRef<T> {
  current: T;
}

export interface ApplyCurrentProjectUpdateStateInput {
  state: CurrentProjectUpdateState;
  clearAcpRunLogRefreshTimer: () => void;
  setCurrentProject: (project: DesktopProjectBundle | null) => void;
  setSavedSceneHash: (hash: string | null) => void;
  setActiveAcpThreadId: (threadId: null) => void;
  setAcpRunLogTaskId: (taskId: null) => void;
  setAcpRunLogSurface: (surface: null) => void;
  setAcpRunLogDetail: (detail: null) => void;
  setAcpRunLogError: (error: null) => void;
  setAcpConversationEntries: (entries: []) => void;
  applyAcpThreadSummariesState: (state: AcpThreadSummariesLoadState) => void;
  setAgentChatDockOpen: (open: false) => void;
  setProjectHealthReport: (report: ProjectHealthReport | null) => void;
  setProjectRepairReport: (report: ProjectRepairReport | null) => void;
  setProjectHealthReportOpen: (open: false) => void;
}

export interface RunCurrentProjectUpdateActionInput
  extends Omit<ApplyCurrentProjectUpdateStateInput, "state"> {
  previousProject: DesktopProjectBundle | null;
  nextProject: DesktopProjectBundle | null;
  notifyProjectState: (project: DesktopProjectBundle | null) => void;
  syncAgentBridgeStatus: (project: DesktopProjectBundle | null) => void;
}

export const applyCurrentProjectUpdateState = ({
  state,
  clearAcpRunLogRefreshTimer,
  setCurrentProject,
  setSavedSceneHash,
  setActiveAcpThreadId,
  setAcpRunLogTaskId,
  setAcpRunLogSurface,
  setAcpRunLogDetail,
  setAcpRunLogError,
  setAcpConversationEntries,
  applyAcpThreadSummariesState,
  setAgentChatDockOpen,
  setProjectHealthReport,
  setProjectRepairReport,
  setProjectHealthReportOpen,
}: ApplyCurrentProjectUpdateStateInput): CurrentProjectUpdateState => {
  setCurrentProject(state.project);
  setSavedSceneHash(state.savedSceneHash);

  if (!state.resetState) {
    return state;
  }

  const { resetState } = state;
  clearAcpRunLogRefreshTimer();
  setActiveAcpThreadId(resetState.activeAcpThreadId);
  setAcpRunLogTaskId(resetState.acpRunLogTaskId);
  setAcpRunLogSurface(resetState.acpRunLogSurface);
  setAcpRunLogDetail(resetState.acpRunLogDetail);
  setAcpRunLogError(resetState.acpRunLogError);
  setAcpConversationEntries(resetState.acpConversationEntries);
  applyAcpThreadSummariesState({
    summaries: resetState.acpThreadSummaries,
    error: resetState.acpThreadSummariesError,
    loading: resetState.acpThreadSummariesLoading,
  });
  setAgentChatDockOpen(resetState.agentChatDockOpen);
  setProjectHealthReport(resetState.projectHealthReport);
  setProjectRepairReport(resetState.projectRepairReport);
  setProjectHealthReportOpen(resetState.projectHealthReportOpen);

  return state;
};

export const runCurrentProjectUpdateAction = ({
  previousProject,
  nextProject,
  notifyProjectState,
  syncAgentBridgeStatus,
  ...applyInput
}: RunCurrentProjectUpdateActionInput): CurrentProjectUpdateState => {
  const state = buildCurrentProjectUpdateState({
    previousProject,
    nextProject,
  });

  applyCurrentProjectUpdateState({
    state,
    ...applyInput,
  });
  notifyProjectState(state.project);
  syncAgentBridgeStatus(state.project);

  return state;
};

export interface CurrentProjectUpdateRendererActionsInput
  extends Omit<
    RunCurrentProjectUpdateActionInput,
    | "previousProject"
    | "nextProject"
    | "setCurrentProject"
    | "setSavedSceneHash"
    | "setAcpRunLogTaskId"
    | "setAcpRunLogSurface"
  > {
  getPreviousProject: () => DesktopProjectBundle | null;
  setCurrentProjectRef: (project: DesktopProjectBundle | null) => void;
  setCurrentProject: (project: DesktopProjectBundle | null) => void;
  setSavedSceneHashRef: (hash: string | null) => void;
  runLogTargetActions: AcpRunLogTargetRendererActions;
}

export interface CurrentProjectUpdateRendererActions {
  update(project: DesktopProjectBundle | null): CurrentProjectUpdateState;
}

export const createCurrentProjectUpdateRendererActions = ({
  getPreviousProject,
  setCurrentProjectRef,
  setCurrentProject,
  setSavedSceneHashRef,
  runLogTargetActions,
  ...input
}: CurrentProjectUpdateRendererActionsInput): CurrentProjectUpdateRendererActions => {
  return {
    update: (project) =>
      runCurrentProjectUpdateAction({
        previousProject: getPreviousProject(),
        nextProject: project,
        ...input,
        setCurrentProject: (nextProject) => {
          setCurrentProjectRef(nextProject);
          setCurrentProject(nextProject);
        },
        setSavedSceneHash: setSavedSceneHashRef,
        setAcpRunLogTaskId: runLogTargetActions.setTaskId,
        setAcpRunLogSurface: runLogTargetActions.setSurface,
      }),
  };
};

export interface ProjectViewClearRendererActionsInput {
  beginProjectOpen: () => void;
  editorApiRef: CurrentProjectClearableRef<unknown>;
  latestSceneRef: CurrentProjectClearableRef<unknown>;
  setSceneImageFileIds: (fileIds: []) => void;
  updateCurrentProject: (project: null) => void;
  setInitialData: (initialData: null) => void;
  setWorkspaceOverlayState: (state: null) => void;
  resetWorkspaceZoomGate: () => void;
  updateEditorInitializing: (initializing: false) => void;
  setSelectedRecord: (record: null) => void;
  setSelectedTask: (task: null) => void;
  lastCanvasPointerRef: CurrentProjectClearableRef<unknown>;
  lastBatchBoundsRef: CurrentProjectClearableRef<unknown>;
  resetGenerationTrackingState: () => void;
  resetImageRenditionState: () => void;
}

export const runProjectViewClearAction = ({
  beginProjectOpen,
  editorApiRef,
  latestSceneRef,
  setSceneImageFileIds,
  updateCurrentProject,
  setInitialData,
  setWorkspaceOverlayState,
  resetWorkspaceZoomGate,
  updateEditorInitializing,
  setSelectedRecord,
  setSelectedTask,
  lastCanvasPointerRef,
  lastBatchBoundsRef,
  resetGenerationTrackingState,
  resetImageRenditionState,
}: ProjectViewClearRendererActionsInput) => {
  beginProjectOpen();
  editorApiRef.current = null;
  latestSceneRef.current = null;
  setSceneImageFileIds([]);
  updateCurrentProject(null);
  setInitialData(null);
  setWorkspaceOverlayState(null);
  resetWorkspaceZoomGate();
  updateEditorInitializing(false);
  setSelectedRecord(null);
  setSelectedTask(null);
  lastCanvasPointerRef.current = null;
  lastBatchBoundsRef.current = null;
  resetGenerationTrackingState();
  resetImageRenditionState();
};

export const createProjectViewClearRendererActions = (
  input: ProjectViewClearRendererActionsInput,
) => ({
  clear: () => {
    runProjectViewClearAction(input);
  },
});

export interface CurrentProjectRenderErrorDetail {
  message: string;
  stack: string | null;
  componentStack: string | null;
  projectPath: string | null;
}

export const runCurrentProjectRenderErrorAction = ({
  error,
  componentStack,
  project,
  logError,
  updateEditorInitializing,
}: {
  error: Error;
  componentStack: string | null;
  project: DesktopProjectBundle | null;
  logError: (
    message: "[project-render-error]",
    detail: CurrentProjectRenderErrorDetail,
  ) => void;
  updateEditorInitializing: (initializing: false) => void;
}): CurrentProjectRenderErrorDetail => {
  const detail: CurrentProjectRenderErrorDetail = {
    message: error.message,
    stack: error.stack || null,
    componentStack,
    projectPath: project?.projectPath || null,
  };

  logError("[project-render-error]", detail);
  updateEditorInitializing(false);

  return detail;
};

export interface CurrentProjectRenderBoundaryRendererActionsInput {
  getCurrentProject: () => DesktopProjectBundle | null;
  logError: (
    message: "[project-render-error]",
    detail: CurrentProjectRenderErrorDetail,
  ) => void;
  updateEditorInitializing: (initializing: false) => void;
  clearProjectViewState: () => void;
}

export const createCurrentProjectRenderBoundaryRendererActions = ({
  getCurrentProject,
  logError,
  updateEditorInitializing,
  clearProjectViewState,
}: CurrentProjectRenderBoundaryRendererActionsInput) => ({
  reportRenderError: (error: Error, componentStack: string | null) =>
    runCurrentProjectRenderErrorAction({
      error,
      componentStack,
      project: getCurrentProject(),
      logError,
      updateEditorInitializing,
    }),
  resetProjectView: () => {
    clearProjectViewState();
  },
});

export interface CurrentProjectEditorInitializingRendererActionsInput<
  TimerId = number,
> {
  getCurrentRenderNonce: () => number | null;
  setCurrentRenderNonceRef: (renderNonce: number | null) => void;
  setInitializingRef: (initializing: boolean) => void;
  setInitializing: (initializing: boolean) => void;
  getEditorApi: () => unknown | null;
  scheduleFallbackTimeout: (callback: () => void, delayMs: number) => TimerId;
  clearFallbackTimeout: (timerId: TimerId) => void;
}

export interface CurrentProjectEditorInitializingFallbackInput {
  isEditorInitializing: boolean;
  renderNonce: number;
}

export interface CurrentProjectEditorInitializingRendererActions {
  update(initializing: boolean, renderNonce?: number): boolean;
  hideLoading(renderNonce: number): boolean;
  startFallbackClear(
    input: CurrentProjectEditorInitializingFallbackInput,
  ): (() => void) | undefined;
}

export const createCurrentProjectEditorInitializingRendererActions = ({
  getCurrentRenderNonce,
  setCurrentRenderNonceRef,
  setInitializingRef,
  setInitializing,
  getEditorApi,
  scheduleFallbackTimeout,
  clearFallbackTimeout,
}: CurrentProjectEditorInitializingRendererActionsInput): CurrentProjectEditorInitializingRendererActions => {
  const hideLoading = (renderNonce: number): boolean => {
    if (
      !shouldHideEditorLoading({
        currentRenderNonce: getCurrentRenderNonce(),
        renderNonce,
      })
    ) {
      return false;
    }

    setInitializing(false);
    return true;
  };

  return {
    update: (initializing, renderNonce) => {
      const plan = buildEditorInitializingUpdatePlan({
        currentRenderNonce: getCurrentRenderNonce(),
        initializing,
        renderNonce,
      });
      if (!plan.shouldApply) {
        return false;
      }

      setInitializingRef(plan.nextInitializing);
      setCurrentRenderNonceRef(plan.nextRenderNonce);
      setInitializing(plan.nextInitializing);
      return true;
    },
    hideLoading,
    startFallbackClear: ({ isEditorInitializing, renderNonce }) =>
      scheduleEditorInitializingFallbackClearAction({
        isEditorInitializing,
        renderNonce,
        getCurrentRenderNonce: () => getCurrentRenderNonce() ?? -1,
        hasEditorApi: () => Boolean(getEditorApi()),
        scheduleTimeout: scheduleFallbackTimeout,
        clearTimeout: clearFallbackTimeout,
        hideEditorLoading: hideLoading,
      }) ?? undefined,
  };
};

export interface CurrentProjectOpenSequenceRendererActionsInput {
  getCurrentSequence: () => number;
  setCurrentSequenceRef: (sequence: number) => void;
}

export interface CurrentProjectOpenSequenceRendererActions {
  begin: () => number;
  isCurrent: (sequence: number) => boolean;
}

export const createCurrentProjectOpenSequenceRendererActions = ({
  getCurrentSequence,
  setCurrentSequenceRef,
}: CurrentProjectOpenSequenceRendererActionsInput): CurrentProjectOpenSequenceRendererActions => ({
  begin: () => {
    const nextSequence = getNextProjectOpenSequence(getCurrentSequence());
    setCurrentSequenceRef(nextSequence);
    return nextSequence;
  },
  isCurrent: (sequence) =>
    isProjectOpenSequenceCurrent({
      currentSequence: getCurrentSequence(),
      sequence,
    }),
});

export const runCurrentProjectEditorReadyAction = <Api, Scene, TimerId>({
  api,
  renderNonce,
  currentRenderNonce,
  latestScene,
  setEditorApi,
  flushQueuedImageFilesToCanvas,
  scheduleVisibleImageRenditionLoad,
  requestAnimationFrame,
  scheduleTimeout,
  clearInitializing,
}: {
  api: Api | null;
  renderNonce: number;
  currentRenderNonce: number;
  latestScene: Scene | null;
  setEditorApi: (api: Api) => void;
  flushQueuedImageFilesToCanvas: () => void;
  scheduleVisibleImageRenditionLoad: (scene: Scene | null) => void;
  requestAnimationFrame:
    | ((callback: FrameRequestCallback) => number)
    | null
    | undefined;
  scheduleTimeout: (callback: () => void, delayMs: number) => TimerId;
  clearInitializing: (renderNonce: number) => void;
}):
  | {
      status: "stale";
    }
  | {
      status: "ready";
      apiApplied: boolean;
    } => {
  if (renderNonce !== currentRenderNonce) {
    return { status: "stale" };
  }

  if (api) {
    setEditorApi(api);
    flushQueuedImageFilesToCanvas();
    scheduleVisibleImageRenditionLoad(latestScene);
  }

  scheduleEditorReadyInitializingClearAction({
    renderNonce,
    requestAnimationFrame,
    scheduleTimeout,
    clearInitializing,
  });

  return {
    status: "ready",
    apiApplied: Boolean(api),
  };
};

export interface CurrentProjectEditorReadyRendererActionsInput<
  Api,
  Scene,
  TimerId,
> {
  getCurrentRenderNonce: () => number;
  getLatestScene: () => Scene | null;
  setEditorApi: (api: Api) => void;
  flushQueuedImageFilesToCanvas: () => void;
  scheduleVisibleImageRenditionLoad: (scene: Scene | null) => void;
  requestAnimationFrame:
    | ((callback: FrameRequestCallback) => number)
    | null
    | undefined;
  scheduleTimeout: (callback: () => void, delayMs: number) => TimerId;
  clearInitializing: (renderNonce: number) => void;
}

export const createCurrentProjectEditorReadyRendererActions = <
  Api,
  Scene,
  TimerId,
>({
  getCurrentRenderNonce,
  getLatestScene,
  setEditorApi,
  flushQueuedImageFilesToCanvas,
  scheduleVisibleImageRenditionLoad,
  requestAnimationFrame,
  scheduleTimeout,
  clearInitializing,
}: CurrentProjectEditorReadyRendererActionsInput<Api, Scene, TimerId>) => ({
  ready: (api: Api | null, renderNonce: number) =>
    runCurrentProjectEditorReadyAction({
      api,
      renderNonce,
      currentRenderNonce: getCurrentRenderNonce(),
      latestScene: getLatestScene(),
      setEditorApi,
      flushQueuedImageFilesToCanvas,
      scheduleVisibleImageRenditionLoad,
      requestAnimationFrame,
      scheduleTimeout,
      clearInitializing,
    }),
});

export const runCurrentProjectCommandStartAction = ({
  setProjectError,
  clearProjectNotice,
}: {
  setProjectError: (message: null) => void;
  clearProjectNotice: () => void;
}) => {
  setProjectError(null);
  clearProjectNotice();
};

export const runCurrentProjectCommandFailureAction = ({
  error,
  formatError,
  setProjectError,
}: {
  error: unknown;
  formatError: (error: unknown) => string;
  setProjectError: (message: string) => void;
}) => {
  setProjectError(formatError(error));
};

export const runCurrentProjectRevealAction = async ({
  project,
  revealProjectInFinder,
  formatError,
  setProjectError,
}: {
  project: DesktopProjectBundle | null;
  revealProjectInFinder: (projectPath: string) => Promise<void>;
  formatError: (error: unknown) => string;
  setProjectError: (message: string) => void;
}): Promise<
  | { status: "skipped" }
  | { status: "revealed" }
  | {
      status: "failed";
      error: unknown;
    }
> => {
  if (!project) {
    return { status: "skipped" };
  }

  try {
    await revealProjectInFinder(project.projectPath);
    return { status: "revealed" };
  } catch (error) {
    runCurrentProjectCommandFailureAction({
      error,
      formatError,
      setProjectError,
    });
    return {
      status: "failed",
      error,
    };
  }
};

export const runCurrentProjectAutosaveFailureAction = ({
  error,
  formatError,
  logError,
  setProjectError,
}: {
  error: unknown;
  formatError: (error: unknown) => string;
  logError: (message: string, error: unknown) => void;
  setProjectError: (message: string) => void;
}) => {
  logError("[project:autosave-failed]", error);
  setProjectError(formatError(error));
};

export interface CurrentProjectAutosaveFailureRendererActionsInput {
  formatError: (error: unknown) => string;
  logError: (message: string, error: unknown) => void;
  setProjectError: (message: string) => void;
}

export const createCurrentProjectAutosaveFailureRendererActions = ({
  formatError,
  logError,
  setProjectError,
}: CurrentProjectAutosaveFailureRendererActionsInput) => ({
  report: (error: unknown) =>
    runCurrentProjectAutosaveFailureAction({
      error,
      formatError,
      logError,
      setProjectError,
    }),
});

export const runCurrentProjectEntryMenuFailureAction = ({
  errorMessage,
  fallbackMessage,
  setProjectError,
  clearProjectNotice,
}: {
  errorMessage?: string | null;
  fallbackMessage: string;
  setProjectError: (message: string) => void;
  clearProjectNotice: () => void;
}) => {
  const normalizedErrorMessage = errorMessage
    ? unmarkMissingRecentProjectMessage(errorMessage) ?? errorMessage
    : fallbackMessage;
  setProjectError(normalizedErrorMessage || fallbackMessage);
  clearProjectNotice();
};

export const runCurrentProjectSwitchToListAction = async ({
  flushPendingAutosave,
  clearProjectViewState,
  loadRecentProjectsState,
  formatError,
  setProjectError,
  clearProjectNotice,
}: {
  flushPendingAutosave: (options: { strict: true }) => Promise<unknown>;
  clearProjectViewState: () => void;
  loadRecentProjectsState: () => void | Promise<void>;
  formatError: (error: unknown) => string;
  setProjectError: (message: string | null) => void;
  clearProjectNotice: () => void;
}): Promise<
  | { status: "switched" }
  | {
      status: "failed";
      error: unknown;
    }
> => {
  runCurrentProjectCommandStartAction({
    setProjectError,
    clearProjectNotice,
  });

  try {
    await flushPendingAutosave({ strict: true });
  } catch (error) {
    runCurrentProjectCommandFailureAction({
      error,
      formatError,
      setProjectError,
    });
    return {
      status: "failed",
      error,
    };
  }

  clearProjectViewState();
  await loadRecentProjectsState();

  return { status: "switched" };
};

export const runCurrentProjectEntryStartAction = ({
  setLoadingProject,
  setProjectError,
  clearProjectNotice,
}: {
  setLoadingProject: (loading: true) => void;
  setProjectError: (message: null) => void;
  clearProjectNotice: () => void;
}) => {
  setLoadingProject(true);
  setProjectError(null);
  clearProjectNotice();
};

export const runCurrentProjectEntryCompleteAction = ({
  sequence,
  isCurrentProjectOpen,
  setLoadingProject,
}: {
  sequence: number;
  isCurrentProjectOpen: (sequence: number) => boolean;
  setLoadingProject: (loading: false) => void;
}): boolean => {
  if (!isCurrentProjectOpen(sequence)) {
    return false;
  }

  setLoadingProject(false);

  return true;
};

export const runCurrentProjectEntryPreflightFailureAction = ({
  sequence,
  isCurrentProjectOpen,
  error,
  formatError,
  setProjectError,
}: {
  sequence: number;
  isCurrentProjectOpen: (sequence: number) => boolean;
  error: unknown;
  formatError: (error: unknown) => string;
  setProjectError: (message: string) => void;
}): boolean => {
  if (!isCurrentProjectOpen(sequence)) {
    return false;
  }

  setProjectError(formatError(error));

  return true;
};

export const runCurrentProjectEntryFailureAction = ({
  sequence,
  isCurrentProjectOpen,
  error,
  formatError,
  setProjectError,
  setLoadingProject,
  updateEditorInitializing,
}: {
  sequence: number;
  isCurrentProjectOpen: (sequence: number) => boolean;
  error: unknown;
  formatError: (error: unknown) => string;
  setProjectError: (message: string) => void;
  setLoadingProject: (loading: false) => void;
  updateEditorInitializing: (initializing: false) => void;
}): boolean => {
  if (!isCurrentProjectOpen(sequence)) {
    return false;
  }

  setProjectError(formatError(error));
  setLoadingProject(false);
  updateEditorInitializing(false);

  return true;
};

export const runCurrentProjectEntryOpenAction = async ({
  beginProjectOpen,
  readProjectBundle,
  openProjectBundle,
  isCurrentProjectOpen,
  formatError,
  setProjectError,
  setLoadingProject,
  updateEditorInitializing,
  onFailureApplied,
}: {
  beginProjectOpen: () => number;
  readProjectBundle: () => Promise<DesktopProjectBundle | null>;
  openProjectBundle: (
    project: DesktopProjectBundle | null,
    sequence: number,
  ) => Promise<unknown>;
  isCurrentProjectOpen: (sequence: number) => boolean;
  formatError: (error: unknown) => string;
  setProjectError: (message: string) => void;
  setLoadingProject: (loading: false) => void;
  updateEditorInitializing: (initializing: false) => void;
  onFailureApplied?: () => void | Promise<void>;
}): Promise<
  | { status: "opened"; sequence: number }
  | { status: "failed"; sequence: number; applied: boolean }
> => {
  const sequence = beginProjectOpen();

  try {
    await openProjectBundle(await readProjectBundle(), sequence);
    return {
      status: "opened",
      sequence,
    };
  } catch (error) {
    const applied = runCurrentProjectEntryFailureAction({
      sequence,
      isCurrentProjectOpen,
      error,
      formatError,
      setProjectError,
      setLoadingProject,
      updateEditorInitializing,
    });
    if (applied) {
      await onFailureApplied?.();
    }
    return {
      status: "failed",
      sequence,
      applied,
    };
  }
};

interface CurrentProjectEntryBridge {
  createProject: () => Promise<DesktopProjectBundle | null>;
  openProject: () => Promise<DesktopProjectBundle | null>;
  openRecentProject?: (
    projectPath: string,
  ) => Promise<DesktopProjectBundle | null>;
  revealProjectInFinder: (projectPath: string) => Promise<void>;
}

export interface CurrentProjectEntryRendererActionsInput {
  getBridge: () => CurrentProjectEntryBridge;
  getCurrentProject: () => DesktopProjectBundle | null;
  beginProjectOpen: () => number;
  openProjectBundle: (
    project: DesktopProjectBundle | null,
    sequence: number,
  ) => Promise<unknown>;
  isCurrentProjectOpen: (sequence: number) => boolean;
  flushPendingAutosave: (options: { strict: true }) => Promise<unknown>;
  clearProjectViewState: () => void;
  loadRecentProjectsState: () => void | Promise<void>;
  formatCreateError: (error: unknown) => string;
  formatOpenError: (error: unknown) => string;
  formatSaveBeforeOpenError: (error: unknown) => string;
  formatRevealError: (error: unknown) => string;
  setProjectError: (message: string | null) => void;
  setLoadingProject: (loading: false) => void;
  updateEditorInitializing: (initializing: false) => void;
  clearProjectNotice: () => void;
}

export const createCurrentProjectEntryRendererActions = ({
  getBridge,
  getCurrentProject,
  beginProjectOpen,
  openProjectBundle,
  isCurrentProjectOpen,
  flushPendingAutosave,
  clearProjectViewState,
  loadRecentProjectsState,
  formatCreateError,
  formatOpenError,
  formatSaveBeforeOpenError,
  formatRevealError,
  setProjectError,
  setLoadingProject,
  updateEditorInitializing,
  clearProjectNotice,
}: CurrentProjectEntryRendererActionsInput) => ({
  createProject: () =>
    runCurrentProjectEntryOpenAction({
      beginProjectOpen,
      readProjectBundle: () => getBridge().createProject(),
      openProjectBundle,
      isCurrentProjectOpen,
      formatError: formatCreateError,
      setProjectError,
      setLoadingProject,
      updateEditorInitializing,
    }),
  openProject: () =>
    runCurrentProjectEntryOpenAction({
      beginProjectOpen,
      readProjectBundle: () => getBridge().openProject(),
      openProjectBundle,
      isCurrentProjectOpen,
      formatError: formatOpenError,
      setProjectError,
      setLoadingProject,
      updateEditorInitializing,
    }),
  openRecentProject: (projectPath: string) =>
    runCurrentProjectEntryOpenAction({
      beginProjectOpen,
      readProjectBundle: () =>
        getBridge().openRecentProject?.(projectPath) ?? Promise.resolve(null),
      openProjectBundle,
      isCurrentProjectOpen,
      formatError: formatOpenError,
      setProjectError,
      setLoadingProject,
      updateEditorInitializing,
      onFailureApplied: loadRecentProjectsState,
    }),
  switchToProjectList: () =>
    runCurrentProjectSwitchToListAction({
      flushPendingAutosave,
      clearProjectViewState,
      loadRecentProjectsState,
      formatError: formatSaveBeforeOpenError,
      setProjectError,
      clearProjectNotice,
    }),
  revealProject: () =>
    runCurrentProjectRevealAction({
      project: getCurrentProject(),
      revealProjectInFinder: getBridge().revealProjectInFinder,
      formatError: formatRevealError,
      setProjectError,
    }),
});

export const runProjectBundleOpenSuccessAction = <
  Asset,
  ThumbnailMaintenance,
  InitialData,
  Elements,
  AppStateValue,
  Scene extends { elements: Elements; appState: AppStateValue },
>({
  project,
  assets,
  thumbnailMaintenance,
  initialData,
  latestScene,
  resetImageRenditionState,
  setThumbnailMaintenance,
  markImageAssetRenditionsLoaded,
  projectRenderNonceRef,
  editorApiRef,
  updateEditorInitializing,
  updateCurrentProject,
  setInitialData,
  setProjectRenderNonce,
  latestSceneRef,
  updateSceneImageFileIds,
  scheduleVisibleImageRenditionLoad,
  updateWorkspaceOverlay,
  resetWorkspaceZoomGate,
  lastCanvasPointerRef,
  setSelectedRecord,
  setSelectedTask,
  lastBatchBoundsRef,
  resetGenerationTrackingState,
}: {
  project: DesktopProjectBundle;
  assets: Asset[];
  thumbnailMaintenance: ThumbnailMaintenance;
  initialData: InitialData;
  latestScene: Scene;
  resetImageRenditionState: () => void;
  setThumbnailMaintenance: (maintenance: ThumbnailMaintenance) => void;
  markImageAssetRenditionsLoaded: (assets: Asset[]) => void;
  projectRenderNonceRef: CurrentProjectMutableRef<number>;
  editorApiRef: CurrentProjectClearableRef<unknown>;
  updateEditorInitializing: (initializing: true, renderNonce: number) => void;
  updateCurrentProject: (project: DesktopProjectBundle) => void;
  setInitialData: (initialData: InitialData) => void;
  setProjectRenderNonce: (renderNonce: number) => void;
  latestSceneRef: CurrentProjectMutableRef<Scene | null>;
  updateSceneImageFileIds: (elements: Elements) => void;
  scheduleVisibleImageRenditionLoad: (scene: Scene) => void;
  updateWorkspaceOverlay: (elements: Elements, appState: AppStateValue) => void;
  resetWorkspaceZoomGate: () => void;
  lastCanvasPointerRef: CurrentProjectClearableRef<unknown>;
  setSelectedRecord: (record: null) => void;
  setSelectedTask: (task: null) => void;
  lastBatchBoundsRef: CurrentProjectClearableRef<unknown>;
  resetGenerationTrackingState: () => void;
}): number => {
  resetImageRenditionState();
  setThumbnailMaintenance(thumbnailMaintenance);
  markImageAssetRenditionsLoaded(assets);

  const nextRenderNonce = projectRenderNonceRef.current + 1;
  projectRenderNonceRef.current = nextRenderNonce;
  editorApiRef.current = null;
  updateEditorInitializing(true, nextRenderNonce);
  updateCurrentProject(project);
  setInitialData(initialData);
  setProjectRenderNonce(nextRenderNonce);

  latestSceneRef.current = latestScene;
  updateSceneImageFileIds(latestScene.elements);
  scheduleVisibleImageRenditionLoad(latestScene);
  updateWorkspaceOverlay(latestScene.elements, latestScene.appState);
  resetWorkspaceZoomGate();

  lastCanvasPointerRef.current = null;
  setSelectedRecord(null);
  setSelectedTask(null);
  lastBatchBoundsRef.current = null;
  resetGenerationTrackingState();

  return nextRenderNonce;
};

export const runProjectBundleOpenFollowupAction = async ({
  project,
  missingThumbnailFileIds,
  safeModeOpenedMessage,
  showProjectNotice,
  rebuildMissingThumbnails,
  loadRecentProjectsState,
}: {
  project: DesktopProjectBundle;
  missingThumbnailFileIds: string[];
  safeModeOpenedMessage: string;
  showProjectNotice: (message: string) => void;
  rebuildMissingThumbnails: (
    project: DesktopProjectBundle,
    missingThumbnailFileIds: string[],
  ) => Promise<unknown> | unknown;
  loadRecentProjectsState: () => void | Promise<void>;
}): Promise<
  | {
      status: "safe-mode-opened";
    }
  | {
      status: "opened";
    }
> => {
  if (project.safeMode) {
    showProjectNotice(safeModeOpenedMessage);
    await loadRecentProjectsState();

    return {
      status: "safe-mode-opened",
    };
  }

  void rebuildMissingThumbnails(project, missingThumbnailFileIds);
  await loadRecentProjectsState();

  return {
    status: "opened",
  };
};

export interface CurrentProjectBundleOpenRendererActionsInput {
  beginProjectOpen: () => number;
  isCurrentProjectOpen: (sequence: number) => boolean;
  flushPendingAutosave: (options: { strict: true }) => Promise<unknown>;
  getDevicePixelRatio: () => number;
  getFallbackCreatedAt: () => number;
  readProjectAssets: (
    input: ProjectBundleOpenAssetReadInput,
  ) => Promise<ProjectAssetPayload[]>;
  setLoadingProject: (loading: boolean) => void;
  setProjectError: (message: string | null) => void;
  clearProjectNotice: () => void;
  formatSaveBeforeOpenError: (error: unknown) => string;
  formatOpenError: (error: unknown) => string;
  resetImageRenditionState: () => void;
  setThumbnailMaintenance: (
    maintenance: ProjectThumbnailMaintenanceResult,
  ) => void;
  markImageAssetRenditionsLoaded: (assets: ProjectAssetPayload[]) => void;
  projectRenderNonceRef: CurrentProjectMutableRef<number>;
  editorApiRef: CurrentProjectClearableRef<unknown>;
  updateEditorInitializing: (
    initializing: boolean,
    renderNonce?: number,
  ) => void;
  updateCurrentProject: (project: DesktopProjectBundle) => void;
  setInitialData: (initialData: ProjectBundleOpenData["initialData"]) => void;
  setProjectRenderNonce: (renderNonce: number) => void;
  latestSceneRef: CurrentProjectMutableRef<ProjectBundleOpenLatestScene | null>;
  updateSceneImageFileIds: (
    elements: ProjectBundleOpenLatestScene["elements"],
  ) => void;
  scheduleVisibleImageRenditionLoad: (
    scene: ProjectBundleOpenLatestScene,
  ) => void;
  updateWorkspaceOverlay: (
    elements: ProjectBundleOpenLatestScene["elements"],
    appState: ProjectBundleOpenLatestScene["appState"],
  ) => void;
  resetWorkspaceZoomGate: () => void;
  lastCanvasPointerRef: CurrentProjectClearableRef<unknown>;
  setSelectedRecord: (record: null) => void;
  setSelectedTask: (task: null) => void;
  lastBatchBoundsRef: CurrentProjectClearableRef<unknown>;
  resetGenerationTrackingState: () => void;
  safeModeOpenedMessage: string;
  showProjectNotice: (message: string) => void;
  rebuildMissingThumbnails: (
    project: DesktopProjectBundle,
    missingThumbnailFileIds: string[],
  ) => Promise<unknown> | unknown;
  loadRecentProjectsState: () => void | Promise<void>;
}

export const runCurrentProjectBundleOpenRendererAction = async ({
  bundle,
  sequence,
  beginProjectOpen,
  isCurrentProjectOpen,
  flushPendingAutosave,
  getDevicePixelRatio,
  getFallbackCreatedAt,
  readProjectAssets,
  setLoadingProject,
  setProjectError,
  clearProjectNotice,
  formatSaveBeforeOpenError,
  formatOpenError,
  resetImageRenditionState,
  setThumbnailMaintenance,
  markImageAssetRenditionsLoaded,
  projectRenderNonceRef,
  editorApiRef,
  updateEditorInitializing,
  updateCurrentProject,
  setInitialData,
  setProjectRenderNonce,
  latestSceneRef,
  updateSceneImageFileIds,
  scheduleVisibleImageRenditionLoad,
  updateWorkspaceOverlay,
  resetWorkspaceZoomGate,
  lastCanvasPointerRef,
  setSelectedRecord,
  setSelectedTask,
  lastBatchBoundsRef,
  resetGenerationTrackingState,
  safeModeOpenedMessage,
  showProjectNotice,
  rebuildMissingThumbnails,
  loadRecentProjectsState,
}: CurrentProjectBundleOpenRendererActionsInput & {
  bundle: DesktopProjectBundle | null;
  sequence?: number;
}): Promise<
  | { status: "cancelled"; sequence: number }
  | { status: "preflight-failed"; sequence: number; applied: boolean }
  | { status: "stale"; sequence: number; stage: "preflight" | "prepare" }
  | {
      status: "opened";
      sequence: number;
      followupStatus: "safe-mode-opened" | "opened";
    }
  | { status: "failed"; sequence: number; applied: boolean; error: unknown }
> => {
  const openSequence = sequence ?? beginProjectOpen();

  if (!bundle) {
    runCurrentProjectEntryCompleteAction({
      sequence: openSequence,
      isCurrentProjectOpen,
      setLoadingProject,
    });
    return {
      status: "cancelled",
      sequence: openSequence,
    };
  }

  runCurrentProjectEntryStartAction({
    setLoadingProject,
    setProjectError,
    clearProjectNotice,
  });

  try {
    try {
      await flushPendingAutosave({ strict: true });
    } catch (error) {
      const applied = runCurrentProjectEntryPreflightFailureAction({
        sequence: openSequence,
        isCurrentProjectOpen,
        error,
        formatError: formatSaveBeforeOpenError,
        setProjectError,
      });
      return {
        status: "preflight-failed",
        sequence: openSequence,
        applied,
      };
    }

    if (!isCurrentProjectOpen(openSequence)) {
      return {
        status: "stale",
        sequence: openSequence,
        stage: "preflight",
      };
    }

    const openData = await prepareProjectBundleOpenData({
      project: bundle,
      devicePixelRatio: getDevicePixelRatio(),
      fallbackCreatedAt: getFallbackCreatedAt(),
      readProjectAssets,
    });
    if (!isCurrentProjectOpen(openSequence)) {
      return {
        status: "stale",
        sequence: openSequence,
        stage: "prepare",
      };
    }

    runProjectBundleOpenSuccessAction({
      project: bundle,
      assets: openData.assets,
      thumbnailMaintenance: openData.thumbnailMaintenance,
      initialData: openData.initialData,
      latestScene: openData.latestScene,
      resetImageRenditionState,
      setThumbnailMaintenance,
      markImageAssetRenditionsLoaded,
      projectRenderNonceRef,
      editorApiRef,
      updateEditorInitializing,
      updateCurrentProject,
      setInitialData,
      setProjectRenderNonce,
      latestSceneRef,
      updateSceneImageFileIds,
      scheduleVisibleImageRenditionLoad,
      updateWorkspaceOverlay,
      resetWorkspaceZoomGate,
      lastCanvasPointerRef,
      setSelectedRecord,
      setSelectedTask,
      lastBatchBoundsRef,
      resetGenerationTrackingState,
    });
    const followup = await runProjectBundleOpenFollowupAction({
      project: bundle,
      missingThumbnailFileIds: openData.missingThumbnailFileIds,
      safeModeOpenedMessage,
      showProjectNotice,
      rebuildMissingThumbnails,
      loadRecentProjectsState,
    });

    return {
      status: "opened",
      sequence: openSequence,
      followupStatus: followup.status,
    };
  } catch (error) {
    const applied = runCurrentProjectEntryFailureAction({
      sequence: openSequence,
      isCurrentProjectOpen,
      error,
      formatError: formatOpenError,
      setProjectError,
      setLoadingProject,
      updateEditorInitializing,
    });
    return {
      status: "failed",
      sequence: openSequence,
      applied,
      error,
    };
  } finally {
    runCurrentProjectEntryCompleteAction({
      sequence: openSequence,
      isCurrentProjectOpen,
      setLoadingProject,
    });
  }
};

export const createCurrentProjectBundleOpenRendererActions = (
  input: CurrentProjectBundleOpenRendererActionsInput,
) => ({
  open: (bundle: DesktopProjectBundle | null, sequence?: number) =>
    runCurrentProjectBundleOpenRendererAction({
      ...input,
      bundle,
      sequence,
    }),
});
