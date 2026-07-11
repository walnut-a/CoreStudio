import { clearTimerRefAction } from "./timerRefController";

export type TimedNoticeScheduleResult = {
  status: "scheduled";
  timerId: number;
};

export type TimedNoticeClearResult = {
  status: "cleared";
};

export interface ShowTimedNoticeActionInput {
  message: string;
  delayMs: number;
  clearExistingTimer: () => void;
  setNotice: (message: string | null) => void;
  setTimerId: (timerId: number | null) => void;
  scheduleTimeout: (callback: () => void, delayMs: number) => number;
}

export interface ClearTimedNoticeActionInput {
  clearExistingTimer: () => void;
  setNotice: (message: string | null) => void;
}

export interface CreateTimedNoticeRendererActionsInput {
  delayMs: number;
  getTimerId: () => number | null;
  clearTimer: (timerId: number) => void;
  setTimerId: (timerId: number | null) => void;
  setNotice: (message: string | null) => void;
  scheduleTimeout: (callback: () => void, delayMs: number) => number;
}

export const showTimedNoticeAction = ({
  message,
  delayMs,
  clearExistingTimer,
  setNotice,
  setTimerId,
  scheduleTimeout,
}: ShowTimedNoticeActionInput): TimedNoticeScheduleResult => {
  clearExistingTimer();
  setNotice(message);
  const timerId = scheduleTimeout(() => {
    setTimerId(null);
    setNotice(null);
  }, delayMs);
  setTimerId(timerId);

  return {
    status: "scheduled",
    timerId,
  };
};

export const clearTimedNoticeAction = ({
  clearExistingTimer,
  setNotice,
}: ClearTimedNoticeActionInput): TimedNoticeClearResult => {
  clearExistingTimer();
  setNotice(null);

  return {
    status: "cleared",
  };
};

export const createTimedNoticeRendererActions = ({
  delayMs,
  getTimerId,
  clearTimer,
  setTimerId,
  setNotice,
  scheduleTimeout,
}: CreateTimedNoticeRendererActionsInput) => {
  const clearTimerRef = () =>
    clearTimerRefAction({
      getTimerId,
      clearTimer,
      setTimerId,
    });

  return {
    show: (message: string) =>
      showTimedNoticeAction({
        message,
        delayMs,
        clearExistingTimer: clearTimerRef,
        setNotice,
        setTimerId,
        scheduleTimeout,
      }),
    clear: () =>
      clearTimedNoticeAction({
        clearExistingTimer: clearTimerRef,
        setNotice,
      }),
    clearTimer: clearTimerRef,
  };
};
