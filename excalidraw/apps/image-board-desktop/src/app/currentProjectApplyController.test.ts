import { describe, expect, it, vi } from "vitest";

import {
  applyCurrentProjectUpdateState,
  createCurrentProjectEditorInitializingRendererActions,
  createCurrentProjectOpenSequenceRendererActions,
  createCurrentProjectUpdateRendererActions,
  createCurrentProjectAutosaveFailureRendererActions,
  createCurrentProjectEditorReadyRendererActions,
  createCurrentProjectRenderBoundaryRendererActions,
  createCurrentProjectBundleOpenRendererActions,
  createProjectViewClearRendererActions,
  createCurrentProjectEntryRendererActions,
  runCurrentProjectBundleOpenRendererAction,
  runProjectBundleOpenSuccessAction,
  runCurrentProjectCommandFailureAction,
  runCurrentProjectCommandStartAction,
  runCurrentProjectRevealAction,
  runCurrentProjectAutosaveFailureAction,
  runCurrentProjectEntryCompleteAction,
  runCurrentProjectEntryFailureAction,
  runCurrentProjectEntryMenuFailureAction,
  runCurrentProjectEntryPreflightFailureAction,
  runCurrentProjectEntryStartAction,
  runCurrentProjectEntryOpenAction,
  runCurrentProjectSwitchToListAction,
  runProjectViewClearAction,
  runProjectBundleOpenFollowupAction,
  runCurrentProjectUpdateAction,
} from "./currentProjectApplyController";
import { buildCurrentProjectChangedResetState } from "./currentProjectState";
import { serializeSceneForProject } from "./project/sceneSerialization";

import type { DesktopProjectBundle } from "../shared/desktopBridgeTypes";
import type { ProjectManifest } from "../shared/projectTypes";

const createProjectManifest = (name: string): ProjectManifest => ({
  formatVersion: 1,
  appVersion: "test",
  name,
  createdAt: "2026-07-04T00:00:00.000Z",
  updatedAt: "2026-07-04T00:00:00.000Z",
  sceneFile: "scene.excalidraw.json",
  imageRecordsFile: "image-records.json",
  assetsDir: "assets",
  exportsDir: "exports",
  agentAccess: {
    enabled: true,
    token: `${name}-token`,
  },
});

const createProject = (path: string): DesktopProjectBundle => ({
  projectPath: path,
  project: createProjectManifest("工业设计助手"),
  sceneJson: serializeSceneForProject({
    elements: [],
    appState: {},
  }),
  imageRecords: {},
});

const createCallbacks = () => ({
  setCurrentProject: vi.fn(),
  setSavedSceneHash: vi.fn(),
  setProjectHealthReport: vi.fn(),
  setProjectRepairReport: vi.fn(),
  setProjectHealthReportOpen: vi.fn(),
  notifyProjectState: vi.fn(),
  syncAgentBridgeStatus: vi.fn(),
});

const createBundleOpenInput = (patch: Record<string, unknown> = {}) => {
  let currentSequence = 12;

  return {
    beginProjectOpen: vi.fn(() => {
      currentSequence += 1;
      return currentSequence;
    }),
    isCurrentProjectOpen: vi.fn((sequence: number) => sequence === currentSequence),
    flushPendingAutosave: vi.fn().mockResolvedValue(undefined),
    getDevicePixelRatio: vi.fn(() => 1),
    getFallbackCreatedAt: vi.fn(() =>
      Date.parse("2026-07-06T00:00:00.000Z"),
    ),
    readProjectAssets: vi.fn(async () => []),
    setLoadingProject: vi.fn(),
    setProjectError: vi.fn(),
    clearProjectNotice: vi.fn(),
    formatSaveBeforeOpenError: (error: unknown) =>
      error instanceof Error ? `保存失败：${error.message}` : "保存失败",
    formatOpenError: (error: unknown) =>
      error instanceof Error ? `打开失败：${error.message}` : "打开失败",
    resetImageRenditionState: vi.fn(),
    setThumbnailMaintenance: vi.fn(),
    markImageAssetRenditionsLoaded: vi.fn(),
    projectRenderNonceRef: { current: 0 },
    editorApiRef: { current: { api: true } },
    updateEditorInitializing: vi.fn(),
    updateCurrentProject: vi.fn(),
    setInitialData: vi.fn(),
    setProjectRenderNonce: vi.fn(),
    latestSceneRef: { current: null },
    updateSceneImageFileIds: vi.fn(),
    scheduleVisibleImageRenditionLoad: vi.fn(),
    updateWorkspaceOverlay: vi.fn(),
    resetWorkspaceZoomGate: vi.fn(),
    lastCanvasPointerRef: { current: { pointer: true } },
    setSelectedRecord: vi.fn(),
    setSelectedTask: vi.fn(),
    lastBatchBoundsRef: { current: { bounds: true } },
    resetGenerationTrackingState: vi.fn(),
    safeModeOpenedMessage: "已用安全模式打开",
    showProjectNotice: vi.fn(),
    rebuildMissingThumbnails: vi.fn(),
    loadRecentProjectsState: vi.fn().mockResolvedValue(undefined),
    ...patch,
  };
};

describe("applyCurrentProjectUpdateState", () => {
  it("applies the project and saved hash without resetting project-scoped UI when the project path is unchanged", () => {
    const project = createProject("/projects/current");
    const callbacks = createCallbacks();

    applyCurrentProjectUpdateState({
      state: {
        previousProjectPath: "/projects/current",
        nextProjectPath: "/projects/current",
        projectChanged: false,
        savedSceneHash: "hash-current",
        project,
        resetState: null,
      },
      ...callbacks,
    });

    expect(callbacks.setCurrentProject).toHaveBeenCalledWith(project);
    expect(callbacks.setSavedSceneHash).toHaveBeenCalledWith("hash-current");
  });

  it("applies the project changed reset state when switching projects", () => {
    const project = createProject("/projects/next");
    const callbacks = createCallbacks();
    const resetState = buildCurrentProjectChangedResetState();

    applyCurrentProjectUpdateState({
      state: {
        previousProjectPath: "/projects/previous",
        nextProjectPath: "/projects/next",
        projectChanged: true,
        savedSceneHash: "hash-next",
        project,
        resetState,
      },
      ...callbacks,
    });

    expect(callbacks.setCurrentProject).toHaveBeenCalledWith(project);
    expect(callbacks.setSavedSceneHash).toHaveBeenCalledWith("hash-next");
    expect(callbacks.setProjectHealthReport).toHaveBeenCalledWith(null);
    expect(callbacks.setProjectRepairReport).toHaveBeenCalledWith(null);
    expect(callbacks.setProjectHealthReportOpen).toHaveBeenCalledWith(false);
  });
});

