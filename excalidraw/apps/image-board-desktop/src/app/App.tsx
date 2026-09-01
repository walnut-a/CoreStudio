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
import type { FooterNavigationControls } from "@excalidraw/excalidraw/components/footer/FooterNavigation";

import {
  buildAgentBrowserRouteState,
  exchangeStableAgentBoardSession,
  getPendingAgentBoardConnection,
  inspectStableAgentBoardIntegration,
  returnToAgentBoardProjectSelection,
} from "./agent/agentBrowserBridge";
import { buildAgentBoardLinkInstruction } from "./agentBoardLinkInstruction";
import {
  getOrCreateStableBoardPageNonce,
  setAgentBrowserRoomResumeToken,
  setStableBoardActorResumeToken,
} from "./agent/agentBrowserRoomCredentials";
import {
  mergeAgentBoardAuthoritativeAppState,
  mergeAgentBoardInitialAppState,
  readAgentBoardViewportState,
  type AgentBoardViewportState,
  writeAgentBoardViewportState,
} from "./agent/agentBoardViewportState";
import { createProjectRoomFlushLifecycleActions } from "./projectRoomFlushLifecycle";
import { createQueuedExcalidrawBinaryFilesRendererActions } from "./canvasImageAssetState";
import { createCanvasSceneChangeRendererActions } from "./canvasSceneChangeRendererController";
import { createDesktopProjectRoomTransport } from "./desktopProjectRoomTransport";
import {
  createProjectRoomClientController,
  type ProjectRoomClientController,
} from "./projectRoomClientController";
import { createProjectRoomAssetRefreshRendererActions } from "./projectRoomAssetRefreshController";
import { createProjectRoomWebSocketTransport } from "./projectRoomWebSocketTransport";
import { createProjectRoomCollaborators } from "./projectRoomPresence";
import { reconcileProjectRoomScene } from "./projectRoomSceneReconciliation";
import { maybeGetDesktopBridge } from "./desktopBridge";
import { createDesktopMenuEventRendererActions } from "./desktopMenuEventController";
import {
  createDesktopStartupRendererActions,
  type RecentProjectsLoadStatus,
} from "./desktopStartupState";
import { createAppStartupLifecycleRendererActions } from "./appStartupLifecycleController";
import { createAppUnmountCleanupRendererActions } from "./appUnmountCleanupController";
import { createGenerationRequestRendererActions } from "./generationRequestRendererController";
import { runBuiltinGenerationRendererAction } from "./builtinGenerationRendererController";
import { createGenerationSubmitRendererActions } from "./generationSubmitRendererController";
import {
  type GeneratedImagePlacementViewport,
  type SceneBounds,
} from "./project/imagePlacement";
import { createGeneratedImageSceneInsertRendererActions } from "./generatedImageSceneInsertRendererController";
import {
  deserializeSceneFromProject,
  extractSharedSceneConfig,
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
import {
  applyRemoteModelCatalog,
  getConfiguredProviderIds,
} from "../shared/providerCatalog";
import { appendElementsWithSyncedIndices } from "./sceneOrder";
import { createSceneImageFileIdsRendererActions } from "./sceneImageFileIds";
import { buildSelectedImageRelationshipState } from "./imageRecordState";
import { createProjectImageAssetPersistenceRendererActions } from "./projectImageAssetPersistenceController";
import { createProjectImageImportRendererActions } from "./projectImageImportController";
import { createProjectClipboardRendererActions } from "./projectClipboardController";
import { createProjectImageStateResetRendererActions } from "./projectImageStateResetRendererActions";
import { createImageRecordLocatorRendererActions } from "./imageRecordLocator";
import { IMAGE_HIGH_RES_LOAD_DEBOUNCE_MS } from "./imageRenditions";
import { createVisibleImageRenditionLoadRendererActions } from "./imageRenditionLoadPlan";
import { createViewportChangeRendererActions } from "./viewportChangeRendererController";
import { createSelectedInspectorRendererActions } from "./selectedInspectorRendererActions";
import { createSelectionReferenceOriginalSceneRendererActions } from "./selectionReference";
import { useDesktopMenuEvents } from "./useDesktopMenuEvents";
import { useDesktopStartupWiring } from "./useDesktopStartupWiring";
import { useProjectRoomFlushWiring } from "./useProjectRoomFlushWiring";
import { useAppUpdate } from "./useAppUpdate";
import { GenerateImageDialog } from "./components/GenerateImageDialog";
import { AppBridgeUnavailable } from "./components/AppBridgeUnavailable";
import { ImageAssetSidebar } from "./components/ImageAssetSidebar";
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
import { AgentBoardSelectionBar } from "./components/AgentBoardSelectionBar";
import { AgentBoardClaimInstructions } from "./components/AgentBoardClaimInstructions";
import { DesktopButton } from "./components/DesktopButton";
import { ExcalidrawThemeTokenBridge } from "./components/ExcalidrawThemeTokenBridge";
import { GenerateComposerFooterToggle } from "./components/GenerateComposerFooterToggle";
import { CanvasMinimap } from "./components/CanvasMinimap";
import {
  createDesktopProjectRuntime,
  type DesktopProjectRuntime,
} from "./desktopProjectRuntime";
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
import { reconcilePendingGenerationScene } from "./pendingGenerationSceneReconciliation";

import { handleAgentCommandRequest } from "./agent/agentCommandRuntime";
import { collectAgentImageFileIds } from "./agent/agentCommandHandlers";
import { createActiveAgentProjectPathRendererActions } from "./agent/agentCommandRuntimeShared";
import { createAgentCommandRequestSubscriptionRendererActions } from "./agent/agentCommandRequestSubscriptionController";
import { handleAgentDesktopBridgeRequest } from "./agent/agentDesktopBridgeRequest";
import {
  createGenerationErrorStateApplier,
  createGenerationErrorRendererActions,
} from "./generationErrorController";
import { type GenerationErrorDetails } from "./generationErrorViewModel";
import {
  buildImageAssetItems,
  createImageAssetRendererActions,
} from "./imageAssetViewModel";
import {
  createImageAssetThumbnailStore,
  type ImageAssetThumbnailStore,
} from "./imageAssetThumbnailStore";
import { createTimedNoticeRendererActions } from "./noticeTimerController";
import { buildDefaultGenerationRequest } from "./generatePromptRequest";
import { createGenerateDialogReferenceRendererActions } from "./generateDialogReferenceController";
import { createAgentBrowserRuntimePublishRendererActions } from "./agent/agentBrowserRuntimePublishController";
import { createAgentBrowserBridgeStatusRetryLoopRendererActions } from "./agent/agentBrowserBridgeStatusRetryController";
import {
  registerAgentBoardWebMcpTools,
  type ModelContextLike,
} from "./agent/agentBoardWebMcp";
import {
  locateAgentSceneElement,
  selectAgentSceneElements,
} from "./agent/agentSceneNavigation";
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
import {
  getTrackpadZoomSensitivity,
  type TrackpadZoomSpeed,
} from "../shared/canvasInteractionSettings";
import type { GenerationReferencePayload } from "../shared/providerTypes";
import type {
  ProjectRoomParticipant,
  ProjectRoomSceneElement,
} from "../shared/projectRoomProtocol";
import type { StableBoardIntegrationStatus } from "../shared/agentBridgeTypes";
import type { AgentRendererCommandRequest } from "../shared/agentBridgeTypes";

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
  ProjectAssetPayload,
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

const LazyFooterRight = lazy(async () => {
  const { FooterRight } = await import("@excalidraw/excalidraw");
  return { default: FooterRight };
});

const LazyFooterNavigation = lazy(async () => {
  const { default: FooterNavigation } = await import(
    "@excalidraw/excalidraw/components/footer/FooterNavigation"
  );
  return { default: FooterNavigation };
});

type AppSceneSnapshot = {
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
};

type PlacementViewportContext = GeneratedImagePlacementViewport;

const AGENT_BOARD_REOPEN_ERROR_CODES = new Set([
  "AUTH_REQUIRED",
  "TOKEN_EXPIRED",
  "PROJECT_MISMATCH",
  "ROOM_MISMATCH",
  "SESSION_EPOCH_EXPIRED",
  "ROOM_CLOSED",
]);

const shouldReopenAgentBoard = (error: unknown) =>
  Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      typeof error.code === "string" &&
      AGENT_BOARD_REOPEN_ERROR_CODES.has(error.code),
  );

