import { describe, expect, it, vi } from "vitest";

import type { ProjectRoomSceneOperation } from "../shared/projectRoomProtocol";
import { createProjectRoomWebSocketTransport } from "./projectRoomWebSocketTransport";

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static OPEN = 1;
  readyState = 0;
  readonly sent: string[] = [];
  private readonly listeners = new Map<string, Set<(event: any) => void>>();

  constructor(public readonly url: string) {
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type: string, listener: (event: any) => void) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.emit("close", {});
  }

  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.emit("open", {});
  }

  receive(value: unknown) {
    this.emit("message", { data: JSON.stringify(value) });
  }

  private emit(type: string, event: any) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

const snapshot = {
  type: "room.snapshot" as const,
  identity: {
    projectId: "project-1",
    canonicalProjectPath: "/projects/project-1",
    roomId: "room-1",
    sessionEpoch: 1,
  },
  sequence: 0,
  persistedSequence: 0,
  projectRevision: "revision-1",
  scene: {
    elements: [],
    sharedSceneConfig: {},
  },
  participants: [],
};

describe("createProjectRoomWebSocketTransport", () => {
  it("exchanges a launch ticket for a session and resume token", async () => {
    FakeWebSocket.instances = [];
    const replaceResumeToken = vi.fn();
    const transport = createProjectRoomWebSocketTransport({
      bridgeBaseUrl: "http://127.0.0.1:60909",
      launchTicket: "launch-ticket",
      WebSocketImpl: FakeWebSocket as any,
      replaceResumeToken,
    });
    const joinedPromise = transport.join({
      projectPath: "/projects/project-1",
      sessionId: "ignored-browser-session",
    });
    const socket = FakeWebSocket.instances[0];

    expect(socket.url).toBe(
      "ws://127.0.0.1:60909/v1/room?launchTicket=launch-ticket",
    );
    expect(socket.url).not.toContain("projectToken");
    socket.open();
    socket.receive({
      type: "room.joined",
      sessionId: "board-session",
      resumeToken: "resume-token",
      snapshot,
    });

    await expect(joinedPromise).resolves.toEqual({
      snapshot,
      sessionId: "board-session",
      resumeToken: "resume-token",
    });
    expect(replaceResumeToken).toHaveBeenCalledWith("resume-token");
  });

  it("closes an in-flight socket when the client stops before joining", async () => {
    FakeWebSocket.instances = [];
    const transport = createProjectRoomWebSocketTransport({
      bridgeBaseUrl: "http://127.0.0.1:60909",
      launchTicket: "launch-ticket",
      WebSocketImpl: FakeWebSocket as any,
    });
    const joinedPromise = transport.join({
      projectPath: "/projects/project-1",
      sessionId: "ignored-browser-session",
    });
    const socket = FakeWebSocket.instances[0];

    await transport.cancelPendingJoin?.();

    await expect(joinedPromise).rejects.toThrow(
      "Project room WebSocket disconnected.",
    );
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(socket.sent).toEqual([]);
  });

  it("forwards room events and resolves operation results", async () => {
    FakeWebSocket.instances = [];
    const transport = createProjectRoomWebSocketTransport({
      bridgeBaseUrl: "http://127.0.0.1:60909",
      resumeToken: "resume-token",
      WebSocketImpl: FakeWebSocket as any,
    });
    const listener = vi.fn();
    transport.subscribe(listener);
    const joinedPromise = transport.join({
      projectPath: "/projects/project-1",
      sessionId: "ignored",
    });
    const socket = FakeWebSocket.instances[0];
    socket.open();
    socket.receive({
      type: "room.joined",
      sessionId: "board-session",
      resumeToken: "resume-token",
      snapshot,
    });
    await joinedPromise;

    const selection = {
      source: "agent-board" as const,
      projectPath: "/projects/project-1",
      updatedAt: "2026-07-23T00:00:00.000Z",
      selection: { selected: true },
      scene: { selectedElementIds: ["element-1"] },
    };
    await transport.updateSelection?.(selection);
    expect(JSON.parse(socket.sent[0])).toEqual({
      type: "selection.update",
      selection,
    });

    const operation: ProjectRoomSceneOperation = {
      ...snapshot.identity,
      operationId: "operation-1",
      baseSequence: 0,
      elements: [],
    };
    const resultPromise = transport.submitOperation(operation);
    expect(JSON.parse(socket.sent[1])).toEqual({
      type: "scene.operation",
      operation,
    });
    const event = {
      type: "scene.persisted" as const,
      identity: snapshot.identity,
      sequence: 1,
      projectRevision: "revision-2",
    };
    socket.receive({ type: "room.event", event });
    socket.receive({
      type: "operation.result",
      result: {
        type: "operation.accepted",
        operationId: "operation-1",
        sequence: 1,
        acceptedElementIds: [],
        supersededElementIds: [],
      },
    });

    expect(listener).toHaveBeenCalledWith(event);
    await expect(resultPromise).resolves.toMatchObject({
      operationId: "operation-1",
      sequence: 1,
    });

    const persistence = transport.requestPersistence?.();
    const persistenceRequest = JSON.parse(socket.sent[2]);
    expect(persistenceRequest).toMatchObject({
      type: "room.flush-persistence",
      requestId: expect.any(String),
    });
    socket.receive({
      type: "room.persistence-flushed",
      requestId: persistenceRequest.requestId,
    });
    await expect(persistence).resolves.toBeUndefined();
  });

  it("reconnects with the resume token and publishes the new snapshot", async () => {
    FakeWebSocket.instances = [];
    const scheduled: Array<() => void> = [];
    const transport = createProjectRoomWebSocketTransport({
      bridgeBaseUrl: "http://127.0.0.1:60909",
      launchTicket: "launch-ticket",
      WebSocketImpl: FakeWebSocket as any,
      scheduleReconnect: (callback) => {
        scheduled.push(callback);
        return 1;
      },
    });
    const snapshotListener = vi.fn();
    transport.subscribeSnapshot?.(snapshotListener);
    const joinedPromise = transport.join({
      projectPath: "/projects/project-1",
      sessionId: "ignored",
    });
    const firstSocket = FakeWebSocket.instances[0];
    firstSocket.open();
    firstSocket.receive({
      type: "room.joined",
      sessionId: "board-session-1",
      resumeToken: "resume-token",
      snapshot,
    });
    await joinedPromise;

    firstSocket.close();
    expect(scheduled).toHaveLength(1);
    scheduled[0]();
    const secondSocket = FakeWebSocket.instances[1];
    expect(secondSocket.url).toBe(
      "ws://127.0.0.1:60909/v1/room?resumeToken=resume-token",
    );
    secondSocket.open();
    const nextSnapshot = { ...snapshot, sequence: 2 };
    secondSocket.receive({
      type: "room.joined",
      sessionId: "board-session-2",
      resumeToken: "resume-token",
      snapshot: nextSnapshot,
    });

    expect(snapshotListener).toHaveBeenCalledWith({
      snapshot: nextSnapshot,
      sessionId: "board-session-2",
      resumeToken: "resume-token",
    });
  });

  it("retries an unacknowledged operation with the same id after reconnect", async () => {
    FakeWebSocket.instances = [];
    const scheduled: Array<() => void> = [];
    const transport = createProjectRoomWebSocketTransport({
      bridgeBaseUrl: "http://127.0.0.1:60909",
      launchTicket: "launch-ticket",
      WebSocketImpl: FakeWebSocket as any,
      scheduleReconnect: (callback) => {
        scheduled.push(callback);
        return 1;
      },
    });
    const joinedPromise = transport.join({
      projectPath: "/projects/project-1",
      sessionId: "ignored",
    });
    const firstSocket = FakeWebSocket.instances[0];
    firstSocket.open();
    firstSocket.receive({
      type: "room.joined",
      sessionId: "board-session-1",
      resumeToken: "resume-token",
      snapshot,
    });
    await joinedPromise;

    const operation: ProjectRoomSceneOperation = {
      ...snapshot.identity,
      operationId: "operation-retry",
      baseSequence: 0,
      elements: [],
    };
    const resultPromise = transport.submitOperation(operation);
    firstSocket.close();

    scheduled[0]();
    const secondSocket = FakeWebSocket.instances[1];
    secondSocket.open();
    secondSocket.receive({
      type: "room.joined",
      sessionId: "board-session-2",
      resumeToken: "resume-token",
      snapshot: { ...snapshot, sequence: 1 },
    });

    expect(JSON.parse(secondSocket.sent[0])).toEqual({
      type: "scene.operation",
      operation,
    });
    secondSocket.receive({
      type: "operation.result",
      result: {
        type: "operation.accepted",
        operationId: operation.operationId,
        sequence: 1,
        acceptedElementIds: [],
        supersededElementIds: [],
      },
    });
    await expect(resultPromise).resolves.toMatchObject({
      operationId: operation.operationId,
    });
  });

  it("forwards an explicit resync snapshot", async () => {
    FakeWebSocket.instances = [];
    const transport = createProjectRoomWebSocketTransport({
      bridgeBaseUrl: "http://127.0.0.1:60909",
      resumeToken: "resume-token",
      WebSocketImpl: FakeWebSocket as any,
    });
    const snapshotListener = vi.fn();
    transport.subscribeSnapshot?.(snapshotListener);
    const joinedPromise = transport.join({
      projectPath: "/projects/project-1",
      sessionId: "ignored",
    });
    const socket = FakeWebSocket.instances[0];
    socket.open();
    socket.receive({
      type: "room.joined",
      sessionId: "board-session",
      resumeToken: "resume-token",
      snapshot,
    });
    await joinedPromise;

    transport.requestResync?.();
    expect(JSON.parse(socket.sent[0])).toEqual({ type: "room.resync" });
    const nextSnapshot = { ...snapshot, sequence: 4 };
    socket.receive({ type: "room.snapshot", snapshot: nextSnapshot });

    expect(snapshotListener).toHaveBeenCalledWith({
      snapshot: nextSnapshot,
      sessionId: "board-session",
    });
  });

  it("does not reconnect after the room is explicitly closed", async () => {
    FakeWebSocket.instances = [];
    const scheduled: Array<() => void> = [];
    const listener = vi.fn();
    const transport = createProjectRoomWebSocketTransport({
      bridgeBaseUrl: "http://127.0.0.1:60909",
      resumeToken: "resume-token",
      WebSocketImpl: FakeWebSocket as any,
      scheduleReconnect: (callback) => {
        scheduled.push(callback);
        return 1;
      },
    });
    transport.subscribe(listener);
    const joinedPromise = transport.join({
      projectPath: "/projects/project-1",
      sessionId: "ignored",
    });
    const socket = FakeWebSocket.instances[0];
    socket.open();
    socket.receive({
      type: "room.joined",
      sessionId: "board-session",
      resumeToken: "resume-token",
      snapshot,
    });
    await joinedPromise;
    const pendingOperation = transport.submitOperation({
      ...snapshot.identity,
      operationId: "pending-before-room-close",
      baseSequence: snapshot.sequence,
      elements: [],
    });

    const closedEvent = {
      type: "room.closed" as const,
      identity: snapshot.identity,
      reason: "project-closed" as const,
    };
    socket.receive({ type: "room.event", event: closedEvent });
    socket.close();

    expect(listener).toHaveBeenCalledWith(closedEvent);
    await expect(pendingOperation).rejects.toMatchObject({
      code: "ROOM_CLOSED",
    });
    expect(scheduled).toHaveLength(0);
  });

  it("rejects pending work when the participant explicitly leaves", async () => {
    FakeWebSocket.instances = [];
    const transport = createProjectRoomWebSocketTransport({
      bridgeBaseUrl: "http://127.0.0.1:60909",
      resumeToken: "resume-token",
      WebSocketImpl: FakeWebSocket as any,
    });
    const joinedPromise = transport.join({
      projectPath: "/projects/project-1",
      sessionId: "ignored",
    });
    const socket = FakeWebSocket.instances[0];
    socket.open();
    socket.receive({
      type: "room.joined",
      sessionId: "board-session",
      resumeToken: "resume-token",
      snapshot,
    });
    await joinedPromise;

    const pendingOperation = transport.submitOperation({
      ...snapshot.identity,
      operationId: "pending-before-leave",
      baseSequence: snapshot.sequence,
      elements: [],
    });
    const pendingPersistence = transport.requestPersistence?.();

    await transport.leave("board-session");

    await expect(pendingOperation).rejects.toMatchObject({
      code: "ROOM_CLOSED",
    });
    await expect(pendingPersistence).rejects.toMatchObject({
      code: "ROOM_CLOSED",
    });
    expect(socket.sent.map((message) => JSON.parse(message))).toContainEqual({
      type: "room.leave",
    });
  });

  it("stops reconnecting after a terminal resume error", async () => {
    FakeWebSocket.instances = [];
    const scheduled: Array<() => void> = [];
    const onTerminalError = vi.fn();
    const transport = createProjectRoomWebSocketTransport({
      bridgeBaseUrl: "http://127.0.0.1:60909",
      resumeToken: "resume-token",
      WebSocketImpl: FakeWebSocket as any,
      onTerminalError,
      scheduleReconnect: (callback) => {
        scheduled.push(callback);
        return 1;
      },
    });
    const joinedPromise = transport.join({
      projectPath: "/projects/project-1",
      sessionId: "ignored",
    });
    const socket = FakeWebSocket.instances[0];
    socket.open();
    socket.receive({
      type: "room.joined",
      sessionId: "board-session",
      resumeToken: "resume-token",
      snapshot,
    });
    await joinedPromise;

    socket.receive({
      type: "room.error",
      error: {
        code: "SESSION_EPOCH_EXPIRED",
        message: "project session expired",
        details: { expectedSessionEpoch: 2 },
      },
    });

    expect(onTerminalError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "SESSION_EPOCH_EXPIRED",
        details: { expectedSessionEpoch: 2 },
      }),
    );
    expect(scheduled).toHaveLength(0);
  });
});