describe("runCurrentProjectUpdateAction", () => {
  it("builds, applies, and publishes a current project update", () => {
    const previousProject = createProject("/projects/previous");
    const nextProject = createProject("/projects/next");
    const callbacks = createCallbacks();

    const state = runCurrentProjectUpdateAction({
      previousProject,
      nextProject,
      ...callbacks,
    });

    expect(state).toMatchObject({
      previousProjectPath: "/projects/previous",
      nextProjectPath: "/projects/next",
      projectChanged: true,
      project: nextProject,
    });
    expect(callbacks.setCurrentProject).toHaveBeenCalledWith(nextProject);
    expect(callbacks.notifyProjectState).toHaveBeenCalledWith(nextProject);
    expect(callbacks.syncAgentBridgeStatus).toHaveBeenCalledWith(nextProject);
  });

  it("publishes a null project when the project view is cleared", () => {
    const previousProject = createProject("/projects/previous");
    const callbacks = createCallbacks();

    runCurrentProjectUpdateAction({
      previousProject,
      nextProject: null,
      ...callbacks,
    });

    expect(callbacks.setCurrentProject).toHaveBeenCalledWith(null);
    expect(callbacks.notifyProjectState).toHaveBeenCalledWith(null);
    expect(callbacks.syncAgentBridgeStatus).toHaveBeenCalledWith(null);
  });
});

describe("createCurrentProjectUpdateRendererActions", () => {
  it("updates project refs, renderer state, bridge publication and project reset state from one owner", () => {
    const previousProject = createProject("/projects/previous");
    const nextProject = createProject("/projects/next");
    let currentProjectRef: DesktopProjectBundle | null = previousProject;
    let savedSceneHashRef: string | null = null;
    const callbacks = createCallbacks();

    const actions = createCurrentProjectUpdateRendererActions({
      getPreviousProject: () => currentProjectRef,
      setCurrentProjectRef: (project) => {
        currentProjectRef = project;
      },
      setCurrentProject: callbacks.setCurrentProject,
      setSavedSceneHashRef: (hash) => {
        savedSceneHashRef = hash;
      },
      setProjectHealthReport: callbacks.setProjectHealthReport,
      setProjectRepairReport: callbacks.setProjectRepairReport,
      setProjectHealthReportOpen: callbacks.setProjectHealthReportOpen,
      notifyProjectState: callbacks.notifyProjectState,
      syncAgentBridgeStatus: callbacks.syncAgentBridgeStatus,
    });

    const state = actions.update(nextProject);

    expect(state).toMatchObject({
      previousProjectPath: "/projects/previous",
      nextProjectPath: "/projects/next",
      projectChanged: true,
      project: nextProject,
    });
    expect(currentProjectRef).toBe(nextProject);
    expect(callbacks.setCurrentProject).toHaveBeenCalledWith(nextProject);
    expect(savedSceneHashRef).toBe(state.savedSceneHash);
    expect(callbacks.notifyProjectState).toHaveBeenCalledWith(nextProject);
    expect(callbacks.syncAgentBridgeStatus).toHaveBeenCalledWith(nextProject);

    actions.update(null);

    expect(currentProjectRef).toBe(null);
    expect(callbacks.setCurrentProject).toHaveBeenLastCalledWith(null);
    expect(savedSceneHashRef).toBe(null);
    expect(callbacks.notifyProjectState).toHaveBeenLastCalledWith(null);
    expect(callbacks.syncAgentBridgeStatus).toHaveBeenLastCalledWith(null);
  });
});

describe("runProjectViewClearAction", () => {
  it("clears project-scoped editor state through injected application setters", () => {
    const editorApiRef = { current: { api: true } };
    const latestSceneRef = { current: { scene: true } };
    const lastCanvasPointerRef = { current: { pointer: true } };
    const lastBatchBoundsRef = { current: { bounds: true } };
    const callbacks = {
      beginProjectOpen: vi.fn(),
      editorApiRef,
      latestSceneRef,
      setSceneImageFileIds: vi.fn(),
      updateCurrentProject: vi.fn(),
      setInitialData: vi.fn(),
      setWorkspaceOverlayState: vi.fn(),
      resetWorkspaceZoomGate: vi.fn(),
      updateEditorInitializing: vi.fn(),
      setSelectedRecord: vi.fn(),
      setSelectedTask: vi.fn(),
      lastCanvasPointerRef,
      lastBatchBoundsRef,
      resetGenerationTrackingState: vi.fn(),
      resetImageRenditionState: vi.fn(),
    };

    runProjectViewClearAction(callbacks);

    expect(callbacks.beginProjectOpen).toHaveBeenCalledTimes(1);
    expect(editorApiRef.current).toBe(null);
    expect(latestSceneRef.current).toBe(null);
    expect(callbacks.setSceneImageFileIds).toHaveBeenCalledWith([]);
    expect(callbacks.updateCurrentProject).toHaveBeenCalledWith(null);
    expect(callbacks.setInitialData).toHaveBeenCalledWith(null);
    expect(callbacks.setWorkspaceOverlayState).toHaveBeenCalledWith(null);
    expect(callbacks.resetWorkspaceZoomGate).toHaveBeenCalledTimes(1);
    expect(callbacks.updateEditorInitializing).toHaveBeenCalledWith(false);
    expect(callbacks.setSelectedRecord).toHaveBeenCalledWith(null);
    expect(callbacks.setSelectedTask).toHaveBeenCalledWith(null);
    expect(lastCanvasPointerRef.current).toBe(null);
    expect(lastBatchBoundsRef.current).toBe(null);
    expect(callbacks.resetGenerationTrackingState).toHaveBeenCalledTimes(1);
    expect(callbacks.resetImageRenditionState).toHaveBeenCalledTimes(1);
  });
});