const isTransientAgentBoardConnectionError = (error: unknown) =>
  error instanceof TypeError ||
  (error instanceof Error &&
    /fetch|network|websocket|disconnected/i.test(error.message));

interface AppProps {
  locale?: DesktopLocale;
  localePreference?: DesktopLocalePreference;
  desktopProjectPath?: string;
  onLocalePreferenceChange?: (
    preference: DesktopLocalePreference,
  ) => void | Promise<void>;
  trackpadZoomSpeed?: TrackpadZoomSpeed;
  onTrackpadZoomSpeedChange?: (
    speed: TrackpadZoomSpeed,
  ) => void | Promise<void>;
}

const App = ({
  locale = DESKTOP_LANG_CODE,
  localePreference = "system",
  desktopProjectPath,
  onLocalePreferenceChange = () => undefined,
  trackpadZoomSpeed = "standard",
  onTrackpadZoomSpeedChange = () => undefined,
}: AppProps) => {
  const {
    isAgentBrowserRoute,
    stableBoardId,
    projectSelectionToken,
    invalidAddress,
  } = buildAgentBrowserRouteState({
    pathname: window.location.pathname,
    href: window.location.href,
  });
  const isAgentProjectSelectionRoute =
    isAgentBrowserRoute && Boolean(projectSelectionToken);
  const pendingAgentBoardConnection = stableBoardId
    ? getPendingAgentBoardConnection(stableBoardId)
    : null;
  const isDesktopProjectRenderer = Boolean(desktopProjectPath);
  if (invalidAddress) {
    return (
      <div className="image-board-app">
        <div className="welcome-pane">
          <div
            className="welcome-pane__card welcome-pane__diagnostic"
            role="alert"
            aria-labelledby="agent-board-expired-title"
          >
            <span className="welcome-pane__eyebrow">Agent Board</span>
            <h1 id="agent-board-expired-title">
              {copy.agentBoard.expiredConnectionTitle}
            </h1>
            <p>{copy.agentBoard.expiredConnectionDescription}</p>
          </div>
        </div>
      </div>
    );
  }
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
  const [editorApiReadyVersion, setEditorApiReadyVersion] = useState(0);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const imageAssetDockRef = useRef<HTMLElement | null>(null);
  const inspectorDockRef = useRef<HTMLElement | null>(null);
  const generatePanelRef = useRef<HTMLElement | null>(null);
  const appRootRef = useRef<HTMLDivElement | null>(null);
  const isEditorInitializingRef = useRef(false);
  const initializingRenderNonceRef = useRef<number | null>(null);
  const projectRenderNonceRef = useRef(0);
  const projectOpenSequenceRef = useRef(0);
  const lastReportedDesktopThemeRef = useRef<{
    projectPath: string;
    theme: "light" | "dark";
  } | null>(null);
  const agentRuntimeRefsController = useAgentRuntimeRefsController();
  const latestMenuProjectOpenRequestIdRef = useRef(0);
  const rememberedGenerationModelSelectionRef = useRef(
    readRememberedGenerationModelSelection(),
  );
  const generationModelSelectionLockedRef = useRef(false);
  const currentProjectRef = useRef<DesktopProjectBundle | null>(null);
  const projectRoomClientRef = useRef<ProjectRoomClientController | null>(null);
  const desktopProjectRuntimeRef = useRef<DesktopProjectRuntime | null>(null);
  const projectRoomAssetTransactionDepthRef = useRef(0);
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
  const highResImageLoadTimerRef = useRef<number | null>(null);
  const loadedPreviewImageFileIdsRef = useRef<Set<string>>(new Set());
  const loadingPreviewImageFileIdsRef = useRef<Set<string>>(new Set());
  const loadedOriginalImageFileIdsRef = useRef<Set<string>>(new Set());
  const loadingOriginalImageFileIdsRef = useRef<Set<string>>(new Set());
  const pendingImageFilesToAddRef = useRef<BinaryFileData[]>([]);
  const imageAssetThumbnailStoreRef = useRef<ImageAssetThumbnailStore | null>(
    null,
  );
  if (!imageAssetThumbnailStoreRef.current) {
    imageAssetThumbnailStoreRef.current = createImageAssetThumbnailStore();
  }
  const imageAssetThumbnailStore = imageAssetThumbnailStoreRef.current;
  const loadingImageAssetThumbnailKeysRef = useRef<Set<string>>(new Set());

  const selectionReferenceOriginalSceneActions = useMemo(
    () =>
      createSelectionReferenceOriginalSceneRendererActions({
        getProject: () => currentProjectRef.current,
        readOriginalAssets: (project, fileIds) =>
          readProjectImageAssets(project, fileIds, "original"),
      }),
    [readProjectImageAssets],
  );
  const projectClipboardRendererActions = useMemo(
    () =>
      createProjectClipboardRendererActions({
        getProject: () => currentProjectRef.current,
        writeProjectClipboard: desktopBridge.writeProjectClipboard,
        readProjectAssets: readProjectImageAssets,
        getFallbackCreatedAt: () => Date.now(),
      }),
    [desktopBridge.writeProjectClipboard, readProjectImageAssets],
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
  const { status: agentBridgeStatus } =
    agentBridgeConnectionStateController.state;
  const { setStatus: setAgentBridgeStatus } =
    agentBridgeConnectionStateController.setters;
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
  const [recentProjectsLoadStatus, setRecentProjectsLoadStatus] =
    useState<RecentProjectsLoadStatus>("loading");
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
  const [projectRoomReady, setProjectRoomReady] = useState(false);
  const [agentBoardRefreshRequired, setAgentBoardRefreshRequired] =
    useState(false);
  const [projectRoomParticipants, setProjectRoomParticipants] = useState<
    ProjectRoomParticipant[]
  >([]);
  const projectRoomCollaborators = useMemo(
    () => createProjectRoomCollaborators(projectRoomParticipants),
    [projectRoomParticipants],
  );
  const applyProjectRoomCollaborators = useCallback(
    (api: ExcalidrawImperativeAPI | null) => {
      if (!api) {
        return;
      }
      api.updateScene({
        collaborators: projectRoomCollaborators,
        captureUpdate: CaptureUpdateAction.NEVER,
      });
    },
    [projectRoomCollaborators],
  );
  useEffect(() => {
    applyProjectRoomCollaborators(excalidrawAPIRef.current);
  }, [applyProjectRoomCollaborators]);
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
  const [projectRoomError, setProjectRoomError] = useState<string | null>(null);
  const [agentBoardReconnectGeneration, setAgentBoardReconnectGeneration] =
    useState(0);
  const [stableBoardIntegrationStatus, setStableBoardIntegrationStatus] =
    useState<StableBoardIntegrationStatus | null>(null);
  const stableBoardPageNonceRef = useRef<string | null>(
    stableBoardId ? getOrCreateStableBoardPageNonce(stableBoardId) : null,
  );
  const pendingAgentBoardViewportRestoreRef =
    useRef<AgentBoardViewportState | null>(null);
  const [projectNotice, setProjectNotice] = useState<string | null>(null);
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
  const [generateComposerExpanded, setGenerateComposerExpanded] =
    useState(true);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [appSettingsOpen, setAppSettingsOpen] = useState(false);
  const [appSettingsCategory, setAppSettingsCategory] =
    useState<ApplicationSettingsCategory>("image-generation");
  const [appSettingsDirty, setAppSettingsDirty] = useState(false);
  const [appSettingsDiscardToken, setAppSettingsDiscardToken] = useState(0);
  const appUpdate = useAppUpdate(desktopBridge);
  const [imageAssetSidebarOpen, setImageAssetSidebarOpen] = useState(false);
  const [imageAssetGeneratedOnly, setImageAssetGeneratedOnly] = useState(false);
  const [isEditorInitializing, setIsEditorInitializing] = useState(false);
  const [projectRenderNonce, setProjectRenderNonce] = useState(0);
  const [inspectorDockOpen, setInspectorDockOpen] = useState(false);
  const [isImageCropping, setIsImageCropping] = useState(false);
  const [thumbnailMaintenance, setThumbnailMaintenance] =
    useState<ThumbnailMaintenanceState | null>(null);

  useEffect(() => {
    setIsImageCropping(false);
  }, [currentProject?.projectPath]);

  useEffect(() => {
    if (!appSettingsOpen) {
      appUpdate.resetTransientManualState();
    }
  }, [appSettingsOpen, appUpdate.resetTransientManualState]);

  useEffect(() => {
    const projectPath = currentProject?.projectPath ?? null;
    if (imageAssetThumbnailStore.getSnapshot().projectPath === projectPath) {
      return;
    }
    imageAssetThumbnailStore.reset(projectPath);
    loadingImageAssetThumbnailKeysRef.current.clear();
  }, [currentProject?.projectPath, imageAssetThumbnailStore]);

  const replaceImageAssetThumbnailPayloads = useCallback(
    (projectPath: string, assets: readonly ProjectAssetPayload[]) => {
      imageAssetThumbnailStore.replace(projectPath, assets);
    },
    [imageAssetThumbnailStore],
  );

  const applyImageAssetThumbnailPayloads = useCallback(
    (projectPath: string, assets: readonly ProjectAssetPayload[]) => {
      if (currentProjectRef.current?.projectPath !== projectPath) {
        return;
      }
      imageAssetThumbnailStore.merge(projectPath, assets);
    },
    [imageAssetThumbnailStore],
  );

  const loadVisibleImageAssetThumbnails = useCallback(
    async (fileIds: string[]) => {
      const project = currentProjectRef.current;
      if (!project || fileIds.length === 0) {
        return;
      }
      const projectPath = project.projectPath;
      const cached = imageAssetThumbnailStore.getSnapshot();
      const fileIdsToLoad = [...new Set(fileIds)].filter((fileId) => {
        const loadingKey = `${projectPath}\0${fileId}`;
        return (
          project.imageRecords[fileId] &&
          !(cached.projectPath === projectPath && cached.dataUrls[fileId]) &&
          !loadingImageAssetThumbnailKeysRef.current.has(loadingKey)
        );
      });
      if (fileIdsToLoad.length === 0) {
        return;
      }
      const loadingKeys = fileIdsToLoad.map(
        (fileId) => `${projectPath}\0${fileId}`,
      );
      loadingKeys.forEach((key) =>
        loadingImageAssetThumbnailKeysRef.current.add(key),
      );
      try {
        const assets = await desktopBridge.readProjectAssetPayloads({
          projectPath,
          fileIds: fileIdsToLoad,
          rendition: "thumbnail",
          thumbnailMode: "cache-only",
        });
        applyImageAssetThumbnailPayloads(projectPath, assets);
      } catch (error) {
        console.warn("[image-assets:thumbnail-load-failed]", error);
      } finally {
        loadingKeys.forEach((key) =>
          loadingImageAssetThumbnailKeysRef.current.delete(key),
        );
      }
    },
    [
      applyImageAssetThumbnailPayloads,
      desktopBridge,
      imageAssetThumbnailStore,
    ],
  );

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
  const selectedImageRelationship = useMemo(
    () =>
      buildSelectedImageRelationshipState({
        imageRecords: currentProject?.imageRecords,
        selectedRecord,
      }),
    [currentProject?.imageRecords, selectedRecord],
  );
  const imageAssetItems = useMemo(
    () =>
      buildImageAssetItems({
        imageRecords: currentProject?.imageRecords,
        sceneImageFileIds,
        generatedOnly: imageAssetGeneratedOnly,
      }),
    [
      currentProject?.imageRecords,
      imageAssetGeneratedOnly,
      sceneImageFileIds,
    ],
  );
  const renderCanvasMinimap = useCallback(
    (
      api: ExcalidrawImperativeAPI | null,
      navigation: FooterNavigationControls,
    ) => (
      <CanvasMinimap
        api={api}
        onOpenChange={navigation.setZoomControlsExpanded}
        preferenceKey={`corestudio:minimap:${
          isAgentBrowserRoute ? "agent-board" : "desktop"
        }`}
        canvasContainerRef={canvasContainerRef}
        leftOcclusionRef={imageAssetDockRef}
        rightOcclusionRef={inspectorDockRef}
        avoidElementRef={generatePanelRef}
      />
    ),
    [isAgentBrowserRoute],
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
        publishRuntimeState: (state) =>
          projectRoomClientRef.current?.updateParticipantSelection(state) ??
          Promise.resolve(),
      }),
    [agentRuntimeRefsController.actions, isAgentBrowserRoute],
  );

  useEffect(() => {
    if (!isAgentBrowserRoute || !stableBoardId) {
      return;
    }

    const modelContext = (
      document as Document & { modelContext?: ModelContextLike }
    ).modelContext;
    return registerAgentBoardWebMcpTools({
      modelContext,
      runtime: {
        getState: () => ({
          isAgentBoardRoute: isAgentBrowserRoute,
          stableBoardId,
          integrationStatus: stableBoardIntegrationStatus,
          projectRoomReady,
          refreshRequired: agentBoardRefreshRequired,
          project: currentProjectRef.current,
          scene: latestSceneRef.current,
          editorReady: Boolean(excalidrawAPIRef.current),
        }),
        locateElement: (input) => {
          const api = excalidrawAPIRef.current;
          const activeProject = currentProjectRef.current;
          if (!api || !activeProject) {
            throw new Error("Agent Board 当前未就绪。");
          }
          const result = locateAgentSceneElement({
            api,
            imageRecords: activeProject.imageRecords,
            ...input,
          });
          latestSceneRef.current = {
            elements: api.getSceneElementsIncludingDeleted(),
            appState: api.getAppState(),
            files: api.getFiles(),
          };
          agentBrowserRuntimePublishRendererActions.schedule(
            latestSceneRef.current,
          );
          return result;
        },
        selectElements: (input) => {
          const api = excalidrawAPIRef.current;
          if (!api || !currentProjectRef.current) {
            throw new Error("Agent Board 当前未就绪。");
          }
          const result = selectAgentSceneElements({ api, ...input });
          latestSceneRef.current = {
            elements: api.getSceneElementsIncludingDeleted(),
            appState: api.getAppState(),
            files: api.getFiles(),
          };
          agentBrowserRuntimePublishRendererActions.schedule(
            latestSceneRef.current,
          );
          return result;
        },
      },
    });
  }, [
    agentBoardRefreshRequired,
    agentBrowserRuntimePublishRendererActions,
    Boolean(currentProject),
    editorApiReadyVersion,
    isAgentBrowserRoute,
    isEditorInitializing,
    projectRoomReady,
    stableBoardId,
    stableBoardIntegrationStatus,
  ]);

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
    createProjectThumbnailAssetRefreshRendererActions<DesktopProjectBundle>({
      getLoadedPreviewFileIds: () => loadedPreviewImageFileIdsRef.current,
      getLoadedOriginalFileIds: () => loadedOriginalImageFileIdsRef.current,
      readThumbnailAssets: ({ project, fileIds }) =>
        desktopBridge.readProjectAssetPayloads({
          projectPath: project.projectPath,
          fileIds,
          rendition: "thumbnail",
          thumbnailMode: "cache-only",
        }),
      applyThumbnailAssetsToScene: (project, assets) => {
        applyImageAssetThumbnailPayloads(project.projectPath, assets);
        return projectAssetSceneApplyRendererAction(project, assets);
      },
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
      applyThumbnailAssetsToScene: (project, assets) => {
        applyImageAssetThumbnailPayloads(project.projectPath, assets);
        return projectAssetSceneApplyRendererAction(project, assets);
      },
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
    recordViewportChange: (scrollX, scrollY, zoom) => {
      if (stableBoardId && !isEditorInitializingRef.current) {
        writeAgentBoardViewportState(
          stableBoardId,
          {
            scrollX,
            scrollY,
            zoom,
          },
          {
            pageNonce: stableBoardPageNonceRef.current,
          },
        );
      }
    },
    setLatestScene: (scene) => {
      latestSceneRef.current = scene;
    },
    scheduleVisibleImageRenditionLoad:
      visibleImageRenditionLoadRendererActions.schedule,
    scheduleAgentBrowserRuntimeStatePublish:
      agentBrowserRuntimePublishRendererActions.schedule,
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
    setRecentProjectsLoadStatus,
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
      resetAutoOpenProjectPath: () => undefined,
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

  const imageAssetRendererActions = createImageAssetRendererActions({
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

  const agentBrowserBridgeStatusRetryLoopRendererActions =
    createAgentBrowserBridgeStatusRetryLoopRendererActions({
      refreshConnection: ({ canApply }) =>
        agentBridgeStatusRendererActions.refreshBrowserConnection({
          refreshDesktopStartupState: isAgentProjectSelectionRoute
            ? desktopStartupRendererActions.refreshAgentBrowser
            : desktopStartupRendererActions.loadAll,
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
      getIsProjectRoomRoute: () =>
        isAgentBrowserRoute && !isAgentProjectSelectionRoute,
      loadDesktopStartupState: isAgentProjectSelectionRoute
        ? () => {
            void desktopStartupRendererActions.refreshAgentBrowser();
          }
        : desktopStartupRendererActions.loadAll,
      startAgentBrowserBridgeStatusRetryLoop:
        agentBrowserBridgeStatusRetryLoopRendererActions.start,
    });

  const appUnmountCleanupRendererActions =
    createAppUnmountCleanupRendererActions({
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

  const waitForCurrentProjectSubmission = async () => {
    await projectRoomClientRef.current?.waitForSubmission();
  };

  const currentProjectBundleOpenRendererActions =
    createCurrentProjectBundleOpenRendererActions({
      beginProjectOpen: currentProjectOpenSequenceRendererActions.begin,
      isCurrentProjectOpen: currentProjectOpenSequenceRendererActions.isCurrent,
      flushProjectRoom: waitForCurrentProjectSubmission,
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
      applyInitialImageAssetThumbnails: replaceImageAssetThumbnailPayloads,
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
  const openProjectBundle = async (
    bundle: DesktopProjectBundle | null,
    sequence?: number,
  ) => currentProjectBundleOpenRendererActions.open(bundle, sequence);

  const projectViewClearRendererActions = createProjectViewClearRendererActions(
    {
      beginProjectOpen: currentProjectOpenSequenceRendererActions.begin,
      editorApiRef: excalidrawAPIRef,
      latestSceneRef,
      setSceneImageFileIds,
      updateCurrentProject,
      setInitialData,
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
        setEditorApiReadyVersion((current) => current + 1);
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
      getPreviousBatchBounds: () => lastBatchBoundsRef.current,
      setPreviousBatchBounds: (bounds) => {
        lastBatchBoundsRef.current = bounds;
      },
      setActiveProject: updateCurrentProject,
      flushProjectRoom: waitForCurrentProjectSubmission,
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

  const beginProjectImageWritebackForRoom = async (
    input: Parameters<
      typeof projectImageAssetPersistenceRendererActions.beginProjectImageWriteback
    >[0],
  ) => {
    projectRoomAssetTransactionDepthRef.current += 1;
    const writeback = await projectImageAssetPersistenceRendererActions
      .beginProjectImageWriteback(input)
      .catch((error) => {
        projectRoomAssetTransactionDepthRef.current = Math.max(
          0,
          projectRoomAssetTransactionDepthRef.current - 1,
        );
        throw error;
      });
    let finished = false;
    const finish = () => {
      if (finished) {
        return;
      }
      finished = true;
      projectRoomAssetTransactionDepthRef.current = Math.max(
        0,
        projectRoomAssetTransactionDepthRef.current - 1,
      );
    };
    return {
      ...writeback,
      async commit() {
        try {
          await writeback.commit();
        } finally {
          finish();
        }
      },
      async rollback() {
        try {
          return await writeback.rollback();
        } finally {
          finish();
        }
      },
    };
  };

  const builtinGenerationJobCompletionRendererActions =
    createBuiltinGenerationJobCompletionRendererActions<
      readonly ExcalidrawElement[],
      AppState,
      BinaryFiles
    >({
      getActiveProject: () => currentProjectRef.current,
      beginProjectImageWriteback: beginProjectImageWritebackForRoom,
      isSlotActive: (slot) => {
        const elements =
          excalidrawAPIRef.current?.getSceneElementsIncludingDeleted();
        if (!elements) {
          return false;
        }
        const liveElementIds = new Set(
          elements
            .filter((element) => !element.isDeleted)
            .map((element) => element.id),
        );
        return (
          liveElementIds.has(slot.frameId) && liveElementIds.has(slot.labelId)
        );
      },
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
      setScene: (scene) => {
        latestSceneRef.current = scene;
      },
      updateSceneImageFileIds: sceneImageFileIdsRendererActions.update,
      scheduleVisibleImageRenditionLoad:
        visibleImageRenditionLoadRendererActions.schedule,
      flushProjectRoom: (options) => flushProjectRoom(options),
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
      setLatestScene: (scene) => {
        latestSceneRef.current = scene;
      },
      updateSceneImageFileIds: sceneImageFileIdsRendererActions.update,
      scheduleVisibleImageRenditionLoad:
        visibleImageRenditionLoadRendererActions.schedule,
      scheduleAgentBrowserRuntimeStatePublish:
        agentBrowserRuntimePublishRendererActions.schedule,
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
    });

  const ensureProjectRoomAssetsForElements = async (
    elements: readonly ProjectRoomSceneElement[],
    files: Record<string, unknown>,
  ) => {
    const project = currentProjectRef.current;
    if (!project) {
      return;
    }
    return projectImageAssetPersistenceRendererActions.persistUnknownCanvasImages(
      project,
      elements as ExcalidrawElement[],
      files as BinaryFiles,
    );
  };

  const projectRoomAssetRefreshRendererActions =
    createProjectRoomAssetRefreshRendererActions({
      getProject: () => currentProjectRef.current,
      getLatestScene: () => latestSceneRef.current,
      updateProject: updateCurrentProject,
      hydrateImageRecords: async (project, fileIds) => {
        const currentFiles =
          excalidrawAPIRef.current?.getFiles() ??
          latestSceneRef.current?.files ??
          {};
        const missingFileIds = fileIds.filter(
          (fileId) => !currentFiles[fileId],
        );
        if (missingFileIds.length === 0) {
          return fileIds;
        }

        const assets = await readProjectImageAssets(
          project,
          missingFileIds,
          "preview",
        );
        const applied = projectAssetSceneApplyRendererAction(project, assets);
        if (!applied) {
          return fileIds.filter((fileId) => !missingFileIds.includes(fileId));
        }

        const hydratedFileIds = assets.map((asset) => asset.fileId);
        loadedPreviewImageFileIdsRef.current = new Set([
          ...loadedPreviewImageFileIdsRef.current,
          ...hydratedFileIds,
        ]);
        return [
          ...fileIds.filter((fileId) => !missingFileIds.includes(fileId)),
          ...hydratedFileIds,
        ];
      },
      scheduleVisibleImageRenditionLoad:
        visibleImageRenditionLoadRendererActions.schedule,
    });

  useEffect(() => {
    const projectPath = desktopProjectPath ?? currentProject?.projectPath;
    if (
      isAgentBrowserRoute ||
      !projectPath ||
      currentProject?.projectPath !== projectPath
    ) {
      return;
    }

    const sessionId = crypto.randomUUID();
    const runtime = createDesktopProjectRuntime({
      projectPath,
      sessionId,
      transport: createDesktopProjectRoomTransport({
        bridge: desktopBridge,
        sessionId,
      }),
      ensureAssetsForElements: (elements, files) => {
        const project = currentProjectRef.current;
        if (!project || project.projectPath !== projectPath) {
          return Promise.resolve();
        }
        return projectImageAssetPersistenceRendererActions.persistUnknownCanvasImages(
          project,
          elements as ExcalidrawElement[],
          files as BinaryFiles,
        );
      },
      onParticipants: (participants) => {
        setProjectRoomParticipants(participants);
        runtime.getApi()?.updateScene({
          collaborators: createProjectRoomCollaborators(participants),
          captureUpdate: CaptureUpdateAction.NEVER,
        });
      },
      onImageRecords: (imageRecords) => {
        const project = currentProjectRef.current;
        if (!project || project.projectPath !== projectPath) {
          return;
        }
        projectRoomAssetRefreshRendererActions.applyImageRecords(imageRecords);
      },
      onScene: (scene) => {
        latestSceneRef.current = scene;
        projectRoomAssetRefreshRendererActions.applyAuthoritativeScene(scene);
      },
      onReadyChange: setProjectRoomReady,
      onError: (error) => {
        setProjectRoomError(error ? formatProjectSaveError(error) : null);
      },
      onRoomClosed: () => {
        setProjectRoomReady(false);
      },
    });

    desktopProjectRuntimeRef.current = runtime;
    projectRoomClientRef.current = runtime.getController();
    runtime.attachApi(excalidrawAPIRef.current);
    void runtime.start().catch(() => undefined);

    return () => {
      if (desktopProjectRuntimeRef.current === runtime) {
        desktopProjectRuntimeRef.current = null;
      }
      if (projectRoomClientRef.current === runtime.getController()) {
        projectRoomClientRef.current = null;
      }
      void runtime.stop();
    };
  }, [
    currentProject?.projectPath,
    desktopBridge,
    desktopProjectPath,
    isAgentBrowserRoute,
  ]);

  useEffect(() => {
    if (!isAgentBrowserRoute) {
      return;
    }
    const bridgeBaseUrl = window.location.origin;
    if (projectSelectionToken && !stableBoardId) {
      setProjectRoomReady(false);
      setProjectRoomError(null);
      setAgentBoardRefreshRequired(false);
      return;
    }
    if (!stableBoardId) {
      setProjectRoomError("Agent Board 缺少有效的房间连接凭证。");
      setAgentBoardRefreshRequired(false);
      return;
    }

    let disposed = false;
    let reconnectTimer: number | null = null;
    let hasJoinedStableRoom = false;
    const scheduleStableReconnect = (delayMs: number) => {
      if (reconnectTimer !== null) {
        return;
      }
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        if (!disposed) {
          setAgentBoardReconnectGeneration((current) => current + 1);
        }
      }, delayMs);
    };
    const reportConnectionError = (error: unknown) => {
      if (disposed) {
        return;
      }
      setProjectRoomReady(false);
      if (hasJoinedStableRoom) {
        setProjectRoomError(null);
        setAgentBoardRefreshRequired(true);
        return;
      }

      if (shouldReopenAgentBoard(error)) {
        setProjectRoomError(null);
        scheduleStableReconnect(0);
      } else if (isTransientAgentBoardConnectionError(error)) {
        setProjectRoomError(
          "正在等待 CoreStudio 恢复连接，画布地址无需重新获取。",
        );
        scheduleStableReconnect(1_000);
      } else {
        setProjectRoomError(formatProjectSaveError(error));
      }
    };
    let controller: ProjectRoomClientController | null = null;
    setProjectRoomReady(false);
    setAgentBoardRefreshRequired(false);
    const pageNonce = stableBoardId ? stableBoardPageNonceRef.current : null;
    if (stableBoardId && pageNonce) {
      document.documentElement.dataset.corestudioStableBoardId = stableBoardId;
      document.documentElement.dataset.corestudioPageNonce = pageNonce;
    }
    const waitForActorClaim = () =>
      new Promise<void>((resolve) => window.setTimeout(resolve, 1_000));
    const connect = async () => {
      let launchTicket: string | null = null;
      if (pageNonce) {
        const integrationStatus = await inspectStableAgentBoardIntegration({
          bridge: bridgeBaseUrl,
          stableBoardId,
          pageNonce,
        });
        if (disposed) {
          return;
        }
        setStableBoardIntegrationStatus(integrationStatus);
        if (integrationStatus.state !== "ready") {
          return;
        }
        while (!disposed && !launchTicket) {
          try {
            const exchangedSession = await exchangeStableAgentBoardSession({
              bridge: bridgeBaseUrl,
              stableBoardId,
              pageNonce,
            });
            launchTicket = exchangedSession.launchTicket;
            setStableBoardIntegrationStatus((current) =>
              current
                ? {
                    ...current,
                    actorClaimed: true,
                  }
                : current,
            );
            setStableBoardActorResumeToken(
              stableBoardId,
              exchangedSession.actorResumeToken,
            );
          } catch (error) {
            if (
              error &&
              typeof error === "object" &&
              "code" in error &&
              error.code === "ACTOR_CLAIM_REQUIRED"
            ) {
              await waitForActorClaim();
              continue;
            }
            throw error;
          }
        }
      }
      if (disposed || !launchTicket) {
        return;
      }
      const transport = createProjectRoomWebSocketTransport({
        bridgeBaseUrl,
        launchTicket,
        resumeToken: null,
        onTerminalError: reportConnectionError,
        replaceResumeToken: (nextResumeToken) => {
          setAgentBrowserRoomResumeToken(nextResumeToken);
        },
      });
      controller = createProjectRoomClientController({
        projectPath: "",
        sessionId: crypto.randomUUID(),
        transport,
        applyParticipants: setProjectRoomParticipants,
        applyImageRecords:
          projectRoomAssetRefreshRendererActions.applyImageRecords,
        ensureAssetsForElements: ensureProjectRoomAssetsForElements,
        onSyncStateChange: (state, error) => {
          if (error) {
            setProjectRoomError(formatProjectSaveError(error));
          } else if (state === "saved") {
            setProjectRoomError(null);
          }
        },
        onRoomClosed: (event) => {
          setProjectRoomReady(false);
          if (stableBoardId && event.reason === "app-closed") {
            setProjectRoomError(null);
            setAgentBoardRefreshRequired(true);
          } else if (stableBoardId) {
            setAgentBoardRefreshRequired(false);
            setProjectRoomError(
              "CoreStudio 已关闭这个项目，协作连接已断开。重新打开项目后可继续使用同一画布地址。",
            );
          }
        },
        applyAuthoritativeScene: ({ elements, sharedSceneConfig, origin }) => {
          const api = excalidrawAPIRef.current;
          if (!api) {
            return;
          }
          const appState = api.getAppState();
          const reconciledElements = reconcileProjectRoomScene({
            localElements: api.getSceneElementsIncludingDeleted(),
            remoteElements: elements as ExcalidrawElement[],
            appState,
            snapshot: origin === "snapshot",
          });
          api.updateScene({
            elements: reconciledElements,
            appState: mergeAgentBoardAuthoritativeAppState(
              appState,
              sharedSceneConfig,
            ),
            captureUpdate: CaptureUpdateAction.NEVER,
          });
          const latestScene = {
            elements: api.getSceneElementsIncludingDeleted(),
            appState: api.getAppState(),
            files: api.getFiles(),
          };
          latestSceneRef.current = latestScene;
          projectRoomAssetRefreshRendererActions.applyAuthoritativeScene(
            latestScene,
          );
          return reconciledElements as readonly ProjectRoomSceneElement[];
        },
      });
      projectRoomClientRef.current = controller;
      const joined = await controller.start();
      if (!joined.bootstrap) {
        throw new Error("Agent Board 房间缺少项目初始化数据。");
      }
      const savedViewport = readAgentBoardViewportState(stableBoardId, {
        pageNonce: stableBoardPageNonceRef.current,
      });
      pendingAgentBoardViewportRestoreRef.current = savedViewport;
      const sceneJson = JSON.stringify({
        type: "excalidraw",
        version: 2,
        source: "local",
        elements: joined.snapshot.scene.elements,
        appState: mergeAgentBoardInitialAppState(
          joined.snapshot.scene.sharedSceneConfig,
          savedViewport,
        ),
        files: {},
      });
      await currentProjectBundleOpenRendererActions.applyExternalSnapshot({
        ...joined.bootstrap,
        sceneJson,
      });
      if (!disposed) {
        hasJoinedStableRoom = true;
        setProjectRoomReady(true);
        setProjectRoomError(null);
        setAgentBoardRefreshRequired(false);
      }
    };
    void connect().catch((error) => {
      if (!disposed) {
        console.error("[project-room:agent-board-join-failed]", error);
        reportConnectionError(error);
      }
    });

    return () => {
      disposed = true;
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
      setAgentBrowserRoomResumeToken(null);
      delete document.documentElement.dataset.corestudioStableBoardId;
      delete document.documentElement.dataset.corestudioPageNonce;
      setProjectRoomParticipants([]);
      if (projectRoomClientRef.current === controller) {
        projectRoomClientRef.current = null;
      }
      void controller?.stop();
    };
  }, [
    agentBoardReconnectGeneration,
    isAgentBrowserRoute,
    projectSelectionToken,
    stableBoardId,
  ]);

  const reportDesktopProjectTheme = (appState: Pick<AppState, "theme">) => {
    if (!isDesktopProjectRenderer || !currentProject) {
      return;
    }
    const theme = appState.theme === "dark" ? "dark" : "light";
    const lastReportedTheme = lastReportedDesktopThemeRef.current;
    if (
      lastReportedTheme?.projectPath === currentProject.projectPath &&
      lastReportedTheme.theme === theme
    ) {
      return;
    }
    lastReportedDesktopThemeRef.current = {
      projectPath: currentProject.projectPath,
      theme,
    };
    desktopBridge.notifyProjectThemeChanged?.({
      projectPath: currentProject.projectPath,
      theme,
    });
  };

  const handleCanvasSceneChange = (
    elements: readonly ExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles,
  ) => {
    setIsImageCropping(Boolean(appState.croppingElementId));
    reportDesktopProjectTheme(appState);
    if (
      currentProjectRef.current &&
      projectRoomAssetTransactionDepthRef.current === 0 &&
      !isEditorInitializingRef.current
    ) {
      const reconciliation = reconcilePendingGenerationScene({
        generationJobs: pendingGenerationJobsRef.current,
        generationTasks: generationTaskByElementIdRef.current,
        elements,
      });
      pendingGenerationJobsRef.current = reconciliation.pendingJobs;
      generationTaskByElementIdRef.current = reconciliation.generationTasks;
      setPendingGenerationCount(reconciliation.pendingCount);
      reconciliation.cancelledJobIds.forEach((jobId) => {
        void desktopBridge.cancelGenerateImages?.(jobId).catch((error) => {
          console.error("取消已删除占位对应的生成任务失败", error);
        });
      });
    }
    const result = canvasSceneChangeRendererActions.changeScene(
      elements,
      appState,
      files,
    );
    if (
      projectRoomReady &&
      projectRoomAssetTransactionDepthRef.current === 0 &&
      !isEditorInitializingRef.current
    ) {
      const sharedSceneConfig = isAgentBrowserRoute
        ? undefined
        : extractSharedSceneConfig(appState);
      const submission =
        !isAgentBrowserRoute && desktopProjectRuntimeRef.current
          ? desktopProjectRuntimeRef.current.handleLocalSceneChange(
              elements,
              files,
              sharedSceneConfig ?? {},
            )
          : projectRoomClientRef.current?.handleLocalSceneChange(
              elements,
              files,
              sharedSceneConfig,
            );
      void submission?.catch((error) => {
        setProjectRoomError(formatProjectSaveError(error));
      });
    }
    return result;
  };

  const finishImageCropping = () => {
    const api = excalidrawAPIRef.current;
    if (!api?.getAppState().croppingElementId) {
      return;
    }
    api.updateScene({
      appState: {
        croppingElementId: null,
        isCropping: false,
      },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
  };

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

  const flushProjectRoom = async (
    options: {
      strict?: boolean;
    } = {},
  ) => {
    if (projectRoomAssetTransactionDepthRef.current > 0 && !options.strict) {
      return undefined;
    }
    const controller = projectRoomClientRef.current;
    const api = excalidrawAPIRef.current;
    if (!controller || !api) {
      return undefined;
    }
    const elements = api.getSceneElementsIncludingDeleted();
    const appState = api.getAppState();
    const sharedSceneConfig = isAgentBrowserRoute
      ? undefined
      : extractSharedSceneConfig(appState);
    await controller.handleLocalSceneChange(
      elements,
      api.getFiles(),
      sharedSceneConfig,
    );
    return controller.waitForPersistence();
  };

  const projectRoomFlushLifecycleActions =
    createProjectRoomFlushLifecycleActions({
      addEventListener: (eventName, listener) =>
        window.addEventListener(eventName, listener),
      removeEventListener: (eventName, listener) =>
        window.removeEventListener(eventName, listener),
      subscribeFlushRequest: bridge?.onFlushProjectRoomRequest,
      flushBeforeUnload: async () => {
        await flushProjectRoom();
      },
      flushRequest: async () => {
        await flushProjectRoom({ strict: true });
      },
    });

  useProjectRoomFlushWiring({
    bridge,
    actions: projectRoomFlushLifecycleActions,
  });

  const currentProjectEntryRendererActions =
    createCurrentProjectEntryRendererActions({
      getBridge: () => desktopBridge,
      getCurrentProject: () => currentProjectRef.current,
      beginProjectOpen: currentProjectOpenSequenceRendererActions.begin,
      openProjectBundle,
      isCurrentProjectOpen: currentProjectOpenSequenceRendererActions.isCurrent,
      flushProjectRoom: (options) => flushProjectRoom(options),
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

  useEffect(() => {
    if (
      !desktopProjectPath ||
      currentProjectRef.current?.projectPath === desktopProjectPath
    ) {
      return;
    }
    void currentProjectEntryRendererActions.openRecentProject(
      desktopProjectPath,
    );
  }, [desktopProjectPath]);

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
      openGenerateDialog: () => {
        setGenerateComposerExpanded(true);
        return generateDialogReferenceRendererActions.open();
      },
      focusProviderSettings: () => {
        setAppSettingsCategory("image-generation");
        setAppSettingsOpen(true);
      },
      openAppSettings: () => setAppSettingsOpen(true),
      setAgentBridgeEnabled: agentBridgeStatusRendererActions.setEnabled,
      revealProject: currentProjectEntryRendererActions.revealProject,
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
        beginProjectImageWritebackForRoom({
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
      flushProjectRoom,
      handleDesktopBridgeRequest: (input) =>
        handleAgentDesktopBridgeRequest(input),
      handleCommandRequest: async (
        request: AgentRendererCommandRequest,
        deps,
      ) => handleAgentCommandRequest(request, deps),
    });

  useEffect(
    () => agentCommandRequestSubscriptionRendererActions.start(),
    [
      bridge,
      desktopBridge,
      flushProjectRoom,
      generatedImageSceneInsertRendererActions.insertAssets,
      readProjectImageAssets,
    ],
  );
  useDesktopMenuEvents(desktopMenuEventRendererActions.handle);

  const globalDialogs = (
    <AppGlobalDialogs
      appSettings={{
        open: appSettingsOpen,
        activeCategory: appSettingsCategory,
        dirty: appSettingsDirty,
        updateAvailable: Boolean(appUpdate.availability?.hasUnreviewedUpdate),
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
            trackpadZoomSpeed={trackpadZoomSpeed}
            onTrackpadZoomSpeedChange={(speed) => {
              void onTrackpadZoomSpeedChange(speed);
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
            onRefreshCatalog={async () => {
              if (!desktopBridge.refreshModelCatalog) {
                throw new Error(
                  copy.applicationSettings.imageGenerationPage.catalogUpdateUnsupported,
                );
              }
              const configuration = await desktopBridge.refreshModelCatalog();
              if (configuration.modelCatalog?.catalog) {
                applyRemoteModelCatalog(configuration.modelCatalog.catalog);
              }
              setProviderConfiguration(configuration);
            }}
            onOpenExternal={(url) => {
              void desktopBridge.openExternal?.(url);
            }}
            onDirtyChange={setAppSettingsDirty}
            onComposerVisibilityChange={async (visible) => {
              if (!desktopBridge.setGenerateComposerVisible) {
                throw new Error(
                  copy.applicationSettings.imageGenerationPage.composerVisibilitySaveFailed,
                );
              }
              const configuration =
                await desktopBridge.setGenerateComposerVisible(visible);
              setProviderConfiguration(configuration);
              if (visible) {
                setGenerateComposerExpanded(true);
              }
            }}
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
            inspectAgentIntegration={(host) => {
              if (!desktopBridge.inspectAgentIntegration) {
                return Promise.reject(
                  new Error("当前版本暂不支持检测 Agent 集成。"),
                );
              }
              return desktopBridge.inspectAgentIntegration(host);
            }}
            installAgentIntegration={(host) => {
              if (!desktopBridge.installAgentIntegration) {
                return Promise.reject(
                  new Error("当前版本暂不支持安装 Agent 集成。"),
                );
              }
              return desktopBridge.installAgentIntegration(host);
            }}
            removeAgentIntegration={(host) => {
              if (!desktopBridge.removeAgentIntegration) {
                return Promise.reject(
                  new Error("当前版本暂不支持移除 Agent 集成。"),
                );
              }
              return desktopBridge.removeAgentIntegration(host);
            }}
            copyText={clipboardTextRendererActions.copy}
            loadAgentIntegrationSettings={() => {
              if (!desktopBridge.getAgentIntegrationSettings) {
                return Promise.reject(
                  new Error("当前版本暂不支持读取 Agent 权限。"),
                );
              }
              return desktopBridge.getAgentIntegrationSettings();
            }}
            setCodexImageGenerationEnabled={(enabled) => {
              if (!desktopBridge.setCodexImageGenerationEnabled) {
                return Promise.reject(
                  new Error("当前版本暂不支持保存 Agent 权限。"),
                );
              }
              return desktopBridge.setCodexImageGenerationEnabled(enabled);
            }}
            setAgentImageGenerationEnabled={(host, enabled) => {
              if (!desktopBridge.setAgentImageGenerationEnabled) {
                return Promise.reject(
                  new Error("当前版本暂不支持保存 Agent 权限。"),
                );
              }
              return desktopBridge.setAgentImageGenerationEnabled(
                host,
                enabled,
              );
            }}
            loadAgentBridgeStatus={() => {
              if (!desktopBridge.getAgentBridgeStatus) {
                return Promise.reject(
                  new Error("当前版本暂不支持读取 Agent Bridge 状态。"),
                );
              }
              return desktopBridge.getAgentBridgeStatus();
            }}
            providerConfigured={Boolean(
              providerConfiguration &&
                providerConfiguration.defaultProvider &&
                providerConfiguration.providers[
                  providerConfiguration.defaultProvider
                ]?.isConfigured &&
                providerConfiguration.providers[
                  providerConfiguration.defaultProvider
                ]?.defaultModel,
            )}
            onOpenImageIntegrations={() =>
              setAppSettingsCategory("image-generation")
            }
          />
        ),
        aboutContent: (
          <AboutSettingsSection
            appInfo={appInfo}
            repositoryUrl={CORESTUDIO_REPOSITORY_URL}
            dependencies={CORESTUDIO_OPEN_SOURCE_DEPENDENCIES}
            updateAvailability={appUpdate.availability}
            manualUpdateState={appUpdate.manualState}
            onCheckForUpdates={() => {
              void appUpdate.checkManually();
            }}
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
      onOpenDetails={() => setProjectHealthReportOpen(true)}
    />
  );

  if (
    isAgentBrowserRoute &&
    stableBoardId &&
    stableBoardIntegrationStatus &&
    stableBoardIntegrationStatus.state !== "ready"
  ) {
    const integrationRepairRequired =
      stableBoardIntegrationStatus.state === "repair-required";
    return (
      <div className="image-board-app">
        <div className="welcome-pane">
          <div
            className="welcome-pane__card welcome-pane__diagnostic"
            role="alert"
            aria-labelledby="agent-board-integration-title"
          >
            <span className="welcome-pane__eyebrow">Agent Board</span>
            <div className="welcome-pane__diagnostic-copy">
              <h1 id="agent-board-integration-title">
                {integrationRepairRequired
                  ? "请在 CoreStudio 中更新集成"
                  : "暂时无法打开这个项目"}
              </h1>
              <section className="welcome-pane__diagnostic-section">
                <h2>当前状态</h2>
                {stableBoardIntegrationStatus.issues.map((issue) => (
                  <p key={issue.code}>{issue.message}</p>
                ))}
              </section>
              {integrationRepairRequired ? (
                <section className="welcome-pane__diagnostic-section welcome-pane__diagnostic-next-step">
                  <h2>你需要做什么</h2>
                  <p>
                    回到 CoreStudio，打开“应用设置”中的“Codex
                    集成”，完成更新后再返回这个页面。
                  </p>
                </section>
              ) : null}
              {projectRoomError ? (
                <p className="welcome-pane__error">{projectRoomError}</p>
              ) : null}
            </div>
            {integrationRepairRequired ? (
              <div className="welcome-pane__diagnostic-actions">
                <DesktopButton
                  variant="primary"
                  onClick={() => window.location.reload()}
                >
                  我已更新，重新检查
                </DesktopButton>
                <p className="welcome-pane__diagnostic-hint">
                  更新完成后无需重新复制画布地址。
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (
    isAgentBrowserRoute &&
    !isAgentProjectSelectionRoute &&
    !projectError &&
    !projectRoomError &&
    (!currentProject || !initialData)
  ) {
    const pageNonce = stableBoardPageNonceRef.current;
    if (
      stableBoardId &&
      pageNonce &&
      stableBoardIntegrationStatus?.state === "ready" &&
      !stableBoardIntegrationStatus.actorClaimed
    ) {
      return (
        <div className="image-board-app">
          <div className="welcome-pane">
            <AgentBoardClaimInstructions
              stableBoardId={stableBoardId}
              pageNonce={pageNonce}
              projectName={
                stableBoardIntegrationStatus.projectName ??
                pendingAgentBoardConnection?.projectName
              }
              onReturnToProjectSelection={
                pendingAgentBoardConnection
                  ? () =>
                      returnToAgentBoardProjectSelection(
                        pendingAgentBoardConnection,
                      )
                  : undefined
              }
            />
          </div>
        </div>
      );
    }
    return (
      <div className="image-board-app">
        <div className="welcome-pane">
          <div
            className="welcome-pane__card welcome-pane__diagnostic"
            role="status"
            aria-label="正在连接当前项目…"
          >
            <span className="welcome-pane__eyebrow">Agent Board</span>
            <h1>正在连接当前项目…</h1>
            <p>正在恢复权威画布和项目图片。</p>
          </div>
        </div>
      </div>
    );
  }

  if (
    isDesktopProjectRenderer &&
    (!currentProject || !initialData) &&
    !projectError &&
    !projectRoomError
  ) {
    return (
      <div className="image-board-app image-board-app--project-open">
        <EditorLoadingOverlay />
      </div>
    );
  }

  if (!currentProject || !initialData) {
    return (
      <AppProjectEntryScreen
        startupError={startupError}
        projectError={projectError ?? projectRoomError}
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
        onCreateProject={currentProjectEntryRendererActions.createProject}
        onOpenProject={currentProjectEntryRendererActions.openProject}
        onReloadRecentProjects={
          desktopStartupRendererActions.loadRecentProjects
        }
        onOpenProviderSettings={() => {
          setAppSettingsCategory("image-generation");
          setAppSettingsOpen(true);
        }}
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

  const projectRenderKey = `${currentProject.projectPath}:${projectRenderNonce}`;
  const appClassName = [
    "image-board-app",
    "image-board-app--project-open",
    isAgentBrowserRoute ? "image-board-app--agent-board" : "",
    imageAssetSidebarOpen ? "image-board-app--left-dock-open" : "",
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

  const copyCurrentBoardReference = async (
    format: "address" | "instruction",
  ) => {
    const boardUrl = await desktopBridge.getStableAgentBoardUrl?.(
      currentProject.projectPath,
    );
    if (!boardUrl) {
      projectNoticeRendererActions.show(copy.menu.boardAddressUnavailable);
      return;
    }
    const clipboardText =
      format === "instruction"
        ? buildAgentBoardLinkInstruction({
            boardUrl,
            instruction: copy.menu.boardLinkInstruction,
          })
        : boardUrl;
    await clipboardTextRendererActions.copy(clipboardText);
    projectNoticeRendererActions.show(
      format === "instruction"
        ? copy.menu.boardLinkInstructionCopied
        : copy.menu.boardAddressCopied,
    );
  };

  return (
    <div ref={appRootRef} className={appClassName}>
      <AppErrorBanners
        startupError={startupError}
        projectError={projectError ?? projectRoomError}
      />
      {globalDialogs}
      <ProjectRenderBoundary
        projectKey={projectRenderKey}
        onError={projectRenderBoundaryRendererActions.reportRenderError}
        onReset={projectRenderBoundaryRendererActions.resetProjectView}
      >
        <div className="image-board-shell">
          <div ref={canvasContainerRef} className={canvasClassName}>
            {isEditorInitializing || !projectRoomReady ? (
              <EditorLoadingOverlay
                mode={
                  isAgentBrowserRoute && agentBoardRefreshRequired
                    ? "refresh-required"
                    : "loading"
                }
                onReload={
                  isAgentBrowserRoute && agentBoardRefreshRequired
                    ? () => window.location.reload()
                    : undefined
                }
              />
            ) : null}
            {renderProjectStatusToast()}
            <Suspense fallback={null}>
              <LazyExcalidraw
                langCode={locale}
                wheelZoomSensitivity={getTrackpadZoomSensitivity(
                  trackpadZoomSpeed,
                )}
                initialData={initialData}
                onInitialize={(api) => {
                  const runtime = desktopProjectRuntimeRef.current;
                  if (!isAgentBrowserRoute && api && runtime) {
                    runtime.attachApi(api);
                    projectRoomClientRef.current = runtime.getController();
                    void runtime.start().catch(() => undefined);
                  }
                  applyProjectRoomCollaborators(api ?? null);
                  if (api && stableBoardId) {
                    const savedViewport =
                      pendingAgentBoardViewportRestoreRef.current;
                    if (savedViewport) {
                      api.updateScene({
                        appState: savedViewport,
                        captureUpdate: CaptureUpdateAction.NEVER,
                      });
                    }
                    pendingAgentBoardViewportRestoreRef.current = null;
                  }
                  currentProjectEditorReadyRendererActions.ready(
                    api ?? null,
                    projectRenderNonce,
                  );
                  if (api) {
                    reportDesktopProjectTheme(api.getAppState());
                  }
                }}
                onExcalidrawAPI={(api) => {
                  if (projectRenderNonce !== projectRenderNonceRef.current) {
                    return;
                  }
                  excalidrawAPIRef.current = api;
                  if (!isAgentBrowserRoute) {
                    const runtime = desktopProjectRuntimeRef.current;
                    runtime?.attachApi(api);
                    if (runtime) {
                      projectRoomClientRef.current = runtime.getController();
                    }
                  }
                  queuedExcalidrawBinaryFilesRendererActions.flush();
                  visibleImageRenditionLoadRendererActions.schedule(
                    latestSceneRef.current,
                  );
                }}
                onPointerUpdate={({ pointer }) => {
                  lastCanvasPointerRef.current = {
                    x: pointer.x,
                    y: pointer.y,
                  };
                }}
                onScrollChange={viewportChangeRendererActions.changeViewport}
                onCopy={projectClipboardRendererActions.copyElements}
                onCopyAsPng={
                  projectClipboardRendererActions.preparePngExportFiles
                }
                onPaste={projectImageImportRendererActions.pasteClipboardImage}
                onChange={handleCanvasSceneChange}
                UIOptions={{
                  defaultSidebar: false,
                  canvasActions: {
                    clearCanvas: false,
                    loadScene: false,
                    saveToActiveFile: false,
                    export: false,
                    saveAsImage: false,
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
                    rootRef={inspectorDockRef}
                    open={inspectorDockOpen}
                    onOpenChange={setInspectorDockOpen}
                    selectedShapeActions={fullSelectedShapeActions}
                    shouldRenderSelectedShapeActions={
                      shouldRenderSelectedShapeActions
                    }
                    isImageCropping={isImageCropping}
                    onFinishImageCropping={finishImageCropping}
                    record={selectedRecord}
                    ancestorRecords={selectedImageRelationship.ancestorRecords}
                    descendantRecords={
                      selectedImageRelationship.descendantRecords
                    }
                    task={selectedTask}
                    onCopyPrompt={() => {
                      void imageAssetRendererActions.copyPrompt();
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
                  canvasUtilityActionsVisible={!isAgentBrowserRoute}
                  onCopyBoardAddress={() => {
                    void copyCurrentBoardReference("address").catch((error) => {
                      projectNoticeRendererActions.show(
                        formatProjectSaveError(error),
                      );
                    });
                  }}
                  onCopyBoardLinkInstruction={() => {
                    void copyCurrentBoardReference("instruction").catch(
                      (error) => {
                        projectNoticeRendererActions.show(
                          formatProjectSaveError(error),
                        );
                      },
                    );
                  }}
                  onOpenAboutSettings={() => {
                    setAppSettingsCategory("about");
                    setAppSettingsOpen(true);
                  }}
                  updateAvailable={Boolean(
                    appUpdate.availability?.hasUnreviewedUpdate,
                  )}
                  onSwitchProject={() => {
                    if (isAgentBrowserRoute) {
                      void desktopBridge
                        .switchAgentBoardProject?.()
                        .catch((error) => {
                          setProjectError(formatProjectSaveError(error));
                        });
                      return;
                    }
                    void desktopBridge
                      .activateProjectView?.(null)
                      .catch((error) => {
                        setProjectError(formatProjectSaveError(error));
                      });
                  }}
                />
                <LazyFooterNavigation collapseZoomControls>
                  {renderCanvasMinimap}
                </LazyFooterNavigation>
                {!isAgentBrowserRoute &&
                providerConfiguration !== null &&
                providerConfiguration.composerVisible !== false ? (
                  <LazyFooterRight>
                    <GenerateComposerFooterToggle
                      expanded={generateComposerExpanded}
                      loading={pendingGenerationCount > 0}
                      onToggle={() => {
                        setGenerateComposerExpanded((expanded) => !expanded);
                      }}
                    />
                  </LazyFooterRight>
                ) : null}
                <ExcalidrawThemeTokenBridge targetRef={appRootRef} />
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
            <ImageAssetSidebar
              rootRef={imageAssetDockRef}
              open={imageAssetSidebarOpen}
              onOpenChange={setImageAssetSidebarOpen}
              records={imageAssetItems}
              generatedOnly={imageAssetGeneratedOnly}
              onGeneratedOnlyChange={setImageAssetGeneratedOnly}
              selectedFileId={selectedRecord?.fileId}
              onVisibleFileIdsChange={loadVisibleImageAssetThumbnails}
              thumbnailProjectPath={currentProject.projectPath}
              thumbnailStore={imageAssetThumbnailStore}
              onSelectRecord={(fileId) => {
                void imageRecordLocatorRendererActions.locateImageRecord(
                  fileId,
                );
              }}
            />
          </div>
        </div>
      </ProjectRenderBoundary>

      {!isAgentBrowserRoute &&
      providerConfiguration !== null &&
      providerConfiguration.composerVisible !== false ? (
        <GenerateImageDialog
          onPanelElementChange={(element) => {
            generatePanelRef.current = element;
          }}
          open={true}
          expanded={generateComposerExpanded}
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
