import { describe, expect, it } from "vitest";

import { createProjectRoomManager } from "./roomManager";

const roomInput = (projectId: string) => ({
  identity: {
    projectId,
    canonicalProjectPath: `/projects/${projectId}`,
    roomId: `room-${projectId}`,
    sessionEpoch: 1,
  },
  initialScene: {
    elements: [
      {
        id: `element-${projectId}`,
        version: 1,
        versionNonce: 1,
        index: "a0",
        isDeleted: false,
        x: 0,
      },
    ],
    sharedSceneConfig: {},
  },
  persistedSequence: 0,
  projectRevision: `revision-${projectId}`,
});

describe("ProjectRoomManager", () => {
  it("keeps two project rooms and their operations isolated", () => {
    const manager = createProjectRoomManager();
    const roomA = manager.open(roomInput("project-a"));
    const roomB = manager.open(roomInput("project-b"));
    const participantA = {
      actorId: "corestudio:desktop",
      sessionId: "session-a",
      transport: "ipc" as const,
      role: "desktop-editor" as const,
      displayLabel: "CoreStudio A",
    };
    const participantB = {
      ...participantA,
      sessionId: "session-b",
      displayLabel: "CoreStudio B",
    };
    roomA.join(participantA);
    roomB.join(participantB);

    roomA.applySceneOperation("session-a", {
      ...roomA.identity,
      operationId: "operation-a",
      baseSequence: 0,
      elements: [
        {
          ...roomA.getSnapshot().scene.elements[0],
          version: 2,
          x: 100,
        },
      ],
    });

    expect(manager.size).toBe(2);
    expect(roomA.sequence).toBe(1);
    expect(roomB.sequence).toBe(0);
    expect(roomA.getSnapshot().scene.elements[0]).toMatchObject({ x: 100 });
    expect(roomB.getSnapshot().scene.elements[0]).toMatchObject({ x: 0 });
  });

  it("returns the existing room for the same project and rejects conflicting identity", () => {
    const manager = createProjectRoomManager();
    const room = manager.open(roomInput("project-a"));

    expect(manager.open(roomInput("project-a"))).toBe(room);
    expect(() =>
      manager.open({
        ...roomInput("project-a"),
        identity: {
          ...roomInput("project-a").identity,
          roomId: "another-room",
        },
      }),
    ).toThrowError(
      expect.objectContaining({ code: "PROJECT_ROOM_ALREADY_OPEN" }),
    );
  });

  it("does not open the same canonical project path under a second project id", () => {
    const manager = createProjectRoomManager();
    manager.open(roomInput("project-a"));

    expect(() =>
      manager.open({
        ...roomInput("project-b"),
        identity: {
          ...roomInput("project-b").identity,
          canonicalProjectPath: "/projects/project-a",
        },
      }),
    ).toThrowError(
      expect.objectContaining({ code: "PROJECT_ROOM_ALREADY_OPEN" }),
    );
  });

  it("removes only the requested room", () => {
    const manager = createProjectRoomManager();
    manager.open(roomInput("project-a"));
    manager.open(roomInput("project-b"));

    expect(manager.close("project-a")).toBe(true);
    expect(manager.get("project-a")).toBeNull();
    expect(manager.get("project-b")).not.toBeNull();
    expect(manager.size).toBe(1);
  });

  it("lists every open room so application shutdown can close background projects", () => {
    const manager = createProjectRoomManager();
    const roomA = manager.open(roomInput("project-a"));
    const roomB = manager.open(roomInput("project-b"));

    expect(manager.list()).toEqual([roomA, roomB]);
  });
});
