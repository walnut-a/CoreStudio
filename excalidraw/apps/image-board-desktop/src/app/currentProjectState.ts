import type { DesktopProjectBundle } from "../shared/desktopBridgeTypes";
import { unmarkMissingRecentProjectMessage } from "../shared/recentProjectErrors";
import { getSceneContentHash } from "../shared/sceneVersion";
import { formatUnknownErrorMessage } from "./generationErrorViewModel";

export interface CurrentProjectLifecycleState {
  previousProjectPath: string | null;
  nextProjectPath: string | null;
  projectChanged: boolean;
  savedSceneHash: string | null;
}

export interface CurrentProjectChangedResetState {
  activeAcpThreadId: null;
  acpRunLogTaskId: null;
  acpRunLogSurface: null;
  acpRunLogDetail: null;
  acpRunLogError: null;
  acpConversationEntries: [];
  acpThreadSummaries: [];
  acpThreadSummariesError: null;
  acpThreadSummariesLoading: false;
  agentChatDockOpen: false;
  projectHealthReport: null;
  projectRepairReport: null;
  projectHealthReportOpen: false;
}

export interface CurrentProjectUpdateState extends CurrentProjectLifecycleState {
  project: DesktopProjectBundle | null;
  resetState: CurrentProjectChangedResetState | null;
}

export const buildCurrentProjectLifecycleState = ({
  previousProject,
  nextProject,
}: {
  previousProject: DesktopProjectBundle | null;
  nextProject: DesktopProjectBundle | null;
}): CurrentProjectLifecycleState => {
  const previousProjectPath = previousProject?.projectPath ?? null;
  const nextProjectPath = nextProject?.projectPath ?? null;

  return {
    previousProjectPath,
    nextProjectPath,
    projectChanged: previousProjectPath !== nextProjectPath,
    savedSceneHash: nextProject
      ? getSceneContentHash(nextProject.sceneJson)
      : null,
  };
};

export const buildCurrentProjectChangedResetState =
  (): CurrentProjectChangedResetState => ({
    activeAcpThreadId: null,
    acpRunLogTaskId: null,
    acpRunLogSurface: null,
    acpRunLogDetail: null,
    acpRunLogError: null,
    acpConversationEntries: [],
    acpThreadSummaries: [],
    acpThreadSummariesError: null,
    acpThreadSummariesLoading: false,
    agentChatDockOpen: false,
    projectHealthReport: null,
    projectRepairReport: null,
    projectHealthReportOpen: false,
  });

export const buildCurrentProjectUpdateState = ({
  previousProject,
  nextProject,
}: {
  previousProject: DesktopProjectBundle | null;
  nextProject: DesktopProjectBundle | null;
}): CurrentProjectUpdateState => {
  const lifecycle = buildCurrentProjectLifecycleState({
    previousProject,
    nextProject,
  });

  return {
    ...lifecycle,
    project: nextProject,
    resetState: lifecycle.projectChanged
      ? buildCurrentProjectChangedResetState()
      : null,
  };
};

export const getNextProjectOpenSequence = (currentSequence: number) =>
  currentSequence + 1;

export const isProjectOpenSequenceCurrent = ({
  currentSequence,
  sequence,
}: {
  currentSequence: number;
  sequence: number;
}) => currentSequence === sequence;

export const formatProjectSaveError = (error: unknown) =>
  formatUnknownErrorMessage(error, "项目保存失败。");

export const formatProjectSaveBeforeOpenError = (error: unknown) =>
  `旧项目未能保存，已停止打开新项目。 ${formatProjectSaveError(error)}`;

export const formatProjectOpenError = (error: unknown) => {
  const message = formatUnknownErrorMessage(error, "打开项目失败。");
  return unmarkMissingRecentProjectMessage(message) ?? message;
};

export const formatProjectCreateError = (error: unknown) =>
  formatUnknownErrorMessage(error, "新建项目失败。");

export const formatProjectImportImagesError = (error: unknown) =>
  formatUnknownErrorMessage(error, "导入图片失败。");

export const formatProjectRevealError = (error: unknown) =>
  formatUnknownErrorMessage(error, "无法显示项目文件夹。");

export interface EditorInitializingUpdatePlan {
  shouldApply: boolean;
  nextInitializing: boolean;
  nextRenderNonce: number | null;
}

export const buildEditorInitializingUpdatePlan = ({
  currentRenderNonce,
  initializing,
  renderNonce,
}: {
  currentRenderNonce: number | null;
  initializing: boolean;
  renderNonce?: number;
}): EditorInitializingUpdatePlan => {
  if (
    !initializing &&
    renderNonce !== undefined &&
    currentRenderNonce !== renderNonce
  ) {
    return {
      shouldApply: false,
      nextInitializing: false,
      nextRenderNonce: currentRenderNonce,
    };
  }

  return {
    shouldApply: true,
    nextInitializing: initializing,
    nextRenderNonce: initializing
      ? renderNonce ?? currentRenderNonce
      : null,
  };
};

export const shouldHideEditorLoading = ({
  currentRenderNonce,
  renderNonce,
}: {
  currentRenderNonce: number | null;
  renderNonce: number;
}) => currentRenderNonce === renderNonce;

export const EDITOR_INITIALIZING_FALLBACK_DELAY_MS = 3000;

export const scheduleEditorReadyInitializingClearAction = <TimerId>({
  renderNonce,
  requestAnimationFrame,
  scheduleTimeout,
  clearInitializing,
}: {
  renderNonce: number;
  requestAnimationFrame:
    | ((callback: FrameRequestCallback) => number)
    | null
    | undefined;
  scheduleTimeout: (callback: () => void, delayMs: number) => TimerId;
  clearInitializing: (renderNonce: number) => void;
}) => {
  const clearInitializingForRender = () => {
    clearInitializing(renderNonce);
  };

  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(clearInitializingForRender);
    return;
  }

  scheduleTimeout(clearInitializingForRender, 0);
};

export const scheduleEditorInitializingFallbackClearAction = <TimerId>({
  isEditorInitializing,
  renderNonce,
  getCurrentRenderNonce,
  hasEditorApi,
  scheduleTimeout,
  clearTimeout,
  hideEditorLoading,
  delayMs = EDITOR_INITIALIZING_FALLBACK_DELAY_MS,
}: {
  isEditorInitializing: boolean;
  renderNonce: number;
  getCurrentRenderNonce: () => number;
  hasEditorApi: () => boolean;
  scheduleTimeout: (callback: () => void, delayMs: number) => TimerId;
  clearTimeout: (timerId: TimerId) => void;
  hideEditorLoading: (renderNonce: number) => void;
  delayMs?: number;
}): (() => void) | null => {
  if (!isEditorInitializing) {
    return null;
  }

  const fallbackTimer = scheduleTimeout(() => {
    if (renderNonce === getCurrentRenderNonce() && hasEditorApi()) {
      hideEditorLoading(renderNonce);
    }
  }, delayMs);

  return () => {
    clearTimeout(fallbackTimer);
  };
};
