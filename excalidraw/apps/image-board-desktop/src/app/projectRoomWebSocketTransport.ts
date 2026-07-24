import type {
  ProjectRoomEvent,
  ProjectRoomJoinResult,
  ProjectRoomOperationResult,
  ProjectRoomParticipantSelection,
  ProjectRoomSceneOperation,
} from "../shared/projectRoomProtocol";

import type { ProjectRoomClientTransport } from "./projectRoomClientController";

interface WebSocketLike {
  readonly readyState: number;
  addEventListener(
    type: "open" | "message" | "close" | "error",
    listener: (event: any) => void,
  ): void;
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

interface WebSocketConstructorLike {
  readonly OPEN: number;
  new (url: string): WebSocketLike;
}

export interface CreateProjectRoomWebSocketTransportInput {
  bridgeBaseUrl: string;
  launchTicket?: string | null;
  resumeToken?: string | null;
  WebSocketImpl?: WebSocketConstructorLike;
  replaceResumeToken?: (resumeToken: string) => void;
  scheduleReconnect?: (callback: () => void, delayMs: number) => unknown;
  reconnectDelayMs?: number;
  onTerminalError?: (error: Error) => void;
}

const TERMINAL_ROOM_ERROR_CODES = new Set([
  "AUTH_REQUIRED",
  "TOKEN_EXPIRED",
  "PROJECT_MISMATCH",
  "ROOM_MISMATCH",
  "SESSION_EPOCH_EXPIRED",
  "ROOM_CLOSED",
]);

const createRoomSocketUrl = ({
  bridgeBaseUrl,
  launchTicket,
  resumeToken,
}: Pick<
  CreateProjectRoomWebSocketTransportInput,
  "bridgeBaseUrl" | "launchTicket" | "resumeToken"
>) => {
  const url = new URL("/v1/room", bridgeBaseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  if (launchTicket) {
    url.searchParams.set("launchTicket", launchTicket);
  } else if (resumeToken) {
    url.searchParams.set("resumeToken", resumeToken);
  } else {
    throw Object.assign(new Error("Project room credential is missing."), {
      code: "AUTH_REQUIRED",
    });
  }
  return url.toString();
};

const toError = (value: unknown) => {
  const errorValue =
    value && typeof value === "object" && "error" in value ? value.error : null;
  if (!errorValue || typeof errorValue !== "object") {
    return new Error("Project room connection failed.");
  }
  return Object.assign(
    new Error(
      "message" in errorValue
        ? String(errorValue.message)
        : "Project room connection failed.",
    ),
    "code" in errorValue ? { code: String(errorValue.code) } : {},
    "details" in errorValue ? { details: errorValue.details } : {},
  );
};

export const createProjectRoomWebSocketTransport = (
  input: CreateProjectRoomWebSocketTransportInput,
): ProjectRoomClientTransport => {
  const WebSocketImpl =
    input.WebSocketImpl ?? (WebSocket as unknown as WebSocketConstructorLike);
  const listeners = new Set<(event: ProjectRoomEvent) => void>();
  const snapshotListeners = new Set<(joined: ProjectRoomJoinResult) => void>();
  const pendingOperations = new Map<
    string,
    {
      resolve: (result: ProjectRoomOperationResult) => void;
      reject: (error: Error) => void;
    }
  >();
  const pendingPersistenceRequests = new Map<
    string,
    {
      resolve: () => void;
      reject: (error: Error) => void;
    }
  >();
  let socket: WebSocketLike | null = null;
  let activeSessionId: string | null = null;
  let joinPromise: Promise<ProjectRoomJoinResult> | null = null;
  let resolveInitialJoin: ((joined: ProjectRoomJoinResult) => void) | null =
    null;
  let rejectInitialJoin: ((error: Error) => void) | null = null;
  let currentResumeToken = input.resumeToken ?? null;
  let hasJoined = false;
  let stopped = false;
  let reconnectScheduled = false;

  const rejectPending = (error: Error) => {
    for (const pending of pendingOperations.values()) {
      pending.reject(error);
    }
    pendingOperations.clear();
    for (const pending of pendingPersistenceRequests.values()) {
      pending.reject(error);
    }
    pendingPersistenceRequests.clear();
  };

  const scheduleReconnect =
    input.scheduleReconnect ??
    ((callback: () => void, delayMs: number) =>
      window.setTimeout(callback, delayMs));

  const connect = () => {
    let nextSocket: WebSocketLike;
    try {
      nextSocket = new WebSocketImpl(
        createRoomSocketUrl({
          bridgeBaseUrl: input.bridgeBaseUrl,
          launchTicket: hasJoined ? null : input.launchTicket,
          resumeToken: currentResumeToken,
        }),
      );
    } catch (error) {
      rejectInitialJoin?.(
        error instanceof Error ? error : new Error(String(error)),
      );
      return;
    }
    socket = nextSocket;
    reconnectScheduled = false;
    nextSocket.addEventListener("message", (event) => {
      let message: any;
      try {
        message = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (message.type === "room.joined") {
        activeSessionId = message.sessionId;
        if (typeof message.resumeToken === "string") {
          currentResumeToken = message.resumeToken;
          input.replaceResumeToken?.(message.resumeToken);
        }
        const joined: ProjectRoomJoinResult = {
          snapshot: message.snapshot,
          sessionId: message.sessionId,
          resumeToken: message.resumeToken,
          ...(message.bootstrap ? { bootstrap: message.bootstrap } : {}),
        };
        if (!hasJoined) {
          hasJoined = true;
          resolveInitialJoin?.(joined);
          resolveInitialJoin = null;
          rejectInitialJoin = null;
        } else {
          for (const listener of snapshotListeners) {
            listener(joined);
          }
        }
        return;
      }
      if (message.type === "room.snapshot") {
        if (!activeSessionId) {
          return;
        }
        const joined = {
          snapshot: message.snapshot,
          sessionId: activeSessionId,
        };
        for (const listener of snapshotListeners) {
          listener(joined);
        }
        return;
      }
      if (message.type === "room.event") {
        if (message.event?.type === "room.closed") {
          stopped = true;
        }
        for (const listener of listeners) {
          listener(message.event);
        }
        return;
      }
      if (message.type === "operation.result") {
        const operationId = message.result?.operationId;
        const pending = pendingOperations.get(operationId);
        if (pending) {
          pendingOperations.delete(operationId);
          pending.resolve(message.result);
        }
        return;
      }
      if (message.type === "room.persistence-flushed") {
        const pending = pendingPersistenceRequests.get(message.requestId);
        if (pending) {
          pendingPersistenceRequests.delete(message.requestId);
          pending.resolve();
        }
        return;
      }
      if (message.type === "room.error") {
        const error = toError(message);
        rejectInitialJoin?.(error);
        if (message.operationId) {
          const pending = pendingOperations.get(message.operationId);
          pendingOperations.delete(message.operationId);
          pending?.reject(error);
        }
        if (message.requestId) {
          const pending = pendingPersistenceRequests.get(message.requestId);
          pendingPersistenceRequests.delete(message.requestId);
          pending?.reject(error);
        }
        const code =
          "code" in error && typeof error.code === "string" ? error.code : "";
        if (
          !message.operationId &&
          !message.requestId &&
          TERMINAL_ROOM_ERROR_CODES.has(code)
        ) {
          stopped = true;
          rejectPending(error);
          input.onTerminalError?.(error);
          nextSocket.close(1008, "terminal room error");
        }
      }
    });
    nextSocket.addEventListener("error", () => {
      const error = new Error("Project room WebSocket failed.");
      rejectInitialJoin?.(error);
      rejectPending(error);
    });
    nextSocket.addEventListener("close", () => {
      const error = new Error("Project room WebSocket disconnected.");
      rejectInitialJoin?.(error);
      rejectPending(error);
      if (socket === nextSocket) {
        socket = null;
      }
      activeSessionId = null;
      if (hasJoined && !stopped && currentResumeToken && !reconnectScheduled) {
        reconnectScheduled = true;
        scheduleReconnect(() => {
          if (!stopped) {
            connect();
          }
        }, input.reconnectDelayMs ?? 500);
      }
    });
  };

  return {
    join: () => {
      if (joinPromise) {
        return joinPromise;
      }
      joinPromise = new Promise<ProjectRoomJoinResult>((resolve, reject) => {
        resolveInitialJoin = resolve;
        rejectInitialJoin = reject;
        connect();
      });
      return joinPromise;
    },
    submitOperation: (operation: ProjectRoomSceneOperation) => {
      if (!socket || socket.readyState !== WebSocketImpl.OPEN) {
        return Promise.reject(
          new Error("Project room WebSocket is not connected."),
        );
      }
      const result = new Promise<ProjectRoomOperationResult>(
        (resolve, reject) => {
          pendingOperations.set(operation.operationId, {
            resolve,
            reject,
          });
        },
      );
      socket.send(
        JSON.stringify({
          type: "scene.operation",
          operation,
        }),
      );
      return result;
    },
    updateSelection: async (selection: ProjectRoomParticipantSelection) => {
      if (!socket || socket.readyState !== WebSocketImpl.OPEN) {
        throw Object.assign(
          new Error("Project room WebSocket is not connected."),
          { code: "ROOM_CLOSED" },
        );
      }
      socket.send(
        JSON.stringify({
          type: "selection.update",
          selection,
        }),
      );
    },
    leave: async (sessionId) => {
      stopped = true;
      if (socket && (!activeSessionId || activeSessionId === sessionId)) {
        if (socket.readyState === WebSocketImpl.OPEN) {
          socket.send(JSON.stringify({ type: "room.leave" }));
        }
        socket.close(1000, "room leave");
      }
      return true;
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    subscribeSnapshot: (listener) => {
      snapshotListeners.add(listener);
      return () => {
        snapshotListeners.delete(listener);
      };
    },
    requestResync: () => {
      if (socket?.readyState === WebSocketImpl.OPEN) {
        socket.send(JSON.stringify({ type: "room.resync" }));
      }
    },
    requestPersistence: () => {
      if (!socket || socket.readyState !== WebSocketImpl.OPEN) {
        return Promise.reject(
          new Error("Project room WebSocket is not connected."),
        );
      }
      const requestId = crypto.randomUUID();
      const result = new Promise<void>((resolve, reject) => {
        pendingPersistenceRequests.set(requestId, { resolve, reject });
      });
      socket.send(
        JSON.stringify({
          type: "room.flush-persistence",
          requestId,
        }),
      );
      return result;
    },
  };
};
