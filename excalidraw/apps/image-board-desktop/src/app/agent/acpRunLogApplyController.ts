import type {
  AcpRunLogDetail,
  AcpRunLogEntry,
} from "../../shared/acpTypes";
import type {
  AcpRunLogDetailLoadFailureState,
  AcpRunLogDetailLoadSuccessState,
  CloseAcpRunLogState,
  OpenAcpRunLogState,
} from "./acpRunLogState";
import {
  runAcpRunLogDetailRefresh,
  type ReadAcpRunLogDetail,
} from "./acpRunLogDetailController";
import type { AcpRunLogDetailReaderBridge } from "./acpRunLogDetailReader";
import {
  scheduleAcpRunLogLiveRefresh,
  type AcpRunLogLiveRefreshScheduleResult,
} from "./acpRunLogRefreshController";
import { runAcpRunLogClose } from "./acpRunLogCloseController";
import { runAcpRunLogOpen } from "./acpRunLogOpenController";
import {
  buildDirectGenerationRecordsSurfaceState,
  type AcpRunLogSurface,
  type DirectGenerationRecordsSurfaceState,
} from "./agentConversationMode";
import { clearTimerRefAction } from "../timerRefController";

export interface ApplyOpenAcpRunLogStateInput {
  state: OpenAcpRunLogState;
  setRunLogTaskId: (taskId: OpenAcpRunLogState["taskId"]) => void;
  setRunLogSurface: (surface: OpenAcpRunLogState["runLogSurface"]) => void;
  setAppSettingsOpen: (open: OpenAcpRunLogState["appSettingsOpen"]) => void;
  setRunLogDialogOpen: (
    open: OpenAcpRunLogState["runLogDialogOpen"],
  ) => void;
  setChatDockOpen: (open: OpenAcpRunLogState["chatDockOpen"]) => void;
  setRunLogDetail: (detail: OpenAcpRunLogState["runLogDetail"]) => void;
  setRunLogError: (error: OpenAcpRunLogState["runLogError"]) => void;
  setRunLogRawOpen: (open: OpenAcpRunLogState["runLogRawOpen"]) => void;
}

export interface ApplyCloseAcpRunLogStateInput {
  state: CloseAcpRunLogState;
  setRunLogTaskId: (taskId: CloseAcpRunLogState["runLogTaskId"]) => void;
  setRunLogSurface: (surface: CloseAcpRunLogState["runLogSurface"]) => void;
  setRunLogDetail: (detail: null) => void;
  setRunLogDialogOpen: (
    open: CloseAcpRunLogState["runLogDialogOpen"],
  ) => void;
}

export interface ApplyAcpRunLogDetailLoadSuccessStateInput {
  state: AcpRunLogDetailLoadSuccessState;
  setRunLogDetail: (
    detail: AcpRunLogDetailLoadSuccessState["runLogDetail"],
  ) => void;
  setRunLogError: (
    error: AcpRunLogDetailLoadSuccessState["runLogError"],
  ) => void;
}

export interface ApplyAcpRunLogDetailLoadFailureStateInput {
  state: AcpRunLogDetailLoadFailureState;
  setRunLogError: (
    error: AcpRunLogDetailLoadFailureState["runLogError"],
  ) => void;
}

export interface ApplyDirectGenerationRecordsSurfaceStateInput {
  currentSurface: AcpRunLogSurface | null;
  setRunLogSurface: (surface: AcpRunLogSurface | null) => void;
}

export interface RunDirectGenerationRecordsSurfaceActionInput {
  getCurrentSurface: () => AcpRunLogSurface | null;
  setRunLogSurface: (surface: AcpRunLogSurface | null) => void;
}

export interface CreateAcpRunLogTargetRendererActionsInput {
  setRunLogTaskIdRef: (taskId: string | null) => void;
  setRunLogSurfaceRef: (surface: AcpRunLogSurface | null) => void;
  setRunLogSurface: (surface: AcpRunLogSurface | null) => void;
}

export interface AcpRunLogTargetRendererActions {
  setTaskId(taskId: string | null): void;
  setSurface(surface: AcpRunLogSurface | null): void;
}

