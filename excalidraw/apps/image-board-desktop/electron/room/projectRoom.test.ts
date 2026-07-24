import { describe, expect, it, vi } from "vitest";

import { createProjectRoom, type ProjectRoomParticipant } from "./projectRoom";

const initialElements = [
  {
    id: "element-a",
    version: 1,
    versionNonce: 101,
    index: "a0",
    isDeleted: false,
    x: 0,
  },
  {
    id: "element-b",
    version: 1,
    versionNonce: 102,
    index: "a1",
    isDeleted: false,
    x: 0,
  },
];

const desktopParticipant: ProjectRoomParticipant = {
  actorId: "corestudio:desktop",
  sessionId: "desktop-session",
  transport: "ipc",
  role: "desktop-editor",
  displayLabel: "CoreStudio",
};

const boardParticipant: ProjectRoomParticipant = {
  actorId: "codex:thread-b",
  sessionId: "board-session",
  transport: "websocket",
  role: "board-editor",
  displayLabel: "任务 B",
};

const agentWriterParticipant: ProjectRoomParticipant = {
  actorId: "codex:thread-b",
  sessionId: "agent-writer-session",
  transport: "command",
  role: "agent-writer",
  displayLabel: "任务 B",
};

const createRoom = () =>
  createProjectRoom({
    identity: {
      projectId: "project-1",
      canonicalProjectPath: "/projects/project-1",
      roomId: "room-1",
      sessionEpoch: 7,
    },
    initialScene: {
      elements: initialElements,
      sharedSceneConfig: { viewBackgroundColor: "#ffffff" },
    },
    persistedSequence: 0,
    projectRevision: "revision-1",
  });

