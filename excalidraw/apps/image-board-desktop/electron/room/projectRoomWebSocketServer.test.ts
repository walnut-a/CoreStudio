import http from "node:http";

import { WebSocket } from "ws";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createProjectRoom } from "./projectRoom";
import { attachProjectRoomWebSocketServer } from "./projectRoomWebSocketServer";

const createRoom = () =>
  createProjectRoom({
    identity: {
      projectId: "project-1",
      canonicalProjectPath: "/projects/project-1",
      roomId: "room-1",
      sessionEpoch: 1,
    },
    initialScene: {
      elements: [
        {
          id: "element-1",
          version: 1,
          versionNonce: 10,
          index: "a0",
          isDeleted: false,
          x: 0,
        },
      ],
      sharedSceneConfig: {},
    },
    persistedSequence: 0,
    projectRevision: "revision-1",
  });

const listen = (server: http.Server) =>
  new Promise<number>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(typeof address === "object" && address ? address.port : 0);
    });
  });

const createMessageReader = (socket: WebSocket) => {
  const queued: any[] = [];
  const pending: Array<(message: any) => void> = [];
  socket.on("message", (data) => {
    const message = JSON.parse(data.toString());
    const resolve = pending.shift();
    if (resolve) {
      resolve(message);
    } else {
      queued.push(message);
    }
  });
  return {
    next: () =>
      new Promise<any>((resolve) => {
        const message = queued.shift();
        if (message) {
          resolve(message);
        } else {
          pending.push(resolve);
        }
      }),
  };
};

describe("attachProjectRoomWebSocketServer", () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    await Promise.all(cleanups.splice(0).map((cleanup) => cleanup()));
  });

  it("joins with an authenticated ticket and exchanges room operations", async () => {
    const room = createRoom();
    const validateOperationAssets = vi.fn(async () => undefined);
    const server = http.createServer();
    const attached = attachProjectRoomWebSocketServer({
      server,
      authenticate: vi.fn(async () => ({
        room,
        exchange: {
          sessionId: "board-session",
          resumeToken: "resume-token",
          participant: {
            actorId: "codex:thread-b",
            sessionId: "board-session",
            transport: "websocket" as const,
            role: "board-editor" as const,
            displayLabel: "任务 B",
          },
        },
        validateOperationAssets,
      })),
    });
    const port = await listen(server);
    cleanups.push(async () => {
      await attached.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    });
    const socket = new WebSocket(
      `ws://127.0.0.1:${port}/v1/room?launchTicket=launch-ticket`,
    );
    const messages = createMessageReader(socket);
    await new Promise<void>((resolve, reject) => {
      socket.once("open", () => resolve());
      socket.once("error", reject);
    });

    const joined = await messages.next();
    expect(joined).toMatchObject({
      type: "room.joined",
      sessionId: "board-session",
      resumeToken: "resume-token",
      snapshot: {
        type: "room.snapshot",
        sequence: 0,
      },
    });

    socket.send(
      JSON.stringify({
        type: "selection.update",
        selection: {
          source: "agent-board",
          projectPath: room.identity.canonicalProjectPath,
          updatedAt: "2026-07-23T00:00:00.000Z",
          selection: { selected: true },
          scene: { selectedElementIds: ["element-1"] },
        },
      }),
    );
    await expect(messages.next()).resolves.toEqual({
      type: "selection.updated",
      updatedAt: "2026-07-23T00:00:00.000Z",
    });
    expect(room.getParticipantSelectionByActor("codex:thread-b")).toMatchObject(
      {
        scene: { selectedElementIds: ["element-1"] },
      },
    );

    socket.send(
      JSON.stringify({
        type: "scene.operation",
        operation: {
          ...room.identity,
          operationId: "operation-board",
          baseSequence: 0,
          elements: [
            {
              ...joined.snapshot.scene.elements[0],
              version: 2,
              x: 100,
            },
          ],
          final: true,
        },
      }),
    );
    const roomEvent = await messages.next();
    expect(roomEvent).toMatchObject({
      type: "room.event",
      event: {
        type: "scene.update",
        originSessionId: "board-session",
        operationId: "operation-board",
      },
    });
    const operationResult = await messages.next();
    expect(operationResult).toMatchObject({
      type: "operation.result",
      result: {
        type: "operation.accepted",
        operationId: "operation-board",
      },
    });
    expect(validateOperationAssets).toHaveBeenCalledWith(
      expect.objectContaining({ operationId: "operation-board" }),
    );
    socket.close();
  });

  it("returns structured errors for malformed operations", async () => {
    const room = createRoom();
    const server = http.createServer();
    const attached = attachProjectRoomWebSocketServer({
      server,
      authenticate: vi.fn(async () => ({
        room,
        exchange: {
          sessionId: "board-session",
          resumeToken: "resume-token",
          participant: {
            actorId: "codex:thread-b",
            sessionId: "board-session",
            transport: "websocket" as const,
            role: "board-editor" as const,
            displayLabel: "任务 B",
          },
        },
      })),
    });
    const port = await listen(server);
    cleanups.push(async () => {
      await attached.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    });
    const socket = new WebSocket(
      `ws://127.0.0.1:${port}/v1/room?launchTicket=launch-ticket`,
    );
    const messages = createMessageReader(socket);
    await new Promise<void>((resolve) => socket.once("open", resolve));
    await messages.next();

    socket.send(
      JSON.stringify({
        type: "scene.operation",
        operation: { operationId: "broken" },
      }),
    );

    await expect(messages.next()).resolves.toMatchObject({
      type: "room.error",
      operationId: "broken",
      error: {
        code: "BAD_REQUEST",
        message: expect.any(String),
      },
    });
    socket.close();
  });

  it("does not leave a participant behind when the socket closes during authentication", async () => {
    const room = createRoom();
    let finishAuthentication!: (value: {
      room: ReturnType<typeof createRoom>;
      exchange: {
        sessionId: string;
        resumeToken: string;
        participant: {
          actorId: string;
          sessionId: string;
          transport: "websocket";
          role: "board-editor";
          displayLabel: string;
        };
      };
    }) => void;
    const authentication = new Promise<{
      room: ReturnType<typeof createRoom>;
      exchange: {
        sessionId: string;
        resumeToken: string;
        participant: {
          actorId: string;
          sessionId: string;
          transport: "websocket";
          role: "board-editor";
          displayLabel: string;
        };
      };
    }>((resolve) => {
      finishAuthentication = resolve;
    });
    const server = http.createServer();
    const attached = attachProjectRoomWebSocketServer({
      server,
      authenticate: vi.fn(() => authentication),
    });
    const port = await listen(server);
    cleanups.push(async () => {
      await attached.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    });
    const socket = new WebSocket(
      `ws://127.0.0.1:${port}/v1/room?launchTicket=launch-ticket`,
    );
    await new Promise<void>((resolve, reject) => {
      socket.once("open", () => resolve());
      socket.once("error", reject);
    });
    const closed = new Promise<void>((resolve) =>
      socket.once("close", () => resolve()),
    );
    socket.close();
    await closed;

    finishAuthentication({
      room,
      exchange: {
        sessionId: "board-session",
        resumeToken: "resume-token",
        participant: {
          actorId: "codex:thread-b",
          sessionId: "board-session",
          transport: "websocket",
          role: "board-editor",
          displayLabel: "任务 B",
        },
      },
    });
    await authentication;
    await Promise.resolve();

    expect(room.getSnapshot().participants).toEqual([]);
  });
});