export const applyOpenAcpRunLogState = (
  {
    state,
    setRunLogTaskId,
    setRunLogSurface,
    setAppSettingsOpen,
    setRunLogDialogOpen,
    setChatDockOpen,
    setRunLogDetail,
    setRunLogError,
    setRunLogRawOpen,
  }: ApplyOpenAcpRunLogStateInput,
): OpenAcpRunLogState => {
  setRunLogTaskId(state.taskId);
  setRunLogSurface(state.runLogSurface);
  setAppSettingsOpen(state.appSettingsOpen);
  setRunLogDialogOpen(state.runLogDialogOpen);
  setChatDockOpen(state.chatDockOpen);
  setRunLogDetail(state.runLogDetail);
  setRunLogError(state.runLogError);
  setRunLogRawOpen(state.runLogRawOpen);

  return state;
};

export const applyCloseAcpRunLogState = (
  {
    state,
    setRunLogTaskId,
    setRunLogSurface,
    setRunLogDetail,
    setRunLogDialogOpen,
  }: ApplyCloseAcpRunLogStateInput,
): CloseAcpRunLogState => {
  setRunLogTaskId(state.runLogTaskId);
  setRunLogSurface(state.runLogSurface);
  if (state.clearRunLogDetail) {
    setRunLogDetail(null);
  }
  setRunLogDialogOpen(state.runLogDialogOpen);

  return state;
};

export const applyAcpRunLogDetailLoadSuccessState = ({
  state,
  setRunLogDetail,
  setRunLogError,
}: ApplyAcpRunLogDetailLoadSuccessStateInput): AcpRunLogDetailLoadSuccessState => {
  setRunLogDetail(state.runLogDetail);
  setRunLogError(state.runLogError);

  return state;
};

export const applyAcpRunLogDetailLoadFailureState = ({
  state,
  setRunLogError,
}: ApplyAcpRunLogDetailLoadFailureStateInput): AcpRunLogDetailLoadFailureState => {
  setRunLogError(state.runLogError);

  return state;
};

export const applyDirectGenerationRecordsSurfaceState = ({
  currentSurface,
  setRunLogSurface,
}: ApplyDirectGenerationRecordsSurfaceStateInput): DirectGenerationRecordsSurfaceState => {
  const state = buildDirectGenerationRecordsSurfaceState(currentSurface);

  if (state.shouldUpdateSurface) {
    setRunLogSurface(state.runLogSurface);
  }

  return state;
};

export const runDirectGenerationRecordsSurfaceAction = ({
  getCurrentSurface,
  setRunLogSurface,
}: RunDirectGenerationRecordsSurfaceActionInput): DirectGenerationRecordsSurfaceState =>
  applyDirectGenerationRecordsSurfaceState({
    currentSurface: getCurrentSurface(),
    setRunLogSurface,
  });

export const createAcpRunLogTargetRendererActions = ({
  setRunLogTaskIdRef,
  setRunLogSurfaceRef,
  setRunLogSurface,
}: CreateAcpRunLogTargetRendererActionsInput): AcpRunLogTargetRendererActions => {
  return {
    setTaskId: (taskId) => {
      setRunLogTaskIdRef(taskId);
    },
    setSurface: (surface) => {
      setRunLogSurfaceRef(surface);
      setRunLogSurface(surface);
    },
  };
};

export interface CreateAcpRunLogRendererActionsInput {
  getBridge: () => AcpRunLogDetailReaderBridge | null | undefined;
  getCurrentTaskId: () => string | null;
  getSurface: () => AcpRunLogSurface | null;
  hasCurrentProject: () => boolean;
  hasInitialData: () => boolean;
  getRefreshTimerId: () => number | null;
  clearTimer: (timerId: number) => void;
  setLoading: (loading: boolean) => void;
  runLogTargetActions: AcpRunLogTargetRendererActions;
  setAppSettingsOpen: (open: boolean) => void;
  setRunLogDialogOpen: (open: boolean) => void;
  setChatDockOpen: (open: boolean) => void;
  setRunLogDetail: (detail: AcpRunLogDetail | null) => void;
  setRunLogError: (error: string | null) => void;
  setRunLogRawOpen: (open: boolean) => void;
  updateConversationEntries: (
    updater: (current: AcpRunLogEntry[]) => AcpRunLogEntry[],
  ) => void;
  scheduleTimeout?: (callback: () => void, delay: number) => number;
  setRefreshTimerId: (timerId: number | null) => void;
  readRunLogDetail?: ReadAcpRunLogDetail;
}

export interface AcpRunLogRendererOpenOptions {
  openInConversationDock?: boolean;
}

