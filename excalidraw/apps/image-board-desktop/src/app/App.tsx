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

import {
  buildAgentBrowserRouteState,
  readAgentBrowserProjectVersion,
} from "./agent/agentBrowserBridge";
import {
  createAutosaveLifecycleRendererActions,
  createAutosaveRendererActions,
  type AutosaveSnapshot as ProjectAutosaveSnapshot,
} from "./autosaveProjectState";
import { createAutosaveSnapshotWriteRendererActions } from "./autosaveSnapshotWriteController";
import {
  applyAgentBoardExternalProjectSnapshot,
  readAgentBoardSceneElements,
  runAgentBoardElementPatchScheduleAction,
  writeAgentBoardElementPatchSnapshot,
} from "./agentBoardElementPatchController";
import { createQueuedExcalidrawBinaryFilesRendererActions } from "./canvasImageAssetState";
import { createCanvasSceneChangeRendererActions } from "./canvasSceneChangeRendererController";
import { maybeGetDesktopBridge } from "./desktopBridge";
import { createDesktopMenuEventRendererActions } from "./desktopMenuEventController";
import { createDesktopStartupRendererActions } from "./desktopStartupState";
import { createAppStartupLifecycleRendererActions } from "./appStartupLifecycleController";
import { createAppUnmountCleanupRendererActions } from "./appUnmountCleanupController";
import { createGenerationRequestRendererActions } from "./generationRequestRendererController";
import { runBuiltinGenerationRendererAction } from "./builtinGenerationRendererController";
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
  deserializeSceneFromProject,
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
  resolvePreferredGenerationModelSelection,
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
import { createProjectImageAssetPersistenceRendererActions } from "./projectImageAssetPersistenceController";
import { createProjectImageImportRendererActions } from "./projectImageImportController";
import { createProjectImageStateResetRendererActions } from "./projectImageStateResetRendererActions";
import { createImageRecordLocatorRendererActions } from "./imageRecordLocator";
import { IMAGE_HIGH_RES_LOAD_DEBOUNCE_MS } from "./imageRenditions";
import { createVisibleImageRenditionLoadRendererActions } from "./imageRenditionLoadPlan";
import { createViewportChangeRendererActions } from "./viewportChangeRendererController";
import { createSelectedInspectorRendererActions } from "./selectedInspectorRendererActions";
import { createSelectionReferenceOriginalSceneRendererActions } from "./selectionReference";
import { useDesktopMenuEvents } from "./useDesktopMenuEvents";
import { useDesktopStartupWiring } from "./useDesktopStartupWiring";
import { useProjectAutosaveWiring } from "./useProjectAutosaveWiring";
import { useAgentBridgeWiring } from "./useAgentBridgeWiring";
import { GenerateImageDialog } from "./components/GenerateImageDialog";
import { AgentBoardStartupPane } from "./components/AgentBoardStartupPane";
import { AppBridgeUnavailable } from "./components/AppBridgeUnavailable";
import { GenerationHistorySidebar } from "./components/GenerationHistorySidebar";
import { InspectorSidebar } from "./components/InspectorSidebar";
import { AppErrorBanners } from "./components/AppErrorBanners";
import { AppGlobalDialogs } from "./components/AppGlobalDialogs";
import { type ApplicationSettingsCategory } from "./components/ApplicationSettingsDialog";
import { ImageGenerationSettings } from "./components/ImageGenerationSettings";
import { GeneralSettingsSection } from "./components/GeneralSettingsSection";
import { AboutSettingsSection } from "./components/AboutSettingsSection";
import { CodexIntegrationSettings } from "./components/CodexIntegrationSettings";
import { AppProjectEntryScreen } from "./components/AppProjectEntryScreen";
import { EditorLoadingOverlay } from "./components/EditorLoadingOverlay";
import { ProjectStatusToast } from "./components/ProjectStatusToast";
import { ProjectRenderBoundary } from "./components/ProjectRenderBoundary";
import { WorkspaceBoundsOverlay } from "./components/WorkspaceBoundsOverlay";
import { AgentBoardSelectionBar } from "./components/AgentBoardSelectionBar";
import {
  CORESTUDIO_OPEN_SOURCE_DEPENDENCIES,
  CORESTUDIO_REPOSITORY_URL,
} from "./aboutMetadata";
import {
  createGenerationTrackingRendererActions,
  applyPendingGenerationJobRegistryState,
  type PendingGenerationJob,
} from "./generationJobState";
import { type GenerationTaskRecord } from "./generationTaskState";
import { createBuiltinGenerationJobCompletionRendererActions } from "./builtinGenerationCompletionController";
import { createPendingGenerationCanvasRendererActions } from "./pendingGenerationCanvasController";

