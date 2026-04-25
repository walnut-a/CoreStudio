import {
  Component,
  type ErrorInfo,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  CaptureUpdateAction,
  Excalidraw,
} from "@excalidraw/excalidraw";
import {
  DEFAULT_SIDEBAR,
  LIBRARY_SIDEBAR_TAB,
} from "@excalidraw/common";
import {
  getCommonBounds,
  newElementWith,
  newFrameElement,
  newImageElement,
  newTextElement,
} from "@excalidraw/element";
import type {
  ExcalidrawElement,
  FileId,
} from "@excalidraw/element/types";

import {
  getAspectRatioOptions,
  getClosestAspectRatioOption,
  getDefaultModel,
  getProviderDefinition,
  isAutoAspectRatioRequest,
  normalizeGenerationRequest,
} from "../shared/providerCatalog";
import type {
  DesktopProjectBundle,
  PersistedImageAssetInput,
  ProjectAssetPayload,
  PublicProviderSettings,
  RecentProjectEntry,
} from "../shared/desktopBridgeTypes";
import type { ImageRecord } from "../shared/projectTypes";
import type {
  AppState,
  BinaryFileData,
  BinaryFiles,
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
  SidebarTabName,
} from "@excalidraw/excalidraw/types";
import type { ClipboardData } from "@excalidraw/excalidraw/clipboard";
import type { GenerationRequest } from "../shared/providerTypes";

import { maybeGetDesktopBridge } from "./desktopBridge";
import { syncSelectionReferenceIntoRequest } from "./generationRequestState";
import {
  normalizeGeneratedImageDimensions,
  placeGeneratedImages,
  measureBatchBounds,
} from "./project/imagePlacement";
import {
  deserializeSceneFromProject,
  serializeSceneForProject,
} from "./project/sceneSerialization";
import {
  readRememberedGenerationModelSelection,
  rememberGenerationModelSelection,
  resolvePreferredGenerationModelSelection,
  type GenerationModelSelection,
} from "./generationModelSelection";
import { copyPlainTextToClipboard } from "./clipboardText";
import { loadProviderSettingsWithRetry } from "./providerSettingsLoader";
import { appendElementsWithSyncedIndices } from "./sceneOrder";
import {
  getImageAncestors,
  getImageDescendants,
} from "./imageRelationships";
import {
  buildSelectedGenerationTask,
  buildSelectedImageRecord,
} from "./selectionState";
import {
  buildSelectionReference,
  buildSelectionReferenceSummary,
  getSelectionReferenceSignature,
  getSelectedReferenceElements,
} from "./selectionReference";
import { useDesktopMenuEvents } from "./useDesktopMenuEvents";
import { GenerateImageDialog } from "./components/GenerateImageDialog";
import {
  IMAGE_INFO_SIDEBAR_TAB,
  ImageSidebar,
} from "./components/ImageSidebar";
import type { GenerationTaskRecord } from "./components/ImageInspector";
import { DesktopButton } from "./components/DesktopButton";
import { TopBar } from "./components/TopBar";
import { WelcomePane } from "./components/WelcomePane";
import { copy, DESKTOP_LANG_CODE } from "./copy";

import "./App.css";

const createGenerationRequestFromSelection = (
  selection: GenerationModelSelection,
  providerSettings: PublicProviderSettings | null,
): GenerationRequest =>
  normalizeGenerationRequest(
    {
      provider: selection.provider,
      model: selection.model,
      prompt: "",
      negativePrompt: "",
      aspectRatio: null,
      width: 1024,
      height: 1024,
      seed: null,
      imageCount: 1,
      reference: null,
    },
    {
      customModels:
        providerSettings?.[selection.provider]?.customModels ?? [],
    },
  );

const defaultGenerationRequest = (
  providerSettings: PublicProviderSettings | null,
  rememberedSelection: GenerationModelSelection | null,
): GenerationRequest =>
  createGenerationRequestFromSelection(
    resolvePreferredGenerationModelSelection({
      providerSettings,
      rememberedSelection,
    }),
    providerSettings,
  );

const extractBase64 = (dataURL: string) => {
  const [, payload = ""] = dataURL.split(",", 2);
  return payload;
};

const hasClipboardFiles = (files: BinaryFiles | undefined) =>
  Boolean(files && Object.keys(files).length > 0);

const isEmptyClipboardData = (data: ClipboardData) =>
  !data.elements?.length &&
  !hasClipboardFiles(data.files) &&
  !data.mixedContent?.length &&
  !data.errorMessage &&
  !(data.text ?? "").trim();

const collectImageFileIds = (elements: readonly ExcalidrawElement[]) => {
  return elements.reduce((fileIds, element) => {
    if (
      !element.isDeleted &&
      element.type === "image" &&
      element.fileId
    ) {
      fileIds.push(element.fileId);
    }
    return fileIds;
  }, [] as string[]);
};

const toBinaryFiles = (assets: ProjectAssetPayload[], imageRecords: DesktopProjectBundle["imageRecords"]): BinaryFiles =>
  assets.reduce((files, asset) => {
    const fileId = asset.fileId as FileId;
    files[fileId] = {
      id: fileId,
      mimeType: asset.mimeType as BinaryFileData["mimeType"],
      dataURL: `data:${asset.mimeType};base64,${asset.dataBase64}` as BinaryFileData["dataURL"],
      created: Date.parse(imageRecords[asset.fileId]?.createdAt || asset.createdAt) || Date.now(),
    };
    return files;
  }, {} as BinaryFiles);

const REMOTE_METHOD_PREFIX = /^Error invoking remote method '[^']+':\s*/;
const PENDING_PLACEHOLDER_STROKE = "#6d5efc";
const PENDING_PLACEHOLDER_FILL = "#f4f2ff";
const PENDING_PLACEHOLDER_ERROR_STROKE = "#d14343";
const PENDING_PLACEHOLDER_ERROR_FILL = "#fff1f2";
const PENDING_PLACEHOLDER_LABEL = "生成中";

interface PendingGenerationSlot {
  frameId: string;
  labelId: string;
  fitReturnedImageSize: boolean;
}

interface PendingGenerationJob {
  jobId: string;
  projectPath: string;
  slots: PendingGenerationSlot[];
}

interface GenerationErrorDetails {
  provider: GenerationRequest["provider"];
  model: string;
  occurredAt: string;
  normalizedMessage: string;
  rawMessage: string;
  stack: string | null;
  requestPayload: string | null;
}

interface AutosaveSnapshot {
  project: DesktopProjectBundle;
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
}

interface ProjectRenderBoundaryProps {
  projectKey: string;
  children: ReactNode;
  onError: (error: Error, componentStack: string | null) => void;
  onReset: () => void;
}

interface ProjectRenderBoundaryState {
  error: Error | null;
}

class ProjectRenderBoundary extends Component<
  ProjectRenderBoundaryProps,
  ProjectRenderBoundaryState
