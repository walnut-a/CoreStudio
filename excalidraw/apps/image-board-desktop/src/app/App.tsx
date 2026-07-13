import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { ExcalidrawElement } from "@excalidraw/element/types";
import { CaptureUpdateAction } from "@excalidraw/element";

import type {
  AppState,
  BinaryFileData,
  BinaryFiles,
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
} from "@excalidraw/excalidraw/types";
import type { ClipboardData } from "@excalidraw/excalidraw/clipboard";

import { buildAgentBrowserRouteState } from "./agent/agentBrowserBridge";
import {
  createAutosaveLifecycleRendererActions,
  createAutosaveRendererActions,
  type AutosaveSnapshot as ProjectAutosaveSnapshot,
} from "./autosaveProjectState";
import {
  createAutosaveSnapshotWriteRendererActions,
} from "./autosaveSnapshotWriteController";
import {
  createQueuedExcalidrawBinaryFilesRendererActions,
} from "./canvasImageAssetState";
import {
  createCanvasSceneChangeRendererActions,
} from "./canvasSceneChangeRendererController";
import { maybeGetDesktopBridge } from "./desktopBridge";
import { createDesktopMenuEventRendererActions } from "./desktopMenuEventController";
import { createDesktopStartupRendererActions } from "./desktopStartupState";
import { createAppStartupLifecycleRendererActions } from "./appStartupLifecycleController";
import { createAppUnmountCleanupRendererActions } from "./appUnmountCleanupController";
import {
  createGenerationRequestRendererActions,
} from "./generationRequestRendererController";
import {
  runBuiltinGenerationCancelRendererAction,
  runBuiltinGenerationRendererAction,
} from "./builtinGenerationRendererController";
import { createGenerationSubmitRendererActions } from "./generationSubmitRendererController";
import {
  type GeneratedImagePlacementViewport,
  type SceneBounds,
} from "./project/imagePlacement";
import {
  createWorkspaceFitPulseRendererActions,
  createWorkspaceOverlayRendererActions,
  createWorkspaceZoomSnapRendererActions,
  createWorkspaceZoomGateState,
  type WorkspaceBounds,
  type WorkspaceOverlayState,
  type WorkspaceZoomGateState,
} from "./workspaceBounds";
import { createGeneratedImageSceneInsertRendererActions } from "./generatedImageSceneInsertRendererController";
import {
  serializeSceneForProject,
} from "./project/sceneSerialization";
import {
  shouldApplyProjectMaintenanceResult,
  type ProjectRepairReport,
  type ThumbnailMaintenanceState,
} from "./project/projectMaintenanceController";
import { createProjectImageAssetReader } from "./projectImageAssetReader";
import {
  createProjectMaintenanceActionStateRendererApplier,
  createProjectMaintenanceRendererActions,
  createProjectThumbnailAssetRefreshRendererActions,
  createProjectThumbnailRebuildRendererActions,
} from "./project/projectMaintenanceActionsController";
import { createDesktopProjectRepairSceneRefreshRendererActions } from "./projectRepairSceneRefreshRendererController";
import { createDesktopProjectAssetSceneApplyRendererAction } from "./projectAssetSceneApplyRendererController";
import {
  createGenerationModelSelectionRendererActions,
  readRememberedGenerationModelSelection,
} from "./generationModelSelection";
import { createPlainTextClipboardRendererActions } from "./clipboardText";
import {
  formatProjectCreateError,
  formatProjectImportImagesError,
  formatProjectOpenError,
  formatProjectRevealError,
  formatProjectSaveBeforeOpenError,
  formatProjectSaveError,
} from "./currentProjectState";
import {
  createCurrentProjectAutosaveFailureRendererActions,
  createCurrentProjectEditorInitializingRendererActions,
  createCurrentProjectOpenSequenceRendererActions,
  createCurrentProjectEditorReadyRendererActions,
  createCurrentProjectRenderBoundaryRendererActions,
  createCurrentProjectBundleOpenRendererActions,
  createCurrentProjectEntryRendererActions,
  createCurrentProjectUpdateRendererActions,
  createProjectViewClearRendererActions,
  runCurrentProjectCommandStartAction,
} from "./currentProjectApplyController";
import { createProviderSettingsRendererActions } from "./providerSettingsLoader";
import { appendElementsWithSyncedIndices } from "./sceneOrder";
import { createSceneImageFileIdsRendererActions } from "./sceneImageFileIds";
import { buildSelectedImageRelationshipState } from "./imageRecordState";
import {
  createProjectImageAssetPersistenceRendererActions,
} from "./projectImageAssetPersistenceController";
import {
  createProjectImageImportRendererActions,
} from "./projectImageImportController";
import {
  createProjectImageStateResetRendererActions,
} from "./projectImageStateResetRendererActions";
import { createImageRecordLocatorRendererActions } from "./imageRecordLocator";
import { IMAGE_HIGH_RES_LOAD_DEBOUNCE_MS } from "./imageRenditions";
import {
  createVisibleImageRenditionLoadRendererActions,
} from "./imageRenditionLoadPlan";
import { createViewportChangeRendererActions } from "./viewportChangeRendererController";
import { createSelectedInspectorRendererActions } from "./selectedInspectorRendererActions";
import {
  createSelectionReferenceOriginalSceneRendererActions,
} from "./selectionReference";
import { useDesktopMenuEvents } from "./useDesktopMenuEvents";
import { useDesktopStartupWiring } from "./useDesktopStartupWiring";
import { useProjectAutosaveWiring } from "./useProjectAutosaveWiring";
import { useAcpAgentWiring } from "./useAcpAgentWiring";
import { useAgentBridgeWiring } from "./useAgentBridgeWiring";
import { GenerateImageDialog } from "./components/GenerateImageDialog";
import { AgentStatusDock } from "./components/AgentStatusDock";
import { AgentBoardStartupPane } from "./components/AgentBoardStartupPane";
import { AppBridgeUnavailable } from "./components/AppBridgeUnavailable";
import { AgentConversationSidebar } from "./components/AgentConversationSidebar";
import { InspectorSidebar } from "./components/InspectorSidebar";
import { AppErrorBanners } from "./components/AppErrorBanners";
import { AppGlobalDialogs } from "./components/AppGlobalDialogs";
import { AppProjectEntryScreen } from "./components/AppProjectEntryScreen";
import { EditorLoadingOverlay } from "./components/EditorLoadingOverlay";
import { ProjectStatusToast } from "./components/ProjectStatusToast";
import { ProjectRenderBoundary } from "./components/ProjectRenderBoundary";
import { WorkspaceBoundsOverlay } from "./components/WorkspaceBoundsOverlay";
import {
  createGenerationTrackingRendererActions,
  applyPendingGenerationJobRegistryState,
  type PendingGenerationJob,
} from "./generationJobState";
import {
  type GenerationTaskRecord,
} from "./generationTaskState";
import { createBuiltinGenerationJobCompletionRendererActions } from "./builtinGenerationCompletionController";
import {
  createPendingGenerationCanvasRendererActions,
} from "./pendingGenerationCanvasController";

import {
  buildAgentIntegrationRuntimeViewModel,
} from "./agent/agentIntegrationViewModel";
import { createAgentIntegrationCopyShortcutRendererActions } from "./agent/agentIntegrationCopyShortcut";
import { createAgentIntegrationSettingsDialogRendererActions } from "./agent/agentIntegrationSettingsDialogRendererActions";
import { createAgentStatusDockRendererActions } from "./agent/agentStatusDockRendererActions";
import { handleAgentCommandRequest } from "./agent/agentCommandRuntime";
import { createActiveAgentProjectPathRendererActions } from "./agent/agentCommandRuntimeShared";
import { createAgentCommandRequestSubscriptionRendererActions } from "./agent/agentCommandRequestSubscriptionController";
import { handleAgentDesktopBridgeRequest } from "./agent/agentDesktopBridgeRequest";
import { canStartAcpAgentTask } from "./agent/acpTaskStarter";
import { createAcpTaskStartRendererActions } from "./agent/acpTaskStartController";
import {
  getRunningAcpAgentTaskId,
  isAcpAgentTaskRunning,
} from "./agent/acpTaskUiState";
import { createAcpTaskEventSubscriptionRendererActions } from "./agent/acpTaskEventSubscriptionController";
import {
  createGenerationErrorStateApplier,
  createGenerationErrorRendererActions,
} from "./generationErrorController";
import {
  type GenerationErrorDetails,
} from "./generationErrorViewModel";
import {
  buildGenerationSidebarRecordItems,
  createGenerationRecordRendererActions,
} from "./generationRecordViewModel";
import {
  createTimedNoticeRendererActions,
} from "./noticeTimerController";
import { buildDefaultGenerationRequest } from "./generatePromptRequest";
import {
  createGenerateDialogReferenceRendererActions,
} from "./generateDialogReferenceController";
import {
  createAcpAgentSettingsRendererActions,
  useAcpAgentSettingsController,
} from "./agent/useAcpAgentSettingsController";
import { useAcpAgentTaskStateController } from "./agent/useAcpAgentTaskStateController";
import {
  createAgentBrowserRuntimePublishRendererActions,
} from "./agent/agentBrowserRuntimePublishController";
import { createAgentBrowserAutoOpenProjectRendererActions } from "./agent/agentBrowserAutoOpenController";
import { createAgentBrowserBridgeStatusRetryLoopRendererActions } from "./agent/agentBrowserBridgeStatusRetryController";
import {
  canSetAgentBridgeEnabled,
  getProjectAgentAccessToken,
  notifyAgentBridgeProjectState,
} from "./agent/agentBridgeStatus";
import {
  applyAgentBridgeStatusCurrentProjectUpdate,
  createAgentBridgeStatusRendererActions,
  useAgentBridgeStatusCurrentProjectSyncEffect,
} from "./agent/agentBridgeStatusController";
import { useAgentBridgeConnectionStateController } from "./agent/useAgentBridgeConnectionStateController";
import {
  buildAgentConversationSurfaceState,
} from "./agent/agentConversationMode";
import {
  createAcpRunLogRendererActions,
} from "./agent/acpRunLogApplyController";
import {
  useAcpRunSummariesAutoLoadEffect,
  useAcpRunSummariesController,
} from "./agent/useAcpRunSummariesController";
import { useAgentRuntimeRefsController } from "./agent/useAgentRuntimeRefsController";
import { useAgentSurfaceVisibilityController } from "./agent/useAgentSurfaceVisibilityController";
import {
  createAcpThreadRendererActions,
} from "./agent/acpThreadApplyController";
import { useAcpThreadSummariesController } from "./agent/useAcpThreadSummariesController";
import {
  createAcpConversationMessageRendererActions,
} from "./agent/acpConversationMessageController";
import { useAcpInteractionTargetsController } from "./agent/useAcpInteractionTargetsController";
import { useAcpRunLogStateController } from "./agent/useAcpRunLogStateController";
import { copy, DESKTOP_LANG_CODE } from "./copy";

import "./App.css";

