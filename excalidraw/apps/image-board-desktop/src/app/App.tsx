import {
  Component,
  type ErrorInfo,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  CaptureUpdateAction,
  Excalidraw,
} from "@excalidraw/excalidraw";
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

import type {
  AppState,
  BinaryFileData,
  BinaryFiles,
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
} from "@excalidraw/excalidraw/types";
import type { ClipboardData } from "@excalidraw/excalidraw/clipboard";

import {
  buildImagePromptReferenceRecords,
  buildPromptTextWithInlineReferences,
} from "../shared/promptReferences";
import {
  isAgentDesktopBridgeMethod,
  type AgentBoardCommandContext,
  type AgentBrowserRuntimeViewport,
} from "../shared/agentBridgeTypes";
import {
  ACP_AGENT_CUSTOM_PRESET_ID,
  ACP_AGENT_PRESETS,
  getAcpAgentPreset,
  getDefaultAcpAgentSettings,
  getSelectedAcpAgent,
  inferAcpAgentPresetId,
  type AcpAgentPresetId,
  type AcpAgentSettings,
  type AcpTaskEvent,
  type AcpTaskRequest,
  type AcpTaskStatus,
} from "../shared/acpTypes";
import {
  getProviderDefinition,
  isAutoAspectRatioRequest,
  normalizeGenerationRequest,
} from "../shared/providerCatalog";


import { publishAgentBrowserRuntimeState } from "./agent/agentBrowserBridge";
import { maybeGetDesktopBridge } from "./desktopBridge";
import { syncSelectionReferenceIntoRequest } from "./generationRequestState";
import {
  normalizeGeneratedImageDimensions,
  placeGeneratedImages,
  measureBatchBounds,
} from "./project/imagePlacement";
import {
  ENABLE_WORKSPACE_BOUNDS,
  getWorkspaceFitZoom,
  getWorkspaceBounds,
  resolveWorkspaceZoomGate,
  type WorkspaceBounds,
  type WorkspaceZoomGateState,
} from "./workspaceBounds";
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
  getImageRenditionRequestsNearViewport,
  IMAGE_HIGH_RES_LOAD_DEBOUNCE_MS,
} from "./imageRenditions";
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
import { AgentBoard } from "./components/AgentBoard";
import { AgentStatusDock } from "./components/AgentStatusDock";
import { ImageSidebar } from "./components/ImageSidebar";

import type { GenerationTaskRecord } from "./components/ImageInspector";

import { SideDock } from "./components/SideDock";
import { DesktopButton } from "./components/DesktopButton";
import { ProjectMainMenu } from "./components/ProjectMainMenu";
import { WelcomePane } from "./components/WelcomePane";
import {
  buildAgentProjectContext,
  buildAgentImagePathList,
  buildAgentSceneBoard,
  buildAgentSceneSnapshot,
  buildAgentSelectionContext,
  collectAgentImageFileIds,
  createAgentGenerationRequest,
  createAgentPromptTextElement,
  projectAssetPayloadsToBinaryFiles,
} from "./agent/agentCommandHandlers";
import { copy, DESKTOP_LANG_CODE } from "./copy";

import "./App.css";

import type { AgentBrowserRuntimeState } from "../shared/agentBridgeTypes";
import type {
  GenerationSource,
  GenerationReferencePayload,
  GenerationRequest,
} from "../shared/providerTypes";
import type {
  ImageAssetRequestRendition,
  ImagePromptReferenceRecord,
  ImageRecord,
  ImageRecordMap,
} from "../shared/projectTypes";
import type {
  DesktopAppInfo,
  DesktopAgentBridgeStatus,
  DesktopCurrentProject,
  DesktopProjectBundle,
  PersistedImageAssetInput,
  ProjectAssetPayload,
  PublicProviderSettings,
  RecentProjectEntry,
  SavedPrompt,
  SavePromptInput,
} from "../shared/desktopBridgeTypes";

const getPromptHistoryText = (request: GenerationRequest) =>
  buildPromptTextWithInlineReferences(request).trim() || request.prompt;

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

const getDesktopCurrentProject = (
  project: DesktopProjectBundle | null,
): DesktopCurrentProject | null =>
  project
    ? {
        projectPath: project.projectPath,
        name: project.project.name,
        agentAccess: project.project.agentAccess,
      }
    : null;

const isEmptyClipboardData = (data: ClipboardData) =>
  !data.elements?.length &&
  !hasClipboardFiles(data.files) &&
  !data.mixedContent?.length &&
  !data.errorMessage &&
  !(data.text ?? "").trim();

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

interface AcpAgentTaskUiState {
  taskId: string;
  status: AcpTaskStatus;
  message: string;
  transcript: string;
}

interface AutosaveSnapshot {
  project: DesktopProjectBundle;
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
}

type ThumbnailMaintenanceState = {
  status: "pending" | "failed";
  total: number;
  message?: string;
};

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

const getSceneOccupiedBounds = (
  elements: readonly ExcalidrawElement[],
) =>
  elements.flatMap((element) => {
    if (element.isDeleted) {
      return [];
    }

    const bounds = getElementsSceneBounds([element]);
    return bounds && bounds.width > 0 && bounds.height > 0 ? [bounds] : [];
  });

interface WorkspaceOverlayState {
  bounds: WorkspaceBounds;
  scrollX: number;
  scrollY: number;
  zoomValue: number;
}

const createWorkspaceZoomGateState = (): WorkspaceZoomGateState => ({
  snappedAtFitZoom: false,
  releasedBelowFitZoom: false,
});

const WORKSPACE_OVERLAY_STATE_EPSILON = 0.001;

const getFiniteNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const areNumbersClose = (left: number, right: number) =>
  Math.abs(left - right) <= WORKSPACE_OVERLAY_STATE_EPSILON;

const areWorkspaceBoundsEqual = (
  left: WorkspaceBounds,
  right: WorkspaceBounds,
) =>
  areNumbersClose(left.x, right.x) &&
  areNumbersClose(left.y, right.y) &&
  areNumbersClose(left.width, right.width) &&
  areNumbersClose(left.height, right.height);

const areWorkspaceOverlayStatesEqual = (
  left: WorkspaceOverlayState | null,
  right: WorkspaceOverlayState | null,
) => {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return (
    areWorkspaceBoundsEqual(left.bounds, right.bounds) &&
    areNumbersClose(left.scrollX, right.scrollX) &&
    areNumbersClose(left.scrollY, right.scrollY) &&
    areNumbersClose(left.zoomValue, right.zoomValue)
  );
};

const getViewportCenterFromAppState = (
  appState: Pick<AppState, "width" | "height" | "scrollX" | "scrollY" | "zoom">,
) => {
  const width = getFiniteNumber(appState.width, 0);
  const height = getFiniteNumber(appState.height, 0);
  const scrollX = getFiniteNumber(appState.scrollX, 0);
  const scrollY = getFiniteNumber(appState.scrollY, 0);
  const zoomValue = Math.max(getFiniteNumber(appState.zoom?.value, 1), 0.0001);

  return {
    x: width / (2 * zoomValue) - scrollX,
    y: height / (2 * zoomValue) - scrollY,
  };
};

const buildWorkspaceOverlayState = (
  elements: readonly ExcalidrawElement[],
  appState: AppState,
): WorkspaceOverlayState | null => {
  if (!ENABLE_WORKSPACE_BOUNDS) {
    return null;
  }

  const bounds = getWorkspaceBounds(elements, {
    viewportCenter: getViewportCenterFromAppState(appState),
  });

  return {
    bounds,
    scrollX: getFiniteNumber(appState.scrollX, 0),
    scrollY: getFiniteNumber(appState.scrollY, 0),
    zoomValue: getFiniteNumber(appState.zoom?.value, 1),
  };
};

const getViewportCenteredZoomState = (
  appState: AppState,
  nextZoomValue: number,
) => {
  const currentZoom = getFiniteNumber(appState.zoom?.value, 1);
  const nextZoom = getFiniteNumber(nextZoomValue, currentZoom);
  const appLayerX = getFiniteNumber(appState.width, 0) / 2;
  const appLayerY = getFiniteNumber(appState.height, 0) / 2;
  const scrollX = getFiniteNumber(appState.scrollX, 0);
  const scrollY = getFiniteNumber(appState.scrollY, 0);

  const baseScrollX = scrollX + (appLayerX - appLayerX / currentZoom);
  const baseScrollY = scrollY + (appLayerY - appLayerY / currentZoom);
  const zoomOffsetScrollX = -(appLayerX - appLayerX / nextZoom);
  const zoomOffsetScrollY = -(appLayerY - appLayerY / nextZoom);

  return {
    scrollX: baseScrollX + zoomOffsetScrollX,
    scrollY: baseScrollY + zoomOffsetScrollY,
    zoom: {
      value: nextZoom as AppState["zoom"]["value"],
    },
  };
};

const isObjectPayload = (payload: unknown): payload is Record<string, unknown> =>
  Boolean(payload && typeof payload === "object" && !Array.isArray(payload));

type AppSceneSnapshot = {
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
};

type PlacementViewportContext = {
  viewportCenter: { x: number; y: number };
  viewportSize: { width: number; height: number };
  zoomValue: number;
};

const createAgentBadRequestError = (message: string) =>
  Object.assign(new Error(message), {
    code: "BAD_REQUEST" as const,
  });

const createAgentProjectMismatchError = () =>
  Object.assign(new Error("Agent command projectPath 与当前项目不一致。"), {
    code: "PROJECT_MISMATCH" as const,
  });

const createAgentImageFileId = () => `agent-${crypto.randomUUID()}`;

const assertAgentProjectPath = (
  payload: unknown,
  projectPath: string,
) => {
  if (!isObjectPayload(payload) || payload.projectPath !== projectPath) {
    throw createAgentProjectMismatchError();
  }
};

const parseAgentAnchorPoint = (anchorPoint: unknown) => {
  if (anchorPoint === undefined || anchorPoint === null) {
    return null;
  }

  if (!isObjectPayload(anchorPoint)) {
    throw createAgentBadRequestError("anchorPoint 格式不正确。");
  }

  const { x, y } = anchorPoint;
  if (
    typeof x !== "number" ||
    typeof y !== "number" ||
    !Number.isFinite(x) ||
    !Number.isFinite(y)
  ) {
    throw createAgentBadRequestError("anchorPoint 需要有限的 x/y 数值。");
  }

  return { x, y };
};

const parseAgentBoardCommandContext = (
  payload: unknown,
): AgentBoardCommandContext | null => {
  if (!isObjectPayload(payload) || !isObjectPayload(payload.agentBoardContext)) {
    return null;
  }

  const context = payload.agentBoardContext;
  if (!isObjectPayload(context.browserRuntime)) {
    return null;
  }

  if (context.browserRuntime.source !== "agent-board") {
    return null;
  }

  return context as unknown as AgentBoardCommandContext;
};

const getAgentBoardSelectedElementIds = (
  context: AgentBoardCommandContext | null,
) => {
  const selectedElementIds = context?.scene?.selectedElementIds;
  if (!Array.isArray(selectedElementIds)) {
    return [];
  }

  return Array.from(
    new Set(
      selectedElementIds.filter(
        (elementId): elementId is string =>
          typeof elementId === "string" && Boolean(elementId.trim()),
      ),
    ),
  );
};

const buildSceneWithSelectedElementIds = (
  scene: AppSceneSnapshot | null,
  selectedElementIds: readonly string[],
): AppSceneSnapshot | null => {
  if (!scene || !selectedElementIds.length) {
    return null;
  }

  return {
    ...scene,
    appState: {
      ...scene.appState,
      selectedElementIds: Object.fromEntries(
        selectedElementIds.map((elementId) => [elementId, true as const]),
      ) as AppState["selectedElementIds"],
      selectedGroupIds: {},
    },
  };
};

