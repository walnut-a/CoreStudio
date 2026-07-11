import type { AcpTaskEvent } from "../../shared/acpTypes";
import {
  buildAcpTaskEventHandlingPlan,
  type AcpTaskEventHandlingPlan,
} from "./acpTaskEventHandlingPlan";
import {
  applyAcpTaskEventToUiState,
  type AcpAgentTaskUiState,
} from "./acpTaskUiState";

export interface AcpTaskEventControllerInput {
  event: AcpTaskEvent;
  activeTaskId: string | null;
  openRunLogTaskId: string | null;
  projectToken: string | null;
  appSettingsOpen: boolean;
  acpDebugOpen: boolean;
  historyRefreshDelay: number;
  updateTaskState: (
    updater: (
      current: AcpAgentTaskUiState | null,
    ) => AcpAgentTaskUiState,
  ) => void;
  clearActiveTask: () => void;
  scheduleTimeout: (callback: () => void, delay: number) => number;
  refreshThreadSummaries: (projectToken: string) => void | Promise<unknown>;
  refreshRunSummaries: () => void | Promise<unknown>;
  refreshOpenRunLog: (taskId: string) => void;
}

export const handleAcpTaskEvent = ({
  event,
  activeTaskId,
  openRunLogTaskId,
  projectToken,
  appSettingsOpen,
  acpDebugOpen,
  historyRefreshDelay,
  updateTaskState,
  clearActiveTask,
  scheduleTimeout,
  refreshThreadSummaries,
  refreshRunSummaries,
  refreshOpenRunLog,
}: AcpTaskEventControllerInput): { status: "handled" } => {
  const handlingPlan = buildAcpTaskEventHandlingPlan({
    event,
    activeTaskId,
    openRunLogTaskId,
    projectToken,
    appSettingsOpen,
    acpDebugOpen,
  });

  applyAcpTaskEventHandlingPlan({
    event,
    handlingPlan,
    historyRefreshDelay,
    updateTaskState,
    clearActiveTask,
    scheduleTimeout,
    refreshThreadSummaries,
    refreshRunSummaries,
    refreshOpenRunLog,
  });

  return { status: "handled" };
};

const applyAcpTaskEventHandlingPlan = ({
  event,
  handlingPlan,
  historyRefreshDelay,
  updateTaskState,
  clearActiveTask,
  scheduleTimeout,
  refreshThreadSummaries,
  refreshRunSummaries,
  refreshOpenRunLog,
}: {
  event: AcpTaskEvent;
  handlingPlan: AcpTaskEventHandlingPlan;
  historyRefreshDelay: number;
  updateTaskState: (
    updater: (
      current: AcpAgentTaskUiState | null,
    ) => AcpAgentTaskUiState,
  ) => void;
  clearActiveTask: () => void;
  scheduleTimeout: (callback: () => void, delay: number) => number;
  refreshThreadSummaries: (projectToken: string) => void | Promise<unknown>;
  refreshRunSummaries: () => void | Promise<unknown>;
  refreshOpenRunLog: (taskId: string) => void;
}) => {
  if (handlingPlan.applyTaskEvent) {
    updateTaskState((current) => applyAcpTaskEventToUiState(current, event));
  }

  if (handlingPlan.clearActiveTask) {
    clearActiveTask();
  }

  const threadSummariesProjectToken =
    handlingPlan.refreshThreadSummariesProjectToken;
  if (threadSummariesProjectToken) {
    scheduleTimeout(() => {
      void refreshThreadSummaries(threadSummariesProjectToken);
    }, historyRefreshDelay);
  }

  if (handlingPlan.refreshRunSummaries) {
    scheduleTimeout(() => {
      void refreshRunSummaries();
    }, historyRefreshDelay);
  }

  if (handlingPlan.refreshOpenRunLogTaskId) {
    refreshOpenRunLog(handlingPlan.refreshOpenRunLogTaskId);
  }
};