export interface AcpRunLogRendererRefreshOptions {
  showLoading?: boolean;
}

export interface AcpRunLogRendererActions {
  open(
    taskId: string,
    options?: AcpRunLogRendererOpenOptions,
  ): Promise<{ status: "opened" }>;
  close(): { status: "closed" };
  refreshDetail(
    taskId: string,
    options?: AcpRunLogRendererRefreshOptions,
  ): Promise<{ status: "loaded" | "failed" | "stale" }>;
  scheduleLiveRefresh(
    taskId: string,
    delay: number,
  ): AcpRunLogLiveRefreshScheduleResult;
  clearTimer(): ReturnType<typeof clearTimerRefAction>;
  showDirectGenerationRecords(): DirectGenerationRecordsSurfaceState;
}

export const createAcpRunLogRendererActions = ({
  getBridge,
  getCurrentTaskId,
  getSurface,
  hasCurrentProject,
  hasInitialData,
  getRefreshTimerId,
  clearTimer,
  setLoading,
  runLogTargetActions,
  setAppSettingsOpen,
  setRunLogDialogOpen,
  setChatDockOpen,
  setRunLogDetail,
  setRunLogError,
  setRunLogRawOpen,
  updateConversationEntries,
  scheduleTimeout,
  setRefreshTimerId,
  readRunLogDetail,
}: CreateAcpRunLogRendererActionsInput): AcpRunLogRendererActions => {
  const clearRefreshTimer = () =>
    clearTimerRefAction({
      getTimerId: getRefreshTimerId,
      clearTimer,
      setTimerId: setRefreshTimerId,
    });

  const applyOpenState = (state: OpenAcpRunLogState) => {
    applyOpenAcpRunLogState({
      state,
      setRunLogTaskId: runLogTargetActions.setTaskId,
      setRunLogSurface: runLogTargetActions.setSurface,
      setAppSettingsOpen,
      setRunLogDialogOpen,
      setChatDockOpen,
      setRunLogDetail,
      setRunLogError,
      setRunLogRawOpen,
    });
  };

  const applyCloseState = (state: CloseAcpRunLogState) => {
    applyCloseAcpRunLogState({
      state,
      setRunLogTaskId: runLogTargetActions.setTaskId,
      setRunLogSurface: runLogTargetActions.setSurface,
      setRunLogDetail,
      setRunLogDialogOpen,
    });
  };

  const refreshDetail: AcpRunLogRendererActions["refreshDetail"] = (
    taskId,
    options,
  ) =>
    runAcpRunLogDetailRefresh({
      bridge: getBridge(),
      taskId,
      showLoading: options?.showLoading,
      getCurrentTaskId,
      getSurface,
      setLoading,
      setRunLogError,
      applySuccessState: (state) => {
        applyAcpRunLogDetailLoadSuccessState({
          state,
          setRunLogDetail,
          setRunLogError,
        });
      },
      applyFailureState: (state) => {
        applyAcpRunLogDetailLoadFailureState({
          state,
          setRunLogError,
        });
      },
      updateConversationEntries,
      readRunLogDetail,
    });

  return {
    open: (taskId, options) =>
      runAcpRunLogOpen({
        taskId,
        openInConversationDock: options?.openInConversationDock,
        hasCurrentProject,
        hasInitialData,
        clearRefreshTimer,
        applyOpenState,
        refreshRunLogDetail: async (refreshTaskId, refreshOptions) => {
          await refreshDetail(refreshTaskId, refreshOptions);
        },
      }),
    close: () =>
      runAcpRunLogClose({
        getCurrentSurface: getSurface,
        clearRefreshTimer,
        applyCloseState,
      }),
    scheduleLiveRefresh: (taskId, delay) => {
      if (!scheduleTimeout) {
        return { status: "skipped" };
      }

      return scheduleAcpRunLogLiveRefresh({
        taskId,
        delay,
        getCurrentTaskId,
        clearRefreshTimer,
        scheduleTimeout,
        setRefreshTimerId,
        refreshRunLogDetail: async (refreshTaskId) => {
          await refreshDetail(refreshTaskId, { showLoading: false });
        },
      });
    },
    clearTimer: clearRefreshTimer,
    refreshDetail,
    showDirectGenerationRecords: () =>
      runDirectGenerationRecordsSurfaceAction({
        getCurrentSurface: getSurface,
        setRunLogSurface: runLogTargetActions.setSurface,
      }),
  };
};