import { buildAgentIntegrationRuntimeViewModel } from "./agent/agentIntegrationViewModel";
import { handleAgentCommandRequest } from "./agent/agentCommandRuntime";
import { collectAgentImageFileIds } from "./agent/agentCommandHandlers";
import { runAgentBrowserProjectSyncAction } from "./agent/agentBrowserProjectSyncController";
import { createActiveAgentProjectPathRendererActions } from "./agent/agentCommandRuntimeShared";
import { createAgentCommandRequestSubscriptionRendererActions } from "./agent/agentCommandRequestSubscriptionController";
import { handleAgentDesktopBridgeRequest } from "./agent/agentDesktopBridgeRequest";
import {
  createGenerationErrorStateApplier,
  createGenerationErrorRendererActions,
} from "./generationErrorController";
import { type GenerationErrorDetails } from "./generationErrorViewModel";
import {
  buildGenerationSidebarRecordItems,
  createGenerationRecordRendererActions,
} from "./generationRecordViewModel";
import { createTimedNoticeRendererActions } from "./noticeTimerController";
import { buildDefaultGenerationRequest } from "./generatePromptRequest";
import { createGenerateDialogReferenceRendererActions } from "./generateDialogReferenceController";
import { createAgentBrowserRuntimePublishRendererActions } from "./agent/agentBrowserRuntimePublishController";
import { createAgentBrowserAutoOpenProjectRendererActions } from "./agent/agentBrowserAutoOpenController";
import { createAgentBrowserBridgeStatusRetryLoopRendererActions } from "./agent/agentBrowserBridgeStatusRetryController";
import { notifyAgentBridgeProjectState } from "./agent/agentBridgeStatus";
import {
  applyAgentBridgeStatusCurrentProjectUpdate,
  createAgentBridgeStatusRendererActions,
  useAgentBridgeStatusCurrentProjectSyncEffect,
} from "./agent/agentBridgeStatusController";
import { useAgentBridgeConnectionStateController } from "./agent/useAgentBridgeConnectionStateController";
import { useAgentRuntimeRefsController } from "./agent/useAgentRuntimeRefsController";
import { copy, DESKTOP_LANG_CODE } from "./copy";
import type {
  DesktopLocale,
  DesktopLocalePreference,
} from "../shared/desktopLocale";
import type { GenerationReferencePayload } from "../shared/providerTypes";

import "./App.css";