describe("createProjectViewClearRendererActions", () => {
  it("creates a reusable clear action for project-scoped view state", () => {
    const editorApiRef = { current: { api: true } };
    const latestSceneRef = { current: { scene: true } };
    const lastCanvasPointerRef = { current: { pointer: true } };
    const lastBatchBoundsRef = { current: { bounds: true } };
    const callbacks = {
      beginProjectOpen: vi.fn(),
      editorApiRef,
      latestSceneRef,
      setSceneImageFileIds: vi.fn(),
      updateCurrentProject: vi.fn(),
      setInitialData: vi.fn(),
      setWorkspaceOverlayState: vi.fn(),
      resetWorkspaceZoomGate: vi.fn(),
      updateEditorInitializing: vi.fn(),
      setSelectedRecord: vi.fn(),
      setSelectedTask: vi.fn(),
      lastCanvasPointerRef,
      lastBatchBoundsRef,
      resetGenerationTrackingState: vi.fn(),
      resetImageRenditionState: vi.fn(),
    };

    const actions = createProjectViewClearRendererActions(callbacks);

    actions.clear();

    expect(callbacks.beginProjectOpen).toHaveBeenCalledTimes(1);
    expect(editorApiRef.current).toBe(null);
    expect(latestSceneRef.current).toBe(null);
    expect(callbacks.setSceneImageFileIds).toHaveBeenCalledWith([]);
    expect(callbacks.updateCurrentProject).toHaveBeenCalledWith(null);
    expect(callbacks.setInitialData).toHaveBeenCalledWith(null);
    expect(callbacks.setWorkspaceOverlayState).toHaveBeenCalledWith(null);
    expect(callbacks.resetWorkspaceZoomGate).toHaveBeenCalledTimes(1);
    expect(callbacks.updateEditorInitializing).toHaveBeenCalledWith(false);
    expect(callbacks.setSelectedRecord).toHaveBeenCalledWith(null);
    expect(callbacks.setSelectedTask).toHaveBeenCalledWith(null);
    expect(lastCanvasPointerRef.current).toBe(null);
    expect(lastBatchBoundsRef.current).toBe(null);
    expect(callbacks.resetGenerationTrackingState).toHaveBeenCalledTimes(1);
    expect(callbacks.resetImageRenditionState).toHaveBeenCalledTimes(1);
  });
});

describe("createCurrentProjectRenderBoundaryRendererActions", () => {
  it("reports project render errors with current project context and stops editor initialization", () => {
    const project = createProject("/projects/current");
    const logError = vi.fn();
    const updateEditorInitializing = vi.fn();
    const clearProjectViewState = vi.fn();

    const actions = createCurrentProjectRenderBoundaryRendererActions({
      getCurrentProject: () => project,
      logError,
      updateEditorInitializing,
      clearProjectViewState,
    });
    const error = new Error("画布渲染失败");

    actions.reportRenderError(error, "component stack");

    expect(logError).toHaveBeenCalledWith("[project-render-error]", {
      message: "画布渲染失败",
      stack: error.stack || null,
      componentStack: "component stack",
      projectPath: "/projects/current",
    });
    expect(updateEditorInitializing).toHaveBeenCalledWith(false);
    expect(clearProjectViewState).not.toHaveBeenCalled();
  });

  it("resets the project view through the current project clear action", () => {
    const clearProjectViewState = vi.fn();

    const actions = createCurrentProjectRenderBoundaryRendererActions({
      getCurrentProject: () => null,
      logError: vi.fn(),
      updateEditorInitializing: vi.fn(),
      clearProjectViewState,
    });

    actions.resetProjectView();

    expect(clearProjectViewState).toHaveBeenCalledTimes(1);
  });
});

describe("createCurrentProjectEditorInitializingRendererActions", () => {
  it("applies editor initializing state through one reusable owner action", () => {
    let currentRenderNonce: number | null = null;
    let initializingRef = false;
    const setInitializing = vi.fn();

    const actions = createCurrentProjectEditorInitializingRendererActions({
      getCurrentRenderNonce: () => currentRenderNonce,
      setCurrentRenderNonceRef: (renderNonce) => {
        currentRenderNonce = renderNonce;
      },
      setInitializingRef: (initializing) => {
        initializingRef = initializing;
      },
      setInitializing,
      getEditorApi: () => null,
      scheduleFallbackTimeout: vi.fn(),
      clearFallbackTimeout: vi.fn(),
    });

    expect(actions.update(true, 5)).toBe(true);
    expect(initializingRef).toBe(true);
    expect(currentRenderNonce).toBe(5);
    expect(setInitializing).toHaveBeenCalledWith(true);

    expect(actions.update(false, 4)).toBe(false);
    expect(initializingRef).toBe(true);
    expect(currentRenderNonce).toBe(5);
    expect(setInitializing).toHaveBeenCalledTimes(1);

    expect(actions.update(false, 5)).toBe(true);
    expect(initializingRef).toBe(false);
    expect(currentRenderNonce).toBe(null);
    expect(setInitializing).toHaveBeenLastCalledWith(false);
  });

  it("hides the editor loading surface only for the current render nonce", () => {
    const setInitializing = vi.fn();
    const actions = createCurrentProjectEditorInitializingRendererActions({
      getCurrentRenderNonce: () => 7,
      setCurrentRenderNonceRef: vi.fn(),
      setInitializingRef: vi.fn(),
      setInitializing,
      getEditorApi: () => null,
      scheduleFallbackTimeout: vi.fn(),
      clearFallbackTimeout: vi.fn(),
    });

    expect(actions.hideLoading(6)).toBe(false);
    expect(setInitializing).not.toHaveBeenCalled();

    expect(actions.hideLoading(7)).toBe(true);
    expect(setInitializing).toHaveBeenCalledWith(false);
  });

  it("starts and cleans up the editor initializing fallback clear timer", () => {
    let currentRenderNonce: number | null = 9;
    const setInitializing = vi.fn();
    const clearTimeout = vi.fn();
    const fallbackCallbacks: Array<() => void> = [];
    const actions = createCurrentProjectEditorInitializingRendererActions({
      getCurrentRenderNonce: () => currentRenderNonce,
      setCurrentRenderNonceRef: vi.fn(),
      setInitializingRef: vi.fn(),
      setInitializing,
      getEditorApi: () => ({ ready: true }),
      scheduleFallbackTimeout: (callback) => {
        fallbackCallbacks.push(callback);
        return 42;
      },
      clearFallbackTimeout: clearTimeout,
    });

    const cleanup = actions.startFallbackClear({
      isEditorInitializing: true,
      renderNonce: 9,
    });

    expect(typeof cleanup).toBe("function");
    expect(fallbackCallbacks).toHaveLength(1);

    const currentFallbackCallback = fallbackCallbacks.at(0);
    if (!currentFallbackCallback) {
      throw new Error("expected fallback callback to be scheduled");
    }
    currentFallbackCallback();

    expect(setInitializing).toHaveBeenCalledWith(false);

    cleanup?.();

    expect(clearTimeout).toHaveBeenCalledWith(42);

    currentRenderNonce = 10;
    setInitializing.mockClear();
    fallbackCallbacks.length = 0;

    actions.startFallbackClear({
      isEditorInitializing: true,
      renderNonce: 9,
    });

    const staleFallbackCallback = fallbackCallbacks.at(0);
    if (!staleFallbackCallback) {
      throw new Error("expected stale fallback callback to be scheduled");
    }
    staleFallbackCallback();

    expect(setInitializing).not.toHaveBeenCalled();
  });

  it("does not schedule the editor initializing fallback when the editor is not initializing", () => {
    const scheduleFallbackTimeout = vi.fn();
    const actions = createCurrentProjectEditorInitializingRendererActions({
      getCurrentRenderNonce: () => 9,
      setCurrentRenderNonceRef: vi.fn(),
      setInitializingRef: vi.fn(),
      setInitializing: vi.fn(),
      getEditorApi: () => ({ ready: true }),
      scheduleFallbackTimeout,
      clearFallbackTimeout: vi.fn(),
    });

    expect(
      actions.startFallbackClear({
        isEditorInitializing: false,
        renderNonce: 9,
      }),
    ).toBeUndefined();
    expect(scheduleFallbackTimeout).not.toHaveBeenCalled();
  });
});

