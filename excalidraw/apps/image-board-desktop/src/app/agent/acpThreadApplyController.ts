import type {
  AcpRunLogDetail,
  AcpRunLogEntry,
  AcpThreadDetail,
} from "../../shared/acpTypes";
import {
  startAcpInitialThreadLoadAction,
  type AcpInitialThreadLoadControllerInput,
  type AcpInitialThreadLoadResult,
} from "./acpInitialThreadLoadController";
import type { AcpRunLogTargetRendererActions } from "./acpRunLogApplyController";
import type { AcpInitialThreadReaderBridge } from "./acpInitialThreadReader";
import type { AcpRunLogSurface } from "./agentConversationMode";
import {
  runAcpNewThread,
  type AcpNewThreadResult,
} from "./acpNewThreadController";
import {
  runAcpThreadSelection,
  type AcpThreadSelectionResult,
} from "./acpThreadSelectionController";
import type { AcpThreadDetailReaderBridge } from "./acpThreadDetailReader";
import {
  buildAcpThreadDetailApplyState,
  type AcpInitialThreadResetState,
  type AcpThreadDetailApplyState,
  type AcpThreadSummariesLoadState,
  type NewAcpThreadState,
} from "./acpThreadState";
import type { AcpAgentTaskUiState } from "./acpTaskUiState";

export interface ApplyAcpThreadDetailStateInput {
  detail: AcpThreadDetail;
  options?: { activateSurface?: boolean };
  setActiveThreadId: (threadId: string) => void;
  setRunLogTaskId: (taskId: string | null) => void;
  setRunLogSurface: (surface: AcpRunLogSurface | null) => void;
  setConversationEntries: (entries: AcpRunLogEntry[]) => void;
  setRunLogDetail: (detail: AcpRunLogDetail | null) => void;
  setRunLogError: (error: null) => void;
  setAgentTask: (task: AcpAgentTaskUiState | null) => void;
}

export interface ApplyAcpInitialThreadResetStateInput {
  state: AcpInitialThreadResetState;
  setActiveThreadId: (threadId: null) => void;
  setRunLogTaskId: (taskId: null) => void;
  setConversationEntries: (entries: []) => void;
  setRunLogDetail: (detail: null) => void;
  setRunLogSurface: (surface: null) => void;
}

export interface ApplyNewAcpThreadStateInput {
  state: NewAcpThreadState;
  setActiveThreadId: (threadId: NewAcpThreadState["activeThreadId"]) => void;
  setActiveTaskId: (taskId: NewAcpThreadState["activeTaskId"]) => void;
  setRunLogTaskId: (taskId: NewAcpThreadState["runLogTaskId"]) => void;
  setRunLogSurface: (surface: NewAcpThreadState["runLogSurface"]) => void;
  setConversationEntries: (
    entries: NewAcpThreadState["conversationEntries"],
  ) => void;
  setRunLogDetail: (detail: NewAcpThreadState["runLogDetail"]) => void;
  setRunLogError: (error: NewAcpThreadState["runLogError"]) => void;
  setAgentTask: (task: NewAcpThreadState["agentTask"]) => void;
  setChatDockOpen: (open: NewAcpThreadState["chatDockOpen"]) => void;
}

export type AcpThreadRendererBridge =
  | (AcpInitialThreadReaderBridge & AcpThreadDetailReaderBridge)
  | null
  | undefined;

export interface CreateAcpThreadRendererActionsInput {
  getBridge: () => AcpThreadRendererBridge;
  nextLoadSequence: () => number;
  isLoadSequenceCurrent: (sequence: number) => boolean;
  getCurrentProjectToken: () => string | null;
  getTaskRunning: () => boolean;
  getActiveThreadId: () => string | null;
  applyThreadSummariesState: (state: AcpThreadSummariesLoadState) => void;
  setActiveThreadId: (threadId: string | null) => void;
  setActiveTaskId: (taskId: string | null) => void;
  runLogTargetActions: AcpRunLogTargetRendererActions;
  setConversationEntries: (entries: AcpRunLogEntry[]) => void;
  setRunLogDetail: (detail: AcpRunLogDetail | null) => void;
  setRunLogError: (error: string | null) => void;
  setAgentTask: (task: AcpAgentTaskUiState | null) => void;
  setChatDockOpen: (open: boolean) => void;
  loadInitialThread?: (
    input: AcpInitialThreadLoadControllerInput,
  ) => Promise<AcpInitialThreadLoadResult>;
  onInitialReadError?: (error: unknown) => void;
}

export interface CreateAcpActiveThreadIdRendererActionsInput {
  setActiveThreadIdRef: (threadId: string | null) => void;
  setActiveThreadId: (threadId: string | null) => void;
}

export interface AcpActiveThreadIdRendererActions {
  set(threadId: string | null): void;
}

export interface AcpThreadRendererActions {
  loadInitial(): Promise<AcpInitialThreadLoadResult>;
  startInitialLoad(): void;
  selectThread(threadId: string): Promise<AcpThreadSelectionResult>;
  selectThreadForConversation(threadId: string): Promise<void>;
  startNewThread(): AcpNewThreadResult;
}