const getPlacementViewportFromRuntimeViewport = (
  viewport: AgentBrowserRuntimeViewport | undefined,
): PlacementViewportContext | null => {
  if (!viewport) {
    return null;
  }

  const width = getFiniteNumber(viewport.width, 0);
  const height = getFiniteNumber(viewport.height, 0);
  const zoomValue = Math.max(getFiniteNumber(viewport.zoom, 1), 0.0001);
  if (width <= 0 || height <= 0) {
    return null;
  }

  const scrollX = getFiniteNumber(viewport.scrollX, 0);
  const scrollY = getFiniteNumber(viewport.scrollY, 0);

  return {
    viewportCenter: {
      x: width / (2 * zoomValue) - scrollX,
      y: height / (2 * zoomValue) - scrollY,
    },
    viewportSize: {
      width,
      height,
    },
    zoomValue,
  };
};

const getPlacementViewportFromAgentBoardContext = (
  context: AgentBoardCommandContext | null,
) => getPlacementViewportFromRuntimeViewport(context?.scene?.viewport);

const parseAgentImagePathPayload = (payload: unknown) => {
  if (payload === undefined || payload === null) {
    return { selectionOnly: false };
  }

  if (!isObjectPayload(payload)) {
    throw createAgentBadRequestError("scene.imagePaths payload 格式不正确。");
  }

  const fileIds = payload.fileIds;
  if (fileIds !== undefined && !Array.isArray(fileIds)) {
    throw createAgentBadRequestError("scene.imagePaths fileIds 必须是数组。");
  }
  const normalizedFileIds = Array.from(
    new Set(
      (fileIds ?? []).map((fileId) => {
        if (typeof fileId !== "string" || !fileId.trim()) {
          throw createAgentBadRequestError(
            "scene.imagePaths fileIds 必须是非空字符串。",
          );
        }
        return fileId.trim();
      }),
    ),
  );

  return {
    ...(normalizedFileIds.length ? { fileIds: normalizedFileIds } : {}),
    selectionOnly: payload.selectionOnly === true,
  };
};

const toAgentImageAsset = (
  payload: unknown,
  createdAt = new Date().toISOString(),
): PersistedImageAssetInput => {
  if (!isObjectPayload(payload)) {
    throw createAgentBadRequestError("图片 payload 格式不正确。");
  }

  const fileId = payload.fileId;
  const mimeType = payload.mimeType;
  const dataBase64 = payload.dataBase64;
  const width = payload.width;
  const height = payload.height;

  if (
    typeof fileId !== "string" ||
    !fileId.trim() ||
    typeof mimeType !== "string" ||
    !mimeType.trim() ||
    typeof dataBase64 !== "string" ||
    !dataBase64.trim() ||
    typeof width !== "number" ||
    !Number.isFinite(width) ||
    width <= 0 ||
    typeof height !== "number" ||
    !Number.isFinite(height) ||
    height <= 0
  ) {
    throw createAgentBadRequestError("图片 payload 缺少有效的必要字段。");
  }

  return {
    ...(payload as Partial<PersistedImageAssetInput>),
    fileId: createAgentImageFileId(),
    mimeType,
    dataBase64,
    width,
    height,
    createdAt:
      typeof payload.createdAt === "string" ? payload.createdAt : createdAt,
    sourceType: "imported",
  };
};