describe("createCurrentProjectOpenSequenceRendererActions", () => {
  it("owns project open sequence increments and stale sequence checks", () => {
    let projectOpenSequence = 4;

    const actions = createCurrentProjectOpenSequenceRendererActions({
      getCurrentSequence: () => projectOpenSequence,
      setCurrentSequenceRef: (sequence) => {
        projectOpenSequence = sequence;
      },
    });

    expect(actions.begin()).toBe(5);
    expect(projectOpenSequence).toBe(5);
    expect(actions.isCurrent(5)).toBe(true);
    expect(actions.isCurrent(4)).toBe(false);

    expect(actions.begin()).toBe(6);
    expect(actions.isCurrent(5)).toBe(false);
    expect(actions.isCurrent(6)).toBe(true);
  });
});

describe("createCurrentProjectEditorReadyRendererActions", () => {
  it("applies the editor API, flushes queued files, loads visible renditions, and schedules loading clear", () => {
    const callbacks: FrameRequestCallback[] = [];
    const editorApi = { ready: true };
    const latestScene = { scene: true };
    const setEditorApi = vi.fn();
    const flushQueuedImageFilesToCanvas = vi.fn();
    const scheduleVisibleImageRenditionLoad = vi.fn();
    const clearInitializing = vi.fn();

    const actions = createCurrentProjectEditorReadyRendererActions({
      getCurrentRenderNonce: () => 7,
      getLatestScene: () => latestScene,
      setEditorApi,
      flushQueuedImageFilesToCanvas,
      scheduleVisibleImageRenditionLoad,
      requestAnimationFrame: (callback) => {
        callbacks.push(callback);
        return callbacks.length;
      },
      scheduleTimeout: vi.fn(),
      clearInitializing,
    });

    expect(actions.ready(editorApi, 7)).toEqual({
      status: "ready",
      apiApplied: true,
    });

    expect(setEditorApi).toHaveBeenCalledWith(editorApi);
    expect(flushQueuedImageFilesToCanvas).toHaveBeenCalledTimes(1);
    expect(scheduleVisibleImageRenditionLoad).toHaveBeenCalledWith(
      latestScene,
    );
    expect(clearInitializing).not.toHaveBeenCalled();

    callbacks[0]?.(0);

    expect(clearInitializing).toHaveBeenCalledWith(7);
  });

  it("still clears initialization when the editor API is not available yet", () => {
    const timeoutCallbacks: Array<() => void> = [];
    const setEditorApi = vi.fn();
    const flushQueuedImageFilesToCanvas = vi.fn();
    const scheduleVisibleImageRenditionLoad = vi.fn();
    const clearInitializing = vi.fn();

    const actions = createCurrentProjectEditorReadyRendererActions({
      getCurrentRenderNonce: () => 9,
      getLatestScene: () => null,
      setEditorApi,
      flushQueuedImageFilesToCanvas,
      scheduleVisibleImageRenditionLoad,
      requestAnimationFrame: null,
      scheduleTimeout: (callback) => {
        timeoutCallbacks.push(callback);
        return timeoutCallbacks.length;
      },
      clearInitializing,
    });

    expect(actions.ready(null, 9)).toEqual({
      status: "ready",
      apiApplied: false,
    });

    expect(setEditorApi).not.toHaveBeenCalled();
    expect(flushQueuedImageFilesToCanvas).not.toHaveBeenCalled();
    expect(scheduleVisibleImageRenditionLoad).not.toHaveBeenCalled();

    timeoutCallbacks[0]?.();

    expect(clearInitializing).toHaveBeenCalledWith(9);
  });

  it("ignores stale editor ready notifications from older renders", () => {
    const setEditorApi = vi.fn();
    const clearInitializing = vi.fn();

    const actions = createCurrentProjectEditorReadyRendererActions({
      getCurrentRenderNonce: () => 10,
      getLatestScene: () => ({ scene: true }),
      setEditorApi,
      flushQueuedImageFilesToCanvas: vi.fn(),
      scheduleVisibleImageRenditionLoad: vi.fn(),
      requestAnimationFrame: vi.fn(),
      scheduleTimeout: vi.fn(),
      clearInitializing,
    });

    expect(actions.ready({ ready: true }, 9)).toEqual({ status: "stale" });
    expect(setEditorApi).not.toHaveBeenCalled();
    expect(clearInitializing).not.toHaveBeenCalled();
  });
});

