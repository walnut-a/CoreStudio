import type http from "node:http";

import { WebSocket, WebSocketServer } from "ws";

import {
  isProjectRoomSceneOperation,
  isProjectRoomParticipantSelection,
  type ProjectRoomEvent,
  type ProjectRoomBootstrap,
  type ProjectRoomSceneOperation,
} from "../../src/shared/projectRoomProtocol";

import type { ProjectRoom } from "./projectRoom";
import type { ProjectRoomTicketExchange } from "./projectRoomTicketStore";

export interface AuthenticateProjectRoomWebSocketInput {
  launchTicket: string | null;
  resumeToken: string | null;
}

export interface AuthenticatedProjectRoomWebSocket {
  room: ProjectRoom;
  exchange: ProjectRoomTicketExchange;
  bootstrap?: ProjectRoomBootstrap;
  validateOperationAssets?: (
    operation: ProjectRoomSceneOperation,
  ) => Promise<void>;
}

export interface AttachProjectRoomWebSocketServerInput {
  server: http.Server;
  path?: string;
  allowOrigin?: (origin: string) => boolean;
  authenticate: (
    input: AuthenticateProjectRoomWebSocketInput,
  ) => Promise<AuthenticatedProjectRoomWebSocket>;
}

const getErrorEnvelope = (
  error: unknown,
  operationId?: string,
  requestId?: string,
) => ({
  type: "room.error" as const,
  ...(operationId ? { operationId } : {}),
  ...(requestId ? { requestId } : {}),
  error: {
    code:
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "COMMAND_FAILED",
    message: error instanceof Error ? error.message : String(error),
    ...(error && typeof error === "object" && "details" in error
      ? { details: error.details }
      : {}),
  },
});

const sendJson = (socket: WebSocket, value: unknown) => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(value));
  }
};

const hasAllowedOrigin = (
  request: http.IncomingMessage,
  allowOrigin?: (origin: string) => boolean,
) => {
  const origin = request.headers.origin;
  if (!origin) {
    return true;
  }
  const host = request.headers.host;
  if (!host) {
    return false;
  }
  return (
    origin === `http://${host}` ||
    origin === `https://${host}` ||
    allowOrigin?.(origin) === true
  );
};

