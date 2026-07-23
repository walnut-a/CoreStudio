import { describe, expect, it, vi } from "vitest";

import {
  createProjectRoomFlushLifecycleActions,
  startProjectRoomBeforeUnloadFlush,
} from "./projectRoomFlushLifecycle";

describe("project room flush lifecycle", () => {
  it("flushes on beforeunload and once more when the listener is removed", async () => {
    const listenerHolder: { current?: EventListener } = {};
    const flush = vi.fn().mockResolvedValue(undefined);
    const removeEventListener = vi.fn();

    const stop = startProjectRoomBeforeUnloadFlush({
      addEventListener: (_eventName, listener) => {
        listenerHolder.current = listener;
      },
      removeEventListener,
      flush,
    });

    listenerHolder.current?.(new Event("beforeunload"));
    await Promise.resolve();
    expect(flush).toHaveBeenCalledTimes(1);

    stop();
    await Promise.resolve();
    expect(removeEventListener).toHaveBeenCalledWith(
      "beforeunload",
      listenerHolder.current,
    );
    expect(flush).toHaveBeenCalledTimes(2);
  });

  it("routes explicit flush requests to the room persistence wait", async () => {
    const listenerHolder: {
      current?: () => Promise<void> | void;
    } = {};
    const unsubscribe = vi.fn();
    const flushRequest = vi.fn().mockResolvedValue(undefined);
    const actions = createProjectRoomFlushLifecycleActions({
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      subscribeFlushRequest: (listener) => {
        listenerHolder.current = listener;
        return unsubscribe;
      },
      flushBeforeUnload: vi.fn(),
      flushRequest,
    });

    const stop = actions.subscribeFlushRequests();
    await listenerHolder.current?.();

    expect(flushRequest).toHaveBeenCalledTimes(1);
    expect(stop).toBe(unsubscribe);
  });
});