describe("current project command actions", () => {
  it("clears project command feedback before running a command", () => {
    const setProjectError = vi.fn();
    const clearProjectNotice = vi.fn();

    runCurrentProjectCommandStartAction({
      setProjectError,
      clearProjectNotice,
    });

    expect(setProjectError).toHaveBeenCalledWith(null);
    expect(clearProjectNotice).toHaveBeenCalledTimes(1);
  });

  it("applies formatted project command failures", () => {
    const setProjectError = vi.fn();

    runCurrentProjectCommandFailureAction({
      error: new Error("显示项目文件夹失败"),
      formatError: (error) =>
        error instanceof Error ? `格式化：${error.message}` : "格式化失败",
      setProjectError,
    });

    expect(setProjectError).toHaveBeenCalledWith(
      "格式化：显示项目文件夹失败",
    );
  });

  it("skips revealing a project folder when no project is open", async () => {
    const revealProjectInFinder = vi.fn();

    await expect(
      runCurrentProjectRevealAction({
        project: null,
        revealProjectInFinder,
        formatError: () => "不应调用",
        setProjectError: vi.fn(),
      }),
    ).resolves.toEqual({ status: "skipped" });

    expect(revealProjectInFinder).not.toHaveBeenCalled();
  });

  it("reveals the current project folder through the injected bridge command", async () => {
    const project = createProject("/projects/current");
    const revealProjectInFinder = vi.fn().mockResolvedValue(undefined);

    await expect(
      runCurrentProjectRevealAction({
        project,
        revealProjectInFinder,
        formatError: () => "不应调用",
        setProjectError: vi.fn(),
      }),
    ).resolves.toEqual({ status: "revealed" });

    expect(revealProjectInFinder).toHaveBeenCalledWith("/projects/current");
  });

  it("applies formatted project reveal failures", async () => {
    const error = new Error("Finder 打开失败");
    const setProjectError = vi.fn();

    await expect(
      runCurrentProjectRevealAction({
        project: createProject("/projects/current"),
        revealProjectInFinder: vi.fn().mockRejectedValue(error),
        formatError: (value) =>
          value instanceof Error ? `格式化：${value.message}` : "格式化失败",
        setProjectError,
      }),
    ).resolves.toEqual({
      status: "failed",
      error,
    });

    expect(setProjectError).toHaveBeenCalledWith("格式化：Finder 打开失败");
  });

  it("reports autosave failures with owner logging and save error formatting", () => {
    const setProjectError = vi.fn();
    const logError = vi.fn();
    const error = new Error("保存项目失败");

    runCurrentProjectAutosaveFailureAction({
      error,
      formatError: (value) =>
        value instanceof Error ? `格式化：${value.message}` : "格式化失败",
      logError,
      setProjectError,
    });

    expect(logError).toHaveBeenCalledWith("[project:autosave-failed]", error);
    expect(setProjectError).toHaveBeenCalledWith("格式化：保存项目失败");
  });

  it("creates a reusable autosave failure reporter for renderer controllers", () => {
    const setProjectError = vi.fn();
    const logError = vi.fn();
    const error = new Error("自动保存失败");

    const actions = createCurrentProjectAutosaveFailureRendererActions({
      formatError: (value) =>
        value instanceof Error ? `格式化：${value.message}` : "格式化失败",
      logError,
      setProjectError,
    });

    actions.report(error);

    expect(logError).toHaveBeenCalledWith("[project:autosave-failed]", error);
    expect(setProjectError).toHaveBeenCalledWith("格式化：自动保存失败");
  });

  it("applies a project entry menu failure from the menu event message", () => {
    const setProjectError = vi.fn();
    const clearProjectNotice = vi.fn();

    runCurrentProjectEntryMenuFailureAction({
      errorMessage: "菜单打开项目失败",
      fallbackMessage: "打开项目失败",
      setProjectError,
      clearProjectNotice,
    });

    expect(setProjectError).toHaveBeenCalledWith("菜单打开项目失败");
    expect(clearProjectNotice).toHaveBeenCalledTimes(1);
  });

  it("unwraps missing recent project messages from menu event failures", () => {
    const setProjectError = vi.fn();
    const clearProjectNotice = vi.fn();

    runCurrentProjectEntryMenuFailureAction({
      errorMessage:
        "[CORESTUDIO_MISSING_RECENT_PROJECT]这个项目文件夹已经不存在，可能已被移动或手动删除。",
      fallbackMessage: "打开项目失败",
      setProjectError,
      clearProjectNotice,
    });

    expect(setProjectError).toHaveBeenCalledWith(
      "这个项目文件夹已经不存在，可能已被移动或手动删除。",
    );
    expect(clearProjectNotice).toHaveBeenCalledTimes(1);
  });

  it("applies the fallback message when a project entry menu failure has no event message", () => {
    const setProjectError = vi.fn();
    const clearProjectNotice = vi.fn();

    runCurrentProjectEntryMenuFailureAction({
      errorMessage: "",
      fallbackMessage: "打开项目失败",
      setProjectError,
      clearProjectNotice,
    });

    expect(setProjectError).toHaveBeenCalledWith("打开项目失败");
    expect(clearProjectNotice).toHaveBeenCalledTimes(1);
  });
});

describe("runCurrentProjectSwitchToListAction", () => {
  it("flushes the current project before clearing the project view and refreshing recent projects", async () => {
    const flushPendingAutosave = vi.fn().mockResolvedValue(undefined);
    const clearProjectViewState = vi.fn();
    const loadRecentProjectsState = vi.fn().mockResolvedValue(undefined);
    const setProjectError = vi.fn();
    const clearProjectNotice = vi.fn();

    await expect(
      runCurrentProjectSwitchToListAction({
        flushPendingAutosave,
        clearProjectViewState,
        loadRecentProjectsState,
        formatError: () => "不应调用",
        setProjectError,
        clearProjectNotice,
      }),
    ).resolves.toEqual({ status: "switched" });

    expect(setProjectError).toHaveBeenCalledWith(null);
    expect(clearProjectNotice).toHaveBeenCalledTimes(1);
    expect(flushPendingAutosave).toHaveBeenCalledWith({ strict: true });
    expect(clearProjectViewState).toHaveBeenCalledTimes(1);
    expect(loadRecentProjectsState).toHaveBeenCalledTimes(1);
  });

  it("keeps the current project open when saving before switch fails", async () => {
    const error = new Error("保存旧项目失败");
    const clearProjectViewState = vi.fn();
    const loadRecentProjectsState = vi.fn();
    const setProjectError = vi.fn();

    await expect(
      runCurrentProjectSwitchToListAction({
        flushPendingAutosave: vi.fn().mockRejectedValue(error),
        clearProjectViewState,
        loadRecentProjectsState,
        formatError: (value) =>
          value instanceof Error ? `格式化：${value.message}` : "格式化失败",
        setProjectError,
        clearProjectNotice: vi.fn(),
      }),
    ).resolves.toEqual({
      status: "failed",
      error,
    });

    expect(setProjectError).toHaveBeenCalledWith("格式化：保存旧项目失败");
    expect(clearProjectViewState).not.toHaveBeenCalled();
    expect(loadRecentProjectsState).not.toHaveBeenCalled();
  });
});

