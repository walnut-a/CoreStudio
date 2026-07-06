import { useCallback, useMemo, useRef } from "react";

export const useAgentRuntimeRefsController = () => {
  const statePublishTimerRef = useRef<number | null>(null);
  const threadLoadSequenceRef = useRef(0);

  const getStatePublishTimerId = useCallback(
    () => statePublishTimerRef.current,
    [],
  );
  const setStatePublishTimerId = useCallback((timerId: number | null) => {
    statePublishTimerRef.current = timerId;
  }, []);
  const nextThreadLoadSequence = useCallback(() => {
    threadLoadSequenceRef.current += 1;
    return threadLoadSequenceRef.current;
  }, []);
  const isThreadLoadSequenceCurrent = useCallback(
    (loadSequence: number) => threadLoadSequenceRef.current === loadSequence,
    [],
  );

  const actions = useMemo(
    () => ({
      getStatePublishTimerId,
      setStatePublishTimerId,
      nextThreadLoadSequence,
      isThreadLoadSequenceCurrent,
    }),
    [
      getStatePublishTimerId,
      isThreadLoadSequenceCurrent,
      nextThreadLoadSequence,
      setStatePublishTimerId,
    ],
  );

  return {
    actions,
  };
};