> {
  state: ProjectRenderBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): ProjectRenderBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError(error, info.componentStack || null);
  }

  componentDidUpdate(prevProps: ProjectRenderBoundaryProps) {
    if (
      prevProps.projectKey !== this.props.projectKey &&
      this.state.error
    ) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="image-board-runtime-error" role="alert">
          <div className="image-board-runtime-error__card">
            <h2>项目界面加载失败</h2>
            <p>{this.state.error.message || "发生了未知错误。"}</p>
            <DesktopButton type="button" onClick={this.props.onReset}>
              返回项目列表
            </DesktopButton>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const REQUEST_PAYLOAD_MARKER = "请求载荷：";

const splitRequestPayload = (message: string) => {
  const markerIndex = message.indexOf(REQUEST_PAYLOAD_MARKER);
  if (markerIndex === -1) {
    return {
      message: message.trim(),
      requestPayload: null,
    };
  }

  return {
    message: message.slice(0, markerIndex).trim(),
    requestPayload: message
      .slice(markerIndex + REQUEST_PAYLOAD_MARKER.length)
      .trim(),
  };
};

const getElementsSceneBounds = (
  elements: readonly ExcalidrawElement[],
) => {
  if (!elements.length) {
    return null;
  }

  const [left, top, right, bottom] = getCommonBounds(elements);
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
};

const stringifyUnknownError = (error: unknown) => {
  if (error === null || error === undefined) {
    return "";
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
};

const extractDesktopErrorInfo = (error: unknown) => {
  const rawMessage =
    error instanceof Error
      ? error.message || error.toString()
      : error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message || stringifyUnknownError(error))
      : stringifyUnknownError(error);

  const stack =
    error instanceof Error
      ? error.stack || null
      : error && typeof error === "object" && "stack" in error
      ? String((error as { stack?: unknown }).stack || "") || null
      : null;

  return {
    rawMessage,
    message: rawMessage
      .replace(REMOTE_METHOD_PREFIX, "")
      .replace(/^Error:\s*/, ""),
    stack,
  };
};

const normalizeDesktopErrorMessage = (
  provider: GenerationRequest["provider"],
  error: unknown,
) => {
  const { message } = extractDesktopErrorInfo(error);
  const { message: sanitizedMessage } = splitRequestPayload(message);

  if (
    /API_KEY_INVALID|API key not valid/i.test(sanitizedMessage) &&
    /generativelanguage\.googleapis\.com|googleapis\.com/i.test(sanitizedMessage)
  ) {
    return "Gemini API Key 无效，请在 Google AI Studio 重新生成并保存。";
  }

  if (/ZenMux API Key/i.test(sanitizedMessage)) {
    return sanitizedMessage;
  }

  if (/gemini API key is not configured/i.test(sanitizedMessage)) {
    return "Gemini API Key 还没配置，请在底部设置里的“连接与自定义模型”保存。";
  }

  if (
    provider === "zenmux" &&
    /reject_no_credit|Credit required|positive balance is required|\"code\":\"402\"/i.test(
      sanitizedMessage,
    )
  ) {
    return "ZenMux 余额不足，这个模型需要账户里有正余额。";
  }

  if (
    provider === "zenmux" &&
    /invalid api key|unauthorized|401|forbidden|403|UNAUTHENTICATED/i.test(
      sanitizedMessage,
    )
  ) {
    return "ZenMux API Key 无效，请检查 ZenMux 后台里的 API Key 和账户状态。";
  }

  if (/zenmux API key is not configured/i.test(sanitizedMessage)) {
    return "ZenMux API Key 还没配置，请在底部设置里的“连接与自定义模型”保存。";
  }

  if (/fal\.ai request failed: 401/i.test(sanitizedMessage)) {
    return "fal API Key 无效，请检查后重新保存。";
  }

  return sanitizedMessage;
};

const buildGenerationErrorDetails = (
  request: GenerationRequest,
  error: unknown,
  normalizedMessage: string,
): GenerationErrorDetails => {
  const { rawMessage, stack } = extractDesktopErrorInfo(error);
  const { message: sanitizedRawMessage, requestPayload } =
    splitRequestPayload(rawMessage);

  return {
    provider: request.provider,
    model: request.model,
    occurredAt: new Date().toISOString(),
    normalizedMessage,
    rawMessage: sanitizedRawMessage || normalizedMessage,
    stack,
    requestPayload,
  };
};

const formatGenerationErrorDebugText = (details: GenerationErrorDetails) => {
  return [
    `${copy.debugError.provider}：${getProviderDefinition(details.provider).label}`,
    `${copy.debugError.model}：${details.model}`,
    `${copy.debugError.occurredAt}：${new Date(details.occurredAt).toLocaleString("zh-CN")}`,
    "",
    `${copy.debugError.message}：`,
    details.normalizedMessage,
    "",
    `${copy.debugError.raw}：`,
    details.rawMessage,
    ...(details.requestPayload
      ? ["", `${copy.debugError.payload}：`, details.requestPayload]
      : []),
    ...(details.stack
      ? ["", `${copy.debugError.stack}：`, details.stack]
      : []),
  ].join("\n");
};