const getAgentImageAssetsFromPayload = (
  payload: unknown,
): PersistedImageAssetInput[] => {
  if (isObjectPayload(payload) && Array.isArray(payload.files)) {
    if (!payload.files.length) {
      throw createAgentBadRequestError("scene.addImage files 不能为空。");
    }
    return payload.files.map((file) => toAgentImageAsset(file));
  }

  return [toAgentImageAsset(payload)];
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

const stripSelectionReferenceThumbnails = (
  reference: GenerationReferencePayload | null,
): GenerationReferencePayload | null => {
  if (!reference?.items?.length) {
    return reference;
  }

  return {
    ...reference,
    items: reference.items.map(({ thumbnailDataUrl: _thumbnailDataUrl, ...item }) => item),
  };
};

const createAcpTaskId = () =>
  `acp-task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const getAcpBridgeBaseUrl = (
  status: DesktopAgentBridgeStatus | null,
): string | null => {
  const candidates = [status?.boardUrl, window.location.href].filter(
    (url): url is string => Boolean(url),
  );
  for (const candidate of candidates) {
    try {
      const bridgeBaseUrl = new URL(candidate).searchParams.get("bridge");
      if (bridgeBaseUrl) {
        return bridgeBaseUrl;
      }
    } catch {
      // Ignore malformed user-facing URLs and try the next candidate.
    }
  }
  return null;
};

const getAcpSelectionKind = (
  item: NonNullable<GenerationReferencePayload["items"]>[number],
): AcpTaskRequest["selection"]["items"][number]["kind"] => {
  if (item.kind === "image" || item.kind === "text") {
    return item.kind;
  }
  return item.label === "箭头" ? "arrow" : "shape";
};

const buildAcpSelectionItems = (
  request: GenerationRequest,
  imageRecords: ImageRecordMap,
): AcpTaskRequest["selection"]["items"] => {
  const seenElementIds = new Set<string>();
  return [request.reference, ...(request.promptReferences ?? [])]
    .flatMap((reference) => reference?.items ?? [])
    .flatMap((item) => {
      if (seenElementIds.has(item.id)) {
        return [];
      }
      seenElementIds.add(item.id);
      const imageRecord = item.fileId ? imageRecords[item.fileId] : null;
      return [
        {
          index: item.index,
          elementId: item.id,
          kind: getAcpSelectionKind(item),
          label: item.label,
          ...(item.fileId ? { fileId: item.fileId } : {}),
          ...(imageRecord?.fileId ? { imageId: imageRecord.fileId } : {}),
        },
      ];
    });
};

const buildAcpTaskRequest = ({
  request,
  project,
  status,
  agentId,
}: {
  request: GenerationRequest;
  project: DesktopProjectBundle;
  status: DesktopAgentBridgeStatus | null;
  agentId: string | null;
}): AcpTaskRequest => {
  const bridgeBaseUrl = getAcpBridgeBaseUrl(status);
  if (!bridgeBaseUrl) {
    throw new Error("Agent Bridge 地址尚未就绪。");
  }

  const items = buildAcpSelectionItems(request, project.imageRecords);
  return {
    taskId: createAcpTaskId(),
    agentId: agentId ?? "",
    userPrompt:
      getPromptHistoryText(request) || "请根据当前 CoreStudio 画板继续操作。",
    project: {
      name: project.project.name,
      projectPath: project.projectPath,
      token: project.project.agentAccess.token,
      bridgeBaseUrl,
      boardUrl: status?.boardUrl ?? null,
    },
    generation: {
      source: "agent",
    },
    selection: {
      elementCount: items.length,
      items,
    },
  };
};

const parseAcpAgentArgs = (value: string) =>
  value
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

const formatAcpAgentArgs = (args: readonly string[]) => args.join(" ");

const getAcpAgentDraftName = (presetId: AcpAgentPresetId) =>
  getAcpAgentPreset(presetId)?.name ?? "自定义 ACP Agent";

const getRuntimeSelectedElementIds = (appState: AppState) =>
  Object.entries(appState.selectedElementIds ?? {})
    .filter(([, selected]) => Boolean(selected))
    .map(([elementId]) => elementId);

const buildAgentBrowserRuntimeViewport = (
  appState: AppState,
): NonNullable<AgentBrowserRuntimeState["scene"]>["viewport"] => ({
  scrollX: appState.scrollX,
  scrollY: appState.scrollY,
  zoom: appState.zoom?.value,
  width: appState.width,
  height: appState.height,
});

const App = () => {
  const isAgentBrowserRoute = window.location.pathname === "/agent-board";
  const agentBrowserInitialProjectToken = useMemo(() => {
    if (!isAgentBrowserRoute) {
      return false;
    }
    const url = new URL(window.location.href);
    return Boolean(
      url.searchParams.get("projectToken") ?? url.searchParams.get("token"),
    );
  }, [isAgentBrowserRoute]);
  const bridge = maybeGetDesktopBridge();
  const desktopBridge = bridge!;
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const agentBrowserStatePublishTimerRef = useRef<number | null>(null);
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
  const activeAcpTaskIdRef = useRef<string | null>(null);
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

  const [currentProject, setCurrentProject] = useState<DesktopProjectBundle | null>(null);
  const [initialData, setInitialData] = useState<ExcalidrawInitialDataState | null>(null);
  const [providerSettings, setProviderSettings] = useState<PublicProviderSettings | null>(null);
  const [agentBridgeStatus, setAgentBridgeStatus] =
    useState<DesktopAgentBridgeStatus | null>(null);
  const [acpAgentSettings, setAcpAgentSettings] =
    useState<AcpAgentSettings>(() => getDefaultAcpAgentSettings());
  const [acpAgentEnabledDraft, setAcpAgentEnabledDraft] = useState(false);
  const [acpAgentPresetDraft, setAcpAgentPresetDraft] =
    useState<AcpAgentPresetId>("codex-acp");
  const [acpAgentCommandDraft, setAcpAgentCommandDraft] = useState("");
  const [acpAgentArgsDraft, setAcpAgentArgsDraft] = useState("");
  const [acpAgentCwdDraft, setAcpAgentCwdDraft] = useState("");
  const [savingAcpAgentSettings, setSavingAcpAgentSettings] = useState(false);
  const [acpAgentTask, setAcpAgentTask] =
    useState<AcpAgentTaskUiState | null>(null);
  const [appInfo, setAppInfo] = useState<DesktopAppInfo | null>(null);
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [recentProjects, setRecentProjects] = useState<RecentProjectEntry[]>([]);
  const [
    agentBrowserAutoOpenProjectPath,
    setAgentBrowserAutoOpenProjectPath,
  ] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<ImageRecord | null>(null);
  const [selectedTask, setSelectedTask] = useState<GenerationTaskRecord | null>(null);
  const [generateRequest, setGenerateRequest] = useState(() =>
    defaultGenerationRequest(
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
  const [pendingGenerationCount, setPendingGenerationCount] = useState(0);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [projectNotice, setProjectNotice] = useState<string | null>(null);
  const projectNoticeTimerRef = useRef<number | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationErrorDetails, setGenerationErrorDetails] =
    useState<GenerationErrorDetails | null>(null);
  const [generationErrorDetailsOpen, setGenerationErrorDetailsOpen] = useState(false);
  const [generationErrorCopied, setGenerationErrorCopied] = useState(false);
  const [generateFocusToken, setGenerateFocusToken] = useState(0);
  const [providerSettingsFocusToken, setProviderSettingsFocusToken] = useState(0);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [appSettingsOpen, setAppSettingsOpen] = useState(false);
  const [isEditorInitializing, setIsEditorInitializing] = useState(false);
  const [projectRenderNonce, setProjectRenderNonce] = useState(0);
  const [elementDockOpen, setElementDockOpen] = useState(false);
  const [imageDockOpen, setImageDockOpen] = useState(false);
  const [workspaceOverlayState, setWorkspaceOverlayState] =
    useState<WorkspaceOverlayState | null>(null);
  const [workspaceFitPulse, setWorkspaceFitPulse] = useState(false);
  const [thumbnailMaintenance, setThumbnailMaintenance] =
    useState<ThumbnailMaintenanceState | null>(null);
  const selectedAcpAgent = getSelectedAcpAgent(acpAgentSettings);
  const acpAgentTaskRunning = Boolean(
    acpAgentTask &&
      !["completed", "failed", "cancelled"].includes(acpAgentTask.status),
  );
  const acpAgentGenerationReady = Boolean(
    agentBridgeStatus?.enabled &&
      agentBridgeStatus.ready &&
      selectedAcpAgent &&
      bridge?.startAcpAgentTask,
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

  const notifyDesktopProjectState = (project: DesktopProjectBundle | null) => {
    bridge?.notifyProjectStateChanged?.(getDesktopCurrentProject(project));
  };

  const updateCurrentProject = (project: DesktopProjectBundle | null) => {
    currentProjectRef.current = project;
    setCurrentProject(project);
    notifyDesktopProjectState(project);
    setAgentBridgeStatus((status) =>
      status
        ? {
            ...status,
            currentProject: getDesktopCurrentProject(project),
          }
        : status,
    );
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

  const getGenerationAnchorBounds = (
    request: GenerationRequest,
    scene: AppSceneSnapshot | null = latestSceneRef.current,
  ) => {
    if (!request.reference?.enabled) {
      return null;
    }

    return getElementsSceneBounds(
      getSelectedReferenceElements(scene),
    );
  };

  const updateWorkspaceOverlay = (
    elements: readonly ExcalidrawElement[],
    appState: AppState,
  ) => {
    const overlayState = buildWorkspaceOverlayState(elements, appState);
    setWorkspaceOverlayState((current) =>
      areWorkspaceOverlayStatesEqual(current, overlayState)
        ? current
        : overlayState,
    );
    return overlayState?.bounds ?? null;
  };

  const resetWorkspaceZoomGate = () => {
    previousWorkspaceZoomValueRef.current = null;
    workspaceZoomGateStateRef.current = createWorkspaceZoomGateState();
    setWorkspaceFitPulse(false);
  };

  const triggerWorkspaceFitPulse = () => {
    if (workspaceFitPulseTimerRef.current) {
      window.clearTimeout(workspaceFitPulseTimerRef.current);
    }

    setWorkspaceFitPulse(true);
    workspaceFitPulseTimerRef.current = window.setTimeout(() => {
      workspaceFitPulseTimerRef.current = null;
      setWorkspaceFitPulse(false);
    }, 520);
  };

  const clearHighResImageLoadTimer = () => {
    if (highResImageLoadTimerRef.current) {
      window.clearTimeout(highResImageLoadTimerRef.current);
      highResImageLoadTimerRef.current = null;
    }
  };

  const clearAgentBrowserStatePublishTimer = () => {
    if (agentBrowserStatePublishTimerRef.current) {
      window.clearTimeout(agentBrowserStatePublishTimerRef.current);
      agentBrowserStatePublishTimerRef.current = null;
    }
  };

  const clearProjectNoticeTimer = () => {
    if (projectNoticeTimerRef.current) {
      window.clearTimeout(projectNoticeTimerRef.current);
      projectNoticeTimerRef.current = null;
    }
  };

  const showProjectNotice = (message: string) => {
    clearProjectNoticeTimer();
    setProjectNotice(message);
    projectNoticeTimerRef.current = window.setTimeout(() => {
      projectNoticeTimerRef.current = null;
      setProjectNotice(null);
    }, 4200);
  };

  const clearProjectNotice = () => {
    clearProjectNoticeTimer();
    setProjectNotice(null);
  };

  const publishAgentBrowserRuntimeStateForScene = (
    scene: NonNullable<typeof latestSceneRef.current>,
  ) => {
    const project = currentProjectRef.current;
    if (!isAgentBrowserRoute || !project) {
      return;
    }

    const selectionReference = stripSelectionReferenceThumbnails(
      buildSelectionReferenceSummary(scene),
    );
    const state: AgentBrowserRuntimeState = {
      source: "agent-board",
      projectPath: project.projectPath,
      updatedAt: new Date().toISOString(),
      selection: buildAgentSelectionContext(selectionReference),
      scene: {
        selectedElementIds: getRuntimeSelectedElementIds(scene.appState),
        viewport: buildAgentBrowserRuntimeViewport(scene.appState),
      },
      generation: {
        source: generationSource,
      },
    };

    void publishAgentBrowserRuntimeState(state).catch(() => {
      // 浏览器运行态是给 Agent 观察用的临时通道，失败不应阻断画布操作。
    });
  };

  const scheduleAgentBrowserRuntimeStatePublish = (
    scene: NonNullable<typeof latestSceneRef.current> | null,
  ) => {
    if (!isAgentBrowserRoute || !scene) {
      return;
    }

    clearAgentBrowserStatePublishTimer();
    agentBrowserStatePublishTimerRef.current = window.setTimeout(() => {
      agentBrowserStatePublishTimerRef.current = null;
      publishAgentBrowserRuntimeStateForScene(latestSceneRef.current ?? scene);
    }, 120);
  };

  const resetImageRenditionState = () => {
    clearHighResImageLoadTimer();
    loadedPreviewImageFileIdsRef.current = new Set();
    loadingPreviewImageFileIdsRef.current = new Set();
    loadedOriginalImageFileIdsRef.current = new Set();
    loadingOriginalImageFileIdsRef.current = new Set();
    pendingImageFilesToAddRef.current = [];
    setThumbnailMaintenance(null);
  };

  const readProjectImageAssets = async (
    project: DesktopProjectBundle,
    fileIds: string[],
    rendition: ImageAssetRequestRendition,
  ) => {
    if (!fileIds.length) {
      return [];
    }

    return desktopBridge.readProjectAssetPayloads({
      projectPath: project.projectPath,
      fileIds,
      rendition,
    });
  };

  const readOriginalImageAssets = async (
    project: DesktopProjectBundle,
    fileIds: string[],
  ) => readProjectImageAssets(project, fileIds, "original");

  const readInitialVisibleImageRenditionAssets = async (
    project: DesktopProjectBundle,
    scene: {
      elements?: readonly ExcalidrawElement[];
      appState?: Partial<AppState> | null;
    },
  ) => {
    const elements = scene.elements ?? [];
    const appState = scene.appState;
    if (!elements.length || !appState) {
      return [];
    }

    const requests = getImageRenditionRequestsNearViewport({
      elements,
      appState: appState as AppState,
      imageRecords: project.imageRecords,
      loadedPreviewFileIds: new Set(),
      loadingPreviewFileIds: new Set(),
      loadedOriginalFileIds: new Set(),
      loadingOriginalFileIds: new Set(),
      devicePixelRatio: window.devicePixelRatio,
    });
    if (!requests.length) {
      return [];
    }

    const fileIdsByRendition = requests.reduce((groups, request) => {
      const fileIds = groups.get(request.rendition) ?? [];
      fileIds.push(request.fileId);
      groups.set(request.rendition, fileIds);
      return groups;
    }, new Map<ImageAssetRequestRendition, string[]>());

    try {
      const assetsByRendition = await Promise.all(
        Array.from(fileIdsByRendition.entries()).map(
          ([rendition, fileIds]) =>
            readProjectImageAssets(project, fileIds, rendition),
        ),
      );
      return assetsByRendition.flat();
    } catch {
      // 初始原图预取只是为了避免首屏停在缩略图；失败时继续打开项目，后续懒加载还会重试。
      return [];
    }
  };

  const queueImageFilesForReadyCanvas = (filesToAdd: BinaryFileData[]) => {
    const pendingById = new Map(
      pendingImageFilesToAddRef.current.map((file) => [file.id, file]),
    );
    filesToAdd.forEach((file) => pendingById.set(file.id, file));
    pendingImageFilesToAddRef.current = Array.from(pendingById.values());
  };

  const flushQueuedImageFilesToCanvas = () => {
    const api = excalidrawAPIRef.current;
    const filesToAdd = pendingImageFilesToAddRef.current;
    if (!api || !filesToAdd.length) {
      return;
    }

    pendingImageFilesToAddRef.current = [];
    api.replaceFiles(filesToAdd);
  };

  const addProjectAssetPayloadsToCurrentScene = (
    project: DesktopProjectBundle,
    assets: ProjectAssetPayload[],
  ) => {
    const activeProject = currentProjectRef.current;
    if (activeProject?.projectPath !== project.projectPath || !assets.length) {
      return false;
    }

    const files = projectAssetPayloadsToBinaryFiles(
      assets,
      activeProject.imageRecords,
    );
    const filesToAdd = Object.values(files);
    if (!filesToAdd.length) {
      return false;
    }

    if (excalidrawAPIRef.current) {
      excalidrawAPIRef.current.replaceFiles(filesToAdd);
    } else {
      queueImageFilesForReadyCanvas(filesToAdd);
    }
    latestSceneRef.current = latestSceneRef.current
      ? {
          ...latestSceneRef.current,
          files: {
            ...latestSceneRef.current.files,
            ...files,
          },
        }
      : latestSceneRef.current;

    return true;
  };

  const rebuildMissingThumbnailAssets = async (
    project: DesktopProjectBundle,
    fileIds: string[],
  ) => {
    const uniqueFileIds = Array.from(new Set(fileIds));
    const rebuildProjectThumbnails = desktopBridge.rebuildProjectThumbnails;
    if (!uniqueFileIds.length) {
      return;
    }

    if (!rebuildProjectThumbnails) {
      if (currentProjectRef.current?.projectPath === project.projectPath) {
        setThumbnailMaintenance({
          status: "failed",
          total: uniqueFileIds.length,
        });
      }
      return;
    }

    try {
      const result = await rebuildProjectThumbnails({
        projectPath: project.projectPath,
        fileIds: uniqueFileIds,
      });
      if (currentProjectRef.current?.projectPath === project.projectPath) {
        setThumbnailMaintenance(
          result.failedFileIds.length
            ? {
                status: "failed",
                total: result.failedFileIds.length,
              }
            : null,
        );
      }
      const fileIdsToRefresh = Array.from(
        new Set([...result.generatedFileIds, ...result.skippedFileIds]),
      ).filter(
        (fileId) =>
          !loadedPreviewImageFileIdsRef.current.has(fileId) &&
          !loadedOriginalImageFileIdsRef.current.has(fileId),
      );
      if (!fileIdsToRefresh.length) {
        return;
      }

      const assets = await desktopBridge.readProjectAssetPayloads({
        projectPath: project.projectPath,
        fileIds: fileIdsToRefresh,
        rendition: "thumbnail",
        thumbnailMode: "cache-only",
      });
      const thumbnailAssets = assets.filter(
        (asset) =>
          asset.rendition === "thumbnail" &&
          !loadedPreviewImageFileIdsRef.current.has(asset.fileId) &&
          !loadedOriginalImageFileIdsRef.current.has(asset.fileId),
      );
      addProjectAssetPayloadsToCurrentScene(project, thumbnailAssets);
    } catch {
      if (currentProjectRef.current?.projectPath === project.projectPath) {
        setThumbnailMaintenance({
          status: "failed",
          total: uniqueFileIds.length,
        });
      }
      // 缩略图缓存修复是后台维护动作，失败时继续使用占位图或原图懒加载。
    }
  };

  const handleRepairProjectThumbnails = async () => {
    const project = currentProjectRef.current;
    const rebuildProjectThumbnails = desktopBridge.rebuildProjectThumbnails;
    if (!project) {
      setProjectError(copy.projectRepair.noProject);
      clearProjectNotice();
      return;
    }

    const fileIds = Object.keys(project.imageRecords);
    if (!fileIds.length) {
      showProjectNotice(copy.projectRepair.noImages);
      setProjectError(null);
      return;
    }

    if (!rebuildProjectThumbnails) {
      setProjectError(copy.projectRepair.thumbnailsFailed);
      clearProjectNotice();
      return;
    }

    setProjectError(null);
    clearProjectNotice();
    setThumbnailMaintenance({
      status: "pending",
      total: fileIds.length,
    });

    try {
      const result = await rebuildProjectThumbnails({
        projectPath: project.projectPath,
        fileIds,
        force: true,
        createBackup: true,
      });
      if (currentProjectRef.current?.projectPath !== project.projectPath) {
        return;
      }

      const fileIdsToRefresh = result.generatedFileIds.filter(
        (fileId) =>
          !loadedPreviewImageFileIdsRef.current.has(fileId) &&
          !loadedOriginalImageFileIdsRef.current.has(fileId),
      );

      if (fileIdsToRefresh.length) {
        const assets = await desktopBridge.readProjectAssetPayloads({
          projectPath: project.projectPath,
          fileIds: fileIdsToRefresh,
          rendition: "thumbnail",
          thumbnailMode: "cache-only",
        });
        const thumbnailAssets = assets.filter(
          (asset) =>
            asset.rendition === "thumbnail" &&
            !loadedPreviewImageFileIdsRef.current.has(asset.fileId) &&
            !loadedOriginalImageFileIdsRef.current.has(asset.fileId),
        );
        addProjectAssetPayloadsToCurrentScene(project, thumbnailAssets);
      }

      setThumbnailMaintenance(
        result.failedFileIds.length
          ? {
              status: "failed",
              total: result.failedFileIds.length,
            }
          : null,
      );
      showProjectNotice(
        copy.projectRepair.thumbnailsRepaired(
          result.generatedFileIds.length,
          result.skippedFileIds.length,
          result.failedFileIds.length,
          result.backupPath,
        ),
      );
    } catch (error) {
      if (currentProjectRef.current?.projectPath === project.projectPath) {
        setThumbnailMaintenance({
          status: "failed",
          total: fileIds.length,
        });
        setProjectError(
          getErrorText(error, copy.projectRepair.thumbnailsFailed),
        );
        clearProjectNotice();
      }
    }
  };

  const handleInspectProjectHealth = async () => {
    const project = currentProjectRef.current;
    const inspectProjectHealth = desktopBridge.inspectProjectHealth;
    if (!project) {
      setProjectError(copy.projectRepair.noProject);
      clearProjectNotice();
      return;
    }

    if (!inspectProjectHealth) {
      setProjectError(copy.projectRepair.healthCheckFailed);
      clearProjectNotice();
      return;
    }

    setProjectError(null);
    clearProjectNotice();
    setThumbnailMaintenance({
      status: "pending",
      total: Object.keys(project.imageRecords).length,
      message: copy.projectRepair.healthChecking,
    });

    try {
      const report = await inspectProjectHealth({
        projectPath: project.projectPath,
      });
      if (currentProjectRef.current?.projectPath !== project.projectPath) {
        return;
      }

      setThumbnailMaintenance(null);
      showProjectNotice(
        report.summary.errorCount || report.summary.warningCount
          ? copy.projectRepair.healthNeedsRepair(
              report.summary.errorCount,
              report.summary.warningCount,
              report.summary.repairableCount,
            )
          : copy.projectRepair.healthHealthy(report.imageRecordCount),
      );
    } catch (error) {
      if (currentProjectRef.current?.projectPath === project.projectPath) {
        setThumbnailMaintenance(null);
        setProjectError(
          getErrorText(error, copy.projectRepair.healthCheckFailed),
        );
        clearProjectNotice();
      }
    }
  };

  const handleCleanProjectCache = async () => {
    const project = currentProjectRef.current;
    const cleanProjectCache = desktopBridge.cleanProjectCache;
    if (!project) {
      setProjectError(copy.projectRepair.noProject);
      clearProjectNotice();
      return;
    }

    if (!cleanProjectCache) {
      setProjectError(copy.projectRepair.cacheCleanFailed);
      clearProjectNotice();
      return;
    }

    setProjectError(null);
    clearProjectNotice();

    try {
      const result = await cleanProjectCache({
        projectPath: project.projectPath,
      });
      if (currentProjectRef.current?.projectPath !== project.projectPath) {
        return;
      }
      showProjectNotice(
        copy.projectRepair.cacheCleaned(
          result.removedFileCount,
          result.removedBytes,
        ),
      );
    } catch (error) {
      if (currentProjectRef.current?.projectPath === project.projectPath) {
        setProjectError(getErrorText(error, copy.projectRepair.cacheCleanFailed));
        clearProjectNotice();
      }
    }
  };

  const markImageAssetRenditionsLoaded = (assets: ProjectAssetPayload[]) => {
    assets.forEach((asset) => {
      if (asset.rendition === "original") {
        loadedOriginalImageFileIdsRef.current.add(asset.fileId);
        loadedPreviewImageFileIdsRef.current.add(asset.fileId);
      } else if (asset.rendition === "preview") {
        loadedPreviewImageFileIdsRef.current.add(asset.fileId);
      }
    });
  };

  const loadVisibleImageRenditionAssets = async (
    scene: NonNullable<typeof latestSceneRef.current>,
  ) => {
    const project = currentProjectRef.current;
    const api = excalidrawAPIRef.current;
    if (!project || !api || project.safeMode) {
      return;
    }

    const requests = getImageRenditionRequestsNearViewport({
      elements: scene.elements,
      appState: scene.appState,
      imageRecords: project.imageRecords,
      loadedPreviewFileIds: loadedPreviewImageFileIdsRef.current,
      loadingPreviewFileIds: loadingPreviewImageFileIdsRef.current,
      loadedOriginalFileIds: loadedOriginalImageFileIdsRef.current,
      loadingOriginalFileIds: loadingOriginalImageFileIdsRef.current,
      devicePixelRatio: window.devicePixelRatio,
    });

    if (!requests.length) {
      return;
    }

    const fileIdsByRendition = requests.reduce((groups, request) => {
      const fileIds = groups.get(request.rendition) ?? [];
      fileIds.push(request.fileId);
      groups.set(request.rendition, fileIds);
      return groups;
    }, new Map<ImageAssetRequestRendition, string[]>());

    requests.forEach((request) => {
      if (request.rendition === "original") {
        loadingOriginalImageFileIdsRef.current.add(request.fileId);
      } else if (request.rendition === "preview") {
        loadingPreviewImageFileIdsRef.current.add(request.fileId);
      }
    });

    try {
      const assetsByRendition = await Promise.all(
        Array.from(fileIdsByRendition.entries()).map(
          ([rendition, fileIds]) =>
            readProjectImageAssets(project, fileIds, rendition),
        ),
      );
      const assets = assetsByRendition.flat();
      if (!addProjectAssetPayloadsToCurrentScene(project, assets)) {
        return;
      }
      markImageAssetRenditionsLoaded(assets);
    } catch {
      // 显示资源升级是渐进增强，失败时保留当前缩略图继续使用画布。
    } finally {
      requests.forEach((request) => {
        loadingPreviewImageFileIdsRef.current.delete(request.fileId);
        loadingOriginalImageFileIdsRef.current.delete(request.fileId);
      });
    }
  };

  const scheduleVisibleImageRenditionLoad = (
    scene: NonNullable<typeof latestSceneRef.current> | null,
  ) => {
    if (!scene) {
      return;
    }

    clearHighResImageLoadTimer();
    highResImageLoadTimerRef.current = window.setTimeout(() => {
      highResImageLoadTimerRef.current = null;
      void loadVisibleImageRenditionAssets(scene);
    }, IMAGE_HIGH_RES_LOAD_DEBOUNCE_MS);
  };

  const handleViewportChange = (
    scrollX: number,
    scrollY: number,
    zoom: AppState["zoom"],
  ) => {
    const scene = latestSceneRef.current;
    if (!scene) {
      return;
    }

    const api = excalidrawAPIRef.current;
    const apiAppState = api?.getAppState?.();
    const elements = api?.getSceneElementsIncludingDeleted?.() ?? scene.elements;
    const files = api?.getFiles?.() ?? scene.files;
    const nextAppState = {
      ...scene.appState,
      ...(apiAppState ?? {}),
      scrollX,
      scrollY,
      zoom,
    } as AppState;
    const nextScene = {
      elements,
      appState: nextAppState,
      files,
    };
    latestSceneRef.current = nextScene;
    scheduleVisibleImageRenditionLoad(nextScene);
    scheduleAgentBrowserRuntimeStatePublish(nextScene);
    updateWorkspaceOverlay(elements, nextAppState);
  };

  const buildSceneWithOriginalImageFiles = async (
    scene: typeof latestSceneRef.current,
  ) => {
    const project = currentProjectRef.current;
    if (!scene || !project) {
      return scene;
    }

    const selectedImageFileIds = Array.from(
      new Set(
        getSelectedReferenceElements(scene).flatMap((element) =>
          element.type === "image" && element.fileId ? [element.fileId] : [],
        ),
      ),
    );

    if (!selectedImageFileIds.length) {
      return scene;
    }

    const assets = await readOriginalImageAssets(project, selectedImageFileIds);
    if (!assets.length) {
      return scene;
    }

    return {
      ...scene,
      files: {
        ...scene.files,
        ...projectAssetPayloadsToBinaryFiles(assets, project.imageRecords),
      },
    };
  };

  const maybeSnapWorkspaceZoom = (
    elements: readonly ExcalidrawElement[],
    appState: AppState,
  ) => {
    if (!ENABLE_WORKSPACE_BOUNDS) {
      return false;
    }

    const api = excalidrawAPIRef.current;
    if (!api) {
      return false;
    }

    const bounds = getWorkspaceBounds(elements, {
      viewportCenter: getViewportCenterFromAppState(appState),
    });
    const fitZoomValue = getWorkspaceFitZoom(bounds, appState);
    const currentZoomValue = getFiniteNumber(appState.zoom?.value, 1);
    const gate = resolveWorkspaceZoomGate({
      previousZoomValue: previousWorkspaceZoomValueRef.current,
      currentZoomValue,
      fitZoomValue,
      gateState: workspaceZoomGateStateRef.current,
    });

    workspaceZoomGateStateRef.current = gate.nextGateState;

    if (!gate.shouldSnap || !fitZoomValue) {
      previousWorkspaceZoomValueRef.current = currentZoomValue;
      return false;
    }

    previousWorkspaceZoomValueRef.current = fitZoomValue;
    triggerWorkspaceFitPulse();
    api.updateScene({
      appState: getViewportCenteredZoomState(appState, fitZoomValue),
      captureUpdate: CaptureUpdateAction.NEVER,
    });
    return true;
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

  const loadAppInfoState = async () => {
    if (!bridge?.loadAppInfo) {
      return;
    }

    try {
      setAppInfo(await bridge.loadAppInfo());
    } catch {
      setAppInfo(null);
    }
  };

  const syncAcpAgentDraftFromSettings = (settings: AcpAgentSettings) => {
    const agent = getSelectedAcpAgent(settings) ?? settings.agents[0] ?? null;
    const presetId = inferAcpAgentPresetId(agent);
    const preset = getAcpAgentPreset(presetId);
    setAcpAgentEnabledDraft(settings.enabled);
    setAcpAgentPresetDraft(presetId);
    setAcpAgentCommandDraft(agent?.command ?? preset?.command ?? "");
    setAcpAgentArgsDraft(formatAcpAgentArgs(agent?.args ?? preset?.args ?? []));
    setAcpAgentCwdDraft(agent?.cwd ?? preset?.cwd ?? "");
  };

  const loadAcpAgentSettingsState = async () => {
    if (!bridge?.loadAcpAgentSettings) {
      const defaultSettings = getDefaultAcpAgentSettings();
      setAcpAgentSettings(defaultSettings);
      syncAcpAgentDraftFromSettings(defaultSettings);
      return;
    }

    try {
      const nextSettings = await bridge.loadAcpAgentSettings();
      setAcpAgentSettings(nextSettings);
      syncAcpAgentDraftFromSettings(nextSettings);
    } catch {
      const defaultSettings = getDefaultAcpAgentSettings();
      setAcpAgentSettings(defaultSettings);
      syncAcpAgentDraftFromSettings(defaultSettings);
    }
  };

  const createUnavailableAgentBridgeStatus = (): DesktopAgentBridgeStatus => ({
    enabled: false,
    ready: false,
    currentProject: null,
    boardUrl: isAgentBrowserRoute ? window.location.href : null,
  });

  const readAgentBridgeStatus = async () => {
    if (!bridge?.getAgentBridgeStatus) {
      return null;
    }

    try {
      return await bridge.getAgentBridgeStatus();
    } catch {
      return createUnavailableAgentBridgeStatus();
    }
  };

  const loadAgentBridgeStatus = async () => {
    if (!bridge?.getAgentBridgeStatus) {
      setAgentBridgeStatus(null);
      return null;
    }

    notifyDesktopProjectState(currentProjectRef.current);
    const nextStatus = await readAgentBridgeStatus();
    setAgentBridgeStatus(nextStatus);
    return nextStatus;
  };

  const refreshAgentBrowserConnectionState = async () => {
    const nextStatus = await loadAgentBridgeStatus();
    if (isAgentBrowserRoute && nextStatus?.ready) {
      if (
        nextStatus.currentProject &&
        currentProjectRef.current?.projectPath !==
          nextStatus.currentProject.projectPath
      ) {
        setAgentBrowserAutoOpenProjectPath(null);
      }
      void loadAppInfoState();
      void loadProviderState();
      void loadPromptLibraryState();
      await loadRecentProjectsState();
    }
    return nextStatus;
  };

  const loadPromptLibraryState = async () => {
    if (!bridge) {
      return;
    }

    try {
      setSavedPrompts(await bridge.loadPromptLibrary());
    } catch {
      setSavedPrompts([]);
    }
  };

  const loadDesktopStartupState = () => {
    void loadAppInfoState();
    void loadProviderState();
    void loadAcpAgentSettingsState();
    void loadRecentProjectsState();
    void loadPromptLibraryState();
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
    fallbackMessage: string = copy.startup.generateFailed,
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
    if (!isAgentBrowserRoute) {
      loadDesktopStartupState();
    }
    let cancelled = false;
    let retryTimer: number | null = null;
    let attempts = 0;
    const refreshAgentBridgeStatus = async () => {
      if (!bridge?.getAgentBridgeStatus) {
        setAgentBridgeStatus(null);
        return;
      }

      attempts += 1;
      notifyDesktopProjectState(currentProjectRef.current);
      const nextStatus = await readAgentBridgeStatus();
      if (cancelled) {
        return;
      }

      setAgentBridgeStatus(nextStatus);
      if (isAgentBrowserRoute && nextStatus?.ready) {
        loadDesktopStartupState();
      }
      if (!nextStatus?.boardUrl && attempts < 20) {
        retryTimer = window.setTimeout(refreshAgentBridgeStatus, 500);
      }
    };

    void refreshAgentBridgeStatus();
    return () => {
      cancelled = true;
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
      }
    };
  }, [bridge]);

  useEffect(() => {
    if (!currentProject) {
      return;
    }

    setAgentBridgeStatus((status) =>
      status
        ? {
            ...status,
            currentProject: getDesktopCurrentProject(currentProject),
          }
        : status,
    );
  }, [currentProject?.project.name, currentProject?.projectPath]);

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

  useEffect(
    () => () => {
      if (workspaceFitPulseTimerRef.current) {
        window.clearTimeout(workspaceFitPulseTimerRef.current);
      }
      clearProjectNoticeTimer();
      clearHighResImageLoadTimer();
      clearAgentBrowserStatePublishTimer();
    },
    [],
  );

  useEffect(() => {
    if (!bridge?.onFlushAutosaveRequest) {
      return;
    }

    return bridge.onFlushAutosaveRequest(() =>
      flushPendingAutosave({ strict: true }),
    );
  }, [bridge]);

  useEffect(() => {
    if (!bridge?.onAcpAgentTaskEvent) {
      return;
    }

    return bridge.onAcpAgentTaskEvent((event: AcpTaskEvent) => {
      if (
        activeAcpTaskIdRef.current &&
        event.taskId !== activeAcpTaskIdRef.current
      ) {
        return;
      }

      if (event.type === "status") {
        setAcpAgentTask((current) => ({
          taskId: event.taskId,
          status: event.status,
          message: event.message,
          transcript: current?.taskId === event.taskId ? current.transcript : "",
        }));
        if (["completed", "failed", "cancelled"].includes(event.status)) {
          activeAcpTaskIdRef.current = null;
        }
        return;
      }

      if (event.type === "agent-message") {
        setAcpAgentTask((current) => ({
          taskId: event.taskId,
          status: current?.taskId === event.taskId ? current.status : "running",
          message:
            current?.taskId === event.taskId
              ? current.message
              : "Agent 正在处理",
          transcript: `${current?.taskId === event.taskId ? current.transcript : ""}${
            event.text
          }`.trim(),
        }));
        return;
      }

      if (event.type === "tool") {
        setAcpAgentTask((current) => ({
          taskId: event.taskId,
          status: current?.taskId === event.taskId ? current.status : "running",
          message: event.title,
          transcript: current?.taskId === event.taskId ? current.transcript : "",
        }));
        return;
      }

      if (event.type === "error") {
        setAcpAgentTask((current) => ({
          taskId: event.taskId,
          status: "failed",
          message: event.message,
          transcript: current?.taskId === event.taskId ? current.transcript : "",
        }));
      }
    });
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
    clearProjectNotice();
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
      const fileIds = collectAgentImageFileIds(restored.elements || []);
      const thumbnailAssets = bundle.safeMode
        ? []
        : await desktopBridge.readProjectAssetPayloads({
            projectPath: bundle.projectPath,
            fileIds,
            rendition: "thumbnail",
            thumbnailMode: "cache-only",
          });
      const visibleRenditionAssets = bundle.safeMode
        ? []
        : await readInitialVisibleImageRenditionAssets(bundle, {
            elements: restored.elements ?? undefined,
            appState: restored.appState as AppState,
          });
      if (!isCurrentProjectOpen(sequence)) {
        return;
      }

      const assets = [...thumbnailAssets, ...visibleRenditionAssets];
      const files = projectAssetPayloadsToBinaryFiles(
        assets,
        bundle.imageRecords,
      );
      const missingThumbnailFileIds = Array.from(
        new Set(
          thumbnailAssets
            .filter((asset) => asset.rendition === "placeholder")
            .map((asset) => asset.fileId),
        ),
      );
      resetImageRenditionState();
      if (missingThumbnailFileIds.length) {
        setThumbnailMaintenance({
          status: "pending",
          total: missingThumbnailFileIds.length,
        });
      }
      markImageAssetRenditionsLoaded(assets);
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
      scheduleVisibleImageRenditionLoad(latestSceneRef.current);
      if (bundle.safeMode) {
        showProjectNotice(copy.projectRepair.safeModeOpened);
      } else {
        void rebuildMissingThumbnailAssets(bundle, missingThumbnailFileIds);
      }
      updateWorkspaceOverlay(
        restored.elements || [],
        restored.appState as AppState,
      );
      resetWorkspaceZoomGate();
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

  useEffect(() => {
    const agentBrowserTargetProjectPath =
      agentBridgeStatus?.currentProject?.projectPath ?? null;
    if (
      !isAgentBrowserRoute ||
      !agentBrowserInitialProjectToken ||
      loadingProject ||
      !agentBrowserTargetProjectPath ||
      currentProject?.projectPath === agentBrowserTargetProjectPath ||
      agentBrowserAutoOpenProjectPath === agentBrowserTargetProjectPath
    ) {
      return;
    }

    setAgentBrowserAutoOpenProjectPath(agentBrowserTargetProjectPath);
    void handleOpenRecentProject(agentBrowserTargetProjectPath);
  }, [
    agentBrowserAutoOpenProjectPath,
    agentBrowserInitialProjectToken,
    agentBridgeStatus?.currentProject?.projectPath,
    currentProject?.projectPath,
    isAgentBrowserRoute,
    loadingProject,
  ]);

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

  const clearProjectViewState = () => {
    beginProjectOpen();
    excalidrawAPIRef.current = null;
    latestSceneRef.current = null;
    updateCurrentProject(null);
    setInitialData(null);
    setWorkspaceOverlayState(null);
    resetWorkspaceZoomGate();
    updateEditorInitializing(false);
    setSelectedRecord(null);
    setSelectedTask(null);
    lastCanvasPointerRef.current = null;
    lastBatchBoundsRef.current = null;
    pendingGenerationJobsRef.current.clear();
    generationTaskByElementIdRef.current.clear();
    setPendingGenerationCount(0);
    resetImageRenditionState();
  };

  const handleResetProjectView = () => {
    clearProjectViewState();
  };

  const handleSwitchProject = async () => {
    setProjectError(null);
    clearProjectNotice();
    try {
      await flushPendingAutosave({ strict: true });
    } catch (error) {
      setProjectError(
        `${copy.startup.saveBeforeOpenFailed} ${getErrorText(
          error,
          copy.startup.saveProjectFailed,
        )}`,
      );
      return;
    }

    clearProjectViewState();
    void loadRecentProjectsState();
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

  const assertExpectedAgentProjectActive = (expectedProjectPath?: string) => {
    if (
      expectedProjectPath &&
      currentProjectRef.current?.projectPath !== expectedProjectPath
    ) {
      throw createAgentProjectMismatchError();
    }
  };

  const insertAssetsIntoScene = async (
    assets: PersistedImageAssetInput[],
    nextImageRecords: DesktopProjectBundle["imageRecords"],
    options: {
      anchorPoint?: { x: number; y: number } | null;
      expectedProjectPath?: string;
      placementViewport?: PlacementViewportContext | null;
      requireReady?: boolean;
    } = {},
  ) => {
    assertExpectedAgentProjectActive(options.expectedProjectPath);
    const api = excalidrawAPIRef.current;
    const project = currentProjectRef.current;
    if (!api || !project) {
      if (options.requireReady) {
        throw new Error("CoreStudio 画板还没有准备好。");
      }
      return;
    }

    const appState = api.getAppState();
    const elements = api.getSceneElementsIncludingDeleted();
    const placementViewport = options.placementViewport ?? null;
    const viewportCenter =
      placementViewport?.viewportCenter ??
      getViewportCenterFromAppState(appState);
    const workspaceBounds = placementViewport
      ? ENABLE_WORKSPACE_BOUNDS
        ? getWorkspaceBounds(elements, { viewportCenter })
        : null
      : updateWorkspaceOverlay(elements, appState);
    const anchorPoint = options.anchorPoint ?? null;
    const placements = placeGeneratedImages({
      images: assets.map((asset) => ({
        width: asset.width,
        height: asset.height,
      })),
      anchorPoint,
      viewportCenter,
      viewportSize: placementViewport?.viewportSize ?? {
        width: appState.width,
        height: appState.height,
      },
      zoomValue: placementViewport?.zoomValue ?? appState.zoom.value,
      previousBatchBounds: anchorPoint ? null : lastBatchBoundsRef.current,
      workspaceBounds,
    });

    const filesToAdd: BinaryFileData[] = assets.map((asset) => ({
      id: asset.fileId as FileId,
      mimeType: asset.mimeType as BinaryFileData["mimeType"],
      dataURL: `data:${asset.mimeType};base64,${asset.dataBase64}` as BinaryFileData["dataURL"],
      created: Date.parse(asset.createdAt) || Date.now(),
    }));

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

    assertExpectedAgentProjectActive(options.expectedProjectPath);
    const activeApi = excalidrawAPIRef.current;
    const activeProject = currentProjectRef.current;
    if (!activeApi || !activeProject) {
      if (options.requireReady) {
        throw new Error("CoreStudio 画板还没有准备好。");
      }
      return;
    }

    activeApi.addFiles(filesToAdd);
    activeApi.updateScene({
      elements: appendElementsWithSyncedIndices(
        activeApi.getSceneElementsIncludingDeleted(),
        newElements,
      ),
      appState: {
        selectedElementIds,
      },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });

    lastBatchBoundsRef.current = measureBatchBounds(placements);
    updateCurrentProject({
      ...activeProject,
      imageRecords: nextImageRecords,
    });
  };

  const insertGenerationPlaceholders = (
    request: GenerationRequest,
    startedAt: string,
    options: {
      expectedProjectPath?: string;
      placementViewport?: PlacementViewportContext | null;
      referenceScene?: AppSceneSnapshot | null;
      requireReady?: boolean;
    } = {},
  ) => {
    assertExpectedAgentProjectActive(options.expectedProjectPath);
    const api = excalidrawAPIRef.current;
    const project = currentProjectRef.current;
    if (!api || !project) {
      if (options.requireReady) {
        throw new Error("CoreStudio 画板还没有准备好。");
      }
      return null;
    }

    const appState = api.getAppState();
    const elements = api.getSceneElementsIncludingDeleted();
    const placementViewport = options.placementViewport ?? null;
    const viewportCenter =
      placementViewport?.viewportCenter ??
      getViewportCenterFromAppState(appState);
    const workspaceBounds = placementViewport
      ? ENABLE_WORKSPACE_BOUNDS
        ? getWorkspaceBounds(elements, { viewportCenter })
        : null
      : updateWorkspaceOverlay(elements, appState);
    const anchorBounds = getGenerationAnchorBounds(
      request,
      options.referenceScene ?? latestSceneRef.current,
    );
    const occupiedBounds = getSceneOccupiedBounds(elements);
    const placements = placeGeneratedImages({
      images: Array.from({ length: request.imageCount }, () => ({
        width: request.width,
        height: request.height,
      })),
      anchorBounds,
      anchorPoint: anchorBounds ? null : lastCanvasPointerRef.current,
      occupiedBounds,
      viewportCenter,
      viewportSize: placementViewport?.viewportSize ?? {
        width: appState.width,
        height: appState.height,
      },
      zoomValue: placementViewport?.zoomValue ?? appState.zoom.value,
      workspaceBounds,
      previousBatchBounds:
        anchorBounds || lastCanvasPointerRef.current
          ? null
          : lastBatchBoundsRef.current,
    });

    const slots: PendingGenerationSlot[] = [];
    const placeholderFrames: ExcalidrawElement[] = [];
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

      placeholderFrames.push(frame);
      slots.push({
        frameId: frame.id,
        labelId: label.id,
        fitReturnedImageSize: isAutoAspectRatioRequest(request),
      });

      return [frame, label];
    });

    assertExpectedAgentProjectActive(options.expectedProjectPath);
    const activeApi = excalidrawAPIRef.current;
    const activeProject = currentProjectRef.current;
    if (!activeApi || !activeProject) {
      if (options.requireReady) {
        throw new Error("CoreStudio 画板还没有准备好。");
      }
      return null;
    }

    const promptHistoryText = getPromptHistoryText(request);
    for (const slot of slots) {
      const task: GenerationTaskRecord = {
        status: "pending",
        provider: request.provider,
        model: request.model,
        prompt: promptHistoryText,
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

    activeApi.updateScene({
      elements: appendElementsWithSyncedIndices(
        activeApi.getSceneElementsIncludingDeleted(),
        placeholderElements,
      ),
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });

    if (placeholderFrames.length > 0) {
      activeApi.scrollToContent(placeholderFrames, {
        animate: true,
        fitToContent: true,
      });
    }

    lastBatchBoundsRef.current = measureBatchBounds(placements);

    return {
      jobId: crypto.randomUUID(),
      projectPath: activeProject.projectPath,
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

    const promptHistoryText = getPromptHistoryText(request);
    const promptReferences = buildImagePromptReferenceRecords(request);
    const files: PersistedImageAssetInput[] = response.images.map((image) => ({
      ...image,
      fileId: crypto.randomUUID(),
      sourceType: "generated",
      provider: response.provider,
      model: response.model,
      prompt: promptHistoryText,
      negativePrompt: request.negativePrompt,
      seed: response.seed,
      createdAt: response.createdAt,
      parentFileId: request.reference?.debug?.fileId ?? null,
      ...(promptReferences.length ? { promptReferences } : {}),
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

  const handleStartAcpAgentGeneration = async (request: GenerationRequest) => {
    const project = currentProjectRef.current;
    if (!project) {
      return;
    }

    if (!bridge?.startAcpAgentTask) {
      throw new Error("当前环境不能直接发起 ACP Agent 任务。");
    }
    if (!acpAgentGenerationReady || !selectedAcpAgent) {
      throw new Error("请先开启 Agent 调用，并在应用设置里配置 ACP Agent。");
    }

    const taskRequest = buildAcpTaskRequest({
      request,
      project,
      status: agentBridgeStatus,
      agentId: selectedAcpAgent.id,
    });

    activeAcpTaskIdRef.current = taskRequest.taskId;
    setAcpAgentTask({
      taskId: taskRequest.taskId,
      status: "connecting",
      message: "正在连接 ACP Agent",
      transcript: "",
    });

    await bridge.startAcpAgentTask(taskRequest);
    setGenerateRequest((current) => ({
      ...current,
      prompt: "",
      promptParts: [],
      promptReferences: [],
    }));
  };

  const handleGenerateImages = async (
    request: GenerationRequest,
    _keepOpen: boolean,
    options: {
      expectedProjectPath?: string;
      placementViewport?: PlacementViewportContext | null;
      referenceScene?: AppSceneSnapshot | null;
      rejectOnError?: boolean;
    } = {},
  ) => {
    const project = currentProjectRef.current;
    if (!project) {
      return;
    }
    assertExpectedAgentProjectActive(options.expectedProjectPath);

    clearGenerationErrorState();
    if (request.generationSource === "agent") {
      try {
        await handleStartAcpAgentGeneration(request);
      } catch (error) {
        showGenerationError(request, error, "ACP Agent 任务启动失败。");
        if (options.rejectOnError) {
          throw error;
        }
      }
      return;
    }

    try {
      const requestCustomModels =
        providerSettings?.[request.provider]?.customModels ?? [];
      const normalizedRequest = normalizeGenerationRequest(request, {
        customModels: requestCustomModels,
      });
      let preparedRequest = normalizedRequest;
      if (normalizedRequest.reference?.enabled) {
        const sceneWithOriginalImageFiles =
          await buildSceneWithOriginalImageFiles(
            options.referenceScene ?? latestSceneRef.current,
          );
        assertExpectedAgentProjectActive(options.expectedProjectPath);
        const reference = await buildSelectionReference({
          scene: sceneWithOriginalImageFiles,
          includeImage: true,
          imageRecords: project.imageRecords,
        });
        assertExpectedAgentProjectActive(options.expectedProjectPath);
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
      const pendingJob = insertGenerationPlaceholders(
        preparedRequest,
        startedAt,
        {
          expectedProjectPath: options.expectedProjectPath,
          placementViewport: options.placementViewport,
          referenceScene: options.referenceScene,
          requireReady: Boolean(options.expectedProjectPath),
        },
      );
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
      if (options.rejectOnError) {
        throw error;
      }
    }
  };

  const handleAgentDesktopBridgeRequest = async (payload: unknown) => {
    if (
      !isObjectPayload(payload) ||
      !isAgentDesktopBridgeMethod(payload.method)
    ) {
      throw createAgentBadRequestError("desktop.bridge method 不受支持。");
    }

    const args = payload.args;
    if (args !== undefined && !Array.isArray(args)) {
      throw createAgentBadRequestError("desktop.bridge args 必须是数组。");
    }

    if (payload.method === "openRecentProject") {
      const [projectPath] = args ?? [];
      const project = currentProjectRef.current;
      if (
        typeof projectPath === "string" &&
        project?.projectPath === projectPath
      ) {
        const scene = latestSceneRef.current;
        return {
          ...project,
          sceneJson: scene
            ? serializeSceneForProject({
                elements: scene.elements,
                appState: scene.appState,
              })
            : project.sceneJson,
        };
      }
    }

    const bridgeMethod = desktopBridge[payload.method];
    if (typeof bridgeMethod !== "function") {
      throw createAgentBadRequestError("desktop.bridge method 不可用。");
    }

    return (bridgeMethod as (...methodArgs: unknown[]) => unknown)(
      ...(args ?? []),
    );
  };

  useEffect(() => {
    if (!bridge?.onAgentCommandRequest) {
      return;
    }

    return bridge.onAgentCommandRequest(async (request) => {
      if (request.command === "desktop.bridge") {
        return handleAgentDesktopBridgeRequest(request.payload);
      }

      if (request.command === "task.complete") {
        return { completed: true };
      }

      const project = currentProjectRef.current;
      if (!project) {
        throw Object.assign(new Error("当前没有打开 CoreStudio 项目。"), {
          code: "PROJECT_REQUIRED" as const,
        });
      }

      switch (request.command) {
        case "agent.context": {
          const scene = latestSceneRef.current;
          const selectionReference = buildSelectionReferenceSummary(scene);
          const projectContext = buildAgentProjectContext(
            project,
            providerSettings,
            {
              generationSource,
            },
          );
          return {
            ...projectContext,
            scene: buildAgentSceneSnapshot(scene, project.imageRecords),
            selection: buildAgentSelectionContext(selectionReference),
            providers: projectContext.providers,
          };
        }
        case "project.current":
          return {
            projectPath: project.projectPath,
            name: project.project.name,
            updatedAt: project.project.updatedAt,
          };
        case "scene.board": {
          const scene = latestSceneRef.current;
          const fileIds = collectAgentImageFileIds(scene?.elements ?? []);
          const assetPayloads = await readProjectImageAssets(
            project,
            fileIds,
            "preview",
          );
          return buildAgentSceneBoard({
            project,
            scene,
            imageRecords: project.imageRecords,
            assetPayloads,
            updatedAt: new Date().toISOString(),
          });
        }
        case "scene.snapshot": {
          const scene = latestSceneRef.current;
          const sceneJson = scene
            ? serializeSceneForProject({
                elements: scene.elements,
                appState: scene.appState,
              })
            : undefined;
          return buildAgentSceneSnapshot(
            scene,
            project.imageRecords,
            sceneJson,
          );
        }
        case "scene.selection":
          return buildAgentSelectionContext(
            buildSelectionReferenceSummary(latestSceneRef.current),
          );
        case "scene.imagePaths": {
          const payload = parseAgentImagePathPayload(request.payload);
          return buildAgentImagePathList({
            projectPath: project.projectPath,
            scene: latestSceneRef.current,
            imageRecords: project.imageRecords,
            ...payload,
          });
        }
        case "scene.addImage": {
          assertAgentProjectPath(request.payload, project.projectPath);
          if (!excalidrawAPIRef.current) {
            throw new Error("CoreStudio 画板还没有准备好。");
          }
          const agentBoardContext = parseAgentBoardCommandContext(
            request.payload,
          );
          const files = getAgentImageAssetsFromPayload(request.payload);
          const nextImageRecords = await desktopBridge.persistImageAssets({
            projectPath: project.projectPath,
            files,
          });
          await insertAssetsIntoScene(files, nextImageRecords, {
            expectedProjectPath: project.projectPath,
            placementViewport:
              getPlacementViewportFromAgentBoardContext(agentBoardContext),
            requireReady: true,
          });
          return {
            inserted: true,
            fileIds: files.map((file) => file.fileId),
          };
        }
        case "scene.addPrompt": {
          assertAgentProjectPath(request.payload, project.projectPath);
          if (
            !isObjectPayload(request.payload) ||
            typeof request.payload.text !== "string" ||
            !request.payload.text.trim()
          ) {
            throw createAgentBadRequestError("scene.addPrompt 需要非空 text。");
          }

          const api = excalidrawAPIRef.current;
          if (!api) {
            throw new Error("CoreStudio 画板还没有准备好。");
          }

          const agentBoardContext = parseAgentBoardCommandContext(
            request.payload,
          );
          const placementViewport =
            getPlacementViewportFromAgentBoardContext(agentBoardContext);
          const appState = api.getAppState();
          const anchorPoint = parseAgentAnchorPoint(
            request.payload.anchorPoint,
          );
          const element = createAgentPromptTextElement({
            text: request.payload.text,
            anchorPoint,
            viewportCenter:
              placementViewport?.viewportCenter ??
              getViewportCenterFromAppState(appState),
          });

          api.updateScene({
            elements: appendElementsWithSyncedIndices(
              api.getSceneElementsIncludingDeleted(),
              [element],
            ),
            appState: {
              selectedElementIds: {
                [element.id]: true,
              },
              selectedGroupIds: {},
            },
            captureUpdate: CaptureUpdateAction.IMMEDIATELY,
          });

          return {
            inserted: true,
            elementIds: [element.id],
          };
        }
        case "generate": {
          assertAgentProjectPath(request.payload, project.projectPath);
          if (
            !isObjectPayload(request.payload) ||
            typeof request.payload.prompt !== "string" ||
            !request.payload.prompt.trim()
          ) {
            throw createAgentBadRequestError("generate 需要非空 prompt。");
          }

          const agentBoardContext = parseAgentBoardCommandContext(
            request.payload,
          );
          const agentBoardSelectionScene = buildSceneWithSelectedElementIds(
            latestSceneRef.current,
            getAgentBoardSelectedElementIds(agentBoardContext),
          );
          const referenceScene =
            agentBoardSelectionScene ?? latestSceneRef.current;
          if (
            request.payload.useSelection === true &&
            !buildSelectionReferenceSummary(referenceScene)
          ) {
            throw createAgentBadRequestError(
              "当前没有可用的选区参考，请先选中元素后再试。",
            );
          }

          const generationRequest = createAgentGenerationRequest({
            baseRequest: generateRequest,
            prompt: request.payload.prompt,
            useSelection: request.payload.useSelection === true,
            providerSettings,
          });
          await handleGenerateImages({
            ...generationRequest,
            generationSource: "builtin",
          }, false, {
            expectedProjectPath: project.projectPath,
            placementViewport:
              getPlacementViewportFromAgentBoardContext(agentBoardContext),
            referenceScene:
              request.payload.useSelection === true ? referenceScene : null,
            rejectOnError: true,
          });
          return { accepted: true };
        }
        default:
          throw new Error(`不支持的 Agent command: ${request.command}`);
      }
    });
  }, [
    bridge,
    desktopBridge,
    generateRequest,
    generationSource,
    handleGenerateImages,
    insertAssetsIntoScene,
    providerSettings,
  ]);

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

  const handleCommitGenerateReference = () =>
    buildSceneWithOriginalImageFiles(latestSceneRef.current).then((scene) =>
      buildSelectionReference({
        scene,
        includeImage: true,
        imageRecords: currentProjectRef.current?.imageRecords || null,
      }),
    );

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

  const handleAcpAgentPresetDraftChange = (presetId: AcpAgentPresetId) => {
    setAcpAgentPresetDraft(presetId);
    const preset = getAcpAgentPreset(presetId);
    if (!preset) {
      return;
    }
    setAcpAgentCommandDraft(preset.command);
    setAcpAgentArgsDraft(formatAcpAgentArgs(preset.args));
    setAcpAgentCwdDraft(preset.cwd ?? "");
  };

  const handleSaveAcpAgentSettings = async () => {
    if (!bridge?.saveAcpAgentSettings) {
      setProjectError("当前环境不能保存 ACP Agent 设置。");
      return;
    }

    const command = acpAgentCommandDraft.trim();
    const preset = getAcpAgentPreset(acpAgentPresetDraft);
    const nextSettings: AcpAgentSettings = {
      enabled: Boolean(acpAgentEnabledDraft && command),
      defaultAgentId: command ? "default" : null,
      agents: command
        ? [
            {
              id: "default",
              ...(preset ? { presetId: preset.id } : {}),
              name: getAcpAgentDraftName(acpAgentPresetDraft),
              command,
              args: parseAcpAgentArgs(acpAgentArgsDraft),
              cwd: acpAgentCwdDraft.trim() || null,
            },
          ]
        : [],
    };

    setSavingAcpAgentSettings(true);
    try {
      const savedSettings = await bridge.saveAcpAgentSettings(nextSettings);
      setAcpAgentSettings(savedSettings);
      syncAcpAgentDraftFromSettings(savedSettings);
    } catch (error) {
      setProjectError(getErrorText(error, "ACP Agent 设置保存失败。"));
    } finally {
      setSavingAcpAgentSettings(false);
    }
  };

  const handleSavePrompt = async (input: SavePromptInput) => {
    setSavedPrompts(await desktopBridge.savePrompt(input));
  };

  const handleUsePrompt = async (id: string) => {
    setSavedPrompts(await desktopBridge.markSavedPromptUsed(id));
  };

  const handleDeletePrompt = async (id: string) => {
    setSavedPrompts(await desktopBridge.deleteSavedPrompt(id));
  };

  const handleGenerateRequestChange = (request: GenerationRequest) => {
    if (request.generationSource) {
      setGenerationSource(request.generationSource);
    }
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

  const handleCopyAgentBoardUrl = async () => {
    const nextStatus = (await loadAgentBridgeStatus()) ?? agentBridgeStatus;
    if (!nextStatus?.boardUrl) {
      setProjectError("Agent Board 链接尚未就绪。");
      return;
    }

    if (await copyTextToClipboardWithFallback(nextStatus.boardUrl)) {
      showProjectNotice("Agent Board 链接已复制。");
    }
  };

  const handleSetAgentBridgeEnabled = async (enabled: boolean) => {
    if (!bridge?.setAgentBridgeEnabled) {
      setProjectError("请在 CoreStudio 桌面端开启或关闭 Agent 连接。");
      return;
    }

    notifyDesktopProjectState(currentProjectRef.current);
    try {
      const nextStatus = await bridge.setAgentBridgeEnabled(enabled);
      setAgentBridgeStatus(nextStatus);
      if (nextStatus.currentProject && currentProjectRef.current) {
        updateCurrentProject({
          ...currentProjectRef.current,
          project: {
            ...currentProjectRef.current.project,
            agentAccess: nextStatus.currentProject.agentAccess,
          },
        });
      }
    } catch (error) {
      setProjectError(
        error instanceof Error ? error.message : "Agent 连接状态切换失败。",
      );
    }
  };

  const handleGenerationSourceChange = (source: GenerationSource) => {
    setGenerationSource(source);
    setGenerateRequest((current) => ({
      ...current,
      generationSource: source,
    }));
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

  const handleLocateImageRecord = (fileId: string) => {
    const api = excalidrawAPIRef.current;
    if (!api) {
      return;
    }

    const targetElement = api
      .getSceneElementsIncludingDeleted()
      .find(
        (element) =>
          !element.isDeleted &&
          element.type === "image" &&
          element.fileId === fileId,
      );

    if (!targetElement) {
      return;
    }

    api.updateScene({
      appState: {
        selectedElementIds: {
          [targetElement.id]: true,
        },
        selectedGroupIds: {},
      },
      captureUpdate: CaptureUpdateAction.NEVER,
    });
    api.scrollToContent(targetElement, {
      animate: true,
      duration: 300,
    });
  };

  const handleLocatePromptReference = (
    reference: ImagePromptReferenceRecord,
  ) => {
    const api = excalidrawAPIRef.current;
    if (!api) {
      return;
    }

    const elements = api
      .getSceneElementsIncludingDeleted()
      .filter((element) => !element.isDeleted);
    const elementIds = new Set(reference.elementIds || []);
    const fileIds = new Set(reference.fileIds || []);
    const targetElements = elements.filter((element) => {
      if (elementIds.has(element.id)) {
        return true;
      }

      return (
        element.type === "image" &&
        element.fileId &&
        fileIds.has(element.fileId)
      );
    });

    if (!targetElements.length) {
      return;
    }

    api.updateScene({
      appState: {
        selectedElementIds: Object.fromEntries(
          targetElements.map((element) => [element.id, true]),
        ),
        selectedGroupIds: {},
      },
      captureUpdate: CaptureUpdateAction.NEVER,
    });
    api.scrollToContent(targetElements, {
      animate: true,
      duration: 300,
    });
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
      flushQueuedImageFilesToCanvas();
      scheduleVisibleImageRenditionLoad(latestSceneRef.current);
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
        clearProjectNotice();
        break;
      case "repair-project-thumbnails":
        void handleRepairProjectThumbnails();
        break;
      case "inspect-project-health":
        void handleInspectProjectHealth();
        break;
      case "clean-project-cache":
        void handleCleanProjectCache();
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
      case "app-settings":
        setAppSettingsOpen(true);
        break;
      case "set-agent-bridge-enabled":
        void handleSetAgentBridgeEnabled(event.enabled === true);
        break;
      case "reveal-project":
        void handleRevealProject();
        break;
      case "show-about":
        setAboutOpen(true);
        break;
      default:
        break;
    }
  });

  const renderAboutDialog = () =>
    aboutOpen ? (
      <div className="dialog-backdrop">
        <div
          className="dialog-card dialog-card--about"
          role="dialog"
          aria-modal="true"
          aria-labelledby="about-dialog-title"
        >
          <div className="dialog-card__header">
            <div>
              <h2 id="about-dialog-title">{copy.about.title}</h2>
            </div>
            <DesktopButton
              type="button"
              className="dialog-card__close"
              aria-label={copy.about.closeLabel}
              onClick={() => setAboutOpen(false)}
            >
              {copy.about.close}
            </DesktopButton>
          </div>
          <p className="about-dialog__description">
            {copy.about.description}
          </p>
          <div className="about-dialog__version">
            {copy.about.versionLabel}{" "}
            {appInfo?.version ?? copy.about.versionUnknown}
          </div>
        </div>
      </div>
    ) : null;

  const renderAppSettingsDialog = () =>
    appSettingsOpen ? (
      <div className="dialog-backdrop">
        <div
          className="dialog-card dialog-card--settings"
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-settings-title"
        >
          <div className="dialog-card__header">
            <div>
              <span className="dialog-card__eyebrow">设置</span>
              <h2 id="app-settings-title">应用设置</h2>
            </div>
            <DesktopButton
              type="button"
              className="dialog-card__close"
              onClick={() => setAppSettingsOpen(false)}
            >
              关闭
            </DesktopButton>
          </div>

          <section className="app-settings-section">
            <div className="app-settings-section__copy">
              <strong>Agent 调用</strong>
              <p>
                允许本机 Agent 通过 CLI 或内置浏览器连接 CoreStudio，并使用当前项目的固定 token 读写画板。
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-label="允许 Agent 调用"
              aria-checked={Boolean(agentBridgeStatus?.enabled)}
              disabled={!bridge?.setAgentBridgeEnabled || isAgentBrowserRoute}
              className="app-settings-section__switch"
              onClick={() => {
                void handleSetAgentBridgeEnabled(
                  !Boolean(agentBridgeStatus?.enabled),
                );
              }}
            />
          </section>

          <section className="app-settings-section app-settings-section--stacked">
            <div className="app-settings-section__copy">
              <strong>ACP Agent</strong>
              <p>
                配置一个外部 ACP Agent。CoreStudio 只负责发起任务和接收状态；写回画板仍然要求 Agent 使用 CoreStudio CLI / Local Bridge。
              </p>
            </div>
            <div className="app-settings-form">
              <div className="app-settings-form__header">
                <span>{acpAgentEnabledDraft ? "已启用" : "未启用"}</span>
                <button
                  type="button"
                  role="switch"
                  aria-label="启用 ACP Agent"
                  aria-checked={acpAgentEnabledDraft}
                  disabled={!bridge?.saveAcpAgentSettings || isAgentBrowserRoute}
                  className="app-settings-section__switch"
                  onClick={() =>
                    setAcpAgentEnabledDraft((current) => !current)
                  }
                />
              </div>
              <label>
                Agent 类型
                <select
                  value={acpAgentPresetDraft}
                  disabled={!bridge?.saveAcpAgentSettings || isAgentBrowserRoute}
                  onChange={(event) =>
                    handleAcpAgentPresetDraftChange(
                      event.target.value as AcpAgentPresetId,
                    )
                  }
                >
                  {ACP_AGENT_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                  <option value={ACP_AGENT_CUSTOM_PRESET_ID}>自定义命令</option>
                </select>
              </label>
              <label>
                命令
                <input
                  value={acpAgentCommandDraft}
                  placeholder="/usr/local/bin/acp-agent"
                  disabled={!bridge?.saveAcpAgentSettings || isAgentBrowserRoute}
                  onChange={(event) => {
                    setAcpAgentPresetDraft(ACP_AGENT_CUSTOM_PRESET_ID);
                    setAcpAgentCommandDraft(event.target.value);
                  }}
                />
              </label>
              <label>
                参数
                <input
                  value={acpAgentArgsDraft}
                  placeholder="--stdio"
                  disabled={!bridge?.saveAcpAgentSettings || isAgentBrowserRoute}
                  onChange={(event) => setAcpAgentArgsDraft(event.target.value)}
                />
              </label>
              <label>
                工作目录
                <input
                  value={acpAgentCwdDraft}
                  placeholder="留空则使用默认目录"
                  disabled={!bridge?.saveAcpAgentSettings || isAgentBrowserRoute}
                  onChange={(event) => setAcpAgentCwdDraft(event.target.value)}
                />
              </label>
              <div className="app-settings-form__actions">
                <span>
                  {selectedAcpAgent
                    ? `当前：${selectedAcpAgent.name} · ${selectedAcpAgent.command}`
                    : "尚未配置 ACP Agent"}
                </span>
                <DesktopButton
                  type="button"
                  disabled={
                    savingAcpAgentSettings ||
                    !bridge?.saveAcpAgentSettings ||
                    isAgentBrowserRoute
                  }
                  onClick={() => {
                    void handleSaveAcpAgentSettings();
                  }}
                >
                  {savingAcpAgentSettings ? "保存中..." : "保存"}
                </DesktopButton>
              </div>
            </div>
          </section>
        </div>
      </div>
    ) : null;

  const renderProjectStatusToast = () => {
    const message =
      projectNotice ||
      (thumbnailMaintenance
        ? thumbnailMaintenance.message ??
          (thumbnailMaintenance.status === "pending"
            ? `正在生成 ${thumbnailMaintenance.total} 张缩略图`
            : `${thumbnailMaintenance.total} 张缩略图暂时不可用`)
        : null);

    if (!message) {
      return null;
    }

    const statusClassName = [
      "image-board-thumbnail-status",
      projectNotice ? "image-board-thumbnail-status--success" : "",
      thumbnailMaintenance?.status === "failed"
        ? "image-board-thumbnail-status--failed"
        : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={statusClassName} role="status" aria-live="polite">
        <span
          className={[
            "image-board-thumbnail-status__dot",
            projectNotice ? "image-board-thumbnail-status__dot--success" : "",
            thumbnailMaintenance?.status === "failed"
              ? "image-board-thumbnail-status__dot--muted"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-hidden="true"
        />
        <span>{message}</span>
        {!projectNotice &&
          thumbnailMaintenance?.status === "pending" &&
          !thumbnailMaintenance.message && (
            <span className="image-board-thumbnail-status__hint">
              放大查看时会优先载入原图。
            </span>
          )}
      </div>
    );
  };

  if (!bridge) {
    if (window.location.pathname === "/agent-board") {
      return <AgentBoard />;
    }

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

  if (
    isAgentBrowserRoute &&
    (!agentBridgeStatus || !agentBridgeStatus.ready)
  ) {
    const heading = !agentBridgeStatus
      ? "正在连接桌面端"
      : "桌面端未连接";
    const description =
      "请确认 CoreStudio 桌面端仍在运行，然后刷新连接状态。";

    return (
      <div className="image-board-app">
        <div className="welcome-pane">
          <div className="welcome-pane__card welcome-pane__diagnostic">
            <span className="welcome-pane__eyebrow">Agent Bridge</span>
            <h1>{heading}</h1>
            <p>{description}</p>
            {startupError && (
              <div className="dialog-card__error welcome-pane__error">
                {startupError}
              </div>
            )}
            {projectError && (
              <div className="dialog-card__error welcome-pane__error">
                {projectError}
              </div>
            )}
            <div className="welcome-pane__actions">
              <DesktopButton
                type="button"
                variant="primary"
                onClick={refreshAgentBrowserConnectionState}
              >
                刷新连接状态
              </DesktopButton>
            </div>
          </div>
        </div>
        <AgentStatusDock
          status={agentBridgeStatus}
          onCopyAgentBoardUrl={handleCopyAgentBoardUrl}
          onRefreshStatus={refreshAgentBrowserConnectionState}
          generationSource={generationSource}
          acpAgentName={selectedAcpAgent?.name ?? null}
        />
      </div>
    );
  }

  if (
    isAgentBrowserRoute &&
    agentBrowserInitialProjectToken &&
    agentBridgeStatus?.currentProject &&
    (!currentProject || !initialData)
  ) {
    return (
      <div className="image-board-app">
        <div className="welcome-pane">
          <div className="welcome-pane__card welcome-pane__diagnostic">
            <span className="welcome-pane__eyebrow">Agent Bridge</span>
            <h1>正在进入桌面端当前项目</h1>
            <p>
              {agentBridgeStatus?.currentProject?.name
                ? `当前项目：${agentBridgeStatus.currentProject.name}`
                : "已确认本地桥连接，正在读取桌面端当前项目。"}
            </p>
            {startupError && (
              <div className="dialog-card__error welcome-pane__error">
                {startupError}
              </div>
            )}
            {projectError && (
              <div className="dialog-card__error welcome-pane__error">
                {projectError}
              </div>
            )}
            <div className="welcome-pane__actions">
              <DesktopButton
                type="button"
                variant="primary"
                onClick={refreshAgentBrowserConnectionState}
              >
                重新加载当前画板
              </DesktopButton>
            </div>
          </div>
        </div>
        <AgentStatusDock
          status={agentBridgeStatus}
          onCopyAgentBoardUrl={handleCopyAgentBoardUrl}
          onRefreshStatus={refreshAgentBrowserConnectionState}
          generationSource={generationSource}
          acpAgentName={selectedAcpAgent?.name ?? null}
        />
      </div>
    );
  }

  if (!currentProject || !initialData) {
    return (
      <div className="image-board-app">
        {startupError && <div className="app-startup-error">{startupError}</div>}
        {projectError && (
          <div className="app-canvas-error-toast" role="alert">
            {projectError}
          </div>
        )}
        <WelcomePane
          loading={loadingProject}
          onCreateProject={handleCreateProject}
          onOpenProject={handleOpenProject}
          recentProjects={recentProjects}
          onOpenRecentProject={handleOpenRecentProject}
          agentAccessEnabled={Boolean(agentBridgeStatus?.enabled)}
          onAgentAccessToggle={
            isAgentBrowserRoute ? undefined : handleSetAgentBridgeEnabled
          }
          agentAccessToggleDisabled={
            !bridge?.setAgentBridgeEnabled || isAgentBrowserRoute
          }
          manualProjectActionsVisible={!isAgentBrowserRoute}
        />
        {isAgentBrowserRoute ? (
          <AgentStatusDock
            status={agentBridgeStatus}
            onCopyAgentBoardUrl={handleCopyAgentBoardUrl}
            onRefreshStatus={refreshAgentBrowserConnectionState}
            generationSource={generationSource}
            acpAgentName={selectedAcpAgent?.name ?? null}
          />
        ) : null}
        {renderAboutDialog()}
        {renderAppSettingsDialog()}
      </div>
    );
  }

  const projectRenderKey = `${currentProject.projectPath}:${projectRenderNonce}`;
  const appClassName = [
    "image-board-app",
    "image-board-app--project-open",
    elementDockOpen ? "image-board-app--left-dock-open" : "",
    imageDockOpen ? "image-board-app--right-dock-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const renderWorkspaceBoundsOverlay = () => {
    if (!workspaceOverlayState) {
      return null;
    }

    const { bounds, scrollX, scrollY, zoomValue } = workspaceOverlayState;
    const left = (bounds.x + scrollX) * zoomValue;
    const top = (bounds.y + scrollY) * zoomValue;
    const width = bounds.width * zoomValue;
    const height = bounds.height * zoomValue;

    if (
      !Number.isFinite(left) ||
      !Number.isFinite(top) ||
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0
    ) {
      return null;
    }

    return (
      <div
        aria-hidden="true"
        className={[
          "image-board-workspace-bounds",
          workspaceFitPulse ? "image-board-workspace-bounds--fit-pulse" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          left,
          top,
          width,
          height,
        }}
      />
    );
  };

  return (
    <div className={appClassName}>
      {startupError && <div className="app-startup-error">{startupError}</div>}
      {projectError && (
        <div className="app-canvas-error-toast" role="alert">
          {projectError}
        </div>
      )}
      {renderAboutDialog()}
      {renderAppSettingsDialog()}
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
            {renderProjectStatusToast()}
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
                  flushQueuedImageFilesToCanvas();
                  scheduleVisibleImageRenditionLoad(latestSceneRef.current);
                }
              }}
              onPointerUpdate={({ pointer }) => {
                lastCanvasPointerRef.current = {
                  x: pointer.x,
                  y: pointer.y,
                };
              }}
              onScrollChange={handleViewportChange}
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
                if (maybeSnapWorkspaceZoom(elements, appState)) {
                  return;
                }
                latestSceneRef.current = nextScene;
                scheduleVisibleImageRenditionLoad(nextScene);
                scheduleAgentBrowserRuntimeStatePublish(nextScene);
                updateWorkspaceOverlay(elements, appState);
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
                <SideDock
                  side="left"
                  title={copy.elementActions.title}
                  open={elementDockOpen}
                  onOpenChange={setElementDockOpen}
                >
                  {shouldRenderSelectedShapeActions ? selectedShapeActions : null}
                </SideDock>
              )}
            >
              <ProjectMainMenu
                currentProjectName={currentProject.project.name}
                onSwitchProject={() => {
                  void handleSwitchProject();
                }}
              />
              <ImageSidebar
                open={imageDockOpen}
                onOpenChange={setImageDockOpen}
                record={selectedRecord}
                parentRecord={parentRecord}
                ancestorRecords={ancestorRecords}
                descendantRecords={descendantRecords}
                task={selectedTask}
                onCopyPrompt={handleCopyPrompt}
                onCopyTaskError={handleCopyTaskError}
                onLocateImageRecord={handleLocateImageRecord}
                onLocatePromptReference={handleLocatePromptReference}
              />
            </Excalidraw>
            <AgentStatusDock
              status={agentBridgeStatus}
              onCopyAgentBoardUrl={handleCopyAgentBoardUrl}
              onRefreshStatus={refreshAgentBrowserConnectionState}
              generationSource={generationSource}
              acpAgentName={selectedAcpAgent?.name ?? null}
            />
            {renderWorkspaceBoundsOverlay()}
          </div>
        </div>
      </ProjectRenderBoundary>

      <GenerateImageDialog
        open={true}
        persistent={true}
        focusToken={generateFocusToken}
        composerConfig={{
          defaultMode: isAgentBrowserRoute ? "agent" : "direct",
          showModeSwitch: isAgentBrowserRoute,
          defaultGenerationSource: generationSource,
          showGenerationSourceSwitch:
            isAgentBrowserRoute || Boolean(selectedAcpAgent),
          agentGenerationAvailable:
            acpAgentGenerationReady && !acpAgentTaskRunning,
          agentGenerationUnavailableMessage:
            selectedAcpAgent && agentBridgeStatus?.enabled
              ? "Agent Bridge 尚未就绪。"
              : "请先在应用设置里开启 Agent 调用并配置 ACP Agent。",
          agentTaskStatus: acpAgentTask,
        }}
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
        onReferenceCommit={handleCommitGenerateReference}
        savedPrompts={savedPrompts}
        onSavePrompt={handleSavePrompt}
        onUsePrompt={handleUsePrompt}
        onDeletePrompt={handleDeletePrompt}
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