export const applyAcpThreadDetailState = ({
  detail,
  options,
  setActiveThreadId,
  setRunLogTaskId,
  setRunLogSurface,
  setConversationEntries,
  setRunLogDetail,
  setRunLogError,
  setAgentTask,
}: ApplyAcpThreadDetailStateInput): AcpThreadDetailApplyState => {
  const state = buildAcpThreadDetailApplyState(detail, options);

  setActiveThreadId(state.activeThreadId);
  setRunLogTaskId(state.runLogTaskId);
  if (state.shouldUpdateRunLogSurface) {
    setRunLogSurface(state.runLogSurface);
  }
  setConversationEntries(state.conversationEntries);
  setRunLogDetail(state.runLogDetail);
  setRunLogError(state.runLogError);
  setAgentTask(state.agentTask);

  return state;
};

export const applyAcpInitialThreadResetState = ({
  state,
  setActiveThreadId,
  setRunLogTaskId,
  setConversationEntries,
  setRunLogDetail,
  setRunLogSurface,
}: ApplyAcpInitialThreadResetStateInput): AcpInitialThreadResetState => {
  setActiveThreadId(state.activeThreadId);
  setRunLogTaskId(state.runLogTaskId);
  setConversationEntries(state.conversationEntries);
  setRunLogDetail(state.runLogDetail);
  setRunLogSurface(state.runLogSurface);

  return state;
};

export const applyNewAcpThreadState = ({
  state,
  setActiveThreadId,
  setActiveTaskId,
  setRunLogTaskId,
  setRunLogSurface,
  setConversationEntries,
  setRunLogDetail,
  setRunLogError,
  setAgentTask,
  setChatDockOpen,
}: ApplyNewAcpThreadStateInput): NewAcpThreadState => {
  setActiveThreadId(state.activeThreadId);
  setActiveTaskId(state.activeTaskId);
  setRunLogTaskId(state.runLogTaskId);
  setRunLogSurface(state.runLogSurface);
  setConversationEntries(state.conversationEntries);
  setRunLogDetail(state.runLogDetail);
  setRunLogError(state.runLogError);
  setAgentTask(state.agentTask);
  setChatDockOpen(state.chatDockOpen);

  return state;
};

export const createAcpActiveThreadIdRendererActions = ({
  setActiveThreadIdRef,
  setActiveThreadId,
}: CreateAcpActiveThreadIdRendererActionsInput): AcpActiveThreadIdRendererActions => {
  return {
    set: (threadId) => {
      setActiveThreadIdRef(threadId);
      setActiveThreadId(threadId);
    },
  };
};

export const createAcpThreadRendererActions = ({
  getBridge,
  nextLoadSequence,
  isLoadSequenceCurrent,
  getCurrentProjectToken,
  getTaskRunning,
  getActiveThreadId,
  applyThreadSummariesState,
  setActiveThreadId,
  setActiveTaskId,
  runLogTargetActions,
  setConversationEntries,
  setRunLogDetail,
  setRunLogError,
  setAgentTask,
  setChatDockOpen,
  loadInitialThread,
  onInitialReadError,
}: CreateAcpThreadRendererActionsInput): AcpThreadRendererActions => {
  const applyInitialThreadResetState = (
    state: AcpInitialThreadResetState,
  ) => {
    applyAcpInitialThreadResetState({
      state,
      setActiveThreadId,
      setRunLogTaskId: runLogTargetActions.setTaskId,
      setConversationEntries,
      setRunLogDetail,
      setRunLogSurface: runLogTargetActions.setSurface,
    });
  };

  const applyThreadDetail = (
    detail: AcpThreadDetail,
    options: { activateSurface?: boolean } = {},
  ) => {
    applyAcpThreadDetailState({
      detail,
      options,
      setActiveThreadId,
      setRunLogTaskId: runLogTargetActions.setTaskId,
      setRunLogSurface: runLogTargetActions.setSurface,
      setConversationEntries,
      setRunLogDetail,
      setRunLogError,
      setAgentTask,
    });
  };

  const applyNewThreadState = (state: NewAcpThreadState) => {
    applyNewAcpThreadState({
      state,
      setActiveThreadId,
      setActiveTaskId,
      setRunLogTaskId: runLogTargetActions.setTaskId,
      setRunLogSurface: runLogTargetActions.setSurface,
      setConversationEntries,
      setRunLogDetail,
      setRunLogError,
      setAgentTask,
      setChatDockOpen,
    });
  };

  const loadInitial = () =>
    startAcpInitialThreadLoadAction({
      bridge: getBridge() ?? null,
      nextLoadSequence,
      isLoadSequenceCurrent,
      getCurrentProjectToken,
      applyInitialThreadResetState,
      applyThreadSummariesState,
      applyThreadDetail,
      onReadError: onInitialReadError,
      loadInitialThread,
    });

  const selectThread = (threadId: string) =>
    runAcpThreadSelection({
      bridge: getBridge() ?? null,
      threadId,
      getTaskRunning,
      getActiveThreadId,
      applyThreadSummariesState,
      applyThreadDetail,
      setRunLogError,
      setChatDockOpen,
    });

  return {
    loadInitial,
    startInitialLoad: () => {
      void loadInitial();
    },
    selectThread,
    selectThreadForConversation: async (threadId) => {
      await selectThread(threadId);
    },
    startNewThread: () =>
      runAcpNewThread({
        getTaskRunning,
        applyNewThreadState,
      }),
  };
};