describe("runCurrentProjectEntryFailureAction", () => {
  it("applies the project entry start state through injected setters", () => {
    const setLoadingProject = vi.fn();
    const setProjectError = vi.fn();
    const clearProjectNotice = vi.fn();

    runCurrentProjectEntryStartAction({
      setLoadingProject,
      setProjectError,
      clearProjectNotice,
    });

    expect(setLoadingProject).toHaveBeenCalledWith(true);
    expect(setProjectError).toHaveBeenCalledWith(null);
    expect(clearProjectNotice).toHaveBeenCalledTimes(1);
  });

  it("applies the project entry complete state when the open sequence is still current", () => {
    const setLoadingProject = vi.fn();

    const applied = runCurrentProjectEntryCompleteAction({
      sequence: 5,
      isCurrentProjectOpen: (sequence) => sequence === 5,
      setLoadingProject,
    });

    expect(applied).toBe(true);
    expect(setLoadingProject).toHaveBeenCalledWith(false);
  });

  it("ignores stale project entry completion from older open sequences", () => {
    const setLoadingProject = vi.fn();

    const applied = runCurrentProjectEntryCompleteAction({
      sequence: 4,
      isCurrentProjectOpen: (sequence) => sequence === 5,
      setLoadingProject,
    });

    expect(applied).toBe(false);
    expect(setLoadingProject).not.toHaveBeenCalled();
  });

  it("applies a project entry preflight failure when the open sequence is still current", () => {
    const setProjectError = vi.fn();

    const applied = runCurrentProjectEntryPreflightFailureAction({
      sequence: 5,
      isCurrentProjectOpen: (sequence) => sequence === 5,
      error: new Error("保存旧项目失败"),
      formatError: (error) =>
        error instanceof Error ? `格式化：${error.message}` : "格式化失败",
      setProjectError,
    });

    expect(applied).toBe(true);
    expect(setProjectError).toHaveBeenCalledWith("格式化：保存旧项目失败");
  });

  it("ignores stale project entry preflight failures from older open sequences", () => {
    const setProjectError = vi.fn();

    const applied = runCurrentProjectEntryPreflightFailureAction({
      sequence: 4,
      isCurrentProjectOpen: (sequence) => sequence === 5,
      error: new Error("过期保存失败"),
      formatError: () => "不应写入",
      setProjectError,
    });

    expect(applied).toBe(false);
    expect(setProjectError).not.toHaveBeenCalled();
  });

  it("applies the project entry failure when the open sequence is still current", () => {
    const setProjectError = vi.fn();
    const setLoadingProject = vi.fn();
    const updateEditorInitializing = vi.fn();

    const applied = runCurrentProjectEntryFailureAction({
      sequence: 5,
      isCurrentProjectOpen: (sequence) => sequence === 5,
      error: new Error("读取项目失败"),
      formatError: (error) =>
        error instanceof Error ? `格式化：${error.message}` : "格式化失败",
      setProjectError,
      setLoadingProject,
      updateEditorInitializing,
    });

    expect(applied).toBe(true);
    expect(setProjectError).toHaveBeenCalledWith("格式化：读取项目失败");
    expect(setLoadingProject).toHaveBeenCalledWith(false);
    expect(updateEditorInitializing).toHaveBeenCalledWith(false);
  });

  it("ignores stale project entry failures from older open sequences", () => {
    const setProjectError = vi.fn();
    const setLoadingProject = vi.fn();
    const updateEditorInitializing = vi.fn();

    const applied = runCurrentProjectEntryFailureAction({
      sequence: 4,
      isCurrentProjectOpen: (sequence) => sequence === 5,
      error: new Error("过期失败"),
      formatError: () => "不应写入",
      setProjectError,
      setLoadingProject,
      updateEditorInitializing,
    });

    expect(applied).toBe(false);
    expect(setProjectError).not.toHaveBeenCalled();
    expect(setLoadingProject).not.toHaveBeenCalled();
    expect(updateEditorInitializing).not.toHaveBeenCalled();
  });
});

describe("runCurrentProjectEntryOpenAction", () => {
  it("opens a project bundle with a fresh sequence from the injected reader", async () => {
    const project = createProject("/projects/new");
    const beginProjectOpen = vi.fn(() => 8);
    const readProjectBundle = vi.fn().mockResolvedValue(project);
    const openProjectBundle = vi.fn().mockResolvedValue(undefined);

    await expect(
      runCurrentProjectEntryOpenAction({
        beginProjectOpen,
        readProjectBundle,
        openProjectBundle,
        isCurrentProjectOpen: vi.fn(),
        formatError: () => "不应调用",
        setProjectError: vi.fn(),
        setLoadingProject: vi.fn(),
        updateEditorInitializing: vi.fn(),
      }),
    ).resolves.toEqual({
      status: "opened",
      sequence: 8,
    });

    expect(beginProjectOpen).toHaveBeenCalledTimes(1);
    expect(readProjectBundle).toHaveBeenCalledTimes(1);
    expect(openProjectBundle).toHaveBeenCalledWith(project, 8);
  });

  it("applies a formatted failure when project bundle loading fails", async () => {
    const error = new Error("创建失败");
    const setProjectError = vi.fn();
    const setLoadingProject = vi.fn();
    const updateEditorInitializing = vi.fn();

    await expect(
      runCurrentProjectEntryOpenAction({
        beginProjectOpen: vi.fn(() => 9),
        readProjectBundle: vi.fn().mockRejectedValue(error),
        openProjectBundle: vi.fn(),
        isCurrentProjectOpen: (sequence) => sequence === 9,
        formatError: (value) =>
          value instanceof Error ? `格式化：${value.message}` : "格式化失败",
        setProjectError,
        setLoadingProject,
        updateEditorInitializing,
      }),
    ).resolves.toEqual({
      status: "failed",
      sequence: 9,
      applied: true,
    });

    expect(setProjectError).toHaveBeenCalledWith("格式化：创建失败");
    expect(setLoadingProject).toHaveBeenCalledWith(false);
    expect(updateEditorInitializing).toHaveBeenCalledWith(false);
  });

  it("runs the failure hook only when the failure applies to the current sequence", async () => {
    const onFailureApplied = vi.fn();

    await runCurrentProjectEntryOpenAction({
      beginProjectOpen: vi.fn(() => 10),
      readProjectBundle: vi.fn().mockRejectedValue(new Error("过期失败")),
      openProjectBundle: vi.fn(),
      isCurrentProjectOpen: (sequence) => sequence !== 10,
      formatError: () => "不应写入",
      setProjectError: vi.fn(),
      setLoadingProject: vi.fn(),
      updateEditorInitializing: vi.fn(),
      onFailureApplied,
    });

    expect(onFailureApplied).not.toHaveBeenCalled();

    await runCurrentProjectEntryOpenAction({
      beginProjectOpen: vi.fn(() => 11),
      readProjectBundle: vi.fn().mockRejectedValue(new Error("当前失败")),
      openProjectBundle: vi.fn(),
      isCurrentProjectOpen: (sequence) => sequence === 11,
      formatError: () => "当前失败",
      setProjectError: vi.fn(),
      setLoadingProject: vi.fn(),
      updateEditorInitializing: vi.fn(),
      onFailureApplied,
    });

    expect(onFailureApplied).toHaveBeenCalledTimes(1);
  });
});