const App = () => {
  const bridge = maybeGetDesktopBridge();
  const desktopBridge = bridge!;
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const pendingAutosaveRef = useRef<AutosaveSnapshot | null>(null);
  const autosaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const isEditorInitializingRef = useRef(false);
  const initializingRenderNonceRef = useRef<number | null>(null);
  const projectRenderNonceRef = useRef(0);
  const projectOpenSequenceRef = useRef(0);
  const latestMenuProjectOpenRequestIdRef = useRef(0);
  const rememberedGenerationModelSelectionRef = useRef(
    readRememberedGenerationModelSelection(),
  );
  const generationModelSelectionLockedRef = useRef(
    Boolean(rememberedGenerationModelSelectionRef.current),
  );
  const currentProjectRef = useRef<DesktopProjectBundle | null>(null);
  const latestSceneRef = useRef<{
    elements: readonly ExcalidrawElement[];
    appState: AppState;
    files: BinaryFiles;
  } | null>(null);
  const lastCanvasPointerRef = useRef<{ x: number; y: number } | null>(null);
  const lastBatchBoundsRef = useRef<ReturnType<typeof measureBatchBounds>>(null);
  const pendingGenerationJobsRef = useRef<Map<string, PendingGenerationJob>>(
    new Map(),
  );
  const removedSelectionReferenceSignatureRef = useRef<string | null>(null);
  const generationTaskByElementIdRef = useRef<Map<string, GenerationTaskRecord>>(
    new Map(),
  );

  const [currentProject, setCurrentProject] = useState<DesktopProjectBundle | null>(null);
  const [initialData, setInitialData] = useState<ExcalidrawInitialDataState | null>(null);
  const [providerSettings, setProviderSettings] = useState<PublicProviderSettings | null>(null);
  const [recentProjects, setRecentProjects] = useState<RecentProjectEntry[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<ImageRecord | null>(null);
  const [selectedTask, setSelectedTask] = useState<GenerationTaskRecord | null>(null);
  const [generateRequest, setGenerateRequest] = useState(() =>
    defaultGenerationRequest(
      null,
      rememberedGenerationModelSelectionRef.current,
    ),
  );
  const [loadingProject, setLoadingProject] = useState(false);
  const [savingProviders, setSavingProviders] = useState(false);
  const [pendingGenerationCount, setPendingGenerationCount] = useState(0);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationErrorDetails, setGenerationErrorDetails] =
    useState<GenerationErrorDetails | null>(null);
  const [generationErrorDetailsOpen, setGenerationErrorDetailsOpen] = useState(false);
  const [generationErrorCopied, setGenerationErrorCopied] = useState(false);
  const [generateFocusToken, setGenerateFocusToken] = useState(0);
  const [providerSettingsFocusToken, setProviderSettingsFocusToken] = useState(0);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [isEditorInitializing, setIsEditorInitializing] = useState(false);
  const [projectRenderNonce, setProjectRenderNonce] = useState(0);
  const [defaultSidebarTab, setDefaultSidebarTab] = useState<SidebarTabName>(
    IMAGE_INFO_SIDEBAR_TAB,
  );
  const parentRecord =
    selectedRecord?.parentFileId && currentProject
      ? currentProject.imageRecords[selectedRecord.parentFileId] || null
      : null;
  const ancestorRecords =
    selectedRecord && currentProject
      ? getImageAncestors(currentProject.imageRecords, selectedRecord)
      : [];
  const descendantRecords =
    selectedRecord && currentProject
      ? getImageDescendants(currentProject.imageRecords, selectedRecord)
      : [];

  const updateCurrentProject = (project: DesktopProjectBundle | null) => {
    currentProjectRef.current = project;
    setCurrentProject(project);
  };

  const updateEditorInitializing = (
    initializing: boolean,
    renderNonce?: number,
  ) => {
    if (
      !initializing &&
      renderNonce !== undefined &&
      initializingRenderNonceRef.current !== renderNonce
    ) {
      return false;
    }

    isEditorInitializingRef.current = initializing;
    initializingRenderNonceRef.current = initializing
      ? renderNonce ?? initializingRenderNonceRef.current
      : null;
    setIsEditorInitializing(initializing);
    return true;
  };

  const hideEditorLoading = (renderNonce: number) => {
    if (initializingRenderNonceRef.current !== renderNonce) {
      return;
    }
    setIsEditorInitializing(false);
  };

  const beginProjectOpen = () => {
    projectOpenSequenceRef.current += 1;
    return projectOpenSequenceRef.current;
  };

  const isCurrentProjectOpen = (sequence: number) =>
    projectOpenSequenceRef.current === sequence;

  const getGenerationAnchorBounds = (request: GenerationRequest) => {
    if (!request.reference?.enabled) {
      return null;
    }

    return getElementsSceneBounds(
      getSelectedReferenceElements(latestSceneRef.current),
    );
  };

  const loadProviderState = async () => {
    if (!bridge) {
      return;
    }

    try {
      const nextProviderSettings = await loadProviderSettingsWithRetry(bridge);
      setProviderSettings(nextProviderSettings);
      if (!generationModelSelectionLockedRef.current) {
        const selection = resolvePreferredGenerationModelSelection({
          providerSettings: nextProviderSettings,
          rememberedSelection: null,
        });
        setGenerateRequest((current) =>
          normalizeGenerationRequest(
            {
              ...current,
              provider: selection.provider,
              model: selection.model,
            },
            {
              customModels:
                nextProviderSettings[selection.provider]?.customModels ?? [],
            },
          ),
        );
      }
      setStartupError(null);
    } catch (error: any) {
      setStartupError(error?.message || copy.startup.providerLoadFailed);
    }
  };

  const loadRecentProjectsState = async () => {
    if (!bridge) {
      return;
    }

    try {
      setRecentProjects((await bridge.loadRecentProjects?.()) ?? []);
    } catch {
      setRecentProjects([]);
    }
  };

  const clearGenerationErrorState = () => {
    setGenerationError(null);
    setGenerationErrorDetails(null);
    setGenerationErrorDetailsOpen(false);
    setGenerationErrorCopied(false);
  };

  const showGenerationError = (
    request: GenerationRequest,
    error: unknown,
    fallbackMessage = copy.startup.generateFailed,
  ) => {
    const normalizedMessage =
      normalizeDesktopErrorMessage(request.provider, error) || fallbackMessage;
    setGenerationError(normalizedMessage);
    const details = buildGenerationErrorDetails(request, error, normalizedMessage);
    setGenerationErrorDetails(details);
    setGenerationErrorDetailsOpen(false);
    setGenerationErrorCopied(false);
    return details;
  };

  const getErrorText = (error: unknown, fallbackMessage: string) =>
    error instanceof Error ? error.message : String(error || fallbackMessage);

  const reportAutosaveError = (error: unknown) => {
    console.error("[project:autosave-failed]", error);
    setProjectError(getErrorText(error, copy.startup.saveProjectFailed));
  };

  const copyTextToClipboardWithFallback = async (text: string) => {
    const copied = await copyPlainTextToClipboard(text);
    if (!copied) {
      setProjectError(copy.clipboard.writeFailed);
    }
    return copied;
  };

  useEffect(() => {
    bridge?.notifyRendererReady?.();
    void loadProviderState();
    void loadRecentProjectsState();
  }, [bridge]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      void flushPendingAutosave();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      void flushPendingAutosave();
    };
  }, []);

  useEffect(() => {
    if (!bridge?.onFlushAutosaveRequest) {
      return;
    }

    return bridge.onFlushAutosaveRequest(() =>
      flushPendingAutosave({ strict: true }),
    );
  }, [bridge]);

  useEffect(() => {
    if (!isEditorInitializing) {
      return;
    }

    const renderNonce = projectRenderNonce;
    const fallbackTimer = window.setTimeout(() => {
      if (
        renderNonce === projectRenderNonceRef.current &&
        excalidrawAPIRef.current
      ) {
        hideEditorLoading(renderNonce);
      }
    }, 3000);

    return () => {
      window.clearTimeout(fallbackTimer);
    };
  }, [isEditorInitializing, projectRenderNonce]);

  const openProjectBundle = async (
    bundle: DesktopProjectBundle | null,
    sequence = beginProjectOpen(),
  ) => {
    if (!bundle) {
      if (isCurrentProjectOpen(sequence)) {
        setLoadingProject(false);
      }
      return;
    }

    setLoadingProject(true);
    setProjectError(null);
    try {
      try {
        await flushPendingAutosave({ strict: true });
      } catch (error) {
        if (isCurrentProjectOpen(sequence)) {
          setProjectError(
            `${copy.startup.saveBeforeOpenFailed} ${getErrorText(
              error,
              copy.startup.saveProjectFailed,
            )}`,
          );
        }
        return;
      }

      if (!isCurrentProjectOpen(sequence)) {
        return;
      }

      const restored = await deserializeSceneFromProject(bundle.sceneJson);
      const fileIds = collectImageFileIds(restored.elements || []);
      const assets = await desktopBridge.readProjectAssetPayloads({
        projectPath: bundle.projectPath,
        fileIds,
      });
      if (!isCurrentProjectOpen(sequence)) {
        return;
      }

      const files = toBinaryFiles(assets, bundle.imageRecords);
      const nextInitialData: ExcalidrawInitialDataState = {
        elements: restored.elements,
        appState: restored.appState,
        files,
      };
      const nextRenderNonce = projectRenderNonceRef.current + 1;
      projectRenderNonceRef.current = nextRenderNonce;
      excalidrawAPIRef.current = null;
      updateEditorInitializing(true, nextRenderNonce);
      updateCurrentProject(bundle);
      setInitialData(nextInitialData);
      setProjectRenderNonce(nextRenderNonce);
      latestSceneRef.current = {
        elements: restored.elements || [],
        appState: restored.appState as AppState,
        files,
      };
      lastCanvasPointerRef.current = null;
      setSelectedRecord(null);
      setSelectedTask(null);
      lastBatchBoundsRef.current = null;
      pendingGenerationJobsRef.current.clear();
      generationTaskByElementIdRef.current.clear();
      setPendingGenerationCount(0);
      await loadRecentProjectsState();
    } catch (error: any) {
      if (isCurrentProjectOpen(sequence)) {
        setProjectError(getErrorText(error, copy.startup.openProjectFailed));
        updateEditorInitializing(false);
      }
    } finally {
      if (isCurrentProjectOpen(sequence)) {
        setLoadingProject(false);
      }
    }
  };

  const handleCreateProject = async () => {
    const sequence = beginProjectOpen();
    try {
      await openProjectBundle(await desktopBridge.createProject(), sequence);
    } catch (error) {
      if (isCurrentProjectOpen(sequence)) {
        setProjectError(getErrorText(error, copy.startup.createProjectFailed));
        setLoadingProject(false);
        updateEditorInitializing(false);
      }
    }
  };

  const handleOpenProject = async () => {
    const sequence = beginProjectOpen();
    try {
      await openProjectBundle(await desktopBridge.openProject(), sequence);
    } catch (error) {
      if (isCurrentProjectOpen(sequence)) {
        setProjectError(getErrorText(error, copy.startup.openProjectFailed));
        setLoadingProject(false);
        updateEditorInitializing(false);
      }
    }
  };

  const handleOpenRecentProject = async (projectPath: string) => {
    const sequence = beginProjectOpen();
    try {
      await openProjectBundle(
        await desktopBridge.openRecentProject?.(projectPath),
        sequence,
      );
    } catch (error) {
      if (isCurrentProjectOpen(sequence)) {
        setProjectError(getErrorText(error, copy.startup.openProjectFailed));
        setLoadingProject(false);
        updateEditorInitializing(false);
        await loadRecentProjectsState();
      }
    }
  };

  const handleProjectRenderError = (
    error: Error,
    componentStack: string | null,
  ) => {
    console.error("[project-render-error]", {
      message: error.message,
      stack: error.stack || null,
      componentStack,
      projectPath: currentProjectRef.current?.projectPath || null,
    });
    updateEditorInitializing(false);
  };

  const handleResetProjectView = () => {
    updateCurrentProject(null);
    setInitialData(null);
    updateEditorInitializing(false);
  };

  const handleRevealProject = async () => {
    if (!currentProjectRef.current) {
      return;
    }
    try {
      await desktopBridge.revealProjectInFinder(
        currentProjectRef.current.projectPath,
      );
    } catch (error) {
      setProjectError(getErrorText(error, copy.startup.revealProjectFailed));
    }
  };

  const insertAssetsIntoScene = async (
    assets: PersistedImageAssetInput[],
    nextImageRecords: DesktopProjectBundle["imageRecords"],
    options: {
      anchorPoint?: { x: number; y: number } | null;
    } = {},
  ) => {
    const api = excalidrawAPIRef.current;
    const project = currentProjectRef.current;
    if (!api || !project) {
      return;
    }

    const appState = api.getAppState();
    const viewportCenter = {
      x: appState.width / 2 - appState.scrollX,
      y: appState.height / 2 - appState.scrollY,
    };
    const anchorPoint = options.anchorPoint ?? null;
    const placements = placeGeneratedImages({
      images: assets.map((asset) => ({
        width: asset.width,
        height: asset.height,
      })),
      anchorPoint,
      viewportCenter,
      viewportSize: {
        width: appState.width,
        height: appState.height,
      },
      zoomValue: appState.zoom.value,
      previousBatchBounds: anchorPoint ? null : lastBatchBoundsRef.current,
    });

    const filesToAdd: BinaryFileData[] = assets.map((asset) => ({
      id: asset.fileId as FileId,
      mimeType: asset.mimeType as BinaryFileData["mimeType"],
      dataURL: `data:${asset.mimeType};base64,${asset.dataBase64}` as BinaryFileData["dataURL"],
      created: Date.parse(asset.createdAt) || Date.now(),
    }));
    api.addFiles(filesToAdd);

    const newElements = assets.map((asset, index) =>
      newImageElement({
        type: "image",
        fileId: asset.fileId as FileId,
        status: "saved",
        scale: [1, 1],
        x: placements[index].x,
        y: placements[index].y,
        width: placements[index].width,
        height: placements[index].height,
      }),
    );

    const selectedElementIds = Object.fromEntries(
      newElements.map((element) => [element.id, true as const]),
    ) as AppState["selectedElementIds"];

    api.updateScene({
      elements: appendElementsWithSyncedIndices(
        api.getSceneElementsIncludingDeleted(),
        newElements,
      ),
      appState: {
        selectedElementIds,
      },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });

    lastBatchBoundsRef.current = measureBatchBounds(placements);
    updateCurrentProject({
      ...project,
      imageRecords: nextImageRecords,
    });
  };

  const insertGenerationPlaceholders = (
    request: GenerationRequest,
    startedAt: string,
  ) => {
    const api = excalidrawAPIRef.current;
    const project = currentProjectRef.current;
    if (!api || !project) {
      return null;
    }

    const appState = api.getAppState();
    const viewportCenter = {
      x: appState.width / 2 - appState.scrollX,
      y: appState.height / 2 - appState.scrollY,
    };
    const anchorBounds = getGenerationAnchorBounds(request);
    const placements = placeGeneratedImages({
      images: Array.from({ length: request.imageCount }, () => ({
        width: request.width,
        height: request.height,
      })),
      anchorBounds,
      anchorPoint: anchorBounds ? null : lastCanvasPointerRef.current,
      viewportCenter,
      viewportSize: {
        width: appState.width,
        height: appState.height,
      },
      zoomValue: appState.zoom.value,
      previousBatchBounds:
        anchorBounds || lastCanvasPointerRef.current
          ? null
          : lastBatchBoundsRef.current,
    });

    const slots: PendingGenerationSlot[] = [];
    const placeholderElements = placements.flatMap((placement, index) => {
      const slotGroupId = crypto.randomUUID();
      const frame = newFrameElement({
        x: placement.x,
        y: placement.y,
        width: placement.width,
        height: placement.height,
        groupIds: [slotGroupId],
        backgroundColor: PENDING_PLACEHOLDER_FILL,
        strokeColor: PENDING_PLACEHOLDER_STROKE,
        strokeStyle: "dashed",
        strokeWidth: 2,
        roughness: 0,
        opacity: 80,
      });
      const label = newTextElement({
        x: placement.x + placement.width / 2,
        y: placement.y + placement.height / 2,
        text:
          request.imageCount > 1
            ? `${PENDING_PLACEHOLDER_LABEL}\n${index + 1}/${request.imageCount}`
            : PENDING_PLACEHOLDER_LABEL,
        groupIds: [slotGroupId],
        frameId: frame.id,
        fontSize: 24,
        textAlign: "center",
        verticalAlign: "middle",
        autoResize: true,
        strokeColor: PENDING_PLACEHOLDER_STROKE,
        backgroundColor: "transparent",
        roughness: 0,
      });

      slots.push({
        frameId: frame.id,
        labelId: label.id,
        fitReturnedImageSize: isAutoAspectRatioRequest(request),
      });

      return [frame, label];
    });

    for (const slot of slots) {
      const task: GenerationTaskRecord = {
        status: "pending",
        provider: request.provider,
        model: request.model,
        prompt: request.prompt,
        negativePrompt: request.negativePrompt,
        aspectRatio: request.aspectRatio,
        seed: request.seed,
        width: request.width,
        height: request.height,
        startedAt,
      };
      generationTaskByElementIdRef.current.set(slot.frameId, task);
      generationTaskByElementIdRef.current.set(slot.labelId, task);
    }

    api.updateScene({
      elements: appendElementsWithSyncedIndices(
        api.getSceneElementsIncludingDeleted(),
        placeholderElements,
      ),
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });

    lastBatchBoundsRef.current = measureBatchBounds(placements);

    return {
      jobId: crypto.randomUUID(),
      projectPath: project.projectPath,
      slots,
    } satisfies PendingGenerationJob;
  };

  const markPendingGenerationFailed = (
    job: PendingGenerationJob,
    errorDetails?: Pick<
      GenerationErrorDetails,
      "normalizedMessage" | "rawMessage" | "stack"
    >,
  ) => {
    const api = excalidrawAPIRef.current;
    const project = currentProjectRef.current;
    if (!api || project?.projectPath !== job.projectPath) {
      return;
    }

    const firstSlot = job.slots[0];
    for (const slot of job.slots) {
      const existingTask =
        generationTaskByElementIdRef.current.get(slot.frameId) ||
        generationTaskByElementIdRef.current.get(slot.labelId);

      if (!existingTask) {
        continue;
      }

      const nextTask: GenerationTaskRecord = {
        ...existingTask,
        status: "error",
        errorMessage:
          errorDetails?.normalizedMessage || copy.startup.generateFailed,
        rawError:
          errorDetails?.rawMessage ||
          errorDetails?.normalizedMessage ||
          copy.startup.generateFailed,
        stack: errorDetails?.stack || null,
      };
      generationTaskByElementIdRef.current.set(slot.frameId, nextTask);
      generationTaskByElementIdRef.current.set(slot.labelId, nextTask);
    }

    const slotFrameIds = new Set(job.slots.map((slot) => slot.frameId));
    const slotLabelIds = new Set(job.slots.map((slot) => slot.labelId));
    const currentElements = api.getSceneElementsIncludingDeleted();

    api.updateScene({
      elements: currentElements.map((element) => {
        if (slotFrameIds.has(element.id)) {
          return newElementWith(element, {
            strokeColor: PENDING_PLACEHOLDER_ERROR_STROKE,
            backgroundColor: PENDING_PLACEHOLDER_ERROR_FILL,
          });
        }

        if (
          slotLabelIds.has(element.id) &&
          element.type === "text"
        ) {
          return newElementWith(element, {
            text: "生成失败",
            originalText: "生成失败",
            strokeColor: PENDING_PLACEHOLDER_ERROR_STROKE,
          });
        }

        return element;
      }),
      appState: firstSlot
        ? {
            selectedElementIds: {
              [firstSlot.frameId]: true,
            },
          }
        : undefined,
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
  };

  const replacePendingGenerationSlot = (
    slot: PendingGenerationSlot,
    asset: PersistedImageAssetInput,
  ) => {
    const api = excalidrawAPIRef.current;
    if (!api) {
      return;
    }

    const currentElements = api.getSceneElementsIncludingDeleted();
    const frame = currentElements.find(
      (element) => element.id === slot.frameId && !element.isDeleted,
    );
    if (!frame) {
      return;
    }

    const appState = api.getAppState();
    const filesToAdd: BinaryFileData[] = [
      {
        id: asset.fileId as FileId,
        mimeType: asset.mimeType as BinaryFileData["mimeType"],
        dataURL: `data:${asset.mimeType};base64,${asset.dataBase64}` as BinaryFileData["dataURL"],
        created: Date.parse(asset.createdAt) || Date.now(),
      },
    ];
    api.addFiles(filesToAdd);

    const returnedImageSize = slot.fitReturnedImageSize
      ? normalizeGeneratedImageDimensions({
          width: asset.width,
          height: asset.height,
        })
      : {
          width: frame.width,
          height: frame.height,
        };
    const frameCenter = {
      x: frame.x + frame.width / 2,
      y: frame.y + frame.height / 2,
    };

    const newImage = newImageElement({
      type: "image",
      fileId: asset.fileId as FileId,
      status: "saved",
      scale: [1, 1],
      x: frameCenter.x - returnedImageSize.width / 2,
      y: frameCenter.y - returnedImageSize.height / 2,
      width: returnedImageSize.width,
      height: returnedImageSize.height,
    });

    const selectedElementIds = { ...appState.selectedElementIds };
    const shouldSelectNewImage =
      Boolean(selectedElementIds[slot.frameId]) ||
      Boolean(selectedElementIds[slot.labelId]);
    delete selectedElementIds[slot.frameId];
    delete selectedElementIds[slot.labelId];
    if (shouldSelectNewImage) {
      selectedElementIds[newImage.id] = true;
    }

    api.updateScene({
      elements: appendElementsWithSyncedIndices(
        currentElements.map((element) =>
          element.id === slot.frameId || element.id === slot.labelId
            ? newElementWith(element, { isDeleted: true })
            : element,
        ),
        [newImage],
      ),
      appState: {
        selectedElementIds,
      },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });

    generationTaskByElementIdRef.current.delete(slot.frameId);
    generationTaskByElementIdRef.current.delete(slot.labelId);
  };

  const finishPendingGenerationJob = async (
    job: PendingGenerationJob,
    request: GenerationRequest,
    response: Awaited<ReturnType<typeof desktopBridge.generateImages>>,
  ) => {
    const project = currentProjectRef.current;
    if (!project || project.projectPath !== job.projectPath) {
      return;
    }

    const files: PersistedImageAssetInput[] = response.images.map((image) => ({
      ...image,
      fileId: crypto.randomUUID(),
      sourceType: "generated",
      provider: response.provider,
      model: response.model,
      prompt: request.prompt,
      negativePrompt: request.negativePrompt,
      seed: response.seed,
      createdAt: response.createdAt,
      parentFileId: request.reference?.debug?.fileId ?? null,
    }));
    const nextImageRecords = await desktopBridge.persistImageAssets({
      projectPath: job.projectPath,
      files,
    });

    const activeProject = currentProjectRef.current;
    if (activeProject?.projectPath === job.projectPath) {
      updateCurrentProject({
        ...activeProject,
        imageRecords: nextImageRecords,
      });
    }

    files.forEach((asset, index) => {
      const slot = job.slots[index];
      if (slot) {
        replacePendingGenerationSlot(slot, asset);
      }
    });

    job.slots.slice(files.length).forEach((slot) => {
      markPendingGenerationFailed({
        ...job,
        slots: [slot],
      }, {
        normalizedMessage: "模型没有返回这张图。",
        rawMessage: "模型没有返回这张图。",
        stack: null,
      });
    });
  };

  const persistUnknownCanvasImages = async (
    project: DesktopProjectBundle,
    elements: readonly ExcalidrawElement[],
    files: BinaryFiles,
  ) => {
    const unknownAssets: PersistedImageAssetInput[] = elements.flatMap((element) => {
      if (
        element.isDeleted ||
        element.type !== "image" ||
        !element.fileId ||
        project.imageRecords[element.fileId] ||
        !files[element.fileId]
      ) {
        return [];
      }

      return [
        {
          fileId: element.fileId,
          dataBase64: extractBase64(files[element.fileId].dataURL),
          mimeType: files[element.fileId].mimeType,
          width: element.width,
          height: element.height,
          sourceType: "imported",
          createdAt: new Date(files[element.fileId].created).toISOString(),
        },
      ];
    });

    if (!unknownAssets.length) {
      return project.imageRecords;
    }

    const nextImageRecords = await desktopBridge.persistImageAssets({
      projectPath: project.projectPath,
      files: unknownAssets,
    });
    const activeProject = currentProjectRef.current;
    if (activeProject?.projectPath === project.projectPath) {
      updateCurrentProject({
        ...activeProject,
        imageRecords: nextImageRecords,
      });
    }
    return nextImageRecords;
  };

  const writeAutosaveSnapshot = async (snapshot: AutosaveSnapshot) => {
    const nextImageRecords = await persistUnknownCanvasImages(
      snapshot.project,
      snapshot.elements,
      snapshot.files,
    );
    const sceneJson = serializeSceneForProject({
      elements: snapshot.elements,
      appState: snapshot.appState,
    });
    await desktopBridge.writeProjectScene({
      projectPath: snapshot.project.projectPath,
      sceneJson,
    });

    if (currentProjectRef.current?.projectPath !== snapshot.project.projectPath) {
      return;
    }

    setSelectedRecord(
      buildSelectedImageRecord(
        snapshot.elements,
        snapshot.appState,
        nextImageRecords,
      ),
    );
    setSelectedTask(
      buildSelectedGenerationTask(
        snapshot.appState,
        generationTaskByElementIdRef.current,
      ),
    );
  };

  const enqueueAutosaveWrite = (snapshot: AutosaveSnapshot) => {
    const writePromise = autosaveQueueRef.current
      .catch(() => undefined)
      .then(() => writeAutosaveSnapshot(snapshot));
    autosaveQueueRef.current = writePromise;
    return writePromise;
  };

  const flushPendingAutosave = async ({
    strict = false,
  }: {
    strict?: boolean;
  } = {}) => {
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    const snapshot = pendingAutosaveRef.current;
    pendingAutosaveRef.current = null;
    if (snapshot) {
      try {
        await enqueueAutosaveWrite(snapshot);
      } catch (error) {
        if (strict) {
          throw error;
        }
        reportAutosaveError(error);
      }
      return;
    }

    try {
      await autosaveQueueRef.current;
    } catch (error) {
      if (strict) {
        throw error;
      }
    }
  };

  const scheduleAutosave = (snapshot: AutosaveSnapshot) => {
    pendingAutosaveRef.current = snapshot;

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      autosaveTimerRef.current = null;
      const pendingSnapshot = pendingAutosaveRef.current;
      pendingAutosaveRef.current = null;
      if (pendingSnapshot) {
        void enqueueAutosaveWrite(pendingSnapshot).catch(reportAutosaveError);
      }
    }, 700);
  };

  const handleImportImages = async () => {
    const project = currentProjectRef.current;
    if (!project) {
      return;
    }

    try {
      const importedImages = await desktopBridge.importImages();
      if (!importedImages.length) {
        return;
      }

      const files: PersistedImageAssetInput[] = importedImages.map((image) => ({
        ...image,
        sourceType: "imported",
      }));
      const nextImageRecords = await desktopBridge.persistImageAssets({
        projectPath: project.projectPath,
        files,
      });
      await insertAssetsIntoScene(files, nextImageRecords);
    } catch (error) {
      setProjectError(getErrorText(error, copy.startup.importImagesFailed));
    }
  };

  const handleDesktopClipboardPaste = async (data: ClipboardData) => {
    if (!isEmptyClipboardData(data)) {
      return true;
    }

    const project = currentProjectRef.current;
    if (!project || !desktopBridge.readClipboardImage) {
      return true;
    }

    try {
      const clipboardImage = await desktopBridge.readClipboardImage();
      if (!clipboardImage) {
        return true;
      }

      const file: PersistedImageAssetInput = {
        ...clipboardImage,
        sourceType: "imported",
      };
      const nextImageRecords = await desktopBridge.persistImageAssets({
        projectPath: project.projectPath,
        files: [file],
      });
      await insertAssetsIntoScene([file], nextImageRecords, {
        anchorPoint: lastCanvasPointerRef.current,
      });
      return false;
    } catch (error) {
      setProjectError(getErrorText(error, copy.startup.importImagesFailed));
      return false;
    }
  };

  const handleGenerateImages = async (
    request: GenerationRequest,
    _keepOpen: boolean,
  ) => {
    const project = currentProjectRef.current;
    if (!project) {
      return;
    }

    clearGenerationErrorState();
    try {
      const requestCustomModels =
        providerSettings?.[request.provider]?.customModels ?? [];
      const normalizedRequest = normalizeGenerationRequest(request, {
        customModels: requestCustomModels,
      });
      let preparedRequest = normalizedRequest;
      if (normalizedRequest.reference?.enabled) {
        const reference = await buildSelectionReference({
          scene: latestSceneRef.current,
          includeImage: true,
          imageRecords: currentProjectRef.current?.imageRecords || null,
        });
        if (!reference?.image) {
          throw new Error("当前没有可用的选区参考，请重新选中元素后再试。");
        }
        preparedRequest = {
          ...normalizedRequest,
          reference: {
            ...reference,
            enabled: true,
          },
        };
      }

      const startedAt = new Date().toISOString();
      const pendingJob = insertGenerationPlaceholders(preparedRequest, startedAt);
      if (!pendingJob) {
        throw new Error(copy.startup.generateFailed);
      }

      pendingGenerationJobsRef.current.set(pendingJob.jobId, pendingJob);
      setPendingGenerationCount((count) => count + 1);
      setGenerateRequest({
        ...preparedRequest,
        prompt: "",
      });
      void (async () => {
        try {
          const response = await desktopBridge.generateImages({
            projectPath: project.projectPath,
            request: preparedRequest,
          });
          if (!pendingGenerationJobsRef.current.has(pendingJob.jobId)) {
            return;
          }
          await finishPendingGenerationJob(pendingJob, preparedRequest, response);
        } catch (error: any) {
          const errorDetails = showGenerationError(preparedRequest, error);
          if (pendingGenerationJobsRef.current.has(pendingJob.jobId)) {
            markPendingGenerationFailed(pendingJob, errorDetails);
          }
        } finally {
          pendingGenerationJobsRef.current.delete(pendingJob.jobId);
          setPendingGenerationCount((count) => Math.max(0, count - 1));
          await loadProviderState();
        }
      })();
    } catch (error: any) {
      showGenerationError(
        normalizeGenerationRequest(request, {
          customModels: providerSettings?.[request.provider]?.customModels ?? [],
        }),
        error,
      );
    }
  };

  const handleCopyGenerationErrorDetails = async () => {
    if (!generationErrorDetails) {
      return;
    }

    const copied = await copyTextToClipboardWithFallback(
      formatGenerationErrorDebugText(generationErrorDetails),
    );
    if (copied) {
      setGenerationErrorCopied(true);
    }
  };

  const openGenerateDialog = async (nextRequest?: Partial<GenerationRequest>) => {
    const selectionReferenceSignature = getSelectionReferenceSignature(
      latestSceneRef.current,
    );
    if (
      removedSelectionReferenceSignatureRef.current &&
      removedSelectionReferenceSignatureRef.current !== selectionReferenceSignature
    ) {
      removedSelectionReferenceSignatureRef.current = null;
    }
    const reference =
      selectionReferenceSignature &&
      removedSelectionReferenceSignatureRef.current === selectionReferenceSignature
        ? null
        : await buildSelectionReference({
            scene: latestSceneRef.current,
            includeImage: false,
            imageRecords: currentProjectRef.current?.imageRecords || null,
          });

    setGenerationError(null);
    setGenerateRequest((current) => {
      const mergedRequest = {
        ...current,
        ...nextRequest,
        reference,
      };
      return normalizeGenerationRequest(mergedRequest, {
        customModels: providerSettings?.[mergedRequest.provider]?.customModels ?? [],
      });
    });
    setGenerateFocusToken((current) => current + 1);
  };

  const handleRemoveGenerateReference = () => {
    removedSelectionReferenceSignatureRef.current = getSelectionReferenceSignature(
      latestSceneRef.current,
    );
    setGenerateRequest((current) =>
      normalizeGenerationRequest(
        {
          ...current,
          reference: null,
        },
        {
          customModels: providerSettings?.[current.provider]?.customModels ?? [],
        },
      ),
    );
  };

  const handleSaveProviderSettings = async (
    input: Parameters<typeof desktopBridge.saveProviderSettings>[0],
  ) => {
    setSavingProviders(true);
    try {
      const nextSettings = await desktopBridge.saveProviderSettings(input);
      setProviderSettings(nextSettings);
    } finally {
      setSavingProviders(false);
    }
  };

  const handleGenerateRequestChange = (request: GenerationRequest) => {
    setGenerateRequest(
      normalizeGenerationRequest(request, {
        customModels: providerSettings?.[request.provider]?.customModels ?? [],
      }),
    );
  };

  const handleRememberGenerationModelSelection = (
    selection: GenerationModelSelection,
  ) => {
    generationModelSelectionLockedRef.current = true;
    rememberedGenerationModelSelectionRef.current = selection;
    rememberGenerationModelSelection(selection);
  };

  const handleCopyPrompt = async () => {
    if (!selectedRecord?.prompt) {
      return;
    }
    await copyTextToClipboardWithFallback(selectedRecord.prompt);
  };

  const handleCopyTaskError = async () => {
    if (!selectedTask || selectedTask.status !== "error") {
      return;
    }

    await copyTextToClipboardWithFallback(
      formatGenerationErrorDebugText({
        provider: selectedTask.provider,
        model: selectedTask.model,
        occurredAt: selectedTask.startedAt,
        normalizedMessage:
          selectedTask.errorMessage || copy.startup.generateFailed,
        rawMessage:
          selectedTask.rawError ||
          selectedTask.errorMessage ||
          copy.startup.generateFailed,
        stack: selectedTask.stack || null,
        requestPayload: null,
      }),
    );
  };

  const handleReuseSettings = () => {
    if (!selectedRecord) {
      return;
    }
    const provider = selectedRecord.provider || "gemini";
    const model = selectedRecord.model || getDefaultModel(provider);
    const aspectRatio = getClosestAspectRatioOption(
      selectedRecord.width,
      selectedRecord.height,
      getAspectRatioOptions({
        provider,
        model,
        customModels: providerSettings?.[provider]?.customModels ?? [],
      }),
    );
    void openGenerateDialog({
      provider,
      model,
      prompt: selectedRecord.prompt || "",
      negativePrompt: selectedRecord.negativePrompt || "",
      aspectRatio: aspectRatio.id,
      width: selectedRecord.width,
      height: selectedRecord.height,
      seed: selectedRecord.seed ?? null,
      imageCount: 1,
    });
  };

  const handleDefaultSidebarStateChange = (state: AppState["openSidebar"]) => {
    if (!state?.tab) {
      return;
    }
    if (state.tab === LIBRARY_SIDEBAR_TAB) {
      setDefaultSidebarTab(IMAGE_INFO_SIDEBAR_TAB);
      return;
    }
    setDefaultSidebarTab(state.tab);
  };

  const handleEditorReady = (
    api: ExcalidrawImperativeAPI | null,
    renderNonce: number,
  ) => {
    if (renderNonce !== projectRenderNonceRef.current) {
      return;
    }

    if (api) {
      excalidrawAPIRef.current = api;
    }

    const clearInitializing = () => {
      updateEditorInitializing(false, renderNonce);
    };

    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(clearInitializing);
      return;
    }

    window.setTimeout(clearInitializing, 0);
  };

  useDesktopMenuEvents((event) => {
    switch (event.action) {
      case "new-project":
        void handleCreateProject();
        break;
      case "open-project":
        void handleOpenProject();
        break;
      case "open-recent-project":
        if (event.projectPath) {
          void handleOpenRecentProject(event.projectPath);
        }
        break;
      case "project-opened":
        if (event.projectBundle) {
          if (
            event.openRequestId !== undefined &&
            event.openRequestId < latestMenuProjectOpenRequestIdRef.current
          ) {
            break;
          }
          if (event.openRequestId !== undefined) {
            latestMenuProjectOpenRequestIdRef.current = event.openRequestId;
          }
          const sequence = beginProjectOpen();
          void openProjectBundle(event.projectBundle, sequence);
        }
        break;
      case "project-open-failed":
        if (
          event.openRequestId !== undefined &&
          event.openRequestId < latestMenuProjectOpenRequestIdRef.current
        ) {
          break;
        }
        if (event.openRequestId !== undefined) {
          latestMenuProjectOpenRequestIdRef.current = event.openRequestId;
        }
        setProjectError(event.errorMessage || copy.startup.openProjectFailed);
        break;
      case "import-images":
        void handleImportImages();
        break;
      case "generate-image":
        void openGenerateDialog();
        break;
      case "provider-settings":
        setProviderSettingsFocusToken((current) => current + 1);
        break;
      case "reveal-project":
        void handleRevealProject();
        break;
      default:
        break;
    }
  });

  if (!bridge) {
    return (
      <div className="image-board-app">
        <div className="welcome-pane">
          <div className="welcome-pane__card welcome-pane__diagnostic">
            <span className="welcome-pane__eyebrow">{copy.startup.eyebrow}</span>
            <h1>{copy.startup.heading}</h1>
            <p>{copy.startup.description}</p>
            <div className="dialog-card__error welcome-pane__error">
              {copy.startup.retryInstruction}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentProject || !initialData) {
    return (
      <div className="image-board-app">
        {startupError && <div className="app-startup-error">{startupError}</div>}
        {projectError && <div className="dialog-card__error">{projectError}</div>}
        <WelcomePane
          loading={loadingProject}
          onCreateProject={handleCreateProject}
          onOpenProject={handleOpenProject}
          recentProjects={recentProjects}
          onOpenRecentProject={handleOpenRecentProject}
        />
      </div>
    );
  }

  const projectRenderKey = `${currentProject.projectPath}:${projectRenderNonce}`;

  return (
    <div className="image-board-app">
      {startupError && <div className="app-startup-error">{startupError}</div>}
      {projectError && <div className="dialog-card__error">{projectError}</div>}
      <ProjectRenderBoundary
        projectKey={projectRenderKey}
        onError={handleProjectRenderError}
        onReset={handleResetProjectView}
      >
        <div className="image-board-shell">
          <div className="image-board-canvas">
            {isEditorInitializing && (
              <div className="image-board-canvas__loading" role="status">
                <div className="image-board-canvas__loading-card">
                  <div className="image-board-canvas__loading-spinner" aria-hidden="true" />
                  <span>{copy.startup.editorLoading}</span>
                </div>
              </div>
            )}
            <Excalidraw
              key={projectRenderKey}
              langCode={DESKTOP_LANG_CODE}
              initialData={initialData}
              onInitialize={(api) => {
                handleEditorReady(api ?? null, projectRenderNonce);
              }}
              onExcalidrawAPI={(api) => {
                if (projectRenderNonce === projectRenderNonceRef.current) {
                  excalidrawAPIRef.current = api;
                }
              }}
              onPointerUpdate={({ pointer }) => {
                lastCanvasPointerRef.current = {
                  x: pointer.x,
                  y: pointer.y,
                };
              }}
              onPaste={handleDesktopClipboardPaste}
              onChange={(elements, appState, files) => {
                const activeProject = currentProjectRef.current;
                if (!activeProject) {
                  return;
                }
                const nextScene = {
                  elements,
                  appState,
                  files,
                };
                const selectionReferenceSignature =
                  getSelectionReferenceSignature(nextScene);
                const selectionReferenceSummary = buildSelectionReferenceSummary({
                  elements,
                  appState,
                  files,
                });
                if (
                  removedSelectionReferenceSignatureRef.current &&
                  removedSelectionReferenceSignatureRef.current !==
                    selectionReferenceSignature
                ) {
                  removedSelectionReferenceSignatureRef.current = null;
                }
                latestSceneRef.current = nextScene;
                setGenerateRequest((current) =>
                  syncSelectionReferenceIntoRequest(
                    current,
                    removedSelectionReferenceSignatureRef.current ===
                      selectionReferenceSignature
                      ? null
                      : selectionReferenceSummary,
                  ),
                );
                setSelectedRecord(
                  buildSelectedImageRecord(
                    elements,
                    appState,
                    activeProject.imageRecords,
                  ),
                );
                setSelectedTask(
                  buildSelectedGenerationTask(
                    appState,
                    generationTaskByElementIdRef.current,
                  ),
                );
                if (!isEditorInitializingRef.current) {
                  scheduleAutosave({
                    project: activeProject,
                    elements,
                    appState,
                    files,
                  });
                }
              }}
              UIOptions={{
                canvasActions: {
                  loadScene: false,
                  saveToActiveFile: false,
                  export: false,
                  toggleTheme: true,
                },
              }}
              renderTopLeftUI={() => (
                <TopBar
                  projectName={currentProject.project.name}
                  onOpenProject={handleOpenProject}
                  onImportImages={handleImportImages}
                  onRevealProject={handleRevealProject}
                />
              )}
              detectScroll={false}
              handleKeyboardGlobally={true}
              autoFocus={true}
            >
              <ImageSidebar
                record={selectedRecord}
                parentRecord={parentRecord}
                ancestorRecords={ancestorRecords}
                descendantRecords={descendantRecords}
                task={selectedTask}
                defaultSidebarTab={defaultSidebarTab}
                onDefaultSidebarStateChange={handleDefaultSidebarStateChange}
                onCopyPrompt={handleCopyPrompt}
                onCopyTaskError={handleCopyTaskError}
                onReuseSettings={handleReuseSettings}
              />
            </Excalidraw>
          </div>
        </div>
      </ProjectRenderBoundary>

      <GenerateImageDialog
        open={true}
        persistent={true}
        focusToken={generateFocusToken}
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
        onClose={() => undefined}
        onRequestChange={handleGenerateRequestChange}
        onModelSelectionChange={handleRememberGenerationModelSelection}
        onReferenceRemove={handleRemoveGenerateReference}
        onSaveProviderSettings={handleSaveProviderSettings}
        onSubmit={handleGenerateImages}
      />

      {generationErrorDetailsOpen && generationErrorDetails && (
        <div className="dialog-backdrop">
          <div className="dialog-card dialog-card--wide">
            <div className="dialog-card__header">
              <div>
                <span className="dialog-card__eyebrow">{copy.debugError.eyebrow}</span>
                <h2>{copy.debugError.title}</h2>
              </div>
              <DesktopButton
                type="button"
                className="dialog-card__close"
                onClick={() => setGenerationErrorDetailsOpen(false)}
              >
                {copy.debugError.close}
              </DesktopButton>
            </div>

            <div className="debug-error-dialog">
              <div className="debug-error-dialog__meta">
                <div>
                  <span>{copy.debugError.provider}</span>
                  <strong>
                    {getProviderDefinition(generationErrorDetails.provider).label}
                  </strong>
                </div>
                <div>
                  <span>{copy.debugError.model}</span>
                  <strong>{generationErrorDetails.model}</strong>
                </div>
                <div>
                  <span>{copy.debugError.occurredAt}</span>
                  <strong>
                    {new Date(generationErrorDetails.occurredAt).toLocaleString(
                      "zh-CN",
                    )}
                  </strong>
                </div>
              </div>

              <section className="debug-error-dialog__section">
                <h3>{copy.debugError.message}</h3>
                <p>{generationErrorDetails.normalizedMessage}</p>
              </section>

              <section className="debug-error-dialog__section">
                <h3>{copy.debugError.raw}</h3>
                <pre className="debug-error-dialog__pre">
                  {generationErrorDetails.rawMessage}
                </pre>
              </section>

              {generationErrorDetails.requestPayload && (
                <section className="debug-error-dialog__section">
                  <h3>{copy.debugError.payload}</h3>
                  <pre className="debug-error-dialog__pre">
                    {generationErrorDetails.requestPayload}
                  </pre>
                </section>
              )}

              {generationErrorDetails.stack && (
                <section className="debug-error-dialog__section">
                  <h3>{copy.debugError.stack}</h3>
                  <pre className="debug-error-dialog__pre">
                    {generationErrorDetails.stack}
                  </pre>
                </section>
              )}
            </div>

            <div className="dialog-card__footer">
              <DesktopButton
                type="button"
                onClick={() => {
                  void handleCopyGenerationErrorDetails();
                }}
              >
                {generationErrorCopied ? copy.debugError.copied : copy.debugError.copy}
              </DesktopButton>
              <DesktopButton
                type="button"
                variant="primary"
                onClick={() => setGenerationErrorDetailsOpen(false)}
              >
                {copy.debugError.close}
              </DesktopButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