describe("ProjectRoom", () => {
  it("joins participants with an atomic authoritative snapshot", () => {
    const room = createRoom();

    const joined = room.join(desktopParticipant);

    expect(joined).toEqual({
      type: "room.snapshot",
      identity: room.identity,
      sequence: 0,
      persistedSequence: 0,
      projectRevision: "revision-1",
      scene: {
        elements: initialElements,
        sharedSceneConfig: { viewBackgroundColor: "#ffffff" },
      },
      imageRecords: {},
      participants: [desktopParticipant],
    });
    expect(joined.scene.elements).not.toBe(initialElements);
  });

  it("subscribes a joining participant before returning its snapshot", () => {
    const room = createRoom();
    room.join(desktopParticipant);
    const boardEvents: unknown[] = [];

    const snapshot = room.join(boardParticipant, (event) => {
      boardEvents.push(event);
    });
    room.applySceneOperation(desktopParticipant.sessionId, {
      ...room.identity,
      operationId: "operation-after-board-join",
      baseSequence: snapshot.sequence,
      elements: [{ ...initialElements[0], version: 2, x: 40 }],
      final: true,
    });

    expect(boardEvents).toHaveLength(1);
    expect(boardEvents[0]).toMatchObject({
      type: "scene.update",
      sequence: snapshot.sequence + 1,
      operationId: "operation-after-board-join",
    });
  });

  it("broadcasts the current participant list when participants join and leave", () => {
    const room = createRoom();
    const listener = vi.fn();
    room.subscribe(listener);

    room.join(desktopParticipant);
    room.join(boardParticipant);
    room.leave(boardParticipant.sessionId);

    expect(listener.mock.calls.map(([event]) => event)).toEqual([
      expect.objectContaining({
        type: "participants.changed",
        participants: [desktopParticipant],
      }),
      expect.objectContaining({
        type: "participants.changed",
        participants: [desktopParticipant, boardParticipant],
      }),
      expect.objectContaining({
        type: "participants.changed",
        participants: [desktopParticipant],
      }),
    ]);
  });

  it("keeps participant selection as ephemeral actor state", () => {
    const room = createRoom();
    room.join(boardParticipant);
    const selection = {
      source: "agent-board" as const,
      projectPath: room.identity.canonicalProjectPath,
      updatedAt: "2026-07-23T00:00:00.000Z",
      selection: { selected: true, kind: "image" },
      scene: {
        selectedElementIds: ["element-a"],
      },
    };

    room.updateParticipantSelection(boardParticipant.sessionId, selection);

    expect(room.getParticipantSelectionByActor("codex:thread-b")).toEqual(
      selection,
    );
    expect(room.getSnapshot()).not.toHaveProperty("selection");
    room.leave(boardParticipant.sessionId);
    expect(room.getParticipantSelectionByActor("codex:thread-b")).toBeNull();
  });

  it("merges changes to different elements and broadcasts ordered operations", () => {
    const room = createRoom();
    room.join(desktopParticipant);
    room.join(boardParticipant);
    const listener = vi.fn();
    room.subscribe(listener);

    const desktopResult = room.applySceneOperation(
      desktopParticipant.sessionId,
      {
        projectId: "project-1",
        canonicalProjectPath: "/projects/project-1",
        roomId: "room-1",
        sessionEpoch: 7,
        operationId: "operation-desktop",
        interactionId: "drag-a",
        baseSequence: 0,
        elements: [{ ...initialElements[0], version: 2, x: 40 }],
        final: true,
      },
    );
    const boardResult = room.applySceneOperation(boardParticipant.sessionId, {
      projectId: "project-1",
      canonicalProjectPath: "/projects/project-1",
      roomId: "room-1",
      sessionEpoch: 7,
      operationId: "operation-board",
      interactionId: "drag-b",
      baseSequence: 0,
      elements: [{ ...initialElements[1], version: 2, x: 80 }],
      final: true,
    });

    expect(desktopResult).toMatchObject({
      type: "operation.accepted",
      operationId: "operation-desktop",
      sequence: 1,
      acceptedElementIds: ["element-a"],
      supersededElementIds: [],
    });
    expect(boardResult).toMatchObject({
      type: "operation.accepted",
      operationId: "operation-board",
      sequence: 2,
      acceptedElementIds: ["element-b"],
      supersededElementIds: [],
    });
    expect(room.getSnapshot().scene.elements).toMatchObject([
      { id: "element-a", x: 40 },
      { id: "element-b", x: 80 },
    ]);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.calls.map(([event]) => event.sequence)).toEqual([
      1, 2,
    ]);
    expect(listener.mock.calls[0][0]).toMatchObject({
      type: "scene.update",
      originSessionId: "desktop-session",
      operationId: "operation-desktop",
    });
  });

  it("accepts semantic command results only through an agent-writer operation", () => {
    const room = createRoom();
    room.join(desktopParticipant);
    room.join(agentWriterParticipant);
    const listener = vi.fn();
    room.subscribe(listener);
    const operation = {
      ...room.identity,
      operationId: "operation-agent-writer",
      baseSequence: 0,
      elements: [{ ...initialElements[0], version: 2, x: 120 }],
      final: true,
    };

    expect(() =>
      room.applySceneOperation(agentWriterParticipant.sessionId, operation),
    ).toThrowError(
      expect.objectContaining({
        code: "FORBIDDEN",
      }),
    );

    const result = room.applyAgentCommandOperation(
      agentWriterParticipant.sessionId,
      operation,
    );

    expect(result).toMatchObject({
      type: "operation.accepted",
      operationId: "operation-agent-writer",
      sequence: 1,
    });
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: "scene.update",
        originSessionId: "agent-writer-session",
        originActorId: "codex:thread-b",
      }),
    );
  });

  it("rejects desktop and board sessions on the agent command path", () => {
    const room = createRoom();
    room.join(desktopParticipant);
    room.join(boardParticipant);
    const operation = {
      ...room.identity,
      operationId: "operation-spoofed-agent-writer",
      baseSequence: 0,
      elements: [{ ...initialElements[0], version: 2, x: 120 }],
      final: true,
    };

    expect(() =>
      room.applyAgentCommandOperation(desktopParticipant.sessionId, operation),
    ).toThrowError(expect.objectContaining({ code: "FORBIDDEN" }));
    expect(() =>
      room.applyAgentCommandOperation(boardParticipant.sessionId, operation),
    ).toThrowError(expect.objectContaining({ code: "FORBIDDEN" }));
  });

  it("returns the original result when an operation is retried", () => {
    const room = createRoom();
    room.join(desktopParticipant);
    const operation = {
      projectId: "project-1",
      canonicalProjectPath: "/projects/project-1",
      roomId: "room-1",
      sessionEpoch: 7,
      operationId: "operation-1",
      baseSequence: 0,
      elements: [{ ...initialElements[0], version: 2, x: 40 }],
      final: true,
    };

    const first = room.applySceneOperation(
      desktopParticipant.sessionId,
      operation,
    );
    const retry = room.applySceneOperation(
      desktopParticipant.sessionId,
      operation,
    );

    expect(retry).toEqual(first);
    expect(room.sequence).toBe(1);
  });

  it("bounds retained operation ids for long-lived rooms", () => {
    const room = createProjectRoom({
      identity: {
        projectId: "project-1",
        canonicalProjectPath: "/projects/project-1",
        roomId: "room-1",
        sessionEpoch: 7,
      },
      initialScene: {
        elements: initialElements,
        sharedSceneConfig: {},
      },
      persistedSequence: 0,
      projectRevision: "revision-1",
      operationHistoryLimit: 2,
    });
    room.join(desktopParticipant);
    room.join(boardParticipant);
    for (const [index, operationId] of [
      "operation-1",
      "operation-2",
      "operation-3",
    ].entries()) {
      room.applySceneOperation(desktopParticipant.sessionId, {
        ...room.identity,
        operationId,
        baseSequence: index,
        elements: [
          {
            ...initialElements[0],
            version: index + 2,
            versionNonce: 200 + index,
            x: index + 1,
          },
        ],
        final: true,
      });
    }

    expect(() =>
      room.applySceneOperation(boardParticipant.sessionId, {
        ...room.identity,
        operationId: "operation-1",
        baseSequence: 3,
        elements: [
          {
            ...initialElements[1],
            version: 2,
            versionNonce: 300,
            x: 100,
          },
        ],
        final: true,
      }),
    ).not.toThrow();
  });

  it("broadcasts an operation back to its origin session as confirmation", () => {
    const room = createRoom();
    const originEvents: unknown[] = [];
    room.join(desktopParticipant, (event) => originEvents.push(event));

    room.applySceneOperation(desktopParticipant.sessionId, {
      ...room.identity,
      operationId: "operation-self-confirmation",
      baseSequence: 0,
      elements: [{ ...initialElements[0], version: 2, x: 40 }],
      final: true,
    });

    expect(originEvents).toEqual([
      expect.objectContaining({
        type: "scene.update",
        originSessionId: desktopParticipant.sessionId,
        operationId: "operation-self-confirmation",
        sequence: 1,
      }),
    ]);
  });

  it("accepts shared project scene config only from the desktop editor", () => {
    const room = createRoom();
    room.join(desktopParticipant);
    room.join(boardParticipant);

    room.applySceneOperation(desktopParticipant.sessionId, {
      ...room.identity,
      operationId: "desktop-config",
      baseSequence: 0,
      elements: [],
      sharedSceneConfig: {
        viewBackgroundColor: "#f5f5f5",
        gridSize: 20,
      },
      final: true,
    });

    expect(room.getSnapshot().scene.sharedSceneConfig).toEqual({
      viewBackgroundColor: "#f5f5f5",
      gridSize: 20,
    });
    expect(() =>
      room.applySceneOperation(boardParticipant.sessionId, {
        ...room.identity,
        operationId: "board-config",
        baseSequence: 1,
        elements: [],
        sharedSceneConfig: { viewBackgroundColor: "#000000" },
        final: true,
      }),
    ).toThrowError(expect.objectContaining({ code: "FORBIDDEN" }));
  });

  it("rejects arbitrary scene operations from agent-writer participants", () => {
    const room = createRoom();
    const agentParticipant: ProjectRoomParticipant = {
      actorId: "codex:thread-agent",
      sessionId: "agent-session",
      transport: "command",
      role: "agent-writer",
      displayLabel: "Codex Agent",
    };
    room.join(agentParticipant);

    expect(() =>
      room.applySceneOperation(agentParticipant.sessionId, {
        ...room.identity,
        operationId: "arbitrary-agent-operation",
        baseSequence: 0,
        elements: [{ ...initialElements[0], version: 2, x: 40 }],
        final: true,
      }),
    ).toThrowError(expect.objectContaining({ code: "FORBIDDEN" }));
  });

  it("reports elements superseded by the authoritative version", () => {
    const room = createRoom();
    room.join(desktopParticipant);

    const result = room.applySceneOperation(desktopParticipant.sessionId, {
      projectId: "project-1",
      canonicalProjectPath: "/projects/project-1",
      roomId: "room-1",
      sessionEpoch: 7,
      operationId: "operation-older",
      baseSequence: 0,
      elements: [{ ...initialElements[0], version: 1, versionNonce: 999 }],
      final: true,
    });

    expect(result).toMatchObject({
      type: "operation.superseded",
      sequence: 1,
      acceptedElementIds: [],
      supersededElementIds: ["element-a"],
    });
    expect(room.getSnapshot().scene.elements[0]).toEqual(initialElements[0]);
  });

  it.each([
    ["projectId", "another-project", "PROJECT_MISMATCH"],
    ["canonicalProjectPath", "/projects/another", "PROJECT_MISMATCH"],
    ["roomId", "old-room", "ROOM_MISMATCH"],
    ["sessionEpoch", 6, "SESSION_EPOCH_EXPIRED"],
  ] as const)(
    "rejects operations with a mismatched %s",
    (field, value, expectedCode) => {
      const room = createRoom();
      room.join(desktopParticipant);

      expect(() =>
        room.applySceneOperation(desktopParticipant.sessionId, {
          projectId: "project-1",
          canonicalProjectPath: "/projects/project-1",
          roomId: "room-1",
          sessionEpoch: 7,
          operationId: `operation-${field}`,
          baseSequence: 0,
          elements: [],
          final: true,
          [field]: value,
        }),
      ).toThrowError(expect.objectContaining({ code: expectedCode }));
    },
  );

  it("rejects a participant after it leaves and rejects all writes after close", () => {
    const room = createRoom();
    room.join(desktopParticipant);
    room.leave(desktopParticipant.sessionId);

    expect(() =>
      room.applySceneOperation(desktopParticipant.sessionId, {
        projectId: "project-1",
        canonicalProjectPath: "/projects/project-1",
        roomId: "room-1",
        sessionEpoch: 7,
        operationId: "operation-after-leave",
        baseSequence: 0,
        elements: [],
        final: true,
      }),
    ).toThrowError(expect.objectContaining({ code: "SESSION_NOT_FOUND" }));

    room.join(desktopParticipant);
    room.close();
    expect(room.lifecycle).toBe("closed");
    expect(() =>
      room.applySceneOperation(desktopParticipant.sessionId, {
        projectId: "project-1",
        canonicalProjectPath: "/projects/project-1",
        roomId: "room-1",
        sessionEpoch: 7,
        operationId: "operation-after-close",
        baseSequence: 0,
        elements: [],
        final: true,
      }),
    ).toThrowError(expect.objectContaining({ code: "ROOM_CLOSED" }));
  });

  it("atomically rejects new operations once closing begins", () => {
    const room = createRoom();
    room.join(desktopParticipant);
    const listener = vi.fn();
    room.subscribe(listener);

    room.beginClosing();

    expect(room.lifecycle).toBe("closing");
    expect(listener).toHaveBeenCalledWith({
      type: "room.closing",
      identity: room.identity,
    });
    expect(() =>
      room.applySceneOperation(desktopParticipant.sessionId, {
        ...room.identity,
        operationId: "operation-during-close",
        baseSequence: 0,
        elements: [],
        final: true,
      }),
    ).toThrowError(expect.objectContaining({ code: "ROOM_CLOSING" }));
  });

  it("debounces persistence and writes the latest authoritative sequence", async () => {
    vi.useFakeTimers();
    const persist = vi.fn(async ({ sequence }: { sequence: number }) => ({
      projectRevision: `revision-${sequence}`,
    }));
    const room = createProjectRoom({
      identity: {
        projectId: "project-1",
        canonicalProjectPath: "/projects/project-1",
        roomId: "room-1",
        sessionEpoch: 7,
      },
      initialScene: {
        elements: initialElements,
        sharedSceneConfig: { viewBackgroundColor: "#ffffff" },
      },
      persistedSequence: 0,
      projectRevision: "revision-0",
      persistence: {
        debounceMs: 100,
        persist,
      },
    });
    room.join(desktopParticipant);

    room.applySceneOperation(desktopParticipant.sessionId, {
      ...room.identity,
      operationId: "operation-1",
      baseSequence: 0,
      elements: [{ ...initialElements[0], version: 2, x: 40 }],
      final: false,
    });
    room.applySceneOperation(desktopParticipant.sessionId, {
      ...room.identity,
      operationId: "operation-2",
      baseSequence: 1,
      elements: [{ ...initialElements[0], version: 3, x: 80 }],
      final: true,
    });

    expect(persist).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);

    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith({
      identity: room.identity,
      sequence: 2,
      previousProjectRevision: "revision-0",
      scene: {
        elements: expect.arrayContaining([
          expect.objectContaining({ id: "element-a", x: 80 }),
        ]),
        sharedSceneConfig: { viewBackgroundColor: "#ffffff" },
      },
    });
    expect(room.persistedSequence).toBe(2);
    expect(room.projectRevision).toBe("revision-2");
    vi.useRealTimers();
  });

  it("serializes overlapping persistence and follows up with the newest sequence", async () => {
    let finishFirstWrite:
      | ((result: { projectRevision: string }) => void)
      | undefined;
    const firstWrite = new Promise<{ projectRevision: string }>((resolve) => {
      finishFirstWrite = resolve;
    });
    const persist = vi
      .fn()
      .mockImplementationOnce(() => firstWrite)
      .mockResolvedValueOnce({ projectRevision: "revision-2" });
    const room = createProjectRoom({
      identity: {
        projectId: "project-1",
        canonicalProjectPath: "/projects/project-1",
        roomId: "room-1",
        sessionEpoch: 7,
      },
      initialScene: {
        elements: initialElements,
        sharedSceneConfig: {},
      },
      persistedSequence: 0,
      projectRevision: "revision-0",
      persistence: { debounceMs: 10_000, persist },
    });
    room.join(desktopParticipant);

    room.applySceneOperation(desktopParticipant.sessionId, {
      ...room.identity,
      operationId: "operation-1",
      baseSequence: 0,
      elements: [{ ...initialElements[0], version: 2, x: 40 }],
      final: true,
    });
    const firstFlush = room.flushPersistence();
    await vi.waitFor(() => expect(persist).toHaveBeenCalledTimes(1));
    room.applySceneOperation(desktopParticipant.sessionId, {
      ...room.identity,
      operationId: "operation-2",
      baseSequence: 1,
      elements: [{ ...initialElements[1], version: 2, x: 80 }],
      final: true,
    });
    const secondFlush = room.flushPersistence();

    expect(persist).toHaveBeenCalledTimes(1);
    finishFirstWrite?.({ projectRevision: "revision-1" });
    await firstFlush;
    await secondFlush;

    expect(persist).toHaveBeenCalledTimes(2);
    expect(persist.mock.calls[0][0]).toMatchObject({
      sequence: 1,
      previousProjectRevision: "revision-0",
    });
    expect(persist.mock.calls[1][0]).toMatchObject({
      sequence: 2,
      previousProjectRevision: "revision-1",
    });
    expect(room.persistedSequence).toBe(2);
    expect(room.projectRevision).toBe("revision-2");
  });

  it("reports persistence failure and allows a later retry", async () => {
    const persist = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error("disk unavailable"), {
          details: { path: "/projects/project-1" },
        }),
      )
      .mockResolvedValueOnce({ projectRevision: "revision-1" });
    const room = createProjectRoom({
      identity: {
        projectId: "project-1",
        canonicalProjectPath: "/projects/project-1",
        roomId: "room-1",
        sessionEpoch: 7,
      },
      initialScene: {
        elements: initialElements,
        sharedSceneConfig: {},
      },
      persistedSequence: 0,
      projectRevision: "revision-0",
      persistence: { debounceMs: 10_000, persist },
    });
    const listener = vi.fn();
    room.subscribe(listener);
    room.join(desktopParticipant);
    room.applySceneOperation(desktopParticipant.sessionId, {
      ...room.identity,
      operationId: "operation-1",
      baseSequence: 0,
      elements: [{ ...initialElements[0], version: 2, x: 40 }],
      final: true,
    });

    await expect(room.flushPersistence()).rejects.toThrow("disk unavailable");
    expect(room.lifecycle).toBe("storage-error");
    expect(listener).toHaveBeenCalledWith({
      type: "scene.persistence-failed",
      identity: room.identity,
      sequence: 1,
      error: {
        code: "PERSISTENCE_FAILED",
        message: "disk unavailable",
        details: { path: "/projects/project-1" },
      },
    });

    await expect(room.flushPersistence()).resolves.toBeUndefined();
    expect(room.lifecycle).toBe("active");
    expect(room.persistedSequence).toBe(1);
  });
});
