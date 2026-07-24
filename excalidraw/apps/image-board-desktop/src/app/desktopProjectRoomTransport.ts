import type { DesktopBridgeApi } from "../shared/desktopBridgeTypes";
import type { ProjectRoomEvent } from "../shared/projectRoomProtocol";

import type { ProjectRoomClientTransport } from "./projectRoomClientController";

export interface CreateDesktopProjectRoomTransportInput {
  bridge: DesktopBridgeApi;
  sessionId: string;
}

const unavailable = () =>
  Object.assign(new Error("CoreStudio project room IPC is unavailable."), {
    code: "ROOM_TRANSPORT_UNAVAILABLE",
  });

export const createDesktopProjectRoomTransport = ({
  bridge,
  sessionId,
}: CreateDesktopProjectRoomTransportInput): ProjectRoomClientTransport => {
  const listeners = new Set<(event: ProjectRoomEvent) => void>();
  const unsubscribeBridge = bridge.onProjectRoomEvent?.(
    (eventSessionId, event) => {
      if (eventSessionId !== sessionId) {
        return;
      }
      for (const listener of listeners) {
        listener(event);
      }
    },
  );

  return {
    join: (input) => {
      if (!bridge.joinProjectRoom) {
        return Promise.reject(unavailable());
      }
      return bridge.joinProjectRoom(input).then((snapshot) => ({
        snapshot,
        sessionId,
      }));
    },
    submitOperation: (operation) => {
      if (!bridge.submitProjectRoomOperation) {
        return Promise.reject(unavailable());
      }
      return bridge.submitProjectRoomOperation({
        sessionId,
        operation,
      });
    },
    requestPersistence: () => {
      if (!bridge.flushProjectRoomPersistence) {
        return Promise.reject(unavailable());
      }
      return bridge.flushProjectRoomPersistence(sessionId);
    },
    leave: (requestedSessionId) => {
      if (!bridge.leaveProjectRoom) {
        return Promise.reject(unavailable());
      }
      return bridge.leaveProjectRoom(requestedSessionId);
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          unsubscribeBridge?.();
        }
      };
    },
  };
};
