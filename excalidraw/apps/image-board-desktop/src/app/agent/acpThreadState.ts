import type {
  AcpRunLogDetail,
  AcpThreadDetail,
  AcpThreadSummary,
} from "../../shared/acpTypes";
import type { AcpRunLogSurface } from "./agentConversationMode";

export interface AcpThreadDetailApplyState {
  activeThreadId: string;
  runLogTaskId: string | null;
  shouldUpdateRunLogSurface: boolean;
  runLogSurface: AcpRunLogSurface | null;
  conversationEntries: AcpThreadDetail["entries"];
  runLogDetail: AcpRunLogDetail | null;
  runLogError: null;
  agentTask: null;
}

export interface NewAcpThreadState {
  activeThreadId: null;
  activeTaskId: null;
  runLogTaskId: null;
  runLogSurface: "conversation";
  conversationEntries: [];
  runLogDetail: null;
  runLogError: null;
  agentTask: null;
  chatDockOpen: true;
}

export type NewAcpThreadPlan =
  | { action: "ignore" }
  | ({ action: "start" } & NewAcpThreadState);

export interface AcpThreadSummariesLoadState {
  summaries: AcpThreadSummary[] | null;
  error: string | null;
  loading: boolean | null;
}

export interface AcpInitialThreadResetState {
  activeThreadId: null;
  runLogTaskId: null;
  conversationEntries: [];
  runLogDetail: null;
  runLogSurface: null;
}

export interface AcpInitialThreadUnavailableState
  extends AcpInitialThreadResetState {
  summaries: [];
  summariesError: null;
  summariesLoading: false;
}

export interface AcpInitialThreadLoadStartState {
  summariesError: null;
  summariesLoading: true;
}

export interface AcpInitialThreadLoadSuccessState
  extends AcpInitialThreadResetState {
  summaries: AcpThreadSummary[];
  summariesError: null;
  summariesLoading: false;
  resetConversation: boolean;
}

export interface AcpInitialThreadLoadFailureState {
  summaries: [];
  summariesError: string;
  summariesLoading: false;
}

export type AcpThreadSelectionPlan =
  | { action: "ignore" }
  | { action: "unavailable"; runLogError: string }
  | { action: "show-active-thread"; chatDockOpen: true }
  | {
      action: "read-thread-detail";
      summariesLoading: true;
      runLogError: null;
    };

export interface AcpThreadSelectionSuccessState {
  chatDockOpen: true;
  summariesLoading: false;
}

export interface AcpThreadSelectionFailureState {
  runLogError: string;
  summariesLoading: false;
}

const EMPTY_INITIAL_THREAD_RESET_STATE: AcpInitialThreadResetState = {
  activeThreadId: null,
  runLogTaskId: null,
  conversationEntries: [],
  runLogDetail: null,
  runLogSurface: null,
};

export const buildAcpThreadDetailApplyState = (
  detail: AcpThreadDetail,
  options: { activateSurface?: boolean } = {},
): AcpThreadDetailApplyState => {
  const latestRun = detail.runs[detail.runs.length - 1] ?? null;
  const shouldUpdateRunLogSurface = options.activateSurface ?? true;

  return {
    activeThreadId: detail.summary.threadId,
    runLogTaskId: detail.summary.lastTaskId ?? latestRun?.summary.taskId ?? null,
    shouldUpdateRunLogSurface,
    runLogSurface: shouldUpdateRunLogSurface ? "conversation" : null,
    conversationEntries: detail.entries,
    runLogDetail: latestRun,
    runLogError: null,
    agentTask: null,
  };
};

export const buildNewAcpThreadState = (): NewAcpThreadState => ({
  activeThreadId: null,
  activeTaskId: null,
  runLogTaskId: null,
  runLogSurface: "conversation",
  conversationEntries: [],
  runLogDetail: null,
  runLogError: null,
  agentTask: null,
  chatDockOpen: true,
});

export const buildNewAcpThreadPlan = ({
  taskRunning,
}: {
  taskRunning: boolean;
}): NewAcpThreadPlan => {
  if (taskRunning) {
    return { action: "ignore" };
  }

  return {
    action: "start",
    ...buildNewAcpThreadState(),
  };
};

export const buildAcpThreadSummariesUnavailableState =
  (): AcpThreadSummariesLoadState => ({
    summaries: [],
    error: null,
    loading: false,
  });

export const buildAcpThreadSummariesLoadStartState = ({
  showLoading,
}: {
  showLoading: boolean;
}): AcpThreadSummariesLoadState => ({
  summaries: null,
  error: null,
  loading: showLoading ? true : null,
});

export const buildAcpThreadSummariesLoadSuccessState = (
  summaries: AcpThreadSummary[],
  { showLoading }: { showLoading: boolean },
): AcpThreadSummariesLoadState => ({
  summaries,
  error: null,
  loading: showLoading ? false : null,
});

export const buildAcpThreadSummariesLoadFailureState = (
  error: string,
  { showLoading }: { showLoading: boolean },
): AcpThreadSummariesLoadState => ({
  summaries: [],
  error,
  loading: showLoading ? false : null,
});

export const buildAcpInitialThreadUnavailableState =
  (): AcpInitialThreadUnavailableState => ({
    ...EMPTY_INITIAL_THREAD_RESET_STATE,
    summaries: [],
    summariesError: null,
    summariesLoading: false,
  });

export const buildAcpInitialThreadLoadStartState =
  (): AcpInitialThreadLoadStartState => ({
    summariesError: null,
    summariesLoading: true,
  });

export const buildAcpInitialThreadLoadSuccessState = ({
  summaries,
  hasLatestDetail,
}: {
  summaries: AcpThreadSummary[];
  hasLatestDetail: boolean;
}): AcpInitialThreadLoadSuccessState => ({
  ...EMPTY_INITIAL_THREAD_RESET_STATE,
  summaries,
  summariesError: null,
  summariesLoading: false,
  resetConversation: !hasLatestDetail,
});

export const buildAcpInitialThreadLoadFailureState = (
  error: string,
): AcpInitialThreadLoadFailureState => ({
  summaries: [],
  summariesError: error,
  summariesLoading: false,
});

export const buildAcpThreadSelectionPlan = ({
  taskRunning,
  canReadDetail,
  isActiveThread,
}: {
  taskRunning: boolean;
  canReadDetail: boolean;
  isActiveThread: boolean;
}): AcpThreadSelectionPlan => {
  if (taskRunning) {
    return { action: "ignore" };
  }
  if (!canReadDetail) {
    return {
      action: "unavailable",
      runLogError: "当前环境不能读取 Agent 对话历史。",
    };
  }
  if (isActiveThread) {
    return { action: "show-active-thread", chatDockOpen: true };
  }

  return {
    action: "read-thread-detail",
    summariesLoading: true,
    runLogError: null,
  };
};

export const buildAcpThreadSelectionSuccessState =
  (): AcpThreadSelectionSuccessState => ({
    chatDockOpen: true,
    summariesLoading: false,
  });

export const buildAcpThreadSelectionFailureState = (
  error: string,
): AcpThreadSelectionFailureState => ({
  runLogError: error,
  summariesLoading: false,
});
