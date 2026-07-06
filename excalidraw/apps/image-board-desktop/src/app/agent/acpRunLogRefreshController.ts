export type AcpRunLogLiveRefreshScheduleResult =
  | { status: "scheduled" }
  | { status: "skipped" };

export interface AcpRunLogLiveRefreshScheduleInput {
  taskId: string;
  delay: number;
  getCurrentTaskId: () => string | null;
  clearRefreshTimer: () => void;
  scheduleTimeout: (callback: () => void, delay: number) => number;
  setRefreshTimerId: (timerId: number | null) => void;
  refreshRunLogDetail: (taskId: string) => void | Promise<void>;
}

export const scheduleAcpRunLogLiveRefresh = ({
  taskId,
  delay,
  getCurrentTaskId,
  clearRefreshTimer,
  scheduleTimeout,
  setRefreshTimerId,
  refreshRunLogDetail,
}: AcpRunLogLiveRefreshScheduleInput): AcpRunLogLiveRefreshScheduleResult => {
  if (getCurrentTaskId() !== taskId) {
    return { status: "skipped" };
  }

  clearRefreshTimer();
  const timerId = scheduleTimeout(() => {
    setRefreshTimerId(null);
    void refreshRunLogDetail(taskId);
  }, delay);
  setRefreshTimerId(timerId);

  return { status: "scheduled" };
};