describe("createCurrentProjectEntryRendererActions", () => {
  it("creates project entry actions that read the latest bridge and current project", async () => {
    const createdProject = createProject("/projects/created");
    const openedProject = createProject("/projects/opened");
    const recentProject = createProject("/projects/recent");
    const bridge = {
      createProject: vi.fn().mockResolvedValue(createdProject),
      openProject: vi.fn().mockResolvedValue(openedProject),
      openRecentProject: vi.fn().mockResolvedValue(recentProject),
      revealProjectInFinder: vi.fn().mockResolvedValue(undefined),
    };
    let currentProject: DesktopProjectBundle | null = createProject(
      "/projects/current",
    );
    const beginProjectOpen = vi.fn()
      .mockReturnValueOnce(21)
      .mockReturnValueOnce(22)
      .mockReturnValueOnce(23);
    const openProjectBundle = vi.fn().mockResolvedValue(undefined);
    const loadRecentProjectsState = vi.fn().mockResolvedValue(undefined);
    const clearProjectViewState = vi.fn();

    const actions = createCurrentProjectEntryRendererActions({
      getBridge: () => bridge,
      getCurrentProject: () => currentProject,
      beginProjectOpen,
      openProjectBundle,
      isCurrentProjectOpen: () => true,
      flushPendingAutosave: vi.fn().mockResolvedValue(undefined),
      clearProjectViewState,
      loadRecentProjectsState,
      formatCreateError: () => "创建失败",
      formatOpenError: () => "打开失败",
      formatSaveBeforeOpenError: () => "保存失败",
      formatRevealError: () => "显示失败",
      setProjectError: vi.fn(),
      setLoadingProject: vi.fn(),
      updateEditorInitializing: vi.fn(),
      clearProjectNotice: vi.fn(),
    });

    await expect(actions.createProject()).resolves.toEqual({
      status: "opened",
      sequence: 21,
    });
    await actions.openProject();
    await actions.openRecentProject("/projects/recent");
    await actions.revealProject();
    currentProject = null;
    await expect(actions.revealProject()).resolves.toEqual({
      status: "skipped",
    });
    await actions.switchToProjectList();

    expect(bridge.createProject).toHaveBeenCalledTimes(1);
    expect(bridge.openProject).toHaveBeenCalledTimes(1);
    expect(bridge.openRecentProject).toHaveBeenCalledWith("/projects/recent");
    expect(openProjectBundle).toHaveBeenNthCalledWith(1, createdProject, 21);
    expect(openProjectBundle).toHaveBeenNthCalledWith(2, openedProject, 22);
    expect(openProjectBundle).toHaveBeenNthCalledWith(3, recentProject, 23);
    expect(loadRecentProjectsState).toHaveBeenCalledTimes(1);
    expect(bridge.revealProjectInFinder).toHaveBeenCalledWith(
      "/projects/current",
    );
    expect(clearProjectViewState).toHaveBeenCalledTimes(1);
  });
});

describe("runProjectBundleOpenSuccessAction", () => {
  it("applies the prepared project bundle scene to editor state", () => {
    const project = createProject("/projects/current");
    const assets = [{ fileId: "file-1" }];
    const thumbnailMaintenance = { status: "pending" };
    const elements = [{ id: "element-1" }];
    const appState = { selectedElementIds: {} };
    const initialData = {
      elements,
      appState,
      files: { "file-1": { id: "file-1" } },
    };
    const latestScene = {
      elements,
      appState,
      files: initialData.files,
    };
    const projectRenderNonceRef = { current: 4 };
    const editorApiRef = { current: { api: true } };
    const latestSceneRef = { current: null };
    const lastCanvasPointerRef = { current: { pointer: true } };
    const lastBatchBoundsRef = { current: { bounds: true } };
    const callbacks = {
      resetImageRenditionState: vi.fn(),
      setThumbnailMaintenance: vi.fn(),
      markImageAssetRenditionsLoaded: vi.fn(),
      projectRenderNonceRef,
      editorApiRef,
      updateEditorInitializing: vi.fn(),
      updateCurrentProject: vi.fn(),
      setInitialData: vi.fn(),
      setProjectRenderNonce: vi.fn(),
      latestSceneRef,
      updateSceneImageFileIds: vi.fn(),
      scheduleVisibleImageRenditionLoad: vi.fn(),
      updateWorkspaceOverlay: vi.fn(),
      resetWorkspaceZoomGate: vi.fn(),
      lastCanvasPointerRef,
      setSelectedRecord: vi.fn(),
      setSelectedTask: vi.fn(),
      lastBatchBoundsRef,
      resetGenerationTrackingState: vi.fn(),
    };

    const nextRenderNonce = runProjectBundleOpenSuccessAction({
      project,
      assets,
      thumbnailMaintenance,
      initialData,
      latestScene,
      ...callbacks,
    });

    expect(nextRenderNonce).toBe(5);
    expect(projectRenderNonceRef.current).toBe(5);
    expect(callbacks.resetImageRenditionState).toHaveBeenCalledTimes(1);
    expect(callbacks.setThumbnailMaintenance).toHaveBeenCalledWith(
      thumbnailMaintenance,
    );
    expect(callbacks.markImageAssetRenditionsLoaded).toHaveBeenCalledWith(
      assets,
    );
    expect(editorApiRef.current).toBe(null);
    expect(callbacks.updateEditorInitializing).toHaveBeenCalledWith(true, 5);
    expect(callbacks.updateCurrentProject).toHaveBeenCalledWith(project);
    expect(callbacks.setInitialData).toHaveBeenCalledWith(initialData);
    expect(callbacks.setProjectRenderNonce).toHaveBeenCalledWith(5);
    expect(latestSceneRef.current).toBe(latestScene);
    expect(callbacks.updateSceneImageFileIds).toHaveBeenCalledWith(elements);
    expect(callbacks.scheduleVisibleImageRenditionLoad).toHaveBeenCalledWith(
      latestScene,
    );
    expect(callbacks.updateWorkspaceOverlay).toHaveBeenCalledWith(
      elements,
      appState,
    );
    expect(callbacks.resetWorkspaceZoomGate).toHaveBeenCalledTimes(1);
    expect(lastCanvasPointerRef.current).toBe(null);
    expect(callbacks.setSelectedRecord).toHaveBeenCalledWith(null);
    expect(callbacks.setSelectedTask).toHaveBeenCalledWith(null);
    expect(lastBatchBoundsRef.current).toBe(null);
    expect(callbacks.resetGenerationTrackingState).toHaveBeenCalledTimes(1);
  });
});

