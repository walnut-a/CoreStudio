import type { AcpTaskEvent } from "../../shared/acpTypes";
import type { AcpAgentTaskUiState } from "./acpTaskUiState";
import { handleAcpTaskEvent } from "./acpTaskEventController";

export interface AcpTaskEventSubscriber {
  onAcpAgentTaskEvent?: (listener: (event: AcpTaskEvent) => void) => () => void;
}

export type AcpTaskEventSubscriptionResult =
  | {
      status: "unavailable";
      unsubscribe: null;
    }
  | {
      status: "subscribed";
      unsubscribe: () => void;
    };

export interface SubscribeAcpTaskEventsInput {
  bridge: AcpTaskEventSubscriber | null | undefined;
  getActiveTaskId: () => string | null;
  getOpenRunLogTaskId: () => string | null;
  getProjectToken: () => string | null;
  getAppSettingsOpen: () => boolean;
  getAcpDebugOpen: () => boolean;
  historyRefreshDelay: number;
  updateTaskState: (
    updater: (
      current: AcpAgentTaskUiState | null,
    ) => AcpAgentTaskUiState,
  ) => void;
  clearActiveTask: () => void;
  scheduleTimeout: (callback: () => void, delay: number) => number;
  clearScheduledTimeout: (timerId: number) => void;
  refreshThreadSummaries: (projectToken: string) => void | Promise<unknown>;
  refreshRunSummaries: () => void | Promise<unknown>;
  refreshOpenRunLog: (taskId: string) => void;
}

export interface AcpTaskEventSubscriptionRendererActions {
  subscribe: () => AcpTaskEventSubscriptionResult;
  start: () => (() => void) | undefined;
}

export const subscribeAcpTaskEvents = ({
  bridge,
  getActiveTaskId,
  getOpenRunLogTaskId,
  getProjectToken,
  getAppSettingsOpen,
  getAcpDebugOpen,
  historyRefreshDelay,
  updateTaskState,
  clearActiveTask,
  scheduleTimeout,
  clearScheduledTimeout,
  refreshThreadSummaries,
  refreshRunSummaries,
  refreshOpenRunLog,
}: SubscribeAcpTaskEventsInput): AcpTaskEventSubscriptionResult => {
  if (!bridge?.onAcpAgentTaskEvent) {
    return {
      status: "unavailable",
      unsubscribe: null,
    };
  }

  const pendingHistoryRefreshes = new Set<number>();
  const scheduleHistoryRefresh = (callback: () => void, delay: number) => {
    let timerId: number | null = null;
    timerId = scheduleTimeout(() => {
      if (timerId !== null) {
        pendingHistoryRefreshes.delete(timerId);
      }
      callback();
    }, delay);
    pendingHistoryRefreshes.add(timerId);
    return timerId;
  };
  const unsubscribeFromBridge = bridge.onAcpAgentTaskEvent((event) => {
    handleAcpTaskEvent({
      event,
      activeTaskId: getActiveTaskId(),
      openRunLogTaskId: getOpenRunLogTaskId(),
      projectToken: getProjectToken(),
      appSettingsOpen: getAppSettingsOpen(),
      acpDebugOpen: getAcpDebugOpen(),
      historyRefreshDelay,
      updateTaskState,
      clearActiveTask,
      scheduleTimeout: scheduleHistoryRefresh,
      refreshThreadSummaries,
      refreshRunSummaries,
      refreshOpenRunLog,
    });
  });

  return {
    status: "subscribed",
    unsubscribe: () => {
      unsubscribeFromBridge();
      for (const timerId of pendingHistoryRefreshes) {
        clearScheduledTimeout(timerId);
      }
      pendingHistoryRefreshes.clear();
    },
  };
};

export const createAcpTaskEventSubscriptionRendererActions = (
  input: SubscribeAcpTaskEventsInput,
): AcpTaskEventSubscriptionRendererActions => ({
  subscribe: () => subscribeAcpTaskEvents(input),
  start: () =>
    startAcpTaskEventSubscriptionAction({
      subscribe: () => subscribeAcpTaskEvents(input),
    }),
});

export const startAcpTaskEventSubscriptionAction = ({
  subscribe,
}: {
  subscribe: () => AcpTaskEventSubscriptionResult;
}) => {
  const subscription = subscribe();

  if (subscription.status !== "subscribed") {
    return undefined;
  }

  return subscription.unsubscribe;
};