import type {
  ImageAssetRequestRendition,
  ImagePromptReferenceRecord,
  ImageRecord,
} from "../shared/projectTypes";
import type {
  DesktopAppInfo,
  DesktopProjectBundle,
  PersistedImageAssetInput,
  ProviderConfigurationSnapshot,
  ProjectHealthReport,
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
type AgentBoardElementPatchSnapshot = {
  project: DesktopProjectBundle;
  elements: readonly ExcalidrawElement[];
};

const AGENT_BROWSER_PROJECT_SYNC_INTERVAL_MS = 750;

interface AppProps {
  locale?: DesktopLocale;
  localePreference?: DesktopLocalePreference;
  onLocalePreferenceChange?: (
    preference: DesktopLocalePreference,
  ) => void | Promise<void>;
}

const App = ({
  locale = DESKTOP_LANG_CODE,
  localePreference = "system",
  onLocalePreferenceChange = () => undefined,
}: AppProps) => {
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
  const desktopBridgeRef = useRef(desktopBridge);
  desktopBridgeRef.current = desktopBridge;
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
  const agentBoardPatchTimerRef = useRef<number | null>(null);
  const pendingAgentBoardPatchRef =
    useRef<AgentBoardElementPatchSnapshot | null>(null);
  const agentBoardPatchQueueRef = useRef<Promise<void>>(Promise.resolve());
  const agentBoardBaselineElementsRef = useRef<Record<string, unknown>[]>([]);
  const isEditorInitializingRef = useRef(false);
  const initializingRenderNonceRef = useRef<number | null>(null);
  const projectRenderNonceRef = useRef(0);
  const projectOpenSequenceRef = useRef(0);
  const agentRuntimeRefsController = useAgentRuntimeRefsController();
  const latestMenuProjectOpenRequestIdRef = useRef(0);
  const rememberedGenerationModelSelectionRef = useRef(
    readRememberedGenerationModelSelection(),
  );
  const generationModelSelectionLockedRef = useRef(false);
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
  const agentBoardSelectionSignatureRef = useRef<string | null>(null);
  const generationTaskByElementIdRef = useRef<
    Map<string, GenerationTaskRecord>
  >(new Map());
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
  const [currentProject, setCurrentProject] =
    useState<DesktopProjectBundle | null>(null);
  const [initialData, setInitialData] =
    useState<ExcalidrawInitialDataState | null>(null);
  const [agentBoardSelectionReference, setAgentBoardSelectionReference] =
    useState<GenerationReferencePayload | null>(null);
  const [providerConfiguration, setProviderConfiguration] =
    useState<ProviderConfigurationSnapshot | null>(null);
  const providerSettings = providerConfiguration?.providers ?? null;
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
  const [appInfo, setAppInfo] = useState<DesktopAppInfo | null>(null);
  const generationModelSelectionRendererActions = useMemo(
    () =>
      createGenerationModelSelectionRendererActions({
        selectionLockedRef: generationModelSelectionLockedRef,
        rememberedSelectionRef: rememberedGenerationModelSelectionRef,
      }),
    [generationModelSelectionLockedRef, rememberedGenerationModelSelectionRef],
  );
  const [recentProjects, setRecentProjects] = useState<RecentProjectEntry[]>(
    [],
  );
  const [selectedRecord, setSelectedRecord] = useState<ImageRecord | null>(
    null,
  );
  const [selectedTask, setSelectedTask] = useState<GenerationTaskRecord | null>(
    null,
  );
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
  const [loadingProject, setLoadingProject] = useState(false);
  const [savingProviders, setSavingProviders] = useState(false);
  const providerSettingsRendererActions = useMemo(
    () =>
      createProviderSettingsRendererActions({
        saveProviderSettings: desktopBridge.saveProviderSettings,
        deleteProviderSettings: desktopBridge.deleteProviderSettings,
        setProviderSettings: setProviderConfiguration,
        setSavingProviders,
      }),
    [
      desktopBridge.saveProviderSettings,
      desktopBridge.deleteProviderSettings,
      setProviderConfiguration,
      setSavingProviders,
    ],
  );
  const [pendingGenerationCount, setPendingGenerationCount] = useState(0);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [autosaveConflictProjectPath, setAutosaveConflictProjectPath] =
    useState<string | null>(null);
  const [loadingLatestProject, setLoadingLatestProject] = useState(false);
  const autosaveConflictProjectPathRef = useRef<string | null>(null);
  const [projectNotice, setProjectNotice] = useState<string | null>(null);
  const [agentBoardSaveStatus, setAgentBoardSaveStatus] = useState<
    "idle" | "saving" | "saved" | "conflict" | "error"
  >("idle");
  const [projectHealthReport, setProjectHealthReport] =
    useState<ProjectHealthReport | null>(null);
  const [projectRepairReport, setProjectRepairReport] =
    useState<ProjectRepairReport | null>(null);
  const [projectHealthReportOpen, setProjectHealthReportOpen] = useState(false);
  const projectNoticeTimerRef = useRef<number | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationErrorDetails, setGenerationErrorDetails] =
    useState<GenerationErrorDetails | null>(null);
  const [generationErrorDetailsOpen, setGenerationErrorDetailsOpen] =
    useState(false);
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
  const [startupError, setStartupError] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [appSettingsOpen, setAppSettingsOpen] = useState(false);
  const [appSettingsCategory, setAppSettingsCategory] =
    useState<ApplicationSettingsCategory>("image-generation");
  const [appSettingsDirty, setAppSettingsDirty] = useState(false);
  const [appSettingsDiscardToken, setAppSettingsDiscardToken] = useState(0);
  const [generationHistoryOpen, setGenerationHistoryOpen] = useState(false);
  const [generationRecordRevealRequest, setGenerationRecordRevealRequest] =
    useState<{ fileId: string; requestId: number } | null>(null);
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

  useAgentBridgeStatusCurrentProjectSyncEffect({
    project: currentProject,
    applyBridgeStatus: setAgentBridgeStatus,
  });
  const agentIntegrationRuntime = useMemo(
    () =>
      buildAgentIntegrationRuntimeViewModel({
        bridgeStatus: agentBridgeStatus,
        isAgentBrowserRoute,
        hasInitialProjectToken: Boolean(agentBrowserInitialProjectToken),
        hasCurrentProject: Boolean(currentProject),
        hasInitialData: Boolean(initialData),
      }),
    [
      agentBridgeStatus,
      agentBrowserInitialProjectToken,
      currentProject,
      initialData,
      isAgentBrowserRoute,
    ],
  );
  const selectedImageRelationship = useMemo(
    () =>
      buildSelectedImageRelationshipState({
        imageRecords: currentProject?.imageRecords,
        selectedRecord,
      }),
    [currentProject?.imageRecords, selectedRecord],
  );
  const generationRecordItems = useMemo(
    () =>
      buildGenerationSidebarRecordItems({
        project: currentProject,
        sceneImageFileIds,
        files: latestSceneRef.current?.files ?? null,
      }).generationRecords,
    [currentProject, sceneImageFileIds],
  );

  const sceneImageFileIdsRendererActions =
    createSceneImageFileIdsRendererActions({
      setSceneImageFileIds,
    });

  const currentProjectUpdateRendererActions =
    createCurrentProjectUpdateRendererActions({
      getPreviousProject: () => currentProjectRef.current,
      setCurrentProjectRef: (nextProject) => {
        currentProjectRef.current = nextProject;
      },
      setCurrentProject,
      setSavedSceneHashRef: (savedSceneHash) => {
        savedSceneHashRef.current = savedSceneHash;
      },
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

  useEffect(() => {
    if (!isAgentBrowserRoute || !currentProject) {
      agentBoardBaselineElementsRef.current = [];
      setAgentBoardSaveStatus("idle");
      return;
    }
    agentBoardBaselineElementsRef.current = readAgentBoardSceneElements(
      currentProject.sceneJson,
    );
  }, [
    currentProject?.projectPath,
    currentProject?.sceneJson,
    isAgentBrowserRoute,
  ]);

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
        getUpdatedAt: () => new Date().toISOString(),
        getLatestScene: () => latestSceneRef.current,
        getTimerId: agentRuntimeRefsController.actions.getStatePublishTimerId,
        clearTimer: (timerId) => window.clearTimeout(timerId),
        setTimerId: agentRuntimeRefsController.actions.setStatePublishTimerId,
        scheduleTimeout: (callback, delayMs) =>
          window.setTimeout(callback, delayMs),
      }),
    [agentRuntimeRefsController.actions, isAgentBrowserRoute],
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

  useEffect(() => {
    if (!isAgentBrowserRoute || !currentProject?.projectPath) {
      return;
    }

    let stopped = false;
    let syncing = false;
    const syncProject = async () => {
      if (stopped || syncing) {
        return;
      }
      const activeProject = currentProjectRef.current;
      if (!activeProject) {
        return;
      }

      syncing = true;
      try {
        await runAgentBrowserProjectSyncAction({
          currentProject: activeProject,
          readProjectVersion: readAgentBrowserProjectVersion,
          readProjectBundle: (projectPath) =>
            desktopBridgeRef.current.openRecentProject(projectPath),
          applyProjectMetadata: updateCurrentProject,
          applyProjectBundle: async (nextProject) => {
            const restored = await deserializeSceneFromProject(
              nextProject.sceneJson,
            );
            await applyAgentBoardExternalProjectSnapshot({
              sceneJson: nextProject.sceneJson,
              getBaselineElements: () =>
                agentBoardBaselineElementsRef.current,
              setBaselineElements: (elements) => {
                agentBoardBaselineElementsRef.current = elements;
              },
              applyProjectSnapshot: async () => {
                await projectRepairSceneRefreshRendererActions.refresh({
                  project: nextProject,
                  imageRecords: nextProject.imageRecords,
                  restoredSceneJson: nextProject.sceneJson,
                  restoredBoardFileIds: collectAgentImageFileIds(
                    restored.elements ?? [],
                  ),
                  forceRefresh: true,
                });
                updateCurrentProject(nextProject);
              },
            });
          },
        });
      } catch (error) {
        console.error("[agent-board:project-sync-failed]", error);
      } finally {
        syncing = false;
      }
    };

    const timerId = window.setInterval(
      () => void syncProject(),
      AGENT_BROWSER_PROJECT_SYNC_INTERVAL_MS,
    );
    return () => {
      stopped = true;
      window.clearInterval(timerId);
    };
  }, [currentProject?.projectPath, isAgentBrowserRoute]);

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
    getRememberedGenerationModelSelection: () =>
      rememberedGenerationModelSelectionRef.current,
    setProviderSettings: setProviderConfiguration,
    setGenerateRequest,
    setStartupError,
    setRecentProjects,
    setProjectError,
    setAppInfo,
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

  const generationErrorRendererActions = createGenerationErrorRendererActions({
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

  const generationRequestRendererActions =
    createGenerationRequestRendererActions({
      getProviderSettings: () => providerSettings,
      setGenerateRequest,
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

  const generationRecordRendererActions = createGenerationRecordRendererActions(
    {
      getSelectedRecord: () => selectedRecord,
      copyText: clipboardTextRendererActions.copy,
    },
  );

  const imageRecordLocatorRendererActions =
    createImageRecordLocatorRendererActions({
      getApi: () => excalidrawAPIRef.current,
      getImageRecords: () => currentProjectRef.current?.imageRecords,
      setProjectError,
      showProjectNotice: projectNoticeRendererActions.show,
      clearProjectNotice: projectNoticeRendererActions.clear,
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

  const projectViewClearRendererActions = createProjectViewClearRendererActions(
    {
      beginProjectOpen: currentProjectOpenSequenceRendererActions.begin,
      editorApiRef: excalidrawAPIRef,
      latestSceneRef,
      setSceneImageFileIds,
      updateCurrentProject,
      setInitialData,
      setWorkspaceOverlayState,
      resetWorkspaceZoomGate: workspaceFitPulseRendererActions.reset,
      updateEditorInitializing:
        currentProjectEditorInitializingRendererActions.update,
      setSelectedRecord,
      setSelectedTask,
      lastCanvasPointerRef,
      lastBatchBoundsRef,
      resetGenerationTrackingState: generationTrackingRendererActions.reset,
      resetImageRenditionState: projectImageStateResetRendererActions.reset,
    },
  );

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
          throw new Error(
            "CoreStudio 画板还没有准备好，无法恢复 placeholder 快照。",
          );
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
      handleStaleSnapshot: ({ projectPath }) => {
        if (autosaveTimerRef.current !== null) {
          window.clearTimeout(autosaveTimerRef.current);
          autosaveTimerRef.current = null;
        }
        pendingAutosaveRef.current = null;
        autosaveConflictProjectPathRef.current = projectPath;
        setAutosaveConflictProjectPath(projectPath);
        setProjectError(null);
      },
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
      handleWriteError: autosaveSnapshotWriteRendererActions.handleWriteFailure,
    });

  const enqueueAgentBoardElementPatch = (
    snapshot: AgentBoardElementPatchSnapshot,
  ) => {
    const nextWrite = agentBoardPatchQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const applyProjectSceneElementPatches =
          desktopBridge.applyProjectSceneElementPatches;
        if (!applyProjectSceneElementPatches) {
          throw new Error("当前集成环境不支持画布元素写回，请更新后重试。");
        }
        setAgentBoardSaveStatus("saving");
        await writeAgentBoardElementPatchSnapshot({
          snapshot: {
            project: snapshot.project,
            elements: snapshot.elements as unknown as Record<string, unknown>[],
          },
          baselineElements: agentBoardBaselineElementsRef.current,
          applyProjectSceneElementPatches,
          setBaselineElements: (elements) => {
            agentBoardBaselineElementsRef.current = elements;
          },
          setSavedSceneHash: (sceneHash) => {
            savedSceneHashRef.current = sceneHash;
          },
          updateProject: (nextProject) => {
            if (
              currentProjectRef.current?.projectPath === nextProject.projectPath
            ) {
              updateCurrentProject(nextProject);
            }
          },
        });
        setAgentBoardSaveStatus("saved");
      });
    agentBoardPatchQueueRef.current = nextWrite;
    return nextWrite;
  };

  const agentBoardElementPatchRendererActions =
    createAutosaveRendererActions<AgentBoardElementPatchSnapshot>({
      delayMs: 500,
      getTimerId: () => agentBoardPatchTimerRef.current,
      clearTimer: (timerId) => window.clearTimeout(timerId),
      setTimerId: (timerId) => {
        agentBoardPatchTimerRef.current = timerId;
      },
      setPendingSnapshot: (snapshot) => {
        pendingAgentBoardPatchRef.current = snapshot;
      },
      takePendingSnapshot: () => {
        const snapshot = pendingAgentBoardPatchRef.current;
        pendingAgentBoardPatchRef.current = null;
        return snapshot;
      },
      scheduleTimeout: (callback, delayMs) =>
        window.setTimeout(callback, delayMs),
      writeSnapshot: enqueueAgentBoardElementPatch,
      waitForQueue: async () => {
        await agentBoardPatchQueueRef.current;
      },
      handleWriteError: ({ snapshot, error }) => {
        const isConflict =
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "WRITEBACK_CONFLICT";
        if (isConflict) {
          autosaveConflictProjectPathRef.current = snapshot.project.projectPath;
          setAutosaveConflictProjectPath(snapshot.project.projectPath);
          setAgentBoardSaveStatus("conflict");
          return;
        }
        setAgentBoardSaveStatus("error");
        setProjectError(formatProjectSaveError(error));
      },
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
      updateSelectionReference: ({ signature, getReference }) => {
        if (
          !isAgentBrowserRoute ||
          signature === agentBoardSelectionSignatureRef.current
        ) {
          return;
        }
        agentBoardSelectionSignatureRef.current = signature;
        setAgentBoardSelectionReference(getReference());
      },
      setGenerateRequest,
      updateSelectedInspector: selectedInspectorRendererActions.update,
      isEditorInitializing: () => isEditorInitializingRef.current,
      getPersistencePolicy: () => {
        if (isAgentBrowserRoute) {
          return autosaveConflictProjectPathRef.current ===
            currentProjectRef.current?.projectPath
            ? "paused-conflict"
            : "element-patch";
        }
        if (
          autosaveConflictProjectPathRef.current ===
          currentProjectRef.current?.projectPath
        ) {
          return "paused-conflict";
        }
        return "project-autosave";
      },
      scheduleAutosave: autosaveRendererActions.schedule,
      scheduleAgentBoardElementPatch: (snapshot) => {
        runAgentBoardElementPatchScheduleAction({
          baselineElements: agentBoardBaselineElementsRef.current,
          snapshot,
          cancelPending: agentBoardElementPatchRendererActions.cancel,
          schedule: agentBoardElementPatchRendererActions.schedule,
          setSaveStatus: setAgentBoardSaveStatus,
        });
      },
      getSavedSceneHash: () => savedSceneHashRef.current,
    });

  useEffect(() => {
    if (!isAgentBrowserRoute) {
      return;
    }
    agentBoardSelectionSignatureRef.current = null;
    setAgentBoardSelectionReference(null);
  }, [currentProject?.projectPath, isAgentBrowserRoute]);

  const clearAgentBoardSelection = () => {
    const api = excalidrawAPIRef.current;
    if (!api) {
      return;
    }
    api.updateScene({
      appState: {
        selectedElementIds: {},
        selectedGroupIds: {},
      },
      captureUpdate: CaptureUpdateAction.NEVER,
    });
  };

  const flushPendingAutosave = (options: { strict?: boolean } = {}) =>
    isAgentBrowserRoute
      ? agentBoardElementPatchRendererActions.flush(options)
      : autosaveRendererActions.flush(options);

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
      isCurrentProjectOpen: currentProjectOpenSequenceRendererActions.isCurrent,
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

  const generationSubmitRendererActions = createGenerationSubmitRendererActions<
    PlacementViewportContext,
    AppSceneSnapshot
  >({
    getProject: () => currentProjectRef.current,
    getProviderSettings: () => providerSettings,
    clearGenerationError: generationErrorRendererActions.clear,
    assertProjectActive:
      activeAgentProjectPathRendererActions.assertActiveProject,
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
        setGenerateRequest,
        insertPlaceholders: (preparedRequest, startedAt, placeholderOptions) =>
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

  const desktopMenuEventRendererActions = createDesktopMenuEventRendererActions(
    {
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
      focusProviderSettings: () => {
        setAppSettingsCategory("image-generation");
        setAppSettingsOpen(true);
      },
      openAppSettings: () => setAppSettingsOpen(true),
      setAgentBridgeEnabled: agentBridgeStatusRendererActions.setEnabled,
      revealProject: currentProjectEntryRendererActions.revealProject,
      showAbout: () => setAboutOpen(true),
    },
  );

  const agentCommandRequestSubscriptionRendererActions =
    createAgentCommandRequestSubscriptionRendererActions({
      bridge,
      desktopBridge,
      getProject: () => currentProjectRef.current,
      getScene: () => latestSceneRef.current,
      serializeScene: serializeSceneForProject,
      getExcalidrawAPI: () => excalidrawAPIRef.current,
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
      handleDesktopBridgeRequest: (input) =>
        handleAgentDesktopBridgeRequest({
          ...input,
          flushPendingAutosave,
          applyExternalProjectSnapshot: (project) =>
            currentProjectBundleOpenRendererActions.applyExternalSnapshot(
              project,
            ),
          openRecentProject: async (projectPath) => {
            const result =
              await currentProjectEntryRendererActions.openRecentProject(
                projectPath,
              );
            const openedProject = currentProjectRef.current;
            if (
              result.status !== "opened" ||
              openedProject?.projectPath !== projectPath
            ) {
              return null;
            }
            return openedProject;
          },
        }),
      handleCommandRequest: handleAgentCommandRequest,
    });

  useEffect(
    () => agentCommandRequestSubscriptionRendererActions.start(),
    [
      bridge,
      desktopBridge,
      flushPendingAutosave,
      generatedImageSceneInsertRendererActions.insertAssets,
      readProjectImageAssets,
    ],
  );
  useDesktopMenuEvents(desktopMenuEventRendererActions.handle);

  const globalDialogs = (
    <AppGlobalDialogs
      about={{
        open: aboutOpen,
        appInfo,
        onClose: () => setAboutOpen(false),
      }}
      appSettings={{
        open: appSettingsOpen,
        activeCategory: appSettingsCategory,
        dirty: appSettingsDirty,
        onCategoryChange: (category) => {
          setAppSettingsCategory(category);
        },
        onDiscardChanges: () => {
          setAppSettingsDirty(false);
          setAppSettingsDiscardToken((current) => current + 1);
        },
        onClose: () => setAppSettingsOpen(false),
        generalContent: (
          <GeneralSettingsSection
            preference={localePreference}
            onPreferenceChange={(preference) => {
              void onLocalePreferenceChange(preference);
            }}
          />
        ),
        imageGenerationContent: (
          <ImageGenerationSettings
            configuration={
              providerConfiguration ?? {
                schemaVersion: 2,
                defaultProvider: null,
                providers: {},
              }
            }
            saving={savingProviders}
            discardToken={appSettingsDiscardToken}
            onSave={async (input) => {
              const result = await providerSettingsRendererActions.saveSettings(
                input,
              );
              const selection = resolvePreferredGenerationModelSelection({
                configuration: result.providerConfiguration,
                rememberedSelection: {
                  provider: generateRequest.provider,
                  model: generateRequest.model,
                },
              });
              if (selection) {
                generationRequestRendererActions.changeRequest({
                  ...generateRequest,
                  ...selection,
                });
              }
            }}
            onDelete={async (input) => {
              const result =
                await providerSettingsRendererActions.deleteSettings(input);
              const selection = resolvePreferredGenerationModelSelection({
                configuration: result.providerConfiguration,
                rememberedSelection: {
                  provider: generateRequest.provider,
                  model: generateRequest.model,
                },
              });
              if (selection) {
                generationRequestRendererActions.changeRequest({
                  ...generateRequest,
                  ...selection,
                });
              }
            }}
            onDirtyChange={setAppSettingsDirty}
          />
        ),
        codexIntegrationContent: (
          <CodexIntegrationSettings
            open={
              appSettingsOpen && appSettingsCategory === "codex-integration"
            }
            inspect={() => {
              if (!desktopBridge.inspectCodexIntegration) {
                return Promise.reject(
                  new Error("当前版本暂不支持检测 Codex 集成。"),
                );
              }
              return desktopBridge.inspectCodexIntegration();
            }}
            install={() => {
              if (!desktopBridge.installCodexIntegration) {
                return Promise.reject(
                  new Error("当前版本暂不支持安装 Codex 集成。"),
                );
              }
              return desktopBridge.installCodexIntegration();
            }}
            copyText={clipboardTextRendererActions.copy}
          />
        ),
        aboutContent: (
          <AboutSettingsSection
            appInfo={appInfo}
            repositoryUrl={CORESTUDIO_REPOSITORY_URL}
            dependencies={CORESTUDIO_OPEN_SOURCE_DEPENDENCIES}
            onOpenExternal={(url) => {
              void desktopBridge.openExternal?.(url);
            }}
          />
        ),
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
      agentBoardSaveStatus={isAgentBrowserRoute ? agentBoardSaveStatus : "idle"}
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
        onAction={
          agentBridgeStatusRendererActions.refreshBrowserConnectionStatus
        }
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
        onOpenRecentProject={
          currentProjectEntryRendererActions.openRecentProject
        }
        onRemoveRecentProject={
          desktopStartupRendererActions.removeRecentProject
        }
        onRevealProject={revealProjectFromList}
        manualProjectActionsVisible={!isAgentBrowserRoute}
        globalDialogs={globalDialogs}
      />
    );
  }

  const activeAutosaveConflict =
    autosaveConflictProjectPath === currentProject.projectPath;
  const reloadLatestProject = async () => {
    if (!activeAutosaveConflict || loadingLatestProject) {
      return;
    }

    setLoadingLatestProject(true);
    pendingAutosaveRef.current = null;
    try {
      const result = await currentProjectEntryRendererActions.openRecentProject(
        currentProject.projectPath,
      );
      if (result.status === "opened") {
        autosaveConflictProjectPathRef.current = null;
        setAutosaveConflictProjectPath(null);
        setProjectError(null);
      }
    } finally {
      setLoadingLatestProject(false);
    }
  };

  const projectRenderKey = `${currentProject.projectPath}:${projectRenderNonce}`;
  const appClassName = [
    "image-board-app",
    "image-board-app--project-open",
    generationHistoryOpen ? "image-board-app--left-dock-open" : "",
    inspectorDockOpen ? "image-board-app--right-dock-open" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const canvasClassName = [
    "image-board-canvas",
    isEditorInitializing ? "image-board-canvas--editor-initializing" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={appClassName}>
      <AppErrorBanners
        startupError={startupError}
        projectError={activeAutosaveConflict ? null : projectError}
        projectRecovery={
          activeAutosaveConflict
            ? {
                message: copy.startup.staleProjectSnapshot,
                actionLabel: copy.startup.loadLatestProject,
                actionPendingLabel: copy.startup.loadingLatestProject,
                pending: loadingLatestProject,
                onAction: () => {
                  void reloadLatestProject();
                },
              }
            : null
        }
      />
      {globalDialogs}
      <ProjectRenderBoundary
        projectKey={projectRenderKey}
        onError={projectRenderBoundaryRendererActions.reportRenderError}
        onReset={projectRenderBoundaryRendererActions.resetProjectView}
      >
        <div className="image-board-shell">
          <div className={canvasClassName}>
            {isEditorInitializing ? <EditorLoadingOverlay /> : null}
            {renderProjectStatusToast()}
            <Suspense fallback={null}>
              <LazyExcalidraw
                key={projectRenderKey}
                langCode={locale}
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
                  fullSelectedShapeActions,
                  shouldRenderSelectedShapeActions,
                }) => (
                  <InspectorSidebar
                    open={inspectorDockOpen}
                    onOpenChange={setInspectorDockOpen}
                    selectedShapeActions={fullSelectedShapeActions}
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
                    onLocateGenerationRecord={() => {
                      if (selectedRecord) {
                        setGenerationRecordRevealRequest((current) => ({
                          fileId: selectedRecord.fileId,
                          requestId: (current?.requestId ?? 0) + 1,
                        }));
                      }
                      setGenerationHistoryOpen(true);
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
                  canvasUtilityActionsVisible={!isAgentBrowserRoute}
                  onSwitchProject={() => {
                    void currentProjectEntryRendererActions.switchToProjectList();
                  }}
                />
              </LazyExcalidraw>
            </Suspense>
            {isAgentBrowserRoute ? (
              <AgentBoardSelectionBar
                projectName={currentProject.project.name}
                projectId={currentProject.project.projectId ?? ""}
                reference={agentBoardSelectionReference}
                onClearSelection={clearAgentBoardSelection}
              />
            ) : null}
            <GenerationHistorySidebar
              open={generationHistoryOpen}
              onOpenChange={setGenerationHistoryOpen}
              records={generationRecordItems}
              selectedFileId={selectedRecord?.fileId}
              revealRequest={generationRecordRevealRequest}
              onSelectRecord={(fileId) => {
                void imageRecordLocatorRendererActions.locateImageRecord(
                  fileId,
                );
              }}
            />
            <WorkspaceBoundsOverlay
              state={workspaceOverlayState}
              pulsing={workspaceFitPulse}
            />
          </div>
        </div>
      </ProjectRenderBoundary>

      {!isAgentBrowserRoute ? (
        <GenerateImageDialog
          open={true}
          persistent={true}
          focusToken={generateFocusToken}
          initialRequest={generateRequest}
          providerSettings={providerSettings}
          loading={pendingGenerationCount > 0}
          error={generationError}
          onOpenErrorDetails={
            generationErrorDetails
              ? () => setGenerationErrorDetailsOpen(true)
              : undefined
          }
          onOpenProviderSettings={() => {
            setAppSettingsCategory("image-generation");
            setAppSettingsOpen(true);
          }}
          onClose={() => undefined}
          onRequestChange={generationRequestRendererActions.changeRequest}
          onModelSelectionChange={
            generationModelSelectionRendererActions.rememberSelection
          }
          onReferenceRemove={generateDialogReferenceRendererActions.remove}
          onReferenceCommit={generateDialogReferenceRendererActions.commit}
          onSubmit={generationSubmitRendererActions.submit}
        />
      ) : null}
    </div>
  );
};

export default App;