import type {
  GenerationSource,
} from "../shared/providerTypes";
import type {
  ImageAssetRequestRendition,
  ImagePromptReferenceRecord,
  ImageRecord,
} from "../shared/projectTypes";
import type {
  DesktopAppInfo,
  DesktopProjectBundle,
  PersistedImageAssetInput,
  ProjectHealthReport,
  PublicProviderSettings,
  RecentProjectEntry,
} from "../shared/desktopBridgeTypes";

const LazyExcalidraw = lazy(async () => {
  const { Excalidraw } = await import("@excalidraw/excalidraw");
  return { default: Excalidraw };
});

const LazyProjectMainMenu = lazy(async () => {
  const { ProjectMainMenu } = await import("./components/ProjectMainMenu");
  return { default: ProjectMainMenu };
});

type AppSceneSnapshot = {
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
};

type PlacementViewportContext = GeneratedImagePlacementViewport;

type AutosaveSnapshot = ProjectAutosaveSnapshot<
  readonly ExcalidrawElement[],
  AppState,
  BinaryFiles
>;

const ACP_RUN_HISTORY_REFRESH_DELAY_MS = 160;
const ACP_RUN_LOG_LIVE_REFRESH_DELAY_MS = 240;

const App = () => {
  const {
    isAgentBrowserRoute,
    hasInitialProjectToken: agentBrowserInitialProjectToken,
  } = buildAgentBrowserRouteState({
    pathname: window.location.pathname,
    href: window.location.href,
  });
  const bridge = maybeGetDesktopBridge();
  if (!bridge) {
    return <AppBridgeUnavailable isAgentBrowserRoute={isAgentBrowserRoute} />;
  }

  const desktopBridge = bridge;
  const readProjectImageAssets = useMemo(
    () =>
      createProjectImageAssetReader((input) =>
        desktopBridge.readProjectAssetPayloads(input),
      ),
    [desktopBridge],
  );
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const pendingAutosaveRef = useRef<AutosaveSnapshot | null>(null);
  const autosaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const isEditorInitializingRef = useRef(false);
  const initializingRenderNonceRef = useRef<number | null>(null);
  const projectRenderNonceRef = useRef(0);
  const projectOpenSequenceRef = useRef(0);
  const agentRuntimeRefsController = useAgentRuntimeRefsController();
  const latestMenuProjectOpenRequestIdRef = useRef(0);
  const rememberedGenerationModelSelectionRef = useRef(
    readRememberedGenerationModelSelection(),
  );
  const generationModelSelectionLockedRef = useRef(
    Boolean(rememberedGenerationModelSelectionRef.current),
  );
  const currentProjectRef = useRef<DesktopProjectBundle | null>(null);
  const savedSceneHashRef = useRef<string | null>(null);
  const latestSceneRef = useRef<{
    elements: readonly ExcalidrawElement[];
    appState: AppState;
    files: BinaryFiles;
  } | null>(null);
  const lastCanvasPointerRef = useRef<{ x: number; y: number } | null>(null);
  const lastBatchBoundsRef = useRef<SceneBounds | null>(null);
  const pendingGenerationJobsRef = useRef<Map<string, PendingGenerationJob>>(
    new Map(),
  );
  const removedSelectionReferenceSignatureRef = useRef<string | null>(null);
  const generationTaskByElementIdRef = useRef<Map<string, GenerationTaskRecord>>(
    new Map(),
  );
  const previousWorkspaceZoomValueRef = useRef<number | null>(null);
  const workspaceZoomGateStateRef = useRef<WorkspaceZoomGateState>(
    createWorkspaceZoomGateState(),
  );
  const workspaceFitPulseTimerRef = useRef<number | null>(null);
  const highResImageLoadTimerRef = useRef<number | null>(null);
  const loadedPreviewImageFileIdsRef = useRef<Set<string>>(new Set());
  const loadingPreviewImageFileIdsRef = useRef<Set<string>>(new Set());
  const loadedOriginalImageFileIdsRef = useRef<Set<string>>(new Set());
  const loadingOriginalImageFileIdsRef = useRef<Set<string>>(new Set());
  const pendingImageFilesToAddRef = useRef<BinaryFileData[]>([]);

  const selectionReferenceOriginalSceneActions = useMemo(
    () =>
      createSelectionReferenceOriginalSceneRendererActions({
        getProject: () => currentProjectRef.current,
        readOriginalAssets: (project, fileIds) =>
          readProjectImageAssets(project, fileIds, "original"),
      }),
    [readProjectImageAssets],
  );
  const acpInteractionTargets = useAcpInteractionTargetsController();
  const {
    activeThreadId: activeAcpThreadId,
    runLogSurface: acpRunLogSurface,
  } = acpInteractionTargets.state;
  const {
    activeTaskActions: acpActiveTaskIdRendererActions,
    activeThreadActions: acpActiveThreadIdRendererActions,
    runLogTargetActions: acpRunLogTargetRendererActions,
    getActiveTaskId: getActiveAcpTaskId,
    getActiveThreadId: getActiveAcpThreadId,
    getRunLogTaskId: getAcpRunLogTaskId,
    getRunLogSurface: getAcpRunLogSurface,
  } = acpInteractionTargets.actions;
  const acpRunLogStateController = useAcpRunLogStateController();
  const {
    dialogOpen: acpRunLogDialogOpen,
    loading: acpRunLogLoading,
    detail: acpRunLogDetail,
    error: acpRunLogError,
    rawOpen: acpRunLogRawOpen,
    conversationEntries: acpConversationEntries,
  } = acpRunLogStateController.state;
  const {
    setDialogOpen: setAcpRunLogDialogOpen,
    setLoading: setAcpRunLogLoading,
    setDetail: setAcpRunLogDetail,
    setError: setAcpRunLogError,
    setRawOpen: setAcpRunLogRawOpen,
    setConversationEntries: setAcpConversationEntries,
  } = acpRunLogStateController.setters;
  const {
    getRefreshTimerId: getAcpRunLogRefreshTimerId,
    setRefreshTimerId: setAcpRunLogRefreshTimerId,
  } = acpRunLogStateController.actions;

  const [currentProject, setCurrentProject] = useState<DesktopProjectBundle | null>(null);
  const [initialData, setInitialData] = useState<ExcalidrawInitialDataState | null>(null);
  const [providerSettings, setProviderSettings] = useState<PublicProviderSettings | null>(null);
  const agentBridgeConnectionStateController =
    useAgentBridgeConnectionStateController();
  const {
    status: agentBridgeStatus,
    autoOpenProjectPath: agentBrowserAutoOpenProjectPath,
  } = agentBridgeConnectionStateController.state;
  const {
    setStatus: setAgentBridgeStatus,
    setAutoOpenProjectPath: setAgentBrowserAutoOpenProjectPath,
  } = agentBridgeConnectionStateController.setters;
  const acpAgentSettingsController =
    useAcpAgentSettingsController(bridge);
  const {
    settings: acpAgentSettings,
    selectedAgent: selectedAcpAgent,
    draft: acpAgentSettingsDraft,
    saving: savingAcpAgentSettings,
    editable: acpAgentSettingsEditable,
    load: loadAcpAgentSettingsState,
    save: saveAcpAgentSettingsState,
    setEnabledDraft: setAcpAgentEnabledDraft,
    setPresetDraft: setAcpAgentPresetDraft,
    setCommandDraft: setAcpAgentCommandDraft,
    setArgsDraft: setAcpAgentArgsDraft,
    setCwdDraft: setAcpAgentCwdDraft,
    setTaskInstructionDraft: setAcpTaskInstructionDraft,
  } = acpAgentSettingsController;
  const acpAgentTaskStateController = useAcpAgentTaskStateController();
  const { task: acpAgentTask } = acpAgentTaskStateController.state;
  const { setTask: setAcpAgentTask } = acpAgentTaskStateController.setters;
  const [appInfo, setAppInfo] = useState<DesktopAppInfo | null>(null);
  const generationModelSelectionRendererActions = useMemo(
    () =>
      createGenerationModelSelectionRendererActions({
        selectionLockedRef: generationModelSelectionLockedRef,
        rememberedSelectionRef: rememberedGenerationModelSelectionRef,
      }),
    [generationModelSelectionLockedRef, rememberedGenerationModelSelectionRef],
  );
  const [recentProjects, setRecentProjects] = useState<RecentProjectEntry[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<ImageRecord | null>(null);
  const [selectedTask, setSelectedTask] = useState<GenerationTaskRecord | null>(null);
  const selectedInspectorRendererActions =
    createSelectedInspectorRendererActions({
      getGenerationTasks: () => generationTaskByElementIdRef.current,
      setSelectedRecord,
      setSelectedTask,
    });
  const [sceneImageFileIds, setSceneImageFileIds] = useState<string[]>([]);
  const [generateRequest, setGenerateRequest] = useState(() =>
    buildDefaultGenerationRequest(
      null,
      rememberedGenerationModelSelectionRef.current,
    ),
  );
  const [generationSource, setGenerationSource] =
    useState<GenerationSource>(() =>
      isAgentBrowserRoute ? "agent" : "builtin",
    );
  const [loadingProject, setLoadingProject] = useState(false);
  const [savingProviders, setSavingProviders] = useState(false);
  const providerSettingsRendererActions = useMemo(
    () =>
      createProviderSettingsRendererActions({
        saveProviderSettings: desktopBridge.saveProviderSettings,
        setProviderSettings,
        setSavingProviders,
      }),
    [
      desktopBridge.saveProviderSettings,
      setProviderSettings,
      setSavingProviders,
    ],
  );
  const [pendingGenerationCount, setPendingGenerationCount] = useState(0);
  const [projectError, setProjectError] = useState<string | null>(null);
  const acpAgentSettingsRendererActions = useMemo(
    () =>
      createAcpAgentSettingsRendererActions({
        saveSettings: saveAcpAgentSettingsState,
        setProjectError,
      }),
    [saveAcpAgentSettingsState, setProjectError],
  );
  const [projectNotice, setProjectNotice] = useState<string | null>(null);
  const [projectHealthReport, setProjectHealthReport] =
    useState<ProjectHealthReport | null>(null);
  const [projectRepairReport, setProjectRepairReport] =
    useState<ProjectRepairReport | null>(null);
  const [projectHealthReportOpen, setProjectHealthReportOpen] =
    useState(false);
  const projectNoticeTimerRef = useRef<number | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationErrorDetails, setGenerationErrorDetails] =
    useState<GenerationErrorDetails | null>(null);
  const [generationErrorDetailsOpen, setGenerationErrorDetailsOpen] = useState(false);
  const [generationErrorCopied, setGenerationErrorCopied] = useState(false);
  const clipboardTextRendererActions = useMemo(
    () =>
      createPlainTextClipboardRendererActions({
        failureMessage: copy.clipboard.writeFailed,
        onError: setProjectError,
      }),
    [setProjectError],
  );
  const [generateFocusToken, setGenerateFocusToken] = useState(0);
  const [providerSettingsFocusToken, setProviderSettingsFocusToken] = useState(0);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [appSettingsOpen, setAppSettingsOpen] = useState(false);
  const agentSurfaceVisibilityController =
    useAgentSurfaceVisibilityController();
  const {
    acpDebugOpen,
    chatDockOpen: agentChatDockOpen,
  } = agentSurfaceVisibilityController.state;
  const {
    setAcpDebugOpen,
    setChatDockOpen: setAgentChatDockOpen,
  } = agentSurfaceVisibilityController.setters;
  const [isEditorInitializing, setIsEditorInitializing] = useState(false);
  const [projectRenderNonce, setProjectRenderNonce] = useState(0);
  const [inspectorDockOpen, setInspectorDockOpen] = useState(false);
  const [workspaceOverlayState, setWorkspaceOverlayState] =
    useState<WorkspaceOverlayState | null>(null);
  const [workspaceFitPulse, setWorkspaceFitPulse] = useState(false);
  const [thumbnailMaintenance, setThumbnailMaintenance] =
    useState<ThumbnailMaintenanceState | null>(null);

  const generationTrackingRendererActions =
    createGenerationTrackingRendererActions({
      setPendingJobs: (pendingJobs) => {
        pendingGenerationJobsRef.current = pendingJobs;
      },
      setGenerationTasks: (generationTasks) => {
        generationTaskByElementIdRef.current = generationTasks;
      },
      setPendingCount: setPendingGenerationCount,
    });

  const acpRunSummariesController = useAcpRunSummariesController({
    bridge,
  });
  const {
    summaries: acpRunSummaries,
    loading: acpRunSummariesLoading,
    error: acpRunSummariesError,
    canRead: canReadAcpRunLogs,
    load: loadAcpRunSummariesState,
  } = acpRunSummariesController;
  useAcpRunSummariesAutoLoadEffect({
    settingsOpen: appSettingsOpen,
    debugOpen: acpDebugOpen,
    load: loadAcpRunSummariesState,
  });

  const currentProjectAgentAccessToken =
    getProjectAgentAccessToken(currentProject);
  const getCurrentProjectAgentAccessToken = useCallback(
    () => getProjectAgentAccessToken(currentProjectRef.current),
    [],
  );
  useAgentBridgeStatusCurrentProjectSyncEffect({
    project: currentProject,
    applyBridgeStatus: setAgentBridgeStatus,
  });
  const acpThreadSummariesController = useAcpThreadSummariesController({
    bridge,
    getProjectToken: getCurrentProjectAgentAccessToken,
  });
  const {
    summaries: acpThreadSummaries,
    loading: acpThreadSummariesLoading,
    error: acpThreadSummariesError,
    applyState: applyAcpThreadSummariesState,
    load: loadAcpThreadSummariesState,
  } = acpThreadSummariesController;
  const acpAgentTaskRunning = isAcpAgentTaskRunning(acpAgentTask);
  const acpAgentTaskStartable = canStartAcpAgentTask(bridge);
  const agentIntegrationRuntime = useMemo(
    () =>
      buildAgentIntegrationRuntimeViewModel({
        bridgeStatus: agentBridgeStatus,
        acpAgentSettings,
        agentTaskStatus: acpAgentTask,
        taskRunning: acpAgentTaskRunning,
        isAgentBrowserRoute,
        canStartAcpAgentTask: acpAgentTaskStartable,
        hasInitialProjectToken: Boolean(agentBrowserInitialProjectToken),
        hasCurrentProject: Boolean(currentProject),
        hasInitialData: Boolean(initialData),
      }),
    [
      acpAgentSettings,
      acpAgentTask,
      acpAgentTaskRunning,
      acpAgentTaskStartable,
      agentBridgeStatus,
      agentBrowserInitialProjectToken,
      currentProject,
      initialData,
      isAgentBrowserRoute,
    ],
  );
  const agentIntegration = agentIntegrationRuntime.integration;
  const acpAgentGeneration = agentIntegrationRuntime.acpGeneration;
  const selectedImageRelationship = useMemo(
    () =>
      buildSelectedImageRelationshipState({
        imageRecords: currentProject?.imageRecords,
        selectedRecord,
      }),
    [currentProject?.imageRecords, selectedRecord],
  );
  const agentConversationSurface = useMemo(
    () =>
      buildAgentConversationSurfaceState({
        generationSource,
        acpRunLogSurface,
        acpAgentTaskRunning,
        runLogDetail: acpRunLogDetail,
        error: acpRunLogError,
      }),
    [
      acpAgentTaskRunning,
      acpRunLogDetail,
      acpRunLogError,
      acpRunLogSurface,
      generationSource,
    ],
  );
  const generationSidebarRecordItems = useMemo(
    () =>
      buildGenerationSidebarRecordItems({
        project: currentProject,
        sceneImageFileIds,
        acpEntries: acpConversationEntries,
        acpRunLogDetail: agentConversationSurface.runLogDetail,
        acpTask: acpAgentTask,
        files: latestSceneRef.current?.files ?? null,
      }),
    [
      acpAgentTask,
      acpConversationEntries,
      agentConversationSurface.runLogDetail,
      currentProject,
      sceneImageFileIds,
    ],
  );
  const generationRecordItems = generationSidebarRecordItems.generationRecords;
  const acpAgentResultRecordItems =
    generationSidebarRecordItems.agentResultRecords;
  const generationSidebarMode = agentConversationSurface.mode;

  const acpThreadRendererActions = createAcpThreadRendererActions({
    getBridge: () => bridge,
    nextLoadSequence:
      agentRuntimeRefsController.actions.nextThreadLoadSequence,
    isLoadSequenceCurrent:
      agentRuntimeRefsController.actions.isThreadLoadSequenceCurrent,
    getCurrentProjectToken: getCurrentProjectAgentAccessToken,
    getTaskRunning: () => acpAgentTaskRunning,
    getActiveThreadId: getActiveAcpThreadId,
    applyThreadSummariesState: applyAcpThreadSummariesState,
    setActiveThreadId: acpActiveThreadIdRendererActions.set,
    setActiveTaskId: acpActiveTaskIdRendererActions.set,
    runLogTargetActions: acpRunLogTargetRendererActions,
    setConversationEntries: setAcpConversationEntries,
    setRunLogDetail: setAcpRunLogDetail,
    setRunLogError: setAcpRunLogError,
    setAgentTask: setAcpAgentTask,
    setChatDockOpen: setAgentChatDockOpen,
    onInitialReadError: (error) =>
      console.error("[acp:thread-load-failed]", error),
  });

  const sceneImageFileIdsRendererActions =
    createSceneImageFileIdsRendererActions({
      setSceneImageFileIds,
    });

  const currentProjectUpdateRendererActions =
    createCurrentProjectUpdateRendererActions({
      getPreviousProject: () => currentProjectRef.current,
      clearAcpRunLogRefreshTimer: () => {
        acpRunLogRendererActions.clearTimer();
      },
      setCurrentProjectRef: (nextProject) => {
        currentProjectRef.current = nextProject;
      },
      setCurrentProject,
      setSavedSceneHashRef: (savedSceneHash) => {
        savedSceneHashRef.current = savedSceneHash;
      },
      setActiveAcpThreadId: acpActiveThreadIdRendererActions.set,
      runLogTargetActions: acpRunLogTargetRendererActions,
      setAcpRunLogDetail,
      setAcpRunLogError,
      setAcpConversationEntries,
      applyAcpThreadSummariesState,
      setAgentChatDockOpen,
      setProjectHealthReport,
      setProjectRepairReport,
      setProjectHealthReportOpen,
      notifyProjectState: (nextProject) => {
        notifyAgentBridgeProjectState({
          bridge,
          currentProject: nextProject,
        });
      },
      syncAgentBridgeStatus: (nextProject) => {
        applyAgentBridgeStatusCurrentProjectUpdate({
          project: nextProject,
          applyBridgeStatus: setAgentBridgeStatus,
        });
      },
    });
  const updateCurrentProject = currentProjectUpdateRendererActions.update;

  const currentProjectEditorInitializingRendererActions =
    createCurrentProjectEditorInitializingRendererActions({
      getCurrentRenderNonce: () => initializingRenderNonceRef.current,
      setCurrentRenderNonceRef: (renderNonce) => {
        initializingRenderNonceRef.current = renderNonce;
      },
      setInitializingRef: (initializing) => {
        isEditorInitializingRef.current = initializing;
      },
      setInitializing: setIsEditorInitializing,
      getEditorApi: () => excalidrawAPIRef.current,
      scheduleFallbackTimeout: (callback, delayMs) =>
        window.setTimeout(callback, delayMs),
      clearFallbackTimeout: (timerId) => window.clearTimeout(timerId),
    });

  const currentProjectOpenSequenceRendererActions =
    createCurrentProjectOpenSequenceRendererActions({
      getCurrentSequence: () => projectOpenSequenceRef.current,
      setCurrentSequenceRef: (sequence) => {
        projectOpenSequenceRef.current = sequence;
      },
    });

  const workspaceOverlayRendererActions = useMemo(
    () =>
      createWorkspaceOverlayRendererActions({
        setWorkspaceOverlayState,
      }),
    [],
  );

  const workspaceFitPulseRendererActions = useMemo(
    () =>
      createWorkspaceFitPulseRendererActions({
        delayMs: 520,
        getTimerId: () => workspaceFitPulseTimerRef.current,
        clearTimer: (timerId) => window.clearTimeout(timerId),
        setTimerId: (timerId) => {
          workspaceFitPulseTimerRef.current = timerId;
        },
        setPulse: setWorkspaceFitPulse,
        setPreviousZoomValue: (zoomValue) => {
          previousWorkspaceZoomValueRef.current = zoomValue;
        },
        setZoomGateState: (state) => {
          workspaceZoomGateStateRef.current = state;
        },
        scheduleTimeout: (callback, delayMs) =>
          window.setTimeout(callback, delayMs),
      }),
    [setWorkspaceFitPulse],
  );

  const workspaceZoomSnapRendererActions = useMemo(
    () =>
      createWorkspaceZoomSnapRendererActions({
        getApi: () => excalidrawAPIRef.current,
        getPreviousZoomValue: () => previousWorkspaceZoomValueRef.current,
        setPreviousZoomValue: (zoomValue) => {
          previousWorkspaceZoomValueRef.current = zoomValue;
        },
        getZoomGateState: () => workspaceZoomGateStateRef.current,
        setZoomGateState: (state) => {
          workspaceZoomGateStateRef.current = state;
        },
        triggerWorkspaceFitPulse: workspaceFitPulseRendererActions.trigger,
      }),
    [workspaceFitPulseRendererActions],
  );

  const projectNoticeRendererActions = useMemo(
    () =>
      createTimedNoticeRendererActions({
        delayMs: 4200,
        getTimerId: () => projectNoticeTimerRef.current,
        clearTimer: (timerId) => window.clearTimeout(timerId),
        setTimerId: (timerId) => {
          projectNoticeTimerRef.current = timerId;
        },
        setNotice: setProjectNotice,
        scheduleTimeout: (callback, delayMs) =>
          window.setTimeout(callback, delayMs),
      }),
    [setProjectNotice],
  );

  const agentBrowserRuntimePublishRendererActions = useMemo(
    () =>
      createAgentBrowserRuntimePublishRendererActions({
        delayMs: 120,
        isEnabled: () => isAgentBrowserRoute,
        getProjectPath: () => currentProjectRef.current?.projectPath ?? null,
        getGenerationSource: () => generationSource,
        getUpdatedAt: () => new Date().toISOString(),
        getLatestScene: () => latestSceneRef.current,
        getTimerId:
          agentRuntimeRefsController.actions.getStatePublishTimerId,
        clearTimer: (timerId) => window.clearTimeout(timerId),
        setTimerId:
          agentRuntimeRefsController.actions.setStatePublishTimerId,
        scheduleTimeout: (callback, delayMs) =>
          window.setTimeout(callback, delayMs),
      }),
    [agentRuntimeRefsController.actions, generationSource, isAgentBrowserRoute],
  );

  const queuedExcalidrawBinaryFilesRendererActions = useMemo(
    () =>
      createQueuedExcalidrawBinaryFilesRendererActions({
        getQueuedFiles: () => pendingImageFilesToAddRef.current,
        setQueuedFiles: (files) => {
          pendingImageFilesToAddRef.current = files;
        },
        getReplaceFiles: () => {
          const api = excalidrawAPIRef.current;
          return api ? (files) => api.replaceFiles(files) : null;
        },
      }),
    [],
  );

  const projectMaintenanceActionStateApplier =
    createProjectMaintenanceActionStateRendererApplier<DesktopProjectBundle>({
      setProjectHealthReport,
      setProjectHealthReportOpen,
      setProjectRepairReport,
      setThumbnailMaintenance,
      updateCurrentProject,
      setProjectError,
      showProjectNotice: projectNoticeRendererActions.show,
      clearProjectNotice: projectNoticeRendererActions.clear,
    });

  const projectAssetSceneApplyRendererAction =
    createDesktopProjectAssetSceneApplyRendererAction({
      getActiveProject: () => currentProjectRef.current,
      getLatestScene: () => latestSceneRef.current,
      getFallbackCreatedAt: () => Date.now(),
      getEditorApi: () => excalidrawAPIRef.current,
      queueFiles: queuedExcalidrawBinaryFilesRendererActions.queue,
      setLatestScene: (scene) => {
        latestSceneRef.current = scene;
      },
    });

  const projectThumbnailAssetRefreshRendererActions =
    createProjectThumbnailAssetRefreshRendererActions({
      getLoadedPreviewFileIds: () => loadedPreviewImageFileIdsRef.current,
      getLoadedOriginalFileIds: () => loadedOriginalImageFileIdsRef.current,
      readThumbnailAssets: ({ project, fileIds }) =>
        desktopBridge.readProjectAssetPayloads({
          projectPath: project.projectPath,
          fileIds,
          rendition: "thumbnail",
          thumbnailMode: "cache-only",
        }),
      applyThumbnailAssetsToScene: projectAssetSceneApplyRendererAction,
    });

  const projectThumbnailRebuildRendererActions =
    createProjectThumbnailRebuildRendererActions({
      getActiveProject: () => currentProjectRef.current,
      getLoadedPreviewFileIds: () => loadedPreviewImageFileIdsRef.current,
      getLoadedOriginalFileIds: () => loadedOriginalImageFileIdsRef.current,
      rebuildProjectThumbnails: desktopBridge.rebuildProjectThumbnails,
      readThumbnailAssets: ({ project, fileIds }) =>
        desktopBridge.readProjectAssetPayloads({
          projectPath: project.projectPath,
          fileIds,
          rendition: "thumbnail",
          thumbnailMode: "cache-only",
        }),
      applyThumbnailAssetsToScene: projectAssetSceneApplyRendererAction,
      applyThumbnailMaintenance: setThumbnailMaintenance,
    });

  const visibleImageRenditionLoadRendererActions =
    createVisibleImageRenditionLoadRendererActions({
      delayMs: IMAGE_HIGH_RES_LOAD_DEBOUNCE_MS,
      getProject: () => currentProjectRef.current,
      getSceneReader: () => excalidrawAPIRef.current,
      getDevicePixelRatio: () => window.devicePixelRatio,
      getLatestScene: () => latestSceneRef.current,
      getTimerId: () => highResImageLoadTimerRef.current,
      clearTimer: (timerId) => window.clearTimeout(timerId),
      setTimerId: (timerId) => {
        highResImageLoadTimerRef.current = timerId;
      },
      scheduleTimeout: (callback, delayMs) =>
        window.setTimeout(callback, delayMs),
      getLoadedPreviewFileIds: () => loadedPreviewImageFileIdsRef.current,
      getLoadingPreviewFileIds: () => loadingPreviewImageFileIdsRef.current,
      getLoadedOriginalFileIds: () => loadedOriginalImageFileIdsRef.current,
      getLoadingOriginalFileIds: () => loadingOriginalImageFileIdsRef.current,
      setLoadedPreviewFileIds: (fileIds) => {
        loadedPreviewImageFileIdsRef.current = fileIds;
      },
      setLoadingPreviewFileIds: (fileIds) => {
        loadingPreviewImageFileIdsRef.current = fileIds;
      },
      setLoadedOriginalFileIds: (fileIds) => {
        loadedOriginalImageFileIdsRef.current = fileIds;
      },
      setLoadingOriginalFileIds: (fileIds) => {
        loadingOriginalImageFileIdsRef.current = fileIds;
      },
      setLatestScene: (scene) => {
        latestSceneRef.current = scene;
      },
      readAssets: ({ project, rendition, fileIds }) =>
        readProjectImageAssets(project, fileIds, rendition),
      applyAssetsToScene: projectAssetSceneApplyRendererAction,
    });

  const projectRepairSceneRefreshRendererActions =
    createDesktopProjectRepairSceneRefreshRendererActions({
      getActiveProject: () => currentProjectRef.current,
      getCurrentFiles: () =>
        excalidrawAPIRef.current?.getFiles() ??
        latestSceneRef.current?.files ??
        {},
      getFallbackCreatedAt: () => Date.now(),
      readProjectAssets: (input) =>
        desktopBridge.readProjectAssetPayloads(input),
      getEditorApi: () => excalidrawAPIRef.current,
      queueFiles: queuedExcalidrawBinaryFilesRendererActions.queue,
      setLatestScene: (scene) => {
        latestSceneRef.current = scene;
      },
      updateSceneImageFileIds: sceneImageFileIdsRendererActions.update,
      scheduleVisibleImageRenditionLoad:
        visibleImageRenditionLoadRendererActions.schedule,
      updateWorkspaceOverlay: workspaceOverlayRendererActions.update,
      updateCurrentProject,
      updateSelectedInspector: selectedInspectorRendererActions.update,
    });

  const projectMaintenanceRendererActions =
    createProjectMaintenanceRendererActions({
      getProject: () => currentProjectRef.current,
      getActiveProject: () => currentProjectRef.current,
      getLoadedPreviewFileIds: () => loadedPreviewImageFileIdsRef.current,
      getLoadedOriginalFileIds: () => loadedOriginalImageFileIdsRef.current,
      repairProjectThumbnails: desktopBridge.rebuildProjectThumbnails,
      inspectProjectHealth: desktopBridge.inspectProjectHealth,
      cleanProjectCache: desktopBridge.cleanProjectCache,
      messages: copy.projectRepair,
      refreshThumbnailAssets: async ({ project, fileIds }) => {
        await projectThumbnailAssetRefreshRendererActions.refresh({
          project,
          fileIds,
        });
      },
      refreshSceneFromRepair: projectRepairSceneRefreshRendererActions.refresh,
      applyState: projectMaintenanceActionStateApplier,
    });

  const projectImageStateResetRendererActions =
    createProjectImageStateResetRendererActions({
      resetImageRenditionTracking:
        visibleImageRenditionLoadRendererActions.resetTracking,
      resetQueuedFiles: queuedExcalidrawBinaryFilesRendererActions.reset,
      resetThumbnailMaintenance:
        projectMaintenanceRendererActions.resetThumbnailMaintenance,
    });

  const viewportChangeRendererActions = createViewportChangeRendererActions({
    getScene: () => latestSceneRef.current,
    getSceneReader: () => excalidrawAPIRef.current ?? {},
    setLatestScene: (scene) => {
      latestSceneRef.current = scene;
    },
    scheduleVisibleImageRenditionLoad:
      visibleImageRenditionLoadRendererActions.schedule,
    scheduleAgentBrowserRuntimeStatePublish:
      agentBrowserRuntimePublishRendererActions.schedule,
    updateWorkspaceOverlay: workspaceOverlayRendererActions.update,
  });

  const desktopStartupRendererActions = createDesktopStartupRendererActions({
    getBridge: () => bridge,
    isGenerationModelSelectionLocked: () =>
      generationModelSelectionLockedRef.current,
    setProviderSettings,
    setGenerateRequest,
    setStartupError,
    setRecentProjects,
    setProjectError,
    setAppInfo,
    loadAcpAgentSettings: loadAcpAgentSettingsState,
  });

  const agentBridgeStatusRendererActions =
    createAgentBridgeStatusRendererActions({
      getBridge: () => bridge,
      getCurrentProject: () => currentProjectRef.current,
      getIsAgentBrowserRoute: () => isAgentBrowserRoute,
      getFallbackBoardUrl: () =>
        isAgentBrowserRoute ? window.location.href : null,
      applyBridgeStatus: setAgentBridgeStatus,
      resetAutoOpenProjectPath: setAgentBrowserAutoOpenProjectPath,
      refreshDesktopStartupState:
        desktopStartupRendererActions.refreshAgentBrowser,
      updateCurrentProject,
      showError: setProjectError,
    });

  const generationErrorRendererActions =
    createGenerationErrorRendererActions({
      applyState: createGenerationErrorStateApplier({
        setError: setGenerationError,
        setDetails: setGenerationErrorDetails,
        setDetailsOpen: setGenerationErrorDetailsOpen,
        setCopied: setGenerationErrorCopied,
      }),
      getDetails: () => generationErrorDetails,
      setDetailsCopied: setGenerationErrorCopied,
      getTask: () => selectedTask,
      copyText: clipboardTextRendererActions.copy,
    });

  const acpRunLogRendererActions = createAcpRunLogRendererActions({
    getBridge: () => bridge,
    getCurrentTaskId: getAcpRunLogTaskId,
    getSurface: getAcpRunLogSurface,
    hasCurrentProject: () => Boolean(currentProjectRef.current),
    hasInitialData: () => Boolean(initialData),
    getRefreshTimerId: getAcpRunLogRefreshTimerId,
    clearTimer: (timerId) => window.clearTimeout(timerId),
    setLoading: setAcpRunLogLoading,
    runLogTargetActions: acpRunLogTargetRendererActions,
    setAppSettingsOpen,
    setRunLogDialogOpen: setAcpRunLogDialogOpen,
    setChatDockOpen: setAgentChatDockOpen,
    setRunLogDetail: setAcpRunLogDetail,
    setRunLogError: setAcpRunLogError,
    setRunLogRawOpen: setAcpRunLogRawOpen,
    updateConversationEntries: (updater) => {
      setAcpConversationEntries(updater);
    },
    scheduleTimeout: (callback, timeoutDelay) =>
      window.setTimeout(callback, timeoutDelay),
    setRefreshTimerId: setAcpRunLogRefreshTimerId,
  });

  const closeAcpRunLogDialog = acpRunLogRendererActions.close;

  const generationRequestRendererActions =
    createGenerationRequestRendererActions({
      getProviderSettings: () => providerSettings,
      getCurrentRequest: () => generateRequest,
      setGenerationSource,
      showDirectGenerationRecords:
        acpRunLogRendererActions.showDirectGenerationRecords,
      setGenerateRequest,
      updateGenerateRequest: setGenerateRequest,
    });

  const generateDialogReferenceRendererActions =
    createGenerateDialogReferenceRendererActions({
      getScene: () => latestSceneRef.current,
      getImageRecords: () => currentProjectRef.current?.imageRecords || null,
      getRemovedSelectionReferenceSignature: () =>
        removedSelectionReferenceSignatureRef.current,
      setRemovedSelectionReferenceSignature: (signature) => {
        removedSelectionReferenceSignatureRef.current = signature;
      },
      getCurrentRequest: () => generateRequest,
      getProviderSettings: () => providerSettings,
      clearGenerationError: () => setGenerationError(null),
      updateGenerateRequest: setGenerateRequest,
      focusGenerateInput: () => setGenerateFocusToken((current) => current + 1),
      loadOriginalScene: selectionReferenceOriginalSceneActions.load,
    });

  const currentProjectAutosaveFailureRendererActions =
    createCurrentProjectAutosaveFailureRendererActions({
      formatError: formatProjectSaveError,
      logError: console.error,
      setProjectError,
    });

  const generationRecordRendererActions =
    createGenerationRecordRendererActions({
      getSelectedRecord: () => selectedRecord,
      copyText: clipboardTextRendererActions.copy,
    });

  const imageRecordLocatorRendererActions =
    createImageRecordLocatorRendererActions({
      getApi: () => excalidrawAPIRef.current,
      getImageRecords: () => currentProjectRef.current?.imageRecords,
      setProjectError,
      showProjectNotice: projectNoticeRendererActions.show,
      clearProjectNotice: projectNoticeRendererActions.clear,
    });

  const agentIntegrationCopyShortcutRendererActions =
    createAgentIntegrationCopyShortcutRendererActions({
      getBridgeStatus: () => agentBridgeStatus,
      getAcpAgentSettings: () => acpAgentSettings,
      getRunningTaskId: () => getRunningAcpAgentTaskId(acpAgentTask),
      refreshBridgeStatus: agentBridgeStatusRendererActions.loadStatus,
      copyText: clipboardTextRendererActions.copy,
      onSuccess: projectNoticeRendererActions.show,
      onError: setProjectError,
    });

  const agentStatusDockRendererActions =
    createAgentStatusDockRendererActions({
      copyBoardUrl: agentIntegrationCopyShortcutRendererActions.copyBoardUrl,
      copyCliEnvironment:
        agentIntegrationCopyShortcutRendererActions.copyCliEnvironment,
      refreshStatus:
        agentBridgeStatusRendererActions.refreshBrowserConnectionStatus,
      openSettings: () => setAppSettingsOpen(true),
      openConversation: () => setAgentChatDockOpen(true),
    });

  const agentIntegrationSettingsDialogActions =
    createAgentIntegrationSettingsDialogRendererActions({
      close: () => setAppSettingsOpen(false),
      setIntegrationEnabled: agentBridgeStatusRendererActions.setEnabled,
      copyBoardUrl: agentIntegrationCopyShortcutRendererActions.copyBoardUrl,
      getBoardUrl: () => agentIntegration.bridge.boardUrl,
      openExternalUrl: (url, target) => window.open(url, target),
      copyCliEnvironment:
        agentIntegrationCopyShortcutRendererActions.copyCliEnvironment,
      saveAcpAgentSettings: acpAgentSettingsRendererActions.save,
      setAcpDebugOpen,
      refreshAcpRunSummaries: loadAcpRunSummariesState,
      openAcpRunLog: acpRunLogRendererActions.open,
    });

  const agentBrowserBridgeStatusRetryLoopRendererActions =
    createAgentBrowserBridgeStatusRetryLoopRendererActions({
      refreshConnection: ({ canApply }) =>
        agentBridgeStatusRendererActions.refreshBrowserConnection({
          refreshDesktopStartupState: desktopStartupRendererActions.loadAll,
          canApply,
        }),
      scheduleTimeout: (callback, delayMs) =>
        window.setTimeout(callback, delayMs),
      clearTimeout: (timerId) => window.clearTimeout(timerId),
    });

  const appStartupLifecycleRendererActions =
    createAppStartupLifecycleRendererActions({
      getNotifyRendererReady: () => bridge?.notifyRendererReady,
      getIsAgentBrowserRoute: () => isAgentBrowserRoute,
      loadDesktopStartupState: desktopStartupRendererActions.loadAll,
      startAgentBrowserBridgeStatusRetryLoop:
        agentBrowserBridgeStatusRetryLoopRendererActions.start,
    });

  const appUnmountCleanupRendererActions =
    createAppUnmountCleanupRendererActions({
      clearWorkspaceFitPulseTimer: workspaceFitPulseRendererActions.clearTimer,
      clearProjectNoticeTimer: projectNoticeRendererActions.clearTimer,
      clearVisibleImageRenditionLoadTimer:
        visibleImageRenditionLoadRendererActions.clearTimer,
      clearAcpRunLogRefreshTimer: acpRunLogRendererActions.clearTimer,
      clearAgentBrowserRuntimePublishTimer:
        agentBrowserRuntimePublishRendererActions.clearTimer,
    });

  useDesktopStartupWiring({
    bridge,
    appStartupLifecycleRendererActions,
    appUnmountCleanupRendererActions,
  });

  useEffect(() => {
    return currentProjectEditorInitializingRendererActions.startFallbackClear({
      isEditorInitializing,
      renderNonce: projectRenderNonce,
    });
  }, [isEditorInitializing, projectRenderNonce]);

  const currentProjectBundleOpenRendererActions =
    createCurrentProjectBundleOpenRendererActions({
      beginProjectOpen: currentProjectOpenSequenceRendererActions.begin,
      isCurrentProjectOpen: currentProjectOpenSequenceRendererActions.isCurrent,
      flushPendingAutosave: (options) => flushPendingAutosave(options),
      getDevicePixelRatio: () => window.devicePixelRatio,
      getFallbackCreatedAt: () => Date.now(),
      readProjectAssets: (input) =>
        desktopBridge.readProjectAssetPayloads(input),
      setLoadingProject,
      setProjectError,
      clearProjectNotice: projectNoticeRendererActions.clear,
      formatSaveBeforeOpenError: formatProjectSaveBeforeOpenError,
      formatOpenError: formatProjectOpenError,
      resetImageRenditionState: projectImageStateResetRendererActions.reset,
      setThumbnailMaintenance,
      markImageAssetRenditionsLoaded:
        visibleImageRenditionLoadRendererActions.markLoaded,
      projectRenderNonceRef,
      editorApiRef: excalidrawAPIRef,
      updateEditorInitializing:
        currentProjectEditorInitializingRendererActions.update,
      updateCurrentProject,
      setInitialData,
      setProjectRenderNonce,
      latestSceneRef,
      updateSceneImageFileIds: sceneImageFileIdsRendererActions.update,
      scheduleVisibleImageRenditionLoad:
        visibleImageRenditionLoadRendererActions.schedule,
      updateWorkspaceOverlay: workspaceOverlayRendererActions.update,
      resetWorkspaceZoomGate: workspaceFitPulseRendererActions.reset,
      lastCanvasPointerRef,
      setSelectedRecord,
      setSelectedTask,
      lastBatchBoundsRef,
      resetGenerationTrackingState: generationTrackingRendererActions.reset,
      safeModeOpenedMessage: copy.projectRepair.safeModeOpened,
      showProjectNotice: projectNoticeRendererActions.show,
      rebuildMissingThumbnails:
        projectThumbnailRebuildRendererActions.rebuildMissing,
      loadRecentProjectsState: desktopStartupRendererActions.loadRecentProjects,
    });
  const openProjectBundle = currentProjectBundleOpenRendererActions.open;

  const projectViewClearRendererActions = createProjectViewClearRendererActions({
    beginProjectOpen: currentProjectOpenSequenceRendererActions.begin,
    editorApiRef: excalidrawAPIRef,
    latestSceneRef,
    setSceneImageFileIds,
    updateCurrentProject,
    setInitialData,
    setWorkspaceOverlayState,
    resetWorkspaceZoomGate: workspaceFitPulseRendererActions.reset,
    updateEditorInitializing: currentProjectEditorInitializingRendererActions.update,
    setSelectedRecord,
    setSelectedTask,
    lastCanvasPointerRef,
    lastBatchBoundsRef,
    resetGenerationTrackingState: generationTrackingRendererActions.reset,
    resetImageRenditionState: projectImageStateResetRendererActions.reset,
  });

  const projectRenderBoundaryRendererActions =
    createCurrentProjectRenderBoundaryRendererActions({
      getCurrentProject: () => currentProjectRef.current,
      logError: console.error,
      updateEditorInitializing:
        currentProjectEditorInitializingRendererActions.update,
      clearProjectViewState: projectViewClearRendererActions.clear,
    });

  const currentProjectEditorReadyRendererActions =
    createCurrentProjectEditorReadyRendererActions<
      ExcalidrawImperativeAPI,
      AppSceneSnapshot,
      number
    >({
      getCurrentRenderNonce: () => projectRenderNonceRef.current,
      getLatestScene: () => latestSceneRef.current,
      setEditorApi: (api) => {
        excalidrawAPIRef.current = api;
      },
      flushQueuedImageFilesToCanvas:
        queuedExcalidrawBinaryFilesRendererActions.flush,
      scheduleVisibleImageRenditionLoad:
        visibleImageRenditionLoadRendererActions.schedule,
      requestAnimationFrame: window.requestAnimationFrame,
      scheduleTimeout: (callback, delayMs) =>
        window.setTimeout(callback, delayMs),
      clearInitializing: (nextRenderNonce) => {
        currentProjectEditorInitializingRendererActions.update(
          false,
          nextRenderNonce,
        );
      },
    });

  const activeAgentProjectPathRendererActions =
    createActiveAgentProjectPathRendererActions({
      getActiveProjectPath: () => currentProjectRef.current?.projectPath,
    });

  const generatedImageSceneInsertRendererActions =
    createGeneratedImageSceneInsertRendererActions({
      getEditorApi: () => excalidrawAPIRef.current,
      getActiveProject: () => currentProjectRef.current,
      assertActiveProject:
        activeAgentProjectPathRendererActions.assertActiveProject,
      getSavedSceneHash: () => savedSceneHashRef.current,
      getPreviousBatchBounds: () => lastBatchBoundsRef.current,
      setPreviousBatchBounds: (bounds) => {
        lastBatchBoundsRef.current = bounds;
      },
      updateWorkspaceOverlay: workspaceOverlayRendererActions.update,
      setActiveProject: updateCurrentProject,
      setPendingSnapshot: (snapshot) => {
        pendingAutosaveRef.current = snapshot;
      },
      flushPendingAutosave: (options) => flushPendingAutosave(options),
      getFallbackCreatedAt: () => Date.now(),
    });

  const pendingGenerationCanvasRendererActions =
    createPendingGenerationCanvasRendererActions({
      getEditorApi: () => excalidrawAPIRef.current,
      getActiveProject: () => currentProjectRef.current,
      assertActiveProject:
        activeAgentProjectPathRendererActions.assertActiveProject,
      getFallbackReferenceScene: () => latestSceneRef.current,
      getLastCanvasPointer: () => lastCanvasPointerRef.current,
      getPreviousBatchBounds: () => lastBatchBoundsRef.current,
      setPreviousBatchBounds: (bounds) => {
        lastBatchBoundsRef.current = bounds;
      },
      updateWorkspaceOverlay: workspaceOverlayRendererActions.update,
      getGenerationTasks: () => generationTaskByElementIdRef.current,
      setGenerationTasks: (generationTasks) => {
        generationTaskByElementIdRef.current = generationTasks;
      },
    });

  const projectImageAssetPersistenceRendererActions =
    createProjectImageAssetPersistenceRendererActions({
      getActiveProject: () => currentProjectRef.current,
      imageWritebackBridge: desktopBridge,
      persistImageAssets: desktopBridge.persistImageAssets,
      setActiveProject: updateCurrentProject,
    });

  const builtinGenerationJobCompletionRendererActions =
    createBuiltinGenerationJobCompletionRendererActions<
      readonly ExcalidrawElement[],
      AppState,
      BinaryFiles
    >({
      getActiveProject: () => currentProjectRef.current,
      beginProjectImageWriteback:
        projectImageAssetPersistenceRendererActions.beginProjectImageWriteback,
      replaceSlot: pendingGenerationCanvasRendererActions.replaceSlot,
      markSlotFailed: pendingGenerationCanvasRendererActions.markFailed,
      getCanvasSnapshot: () => {
        const activeApi = excalidrawAPIRef.current;
        if (!activeApi) {
          return null;
        }
        return {
          elements: activeApi.getSceneElementsIncludingDeleted(),
          appState: activeApi.getAppState(),
          files: activeApi.getFiles(),
        };
      },
      restoreCanvasSnapshot: (snapshot) => {
        const activeApi = excalidrawAPIRef.current;
        if (!activeApi) {
          throw new Error("CoreStudio 画板还没有准备好，无法恢复 placeholder 快照。");
        }
        activeApi.updateScene({
          elements: snapshot.elements,
          appState: snapshot.appState,
          captureUpdate: CaptureUpdateAction.NEVER,
        });
        latestSceneRef.current = snapshot;
      },
      getSavedSceneHash: () => savedSceneHashRef.current,
      setScene: (scene) => {
        latestSceneRef.current = scene;
      },
      setPendingSnapshot: (snapshot) => {
        pendingAutosaveRef.current = snapshot;
      },
      updateSceneImageFileIds: sceneImageFileIdsRendererActions.update,
      scheduleVisibleImageRenditionLoad:
        visibleImageRenditionLoadRendererActions.schedule,
      updateWorkspaceOverlay: workspaceOverlayRendererActions.update,
      flushPendingAutosave: (options) => flushPendingAutosave(options),
    });

  const autosaveSnapshotWriteRendererActions =
    createAutosaveSnapshotWriteRendererActions<
      readonly ExcalidrawElement[],
      AppState,
      BinaryFiles
    >({
      getActiveProject: () => currentProjectRef.current,
      hasPendingAutosave: () => Boolean(pendingAutosaveRef.current),
      getPendingSnapshot: () => pendingAutosaveRef.current,
      setPendingSnapshot: (snapshot) => {
        pendingAutosaveRef.current = snapshot;
      },
      getCurrentQueue: () => autosaveQueueRef.current,
      setQueue: (queue) => {
        autosaveQueueRef.current = queue;
      },
      getSavedSceneHash: () => savedSceneHashRef.current,
      persistUnknownCanvasImages:
        projectImageAssetPersistenceRendererActions.persistUnknownCanvasImages,
      serializeScene: serializeSceneForProject,
      writeProjectScene: desktopBridge.writeProjectScene,
      setActiveProject: updateCurrentProject,
      updateSelectedInspector: selectedInspectorRendererActions.update,
      reportError: currentProjectAutosaveFailureRendererActions.report,
    });

  const autosaveRendererActions =
    createAutosaveRendererActions<AutosaveSnapshot>({
      delayMs: 700,
      getTimerId: () => autosaveTimerRef.current,
      clearTimer: (timerId) => window.clearTimeout(timerId),
      setTimerId: (timerId) => {
        autosaveTimerRef.current = timerId;
      },
      setPendingSnapshot: (snapshot) => {
        pendingAutosaveRef.current = snapshot;
      },
      takePendingSnapshot: autosaveSnapshotWriteRendererActions.takePending,
      scheduleTimeout: (callback, delayMs) =>
        window.setTimeout(callback, delayMs),
      writeSnapshot: autosaveSnapshotWriteRendererActions.enqueue,
      waitForQueue: async () => {
        await autosaveQueueRef.current;
      },
      handleWriteError:
        autosaveSnapshotWriteRendererActions.handleWriteFailure,
    });

  const canvasSceneChangeRendererActions =
    createCanvasSceneChangeRendererActions<
      readonly ExcalidrawElement[],
      AppState,
      BinaryFiles
    >({
      getActiveProject: () => currentProjectRef.current,
      getRemovedSelectionReferenceSignature: () =>
        removedSelectionReferenceSignatureRef.current,
      setRemovedSelectionReferenceSignature: (signature) => {
        removedSelectionReferenceSignatureRef.current = signature;
      },
      maybeSnapWorkspaceZoom: workspaceZoomSnapRendererActions.maybeSnap,
      setLatestScene: (scene) => {
        latestSceneRef.current = scene;
      },
      updateSceneImageFileIds: sceneImageFileIdsRendererActions.update,
      scheduleVisibleImageRenditionLoad:
        visibleImageRenditionLoadRendererActions.schedule,
      scheduleAgentBrowserRuntimeStatePublish:
        agentBrowserRuntimePublishRendererActions.schedule,
      updateWorkspaceOverlay: workspaceOverlayRendererActions.update,
      setGenerateRequest,
      updateSelectedInspector: selectedInspectorRendererActions.update,
      isEditorInitializing: () => isEditorInitializingRef.current,
      scheduleAutosave: autosaveRendererActions.schedule,
      getSavedSceneHash: () => savedSceneHashRef.current,
    });

  const flushPendingAutosave = autosaveRendererActions.flush;

  const autosaveLifecycleRendererActions =
    createAutosaveLifecycleRendererActions({
      addEventListener: (eventName, listener) =>
        window.addEventListener(eventName, listener),
      removeEventListener: (eventName, listener) =>
        window.removeEventListener(eventName, listener),
      subscribeFlushRequest: bridge?.onFlushAutosaveRequest,
      flushBeforeUnload: flushPendingAutosave,
      flushRequest: () => flushPendingAutosave({ strict: true }),
    });

  useProjectAutosaveWiring({
    bridge,
    autosaveLifecycleRendererActions,
  });

  const currentProjectEntryRendererActions =
    createCurrentProjectEntryRendererActions({
      getBridge: () => desktopBridge,
      getCurrentProject: () => currentProjectRef.current,
      beginProjectOpen: currentProjectOpenSequenceRendererActions.begin,
      openProjectBundle,
      isCurrentProjectOpen:
        currentProjectOpenSequenceRendererActions.isCurrent,
      flushPendingAutosave,
      clearProjectViewState: projectViewClearRendererActions.clear,
      loadRecentProjectsState: desktopStartupRendererActions.loadRecentProjects,
      formatCreateError: formatProjectCreateError,
      formatOpenError: formatProjectOpenError,
      formatSaveBeforeOpenError: formatProjectSaveBeforeOpenError,
      formatRevealError: formatProjectRevealError,
      setProjectError,
      setLoadingProject,
      updateEditorInitializing:
        currentProjectEditorInitializingRendererActions.update,
      clearProjectNotice: projectNoticeRendererActions.clear,
    });

  const revealProjectFromList = useCallback(
    async (projectPath: string) => {
      try {
        await desktopBridge.revealProjectInFinder(projectPath);
      } catch (error) {
        setProjectError(formatProjectRevealError(error));
      }
    },
    [desktopBridge],
  );

  const agentBrowserAutoOpenProjectRendererActions =
    createAgentBrowserAutoOpenProjectRendererActions({
      getIsAgentBrowserRoute: () => isAgentBrowserRoute,
      getHasInitialProjectToken: () => Boolean(agentBrowserInitialProjectToken),
      getLoadingProject: () => loadingProject,
      getBridgeProjectPath: () =>
        agentBridgeStatus?.currentProject?.projectPath ?? null,
      getCurrentProjectPath: () => currentProject?.projectPath ?? null,
      getAutoOpenProjectPath: () => agentBrowserAutoOpenProjectPath,
      setAutoOpenProjectPath: setAgentBrowserAutoOpenProjectPath,
      openProject: (projectPath) => {
        void currentProjectEntryRendererActions.openRecentProject(projectPath);
      },
    });

  useAgentBridgeWiring({
    agentBrowserAutoOpenProjectRendererActions,
    agentBrowserAutoOpenProjectPath,
    agentBrowserInitialProjectToken,
    agentBridgeCurrentProjectPath:
      agentBridgeStatus?.currentProject?.projectPath ?? null,
    currentProjectPath: currentProject?.projectPath ?? null,
    isAgentBrowserRoute,
    loadingProject,
  });

  const projectImageImportRendererActions =
    createProjectImageImportRendererActions({
      getProject: () => currentProjectRef.current,
      getActiveProject: () => currentProjectRef.current,
      importImages: desktopBridge.importImages,
      readClipboardImage: desktopBridge.readClipboardImage,
      persistImageAssets: desktopBridge.persistImageAssets,
      setActiveProject: updateCurrentProject,
      insertAssetsIntoScene:
        generatedImageSceneInsertRendererActions.insertAssets,
      getClipboardInsertionOptions: () => ({
        anchorPoint: lastCanvasPointerRef.current,
      }),
      formatError: formatProjectImportImagesError,
      setProjectError,
    });

  const acpTaskStartRendererActions = createAcpTaskStartRendererActions({
    getProject: () => currentProjectRef.current,
    getRuntime: () => agentIntegrationRuntime,
    getActiveThreadId: getActiveAcpThreadId,
    getStatus: () => agentBridgeStatus,
    getPageUrl: () => window.location.href,
    getBridge: () => bridge,
    setActiveTaskId: acpActiveTaskIdRendererActions.set,
    setActiveThreadId: acpActiveThreadIdRendererActions.set,
    runLogTargetActions: acpRunLogTargetRendererActions,
    setChatDockOpen: setAgentChatDockOpen,
    setRunLogDetail: setAcpRunLogDetail,
    setRunLogError: setAcpRunLogError,
    setRunLogRawOpen: setAcpRunLogRawOpen,
    setAgentTask: setAcpAgentTask,
    setGenerateRequest,
  });

  const generationSubmitRendererActions =
    createGenerationSubmitRendererActions<
      PlacementViewportContext,
      AppSceneSnapshot
    >({
      getProject: () => currentProjectRef.current,
      getProviderSettings: () => providerSettings,
      clearGenerationError: generationErrorRendererActions.clear,
      assertProjectActive:
        activeAgentProjectPathRendererActions.assertActiveProject,
      startAcpAgentGeneration: acpTaskStartRendererActions.start,
      startBuiltinGeneration: (request, project, options) =>
        runBuiltinGenerationRendererAction({
          request,
          project,
          providerSettings,
          sourceScene: options.referenceScene ?? latestSceneRef.current,
          referenceScene: options.referenceScene ?? null,
          expectedProjectPath: options.expectedProjectPath,
          placementViewport: options.placementViewport,
          startupGenerateFailedMessage: copy.startup.generateFailed,
          loadOriginalScene: selectionReferenceOriginalSceneActions.load,
          assertProjectActive: () =>
            activeAgentProjectPathRendererActions.assertActiveProject(
              options.expectedProjectPath,
            ),
          setGenerationSource,
          showDirectGenerationRecords:
            acpRunLogRendererActions.showDirectGenerationRecords,
          setGenerateRequest,
          insertPlaceholders: (
            preparedRequest,
            startedAt,
            placeholderOptions,
          ) =>
            pendingGenerationCanvasRendererActions.insertPlaceholders(
              preparedRequest,
              startedAt,
              {
                ...placeholderOptions,
                referenceScene: placeholderOptions.referenceScene ?? undefined,
              },
            ),
          getGenerationJobs: () => pendingGenerationJobsRef.current,
          applyRegistryState: (state) =>
            applyPendingGenerationJobRegistryState({
              state,
              setPendingJobs: (pendingJobs) => {
                pendingGenerationJobsRef.current = pendingJobs;
              },
              setPendingCount: setPendingGenerationCount,
            }),
          generateImages: desktopBridge.generateImages,
          cancelGenerateImages: desktopBridge.cancelGenerateImages,
          finishPendingJob:
            builtinGenerationJobCompletionRendererActions.finishPendingJob,
          markPendingGenerationFailed:
            pendingGenerationCanvasRendererActions.markFailed,
          showGenerationError: generationErrorRendererActions.display,
          loadProviderState: desktopStartupRendererActions.loadProvider,
        }),
      showGenerationError: generationErrorRendererActions.display,
    });

  const cancelBuiltinGeneration = () => {
    void runBuiltinGenerationCancelRendererAction({
      getGenerationJobs: () => pendingGenerationJobsRef.current,
      applyRegistryState: (state) =>
        applyPendingGenerationJobRegistryState({
          state,
          setPendingJobs: (pendingJobs) => {
            pendingGenerationJobsRef.current = pendingJobs;
          },
          setPendingCount: setPendingGenerationCount,
        }),
      cancelGenerateImages: desktopBridge.cancelGenerateImages,
      markPendingGenerationFailed:
        pendingGenerationCanvasRendererActions.markFailed,
    });
  };

  const acpConversationMessageRendererActions =
    createAcpConversationMessageRendererActions({
      getCurrentRequest: () => generateRequest,
      getProviderSettings: () => providerSettings,
      getScene: () => latestSceneRef.current,
      getImageRecords: () => currentProjectRef.current?.imageRecords || null,
      getRemovedSelectionReferenceSignature: () =>
        removedSelectionReferenceSignatureRef.current,
      submitGenerationRequest: async (nextRequest) => {
        await generationSubmitRendererActions.submit(nextRequest, false, {
          rejectOnError: true,
        });
      },
    });

  const desktopMenuEventRendererActions =
    createDesktopMenuEventRendererActions({
      getLatestOpenRequestId: () => latestMenuProjectOpenRequestIdRef.current,
      setLatestOpenRequestId: (requestId) => {
        latestMenuProjectOpenRequestIdRef.current = requestId;
      },
      projectOpenFailedFallbackMessage: copy.startup.openProjectFailed,
      setProjectError,
      clearProjectNotice: projectNoticeRendererActions.clear,
      createProject: currentProjectEntryRendererActions.createProject,
      openProject: currentProjectEntryRendererActions.openProject,
      openRecentProject: currentProjectEntryRendererActions.openRecentProject,
      beginProjectOpen: currentProjectOpenSequenceRendererActions.begin,
      openProjectBundle,
      repairProjectThumbnails: projectMaintenanceRendererActions.repair,
      inspectProjectHealth: projectMaintenanceRendererActions.inspectHealth,
      cleanProjectCache: projectMaintenanceRendererActions.cleanCache,
      importImages: projectImageImportRendererActions.importImages,
      openGenerateDialog: generateDialogReferenceRendererActions.open,
      focusProviderSettings: () =>
        setProviderSettingsFocusToken((current) => current + 1),
      openAppSettings: () => setAppSettingsOpen(true),
      setAgentBridgeEnabled: agentBridgeStatusRendererActions.setEnabled,
      revealProject: currentProjectEntryRendererActions.revealProject,
      showAbout: () => setAboutOpen(true),
    });

  const agentCommandRequestSubscriptionRendererActions =
    createAgentCommandRequestSubscriptionRendererActions({
      bridge,
      desktopBridge,
      getProject: () => currentProjectRef.current,
      getScene: () => latestSceneRef.current,
      serializeScene: serializeSceneForProject,
      getExcalidrawAPI: () => excalidrawAPIRef.current,
      providerSettings,
      generationSource,
      generateRequest,
      readProjectImageAssets,
      beginImageWriteback: ({ project, files }) =>
        projectImageAssetPersistenceRendererActions.beginProjectImageWriteback({
          projectPath: project.projectPath,
          projectImageRecords: project.imageRecords,
          files,
        }),
      insertAssetsIntoScene:
        generatedImageSceneInsertRendererActions.insertAssets,
      restoreScene: (snapshot) => {
        const api = excalidrawAPIRef.current;
        if (!api) {
          throw new Error("CoreStudio 画板还没有准备好，无法恢复写入前快照。");
        }
        api.updateScene({
          elements: snapshot.elements,
          appState: snapshot.appState,
          captureUpdate: CaptureUpdateAction.NEVER,
        });
        latestSceneRef.current = snapshot;
      },
      flushPendingAutosave,
      generateImages: async (request, keepOpen, options) => {
        await generationSubmitRendererActions.submit(
          request,
          keepOpen,
          options,
        );
      },
      handleDesktopBridgeRequest: handleAgentDesktopBridgeRequest,
      handleCommandRequest: handleAgentCommandRequest,
    });

  const acpTaskEventSubscriptionRendererActions =
    createAcpTaskEventSubscriptionRendererActions({
      bridge,
      getActiveTaskId: getActiveAcpTaskId,
      getOpenRunLogTaskId: getAcpRunLogTaskId,
      getProjectToken: () => getProjectAgentAccessToken(currentProjectRef.current),
      getAppSettingsOpen: () => appSettingsOpen,
      getAcpDebugOpen: () => acpDebugOpen,
      historyRefreshDelay: ACP_RUN_HISTORY_REFRESH_DELAY_MS,
      updateTaskState: setAcpAgentTask,
      clearActiveTask: () => acpActiveTaskIdRendererActions.set(null),
      scheduleTimeout: (callback, delay) => window.setTimeout(callback, delay),
      clearScheduledTimeout: (timerId) => window.clearTimeout(timerId),
      refreshThreadSummaries: loadAcpThreadSummariesState,
      refreshRunSummaries: loadAcpRunSummariesState,
      refreshOpenRunLog: (taskId, delay = ACP_RUN_LOG_LIVE_REFRESH_DELAY_MS) =>
        acpRunLogRendererActions.scheduleLiveRefresh(taskId, delay),
    });

  useAcpAgentWiring({
    acpThreadRendererActions,
    acpTaskEventSubscriptionRendererActions,
    currentProjectAgentAccessToken,
    bridge,
    getCurrentProjectAgentAccessToken,
    acpDebugOpen,
    appSettingsOpen,
    loadAcpRunSummariesState,
    loadAcpThreadSummariesState,
  });

  useEffect(() => agentCommandRequestSubscriptionRendererActions.start(), [
    bridge,
    desktopBridge,
    flushPendingAutosave,
    generateRequest,
    generationSource,
    generationSubmitRendererActions.submit,
    generatedImageSceneInsertRendererActions.insertAssets,
    providerSettings,
    readProjectImageAssets,
  ]);
  useDesktopMenuEvents(desktopMenuEventRendererActions.handle);

  const globalDialogs = (
    <AppGlobalDialogs
      about={{
        open: aboutOpen,
        appInfo,
        onClose: () => setAboutOpen(false),
      }}
      agentSettings={{
        open: appSettingsOpen,
        integration: agentIntegration,
        canToggleIntegration:
          canSetAgentBridgeEnabled(bridge) && !isAgentBrowserRoute,
        currentProjectPath: currentProject?.projectPath ?? null,
        bridgeProjectPath: agentBridgeStatus?.currentProject?.projectPath ?? null,
        acpAgentDraft: acpAgentSettingsDraft,
        selectedAcpAgent,
        acpAgentEditable: acpAgentSettingsEditable,
        acpAgentSaving: savingAcpAgentSettings,
        acpDebugOpen,
        acpRunSummaries,
        acpRunSummariesLoading,
        acpRunSummariesError,
        canReadAcpRunLogs,
        onClose: agentIntegrationSettingsDialogActions.close,
        onIntegrationEnabledChange:
          agentIntegrationSettingsDialogActions.setIntegrationEnabled,
        onCopyBoardUrl: agentIntegrationSettingsDialogActions.copyBoardUrl,
        onOpenBoardUrl: agentIntegrationSettingsDialogActions.openBoardUrl,
        onCopyCliEnvironment:
          agentIntegrationSettingsDialogActions.copyCliEnvironment,
        onAcpAgentEnabledChange: setAcpAgentEnabledDraft,
        onAcpAgentPresetChange: setAcpAgentPresetDraft,
        onAcpAgentCommandChange: setAcpAgentCommandDraft,
        onAcpAgentArgsChange: setAcpAgentArgsDraft,
        onAcpAgentCwdChange: setAcpAgentCwdDraft,
        onAcpTaskInstructionChange: setAcpTaskInstructionDraft,
        onSaveAcpAgentSettings:
          agentIntegrationSettingsDialogActions.saveAcpAgentSettings,
        onAcpDebugOpenChange:
          agentIntegrationSettingsDialogActions.setAcpDebugOpen,
        onRefreshAcpRunSummaries:
          agentIntegrationSettingsDialogActions.refreshAcpRunSummaries,
        onOpenAcpRunLog: agentIntegrationSettingsDialogActions.openAcpRunLog,
      }}
      acpRunLog={{
        open: acpRunLogDialogOpen,
        loading: acpRunLogLoading,
        error: acpRunLogError,
        detail: acpRunLogDetail,
        rawOpen: acpRunLogRawOpen,
        onRawOpenChange: setAcpRunLogRawOpen,
        onClose: closeAcpRunLogDialog,
      }}
      projectDataReport={{
        open: projectHealthReportOpen,
        healthReport: projectHealthReport,
        repairReport: projectRepairReport,
        onClose: () => setProjectHealthReportOpen(false),
      }}
      generationErrorDetails={{
        open: generationErrorDetailsOpen,
        details: generationErrorDetails,
        copied: generationErrorCopied,
        onCopyDetails: () => {
          void generationErrorRendererActions.copyDetails();
        },
        onClose: () => setGenerationErrorDetailsOpen(false),
      }}
    />
  );

  const renderProjectStatusToast = () => (
    <ProjectStatusToast
      projectNotice={projectNotice}
      thumbnailMaintenance={thumbnailMaintenance}
      projectHealthReport={projectHealthReport}
      projectRepairReport={projectRepairReport}
      onOpenDetails={() => setProjectHealthReportOpen(true)}
    />
  );

  const agentBoardStartupPlan = agentIntegrationRuntime.boardStartup;

  if (agentBoardStartupPlan.action === "show-startup") {
    return (
      <AgentBoardStartupPane
        heading={agentBoardStartupPlan.viewModel.heading}
        description={agentBoardStartupPlan.viewModel.description}
        actionLabel={agentBoardStartupPlan.viewModel.actionLabel}
        startupError={startupError}
        projectError={projectError}
        integration={agentIntegration}
        onAction={agentStatusDockRendererActions.refreshStatus}
        onCopyAgentBoardUrl={agentStatusDockRendererActions.copyBoardUrl}
        onCopyCliEnvironment={agentStatusDockRendererActions.copyCliEnvironment}
        onOpenAgentSettings={agentStatusDockRendererActions.openSettings}
      />
    );
  }

  if (!currentProject || !initialData) {
    return (
      <AppProjectEntryScreen
        startupError={startupError}
        projectError={projectError}
        loadingProject={loadingProject}
        recentProjects={recentProjects}
        onCreateProject={currentProjectEntryRendererActions.createProject}
        onOpenProject={currentProjectEntryRendererActions.openProject}
        onOpenRecentProject={currentProjectEntryRendererActions.openRecentProject}
        onRemoveRecentProject={desktopStartupRendererActions.removeRecentProject}
        onRevealProject={revealProjectFromList}
        agentAccessEnabled={Boolean(agentBridgeStatus?.enabled)}
        onAgentAccessToggle={
          isAgentBrowserRoute
            ? undefined
            : agentBridgeStatusRendererActions.setEnabled
        }
        agentAccessToggleDisabled={
          !canSetAgentBridgeEnabled(bridge) || isAgentBrowserRoute
        }
        manualProjectActionsVisible={!isAgentBrowserRoute}
        showAgentStatusDock={isAgentBrowserRoute}
        integration={agentIntegration}
        onCopyAgentBoardUrl={agentStatusDockRendererActions.copyBoardUrl}
        onCopyCliEnvironment={agentStatusDockRendererActions.copyCliEnvironment}
        onRefreshStatus={agentStatusDockRendererActions.refreshStatus}
        onOpenAgentSettings={agentStatusDockRendererActions.openSettings}
        globalDialogs={globalDialogs}
      />
    );
  }

  const projectRenderKey = `${currentProject.projectPath}:${projectRenderNonce}`;
  const appClassName = [
    "image-board-app",
    "image-board-app--project-open",
    agentChatDockOpen ? "image-board-app--left-dock-open" : "",
    inspectorDockOpen ? "image-board-app--right-dock-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={appClassName}>
      <AppErrorBanners startupError={startupError} projectError={projectError} />
      {globalDialogs}
      <ProjectRenderBoundary
        projectKey={projectRenderKey}
        onError={projectRenderBoundaryRendererActions.reportRenderError}
        onReset={projectRenderBoundaryRendererActions.resetProjectView}
      >
        <div className="image-board-shell">
          <div className="image-board-canvas">
            {isEditorInitializing ? <EditorLoadingOverlay /> : null}
            {renderProjectStatusToast()}
            <Suspense fallback={null}>
              <LazyExcalidraw
                 key={projectRenderKey}
                 langCode={DESKTOP_LANG_CODE}
                 initialData={initialData}
                 onInitialize={(api) => {
                   currentProjectEditorReadyRendererActions.ready(
                     api ?? null,
                     projectRenderNonce,
                   );
                 }}
                onExcalidrawAPI={(api) => {
                  if (projectRenderNonce === projectRenderNonceRef.current) {
                    excalidrawAPIRef.current = api;
                    queuedExcalidrawBinaryFilesRendererActions.flush();
                    visibleImageRenditionLoadRendererActions.schedule(
                      latestSceneRef.current,
                    );
                  }
                }}
                onPointerUpdate={({ pointer }) => {
                  lastCanvasPointerRef.current = {
                    x: pointer.x,
                    y: pointer.y,
                  };
                }}
                onScrollChange={viewportChangeRendererActions.changeViewport}
                onPaste={projectImageImportRendererActions.pasteClipboardImage}
                onChange={canvasSceneChangeRendererActions.changeScene}
                UIOptions={{
                  defaultSidebar: false,
                  canvasActions: {
                    loadScene: false,
                    saveToActiveFile: false,
                    export: false,
                    toggleTheme: true,
                  },
                }}
                detectScroll={false}
                handleKeyboardGlobally={true}
                autoFocus={true}
                renderSelectedShapeActions={({
                  selectedShapeActions,
                  shouldRenderSelectedShapeActions,
                }) => (
                  <InspectorSidebar
                    open={inspectorDockOpen}
                    onOpenChange={setInspectorDockOpen}
                    selectedShapeActions={selectedShapeActions}
                    shouldRenderSelectedShapeActions={
                      shouldRenderSelectedShapeActions
                    }
                    record={selectedRecord}
                    parentRecord={selectedImageRelationship.parentRecord}
                    ancestorRecords={selectedImageRelationship.ancestorRecords}
                    descendantRecords={
                      selectedImageRelationship.descendantRecords
                    }
                    task={selectedTask}
                    onCopyPrompt={() => {
                      void generationRecordRendererActions.copyPrompt();
                    }}
                    onCopyTaskError={() => {
                      void generationErrorRendererActions.copyTaskError();
                    }}
                    onLocateImageRecord={(fileId) => {
                      void imageRecordLocatorRendererActions.locateImageRecord(
                        fileId,
                      );
                    }}
                    onLocatePromptReference={(reference) => {
                      void imageRecordLocatorRendererActions.locatePromptReference(
                        reference,
                      );
                    }}
                  />
                )}
              >
                <LazyProjectMainMenu
                  currentProjectName={currentProject.project.name}
                  onSwitchProject={() => {
                    void currentProjectEntryRendererActions.switchToProjectList();
                  }}
                />
              </LazyExcalidraw>
            </Suspense>
            <AgentConversationSidebar
              mode={generationSidebarMode}
              open={agentChatDockOpen}
              onOpenChange={setAgentChatDockOpen}
              generationRecords={generationRecordItems}
              agentResultRecords={acpAgentResultRecordItems}
              onSelectGenerationRecord={(fileId) => {
                void imageRecordLocatorRendererActions.locateImageRecord(fileId);
              }}
              task={acpAgentTask}
              runLogDetail={agentConversationSurface.runLogDetail}
              threadEntries={acpConversationEntries}
              error={agentConversationSurface.error}
              threadSummaries={acpThreadSummaries}
              activeThreadId={activeAcpThreadId}
              threadsLoading={acpThreadSummariesLoading}
              threadsError={acpThreadSummariesError}
              canSubmitMessage={acpAgentGeneration.canSubmitMessage}
              submitMessageDisabledReason={
                acpAgentGeneration.submitMessageDisabledReason
              }
              threadActionsDisabled={acpAgentTaskRunning}
              onSelectThread={
                acpThreadRendererActions.selectThreadForConversation
              }
              onStartNewThread={acpThreadRendererActions.startNewThread}
              onSubmitMessage={
                acpConversationMessageRendererActions.submitMessage
              }
            />
            <AgentStatusDock
              integration={agentIntegration}
              onCopyAgentBoardUrl={agentStatusDockRendererActions.copyBoardUrl}
              onCopyCliEnvironment={
                agentStatusDockRendererActions.copyCliEnvironment
              }
              onRefreshStatus={agentStatusDockRendererActions.refreshStatus}
              onOpenAgentSettings={agentStatusDockRendererActions.openSettings}
              onOpenAgentConversation={
                agentStatusDockRendererActions.openConversation
              }
            />
            <WorkspaceBoundsOverlay
              state={workspaceOverlayState}
              pulsing={workspaceFitPulse}
            />
          </div>
        </div>
      </ProjectRenderBoundary>

      <GenerateImageDialog
        open={true}
        persistent={true}
        focusToken={generateFocusToken}
        composerConfig={acpAgentGeneration.composerConfig}
        initialRequest={generateRequest}
        providerSettings={providerSettings}
        savingProviderSettings={savingProviders}
        providerSettingsFocusToken={providerSettingsFocusToken}
        loading={pendingGenerationCount > 0}
        error={generationError}
        onOpenErrorDetails={
          generationErrorDetails
            ? () => setGenerationErrorDetailsOpen(true)
            : undefined
        }
        onCancelGeneration={cancelBuiltinGeneration}
        onClose={() => undefined}
        onRequestChange={generationRequestRendererActions.changeRequest}
        onModelSelectionChange={
          generationModelSelectionRendererActions.rememberSelection
        }
        onReferenceRemove={generateDialogReferenceRendererActions.remove}
        onReferenceCommit={generateDialogReferenceRendererActions.commit}
        onOpenAgentRunLog={(taskId) => {
          void acpRunLogRendererActions.open(taskId, {
            openInConversationDock: true,
          });
        }}
        onSaveProviderSettings={(settings) =>
          providerSettingsRendererActions.saveSettings(settings)
        }
        onSubmit={generationSubmitRendererActions.submit}
      />
    </div>
  );
};

export default App;
