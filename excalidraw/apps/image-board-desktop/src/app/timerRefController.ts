export type ClearTimerRefResult =
  | {
      status: "cleared";
      timerId: number;
    }
  | {
      status: "skipped";
    };

export const clearTimerRefAction = ({
  getTimerId,
  clearTimer,
  setTimerId,
}: {
  getTimerId: () => number | null;
  clearTimer: (timerId: number) => void;
  setTimerId: (timerId: number | null) => void;
}): ClearTimerRefResult => {
  const timerId = getTimerId();
  if (timerId === null) {
    return {
      status: "skipped",
    };
  }

  clearTimer(timerId);
  setTimerId(null);

  return {
    status: "cleared",
    timerId,
  };
};
