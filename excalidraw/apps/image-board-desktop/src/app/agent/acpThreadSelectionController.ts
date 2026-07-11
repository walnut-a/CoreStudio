import type { AcpThreadDetail } from "../../shared/acpTypes";
import { formatUnknownErrorMessage } from "../generationErrorViewModel";
import type { AcpThreadSummariesLoadState } from "./acpThreadState";
import {
  canReadAcpThreadDetail,
  readAcpThreadDetail,
  type AcpThreadDetailReaderBridge,
} from "./acpThreadDetailReader";
import {
  buildAcpThreadSelectionFailureState,
  buildAcpThreadSelectionPlan,
  buildAcpThreadSelectionSuccessState,
} from "./acpThreadState";

export type AcpThreadSelectionResult =
  | { status: "ignored" }
  | { status: "unavailable" }
  | { status: "active-thread-shown" }
  | { status: "loaded" }
  | { status: "failed" };

export interface AcpThreadSelectionControllerInput {
  bridge: AcpThreadDetailReaderBridge | null;
  threadId: string;
  getTaskRunning: () => boolean;
  getActiveThreadId: () => string | null;
  applyThreadSummariesState: (state: AcpThreadSummariesLoadState) => void;
  applyThreadDetail: (detail: AcpThreadDetail) => void;
  setRunLogError: (error: string | null) => void;
  setChatDockOpen: (open: boolean) => void;
  formatReadError?: (error: unknown) => string;
}

export const formatAcpThreadSelectionReadError = (error: unknown) =>
  formatUnknownErrorMessage(error, "读取 Agent 对话历史失败。");

export const runAcpThreadSelection = async ({
  bridge,
  threadId,
  getTaskRunning,
  getActiveThreadId,
  applyThreadSummariesState,
  applyThreadDetail,
  setRunLogError,
  setChatDockOpen,
  formatReadError = formatAcpThreadSelectionReadError,
}: AcpThreadSelectionControllerInput): Promise<AcpThreadSelectionResult> => {
  const taskRunning = getTaskRunning();
  const isActiveThread = getActiveThreadId() === threadId;
  const plan = buildAcpThreadSelectionPlan({
    taskRunning,
    canReadDetail: canReadAcpThreadDetail(bridge),
    isActiveThread,
  });

  if (plan.action === "ignore") {
    return { status: "ignored" };
  }
  if (plan.action === "unavailable") {
    setRunLogError(plan.runLogError);
    return { status: "unavailable" };
  }
  if (plan.action === "show-active-thread") {
    setChatDockOpen(plan.chatDockOpen);
    return { status: "active-thread-shown" };
  }

  applyThreadSummariesState({
    summaries: null,
    error: null,
    loading: plan.summariesLoading,
  });
  setRunLogError(plan.runLogError);

  try {
    const detail = await readAcpThreadDetail({ bridge, threadId });
    applyThreadDetail(detail);
    const state = buildAcpThreadSelectionSuccessState();
    setChatDockOpen(state.chatDockOpen);
    applyThreadSummariesState({
      summaries: null,
      error: null,
      loading: state.summariesLoading,
    });
    return { status: "loaded" };
  } catch (error) {
    const state = buildAcpThreadSelectionFailureState(formatReadError(error));
    setRunLogError(state.runLogError);
    applyThreadSummariesState({
      summaries: null,
      error: null,
      loading: state.summariesLoading,
    });
    return { status: "failed" };
  }
};