export const attachProjectRoomWebSocketServer = ({
  server,
  path = "/v1/room",
  allowOrigin,
  authenticate,
}: AttachProjectRoomWebSocketServerInput) => {
  const webSocketServer = new WebSocketServer({ noServer: true });
  const sockets = new Set<WebSocket>();

  const handleUpgrade = (
    request: http.IncomingMessage,
    socket: import("node:stream").Duplex,
    head: Buffer,
  ) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (url.pathname !== path) {
      return;
    }
    if (!hasAllowedOrigin(request, allowOrigin)) {
      socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    webSocketServer.handleUpgrade(request, socket, head, (webSocket) => {
      sockets.add(webSocket);
      let room: ProjectRoom | null = null;
      let sessionId: string | null = null;
      let socketClosed = false;
      webSocket.on("close", () => {
        socketClosed = true;
        sockets.delete(webSocket);
        if (room && sessionId) {
          room.leave(sessionId);
        }
      });
      webSocket.on("error", () => {
        // Close handling removes the participant.
      });
      void (async () => {
        try {
          const authenticated = await authenticate({
            launchTicket: url.searchParams.get("launchTicket"),
            resumeToken: url.searchParams.get("resumeToken"),
          });
          if (socketClosed || webSocket.readyState !== WebSocket.OPEN) {
            return;
          }
          room = authenticated.room;
          sessionId = authenticated.exchange.sessionId;
          const bufferedEvents: ProjectRoomEvent[] = [];
          let snapshotSent = false;
          const snapshot = room.join(
            authenticated.exchange.participant,
            (event) => {
              if (!snapshotSent) {
                bufferedEvents.push(event);
                return;
              }
              sendJson(webSocket, { type: "room.event", event });
              if (event.type === "room.closed") {
                webSocket.close(1001, "project room closed");
              }
            },
          );
          sendJson(webSocket, {
            type: "room.joined",
            sessionId,
            resumeToken: authenticated.exchange.resumeToken,
            snapshot,
            ...(authenticated.bootstrap
              ? { bootstrap: authenticated.bootstrap }
              : {}),
          });
          snapshotSent = true;
          for (const event of bufferedEvents) {
            sendJson(webSocket, { type: "room.event", event });
          }

          let messageQueue: Promise<void> = Promise.resolve();
          webSocket.on("message", (data: unknown) => {
            let operationId: string | undefined;
            let requestId: string | undefined;
            messageQueue = messageQueue.then(async () => {
              try {
                const message = JSON.parse(String(data)) as unknown;
                if (
                  !message ||
                  typeof message !== "object" ||
                  !("type" in message)
                ) {
                  throw Object.assign(new Error("Invalid room message."), {
                    code: "BAD_REQUEST",
                  });
                }
                if (message.type === "scene.operation") {
                  const operation =
                    "operation" in message ? message.operation : undefined;
                  if (
                    operation &&
                    typeof operation === "object" &&
                    "operationId" in operation &&
                    typeof operation.operationId === "string"
                  ) {
                    operationId = operation.operationId;
                  }
                  if (!isProjectRoomSceneOperation(operation)) {
                    throw Object.assign(
                      new Error("Invalid project room scene operation."),
                      { code: "BAD_REQUEST" },
                    );
                  }
                  await authenticated.validateOperationAssets?.(operation);
                  const result = room?.applySceneOperation(
                    sessionId as string,
                    operation,
                  );
                  sendJson(webSocket, {
                    type: "operation.result",
                    result,
                  });
                  return;
                }
                if (message.type === "room.resync") {
                  sendJson(webSocket, {
                    type: "room.snapshot",
                    snapshot: room?.getSnapshot(),
                  });
                  return;
                }
                if (message.type === "room.flush-persistence") {
                  requestId =
                    "requestId" in message &&
                    typeof message.requestId === "string"
                      ? message.requestId
                      : undefined;
                  if (!requestId) {
                    throw Object.assign(
                      new Error("Persistence request id is required."),
                      { code: "BAD_REQUEST" },
                    );
                  }
                  await room?.flushPersistence();
                  sendJson(webSocket, {
                    type: "room.persistence-flushed",
                    requestId,
                  });
                  return;
                }
                if (message.type === "selection.update") {
                  const selection =
                    "selection" in message ? message.selection : undefined;
                  if (!isProjectRoomParticipantSelection(selection)) {
                    throw Object.assign(
                      new Error("Invalid project room participant selection."),
                      { code: "BAD_REQUEST" },
                    );
                  }
                  room?.updateParticipantSelection(
                    sessionId as string,
                    selection,
                  );
                  sendJson(webSocket, {
                    type: "selection.updated",
                    updatedAt: selection.updatedAt,
                  });
                  return;
                }
                if (message.type === "room.leave") {
                  webSocket.close(1000, "room leave");
                  return;
                }
                throw Object.assign(new Error("Unsupported room message."), {
                  code: "BAD_REQUEST",
                });
              } catch (error) {
                sendJson(
                  webSocket,
                  getErrorEnvelope(error, operationId, requestId),
                );
              }
            });
          });
        } catch (error) {
          sendJson(webSocket, getErrorEnvelope(error));
          webSocket.close(1008, "room authentication failed");
        }
      })();
    });
  };

  server.on("upgrade", handleUpgrade);

  return {
    close: async () => {
      server.off("upgrade", handleUpgrade);
      for (const socket of sockets) {
        socket.close(1001, "room server closing");
      }
      await new Promise<void>((resolve, reject) => {
        webSocketServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
};
