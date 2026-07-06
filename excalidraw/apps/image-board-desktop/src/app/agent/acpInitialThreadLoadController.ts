import type { AcpThreadDetail } from "../../shared/acpTypes";
import { formatUnknownErrorMessage } from "../generationErrorViewModel";
import {
  canReadAcpInitialThreadState,
  readAcpInitialThreadState,
  type AcpInitialThreadReaderBridge,
} from "./acpInitialThreadReader";
import {
  buildAcpInitialThreadLoadFailureState,
  buildAcpInitialThreadLoadStartState,
  buildAcpInitialThreadLoadSuccessState,
  buildAcpInitialThreadUnavailableState,
  type AcpInitialThreadResetState,
  type AcpThreadSummariesLoadState,
} from "./acpThreadState";

export type AcpInitialThreadLoadResult =
  | { status: "unavailable" }
  | { status: "loaded"; latestDetailApplied: boolean }
  | { status: "stale" }
  | { status: "failed" };

export interface AcpInitialThreadLoadControllerInput {
  bridge: AcpInitialThreadReaderBridge | null;
  projectToken: string | null;
  isStale: () => boolean;
  isCurrentProjectToken: (projectToken: string | null) => boolean;
  applyInitialThreadResetState: (state: AcpInitialThreadResetState) => void;
  applyThreadSummariesState: (state: AcpThreadSummariesLoadState) => void;
  applyThreadDetail: (
    detail: AcpThreadDetail,
    options: { activateSurface: false },
  ) => void;
  formatReadError?: (error: unknown) => string;
  onReadError?: (error: unknown) => void;
}

export interface StartAcpInitialThreadLoadActionInput
  extends Omit<
    AcpInitialThreadLoadControllerInput,
    "projectToken" | "isStale" | "isCurrentProjectToken"
  > {
  nextLoadSequence: () => number;
  isLoadSequenceCurrent: (sequence: number) => boolean;
  getCurrentProjectToken: () => string | null;
  loadInitialThread?: (
    input: AcpInitialThreadLoadControllerInput,
  ) => Promise<AcpInitialThreadLoadResult>;
}

const applyInitialThreadUnavailableState = ({
  state,
  applyInitialThreadResetState,
  applyThreadSummariesState,
}: {
  state: ReturnType<typeof buildAcpInitialThreadUnavailableState>;
  applyInitialThreadResetState: (state: AcpInitialThreadResetState) => void;
  applyThreadSummariesState: (state: AcpThreadSummariesLoadState) => void;
}) => {
  applyInitialThreadResetState(state);
  applyThreadSummariesState({
    summaries: state.summaries,
    error: state.summariesError,
    loading: state.summariesLoading,
  });
};

export const formatAcpInitialThreadReadError = (error: unknown) =>
  formatUnknownErrorMessage(error, "读取 Agent 对话历史失败。");

export const runAcpInitialThreadLoad = async ({
  bridge,
  projectToken,
  isStale,
  isCurrentProjectToken,
  applyInitialThreadResetState,
  applyThreadSummariesState,
  applyThreadDetail,
  formatReadError = formatAcpInitialThreadReadError,
  onReadError,
}: AcpInitialThreadLoadControllerInput): Promise<AcpInitialThreadLoadResult> => {
  if (!canReadAcpInitialThreadState({ bridge, projectToken })) {
    applyInitialThreadUnavailableState({
      state: buildAcpInitialThreadUnavailableState(),
      applyInitialThreadResetState,
      applyThreadSummariesState,
    });
    return { status: "unavailable" };
  }

  const startState = buildAcpInitialThreadLoadStartState();
  applyThreadSummariesState({
    summaries: null,
    error: startState.summariesError,
    loading: startState.summariesLoading,
  });

  try {
    const initialThreadState = await readAcpInitialThreadState({
      bridge,
      projectToken,
    });
    if (isStale() || !isCurrentProjectToken(projectToken)) {
      return { status: "stale" };
    }

    const state = buildAcpInitialThreadLoadSuccessState({
      summaries: initialThreadState.summaries,
      hasLatestDetail: Boolean(initialThreadState.latestDetail),
    });
    applyThreadSummariesState({
      summaries: state.summaries,
      error: state.summariesError,
      loading: state.summariesLoading,
    });

    if (!initialThreadState.latestDetail) {
      applyInitialThreadResetState(state);
      return { status: "loaded", latestDetailApplied: false };
    }

    applyThreadDetail(initialThreadState.latestDetail, {
      activateSurface: false,
    });
    return { status: "loaded", latestDetailApplied: true };
  } catch (error) {
    const state = buildAcpInitialThreadLoadFailureState(
      formatReadError(error),
    );
    applyThreadSummariesState({
      summaries: state.summaries,
      error: state.summariesError,
      loading: state.summariesLoading,
    });
    onReadError?.(error);
    return { status: "failed" };
  }
};

export const startAcpInitialThreadLoadAction = ({
  nextLoadSequence,
  isLoadSequenceCurrent,
  getCurrentProjectToken,
  loadInitialThread = runAcpInitialThreadLoad,
  ...input
}: StartAcpInitialThreadLoadActionInput): Promise<AcpInitialThreadLoadResult> => {
  const loadSequence = nextLoadSequence();
  const projectToken = getCurrentProjectToken();

  return loadInitialThread({
    ...input,
    projectToken,
    isStale: () => !isLoadSequenceCurrent(loadSequence),
    isCurrentProjectToken: (projectToken) =>
      getCurrentProjectToken() === projectToken,
  });
};
