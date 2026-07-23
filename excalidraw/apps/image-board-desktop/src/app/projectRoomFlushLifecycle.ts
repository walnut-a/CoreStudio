export interface ProjectRoomFlushLifecycleActionsInput {
  addEventListener: (
    eventName: "beforeunload",
    listener: EventListener,
  ) => void;
  removeEventListener: (
    eventName: "beforeunload",
    listener: EventListener,
  ) => void;
  subscribeFlushRequest?:
    | ((listener: () => Promise<void> | void) => () => void)
    | null;
  flushBeforeUnload: () => Promise<unknown>;
  flushRequest: () => Promise<unknown>;
}

export const startProjectRoomBeforeUnloadFlush = ({
  addEventListener,
  removeEventListener,
  flush,
}: {
  addEventListener: (
    eventName: "beforeunload",
    listener: EventListener,
  ) => void;
  removeEventListener: (
    eventName: "beforeunload",
    listener: EventListener,
  ) => void;
  flush: () => Promise<unknown>;
}): (() => void) => {
  const flushRoom = () => {
    void flush();
  };
  addEventListener("beforeunload", flushRoom);
  return () => {
    removeEventListener("beforeunload", flushRoom);
    void flush();
  };
};

export const createProjectRoomFlushLifecycleActions = ({
  addEventListener,
  removeEventListener,
  subscribeFlushRequest,
  flushBeforeUnload,
  flushRequest,
}: ProjectRoomFlushLifecycleActionsInput) => ({
  startBeforeUnloadFlush: () =>
    startProjectRoomBeforeUnloadFlush({
      addEventListener,
      removeEventListener,
      flush: flushBeforeUnload,
    }),
  subscribeFlushRequests: () =>
    subscribeFlushRequest?.(async () => {
      await flushRequest();
    }),
});
