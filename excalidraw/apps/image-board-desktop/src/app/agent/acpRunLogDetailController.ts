import type {
  AcpRunLogDetail,
  AcpRunLogEntry,
} from "../../shared/acpTypes";
import type { AcpRunLogSurface } from "./agentConversationMode";
import {
  readAcpRunLogDetailWithRetry,
  type AcpRunLogDetailReaderBridge,
} from "./acpRunLogDetailReader";
import { formatUnknownErrorMessage } from "../generationErrorViewModel";
import {
  buildAcpRunLogDetailLoadFailureState,
  buildAcpRunLogDetailLoadSuccessState,
  type AcpRunLogDetailLoadFailureState,
  type AcpRunLogDetailLoadSuccessState,
} from "./acpRunLogState";

export type AcpRunLogDetailRefreshStatus = "loaded" | "failed" | "stale";

export type ReadAcpRunLogDetail = (input: {
  bridge: AcpRunLogDetailReaderBridge | null | undefined;
  taskId: string;
}) => Promise<AcpRunLogDetail>;

export interface AcpRunLogDetailRefreshControllerInput {
  bridge: AcpRunLogDetailReaderBridge | null | undefined;
  taskId: string;
  showLoading?: boolean;
  getCurrentTaskId: () => string | null;
  getSurface: () => AcpRunLogSurface | null;
  setLoading: (loading: boolean) => void;
  setRunLogError: (error: string | null) => void;
  applySuccessState: (state: AcpRunLogDetailLoadSuccessState) => void;
  applyFailureState: (state: AcpRunLogDetailLoadFailureState) => void;
  updateConversationEntries: (
    updater: (current: AcpRunLogEntry[]) => AcpRunLogEntry[],
  ) => void;
  formatReadError?: (error: unknown) => string;
  readRunLogDetail?: ReadAcpRunLogDetail;
}

export const formatAcpRunLogDetailReadError = (error: unknown) =>
  formatUnknownErrorMessage(error, "读取 ACP Agent 任务记录失败。");

export const runAcpRunLogDetailRefresh = async ({
  bridge,
  taskId,
  showLoading = false,
  getCurrentTaskId,
  getSurface,
  setLoading,
  setRunLogError,
  applySuccessState,
  applyFailureState,
  updateConversationEntries,
  formatReadError = formatAcpRunLogDetailReadError,
  readRunLogDetail = readAcpRunLogDetailWithRetry,
}: AcpRunLogDetailRefreshControllerInput): Promise<{
  status: AcpRunLogDetailRefreshStatus;
}> => {
  if (showLoading) {
    setLoading(true);
    setRunLogError(null);
  }

  try {
    const detail = await readRunLogDetail({ bridge, taskId });
    if (getCurrentTaskId() !== taskId) {
      return { status: "stale" };
    }

    const surface = getSurface();
    const state = buildAcpRunLogDetailLoadSuccessState({
      detail,
      surface,
      currentConversationEntries: [],
    });
    applySuccessState(state);

    if (surface === "conversation") {
      updateConversationEntries((current) => {
        const conversationState = buildAcpRunLogDetailLoadSuccessState({
          detail,
          surface,
          currentConversationEntries: current,
        });
        return conversationState.conversationEntries ?? current;
      });
    }

    return { status: "loaded" };
  } catch (error) {
    if (getCurrentTaskId() !== taskId) {
      return { status: "stale" };
    }

    const state = buildAcpRunLogDetailLoadFailureState(
      formatReadError(error),
    );
    applyFailureState(state);
    return { status: "failed" };
  } finally {
    if (showLoading && getCurrentTaskId() === taskId) {
      setLoading(false);
    }
  }
};
