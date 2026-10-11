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
        baseSequence: 0,
        elements: [{ ...initialElements[0], version: 2, x: 40 }],
      },
    );
    const boardResult = room.applySceneOperation(boardParticipant.sessionId, {
      projectId: "project-1",
      canonicalProjectPath: "/projects/project-1",
      roomId: "room-1",
      sessionEpoch: 7,
      operationId: "operation-board",
      baseSequence: 0,
      elements: [{ ...initialElements[1], version: 2, x: 80 }],
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
    });
    const firstFlush = room.flushPersistence();
    await vi.waitFor(() => expect(persist).toHaveBeenCalledTimes(1));
    room.applySceneOperation(desktopParticipant.sessionId, {
      ...room.identity,
      operationId: "operation-2",
      baseSequence: 1,
      elements: [{ ...initialElements[1], version: 2, x: 80 }],
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
});