describe("runProjectBundleOpenFollowupAction", () => {
  it("shows the safe mode notice and refreshes recent projects without rebuilding thumbnails", async () => {
    const project = {
      ...createProject("/projects/safe"),
      safeMode: true,
    };
    const showProjectNotice = vi.fn();
    const rebuildMissingThumbnails = vi.fn();
    const loadRecentProjectsState = vi.fn().mockResolvedValue(undefined);

    await expect(
      runProjectBundleOpenFollowupAction({
        project,
        missingThumbnailFileIds: ["file-1"],
        safeModeOpenedMessage: "已用安全模式打开",
        showProjectNotice,
        rebuildMissingThumbnails,
        loadRecentProjectsState,
      }),
    ).resolves.toEqual({
      status: "safe-mode-opened",
    });

    expect(showProjectNotice).toHaveBeenCalledWith("已用安全模式打开");
    expect(rebuildMissingThumbnails).not.toHaveBeenCalled();
    expect(loadRecentProjectsState).toHaveBeenCalledTimes(1);
  });

  it("starts thumbnail rebuilds in the background before refreshing recent projects", async () => {
    const project = createProject("/projects/current");
    const showProjectNotice = vi.fn();
    const rebuildMissingThumbnails = vi.fn().mockResolvedValue(undefined);
    const loadRecentProjectsState = vi.fn().mockResolvedValue(undefined);

    await expect(
      runProjectBundleOpenFollowupAction({
        project,
        missingThumbnailFileIds: ["file-1", "file-2"],
        safeModeOpenedMessage: "不应显示",
        showProjectNotice,
        rebuildMissingThumbnails,
        loadRecentProjectsState,
      }),
    ).resolves.toEqual({
      status: "opened",
    });

    expect(showProjectNotice).not.toHaveBeenCalled();
    expect(rebuildMissingThumbnails).toHaveBeenCalledWith(project, [
      "file-1",
      "file-2",
    ]);
    expect(loadRecentProjectsState).toHaveBeenCalledTimes(1);
  });
});

describe("runCurrentProjectBundleOpenRendererAction", () => {
  it("runs the project-open lifecycle through one current-project owner action", async () => {
    const project = createProject("/projects/current");
    const input = createBundleOpenInput({
      isCurrentProjectOpen: vi.fn((sequence: number) => sequence === 12),
    });

    await expect(
      runCurrentProjectBundleOpenRendererAction({
        ...input,
        bundle: project,
        sequence: 12,
      }),
    ).resolves.toEqual({
      status: "opened",
      sequence: 12,
      followupStatus: "opened",
    });

    expect(input.flushPendingAutosave).toHaveBeenCalledWith({ strict: true });
    expect(input.setLoadingProject).toHaveBeenNthCalledWith(1, true);
    expect(input.setLoadingProject).toHaveBeenLastCalledWith(false);
    expect(input.setProjectError).toHaveBeenCalledWith(null);
    expect(input.clearProjectNotice).toHaveBeenCalledTimes(1);
    expect(input.updateCurrentProject).toHaveBeenCalledWith(project);
    expect(input.setInitialData).toHaveBeenCalledTimes(1);
    expect(input.updateSceneImageFileIds).toHaveBeenCalledTimes(1);
    expect(input.scheduleVisibleImageRenditionLoad).toHaveBeenCalledTimes(1);
    expect(input.updateWorkspaceOverlay).toHaveBeenCalledTimes(1);
    expect(input.resetWorkspaceZoomGate).toHaveBeenCalledTimes(1);
    expect(input.loadRecentProjectsState).toHaveBeenCalledTimes(1);
  });

  it("applies save-before-open failures without preparing or applying the bundle", async () => {
    const error = new Error("旧项目保存失败");
    const input = createBundleOpenInput({
      isCurrentProjectOpen: vi.fn((sequence: number) => sequence === 12),
      flushPendingAutosave: vi.fn().mockRejectedValue(error),
    });

    await expect(
      runCurrentProjectBundleOpenRendererAction({
        ...input,
        bundle: createProject("/projects/current"),
        sequence: 12,
      }),
    ).resolves.toEqual({
      status: "preflight-failed",
      sequence: 12,
      applied: true,
    });

    expect(input.setProjectError).toHaveBeenCalledWith(
      "保存失败：旧项目保存失败",
    );
    expect(input.readProjectAssets).not.toHaveBeenCalled();
    expect(input.updateCurrentProject).not.toHaveBeenCalled();
    expect(input.setLoadingProject).toHaveBeenLastCalledWith(false);
  });

  it("creates an open sequence when the caller does not pass one", async () => {
    const input = createBundleOpenInput();
    const actions = createCurrentProjectBundleOpenRendererActions(input);

    await expect(actions.open(null)).resolves.toEqual({
      status: "cancelled",
      sequence: 13,
    });

    expect(input.beginProjectOpen).toHaveBeenCalledTimes(1);
    expect(input.setLoadingProject).toHaveBeenCalledWith(false);
  });

  it("applies an already-persisted external snapshot without flushing the stale local snapshot again", async () => {
    const project = createProject("/projects/current");
    const input = createBundleOpenInput();
    const actions = createCurrentProjectBundleOpenRendererActions(input);

    await expect(actions.applyExternalSnapshot(project)).resolves.toEqual({
      status: "opened",
      sequence: 13,
      followupStatus: "opened",
    });

    expect(input.flushPendingAutosave).not.toHaveBeenCalled();
    expect(input.updateCurrentProject).toHaveBeenCalledWith(project);
  });
});
