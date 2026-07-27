import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { createProjectRoomService } from "./projectRoomService";

const sceneJson = JSON.stringify({
  type: "excalidraw",
  version: 2,
  source: "local",
  elements: [
    {
      id: "element-1",
      version: 1,
      versionNonce: 10,
      index: "a0",
      isDeleted: false,
    },
  ],
  appState: { viewBackgroundColor: "#ffffff" },
  files: {},
});

const bundle = (projectId: string, projectPath: string) => ({
  projectPath,
  project: {
    formatVersion: 1,
    appVersion: "1.1.26",
    projectId,
    name: projectId,
    createdAt: "2026-07-23T00:00:00.000Z",
    updatedAt: "2026-07-23T00:00:00.000Z",
    sceneFile: "scene.excalidraw.json",
    imageRecordsFile: "image-records.json",
    assetsDir: "assets",
    exportsDir: "exports",
    agentAccess: { token: `token-${projectId}`, enabled: true },
  },
  sceneJson,
  imageRecords: {},
});

describe("ProjectRoomService", () => {
  it("acquires the machine-wide project lease before reading project data", async () => {
    const release = vi.fn(async () => undefined);
    const acquire = vi.fn(async (projectPath: string) => ({
      projectPath,
      owner: {
        appName: "CoreStudio",
        pid: process.pid,
        processNonce: "test-process",
      },
      release,
    }));
    const readProjectBundle = vi.fn(async (projectPath: string) =>
      bundle("project-1", projectPath),
    );
    const service = createProjectRoomService({
      readProjectBundle,
      writeProjectScene: vi.fn(async () => ({})),
      canonicalizeProjectPath: vi.fn(async (value) => value),
      projectProcessLeaseRegistry: { acquire },
    });

    const room = await service.openProject("/projects/project-1");

    expect(acquire).toHaveBeenCalledWith("/projects/project-1");
    expect(acquire.mock.invocationCallOrder[0]).toBeLessThan(
      readProjectBundle.mock.invocationCallOrder[0],
    );
    await service.closeProject(room.identity.projectId, { force: true });
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("releases the project lease when opening project data fails", async () => {
    const release = vi.fn(async () => undefined);
    const service = createProjectRoomService({
      readProjectBundle: vi.fn(async () => {
        throw new Error("project read failed");
      }),
      writeProjectScene: vi.fn(async () => ({})),
      canonicalizeProjectPath: vi.fn(async (value) => value),
      projectProcessLeaseRegistry: {
        acquire: vi.fn(async (projectPath: string) => ({
          projectPath,
          owner: {
            appName: "CoreStudio",
            pid: process.pid,
            processNonce: "test-process",
          },
          release,
        })),
      },
    });

    await expect(
      service.openProject("/projects/project-1"),
    ).rejects.toThrow("project read failed");
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("opens a room from the canonical project bundle", async () => {
    const readProjectBundle = vi.fn(async (projectPath: string) =>
      bundle("project-1", projectPath),
    );
    const service = createProjectRoomService({
      readProjectBundle,
      writeProjectScene: vi.fn(async () => ({})),
      canonicalizeProjectPath: vi.fn(
        async () => "/canonical/projects/project-1",
      ),
      randomId: vi.fn(() => "room-id-1"),
      persistenceDebounceMs: 100,
    });

    const room = await service.openProject("/projects/project-1");

    expect(readProjectBundle).toHaveBeenCalledWith(
      "/canonical/projects/project-1",
    );
    expect(room.identity).toEqual({
      projectId: "project-1",
      canonicalProjectPath: "/canonical/projects/project-1",
      roomId: "room-id-1",
      sessionEpoch: 1,
    });
    expect(room.getSnapshot().scene.elements).toHaveLength(1);
  });

  it("returns the same room when the project is opened twice", async () => {
    const service = createProjectRoomService({
      readProjectBundle: vi.fn(async (projectPath: string) =>
        bundle("project-1", projectPath),
      ),
      writeProjectScene: vi.fn(async () => ({})),
      canonicalizeProjectPath: vi.fn(async (value) => value),
      randomId: vi.fn(() => "room-id-1"),
    });

    const first = await service.openProject("/projects/project-1");
    const second = await service.openProject("/projects/project-1");

    expect(second).toBe(first);
  });

  it("flushes before close and increments epoch when the project reopens", async () => {
    const writeProjectScene = vi.fn(async () => ({}));
    const randomId = vi
      .fn()
      .mockReturnValueOnce("room-id-1")
      .mockReturnValueOnce("room-id-2");
    const service = createProjectRoomService({
      readProjectBundle: vi.fn(async (projectPath: string) =>
        bundle("project-1", projectPath),
      ),
      writeProjectScene,
      canonicalizeProjectPath: vi.fn(async (value) => value),
      randomId,
      persistenceDebounceMs: 10_000,
    });
    const first = await service.openProject("/projects/project-1");
    first.join({
      actorId: "corestudio:desktop",
      sessionId: "desktop-session",
      transport: "ipc",
      role: "desktop-editor",
      displayLabel: "CoreStudio",
    });
    first.applySceneOperation("desktop-session", {
      ...first.identity,
      operationId: "operation-1",
      baseSequence: 0,
      elements: [
        {
          ...first.getSnapshot().scene.elements[0],
          version: 2,
          x: 100,
        },
      ],
    });

    await service.closeProject("project-1");
    expect(writeProjectScene).toHaveBeenCalledTimes(1);
    expect(first.lifecycle).toBe("closed");

    const second = await service.openProject("/projects/project-1");
    expect(second.identity).toMatchObject({
      roomId: "room-id-2",
      sessionEpoch: 2,
    });
  });

  it("restores an active room when close persistence fails", async () => {
    const writeProjectScene = vi.fn(async () => {
      throw new Error("disk unavailable");
    });
    const service = createProjectRoomService({
      readProjectBundle: vi.fn(async (projectPath: string) =>
        bundle("project-1", projectPath),
      ),
      writeProjectScene,
      canonicalizeProjectPath: vi.fn(async (value) => value),
      randomId: vi.fn(() => "room-id-1"),
      persistenceDebounceMs: 10_000,
    });
    const room = await service.openProject("/projects/project-1");
    room.join({
      actorId: "corestudio:desktop",
      sessionId: "desktop-session",
      transport: "ipc",
      role: "desktop-editor",
      displayLabel: "CoreStudio",
    });
    room.applySceneOperation("desktop-session", {
      ...room.identity,
      operationId: "operation-1",
      baseSequence: 0,
      elements: [
        {
          ...room.getSnapshot().scene.elements[0],
          version: 2,
          x: 100,
        },
      ],
    });

    await expect(service.closeProject("project-1")).rejects.toThrow(
      "disk unavailable",
    );

    expect(room.lifecycle).toBe("storage-error");
    expect(service.manager.get("project-1")).toBe(room);
    expect(() =>
      room.applySceneOperation("desktop-session", {
        ...room.identity,
        operationId: "operation-2",
        baseSequence: 1,
        elements: [
          {
            ...room.getSnapshot().scene.elements[0],
            version: 3,
            x: 200,
          },
        ],
      }),
    ).not.toThrow();
  });

  it("routes maintenance scene writes through an active room", async () => {
    const writeProjectScene = vi.fn(async () => ({}));
    const service = createProjectRoomService({
      readProjectBundle: vi.fn(async (projectPath: string) =>
        bundle("project-1", projectPath),
      ),
      writeProjectScene,
      canonicalizeProjectPath: vi.fn(async (value) => value),
      randomId: vi
        .fn()
        .mockReturnValueOnce("room-id-1")
        .mockReturnValueOnce("maintenance-operation-1"),
      persistenceDebounceMs: 10_000,
    });
    const room = await service.openProject("/projects/project-1");
    const listener = vi.fn();
    room.join(
      {
        actorId: "corestudio:desktop",
        sessionId: "desktop-session",
        transport: "ipc",
        role: "desktop-editor",
        displayLabel: "CoreStudio",
      },
      listener,
    );
    const repairedSceneJson = JSON.stringify({
      type: "excalidraw",
      version: 2,
      source: "local",
      elements: [
        ...JSON.parse(sceneJson).elements,
        {
          id: "restored-image",
          type: "image",
          fileId: "file-restored",
          version: 1,
          versionNonce: 20,
          index: "a1",
          isDeleted: false,
        },
      ],
      appState: { viewBackgroundColor: "#ffffff" },
      files: {},
    });

    await service.writeMaintenanceScene({
      projectPath: "/projects/project-1",
      sceneJson: repairedSceneJson,
    });

    expect(room.getSnapshot().scene.elements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "restored-image" }),
      ]),
    );
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "scene.update",
        originActorId: "corestudio:maintenance",
      }),
    );
    expect(writeProjectScene).toHaveBeenCalledTimes(1);
  });

  it("rejects maintenance changes outside scene elements while a room is active", async () => {
    const writeProjectScene = vi.fn(async () => ({}));
    const service = createProjectRoomService({
      readProjectBundle: vi.fn(async (projectPath: string) =>
        bundle("project-1", projectPath),
      ),
      writeProjectScene,
      canonicalizeProjectPath: vi.fn(async (value) => value),
      randomId: vi.fn(() => "room-id-1"),
    });
    await service.openProject("/projects/project-1");
    const changedFilesSceneJson = JSON.stringify({
      ...JSON.parse(sceneJson),
      files: {
        "file-new": {
          mimeType: "image/png",
        },
      },
    });

    await expect(
      service.writeMaintenanceScene({
        projectPath: "/projects/project-1",
        sceneJson: changedFilesSceneJson,
      }),
    ).rejects.toMatchObject({
      code: "PERSISTENCE_FAILED",
      details: {
        reason: "UNSUPPORTED_MAINTENANCE_SCENE_FIELDS",
      },
    });
    expect(writeProjectScene).not.toHaveBeenCalled();
  });

  it("keeps simultaneous project services isolated", async () => {
    const service = createProjectRoomService({
      readProjectBundle: vi.fn(async (projectPath: string) =>
        bundle(
          projectPath.endsWith("a") ? "project-a" : "project-b",
          projectPath,
        ),
      ),
      writeProjectScene: vi.fn(async () => ({})),
      canonicalizeProjectPath: vi.fn(async (value) => value),
      randomId: vi
        .fn()
        .mockReturnValueOnce("room-a")
        .mockReturnValueOnce("room-b"),
    });

    const [roomA, roomB] = await Promise.all([
      service.openProject("/projects/a"),
      service.openProject("/projects/b"),
    ]);

    expect(service.manager.size).toBe(2);
    expect(roomA.identity.projectId).toBe("project-a");
    expect(roomB.identity.projectId).toBe("project-b");
    expect(roomA).not.toBe(roomB);
  });

  it("reports other participants before closing by project path", async () => {
    const service = createProjectRoomService({
      readProjectBundle: vi.fn(async (projectPath: string) =>
        bundle("project-1", projectPath),
      ),
      writeProjectScene: vi.fn(async () => ({})),
      canonicalizeProjectPath: vi.fn(async (value) => value),
      randomId: vi.fn(() => "room-id-1"),
    });
    const room = await service.openProject("/projects/project-1");
    room.join({
      actorId: "corestudio:desktop",
      sessionId: "desktop-session",
      transport: "ipc",
      role: "desktop-editor",
      displayLabel: "CoreStudio",
    });
    room.join({
      actorId: "codex:thread-b",
      sessionId: "board-session",
      transport: "websocket",
      role: "board-editor",
      displayLabel: "任务 B",
    });

    await expect(
      service.getCloseState("/projects/project-1", "desktop-session"),
    ).resolves.toMatchObject({
      roomId: "room-id-1",
      otherParticipants: [
        expect.objectContaining({ sessionId: "board-session" }),
      ],
    });
    await expect(service.closeProjectPath("/projects/project-1")).resolves.toBe(
      true,
    );
    expect(room.lifecycle).toBe("closed");
  });

  it("requires confirmation again when participants change before close", async () => {
    const service = createProjectRoomService({
      readProjectBundle: vi.fn(async (projectPath: string) =>
        bundle("project-1", projectPath),
      ),
      writeProjectScene: vi.fn(async () => ({})),
      canonicalizeProjectPath: vi.fn(async (value) => value),
      randomId: vi.fn(() => "room-id-1"),
    });
    const room = await service.openProject("/projects/project-1");
    room.join({
      actorId: "corestudio:desktop",
      sessionId: "desktop-session",
      transport: "ipc",
      role: "desktop-editor",
      displayLabel: "CoreStudio",
    });
    const closeState = await service.getCloseState(
      "/projects/project-1",
      "desktop-session",
    );
    room.join({
      actorId: "codex:thread-new",
      sessionId: "board-session-new",
      transport: "websocket",
      role: "board-editor",
      displayLabel: "新任务",
    });

    await expect(
      service.closeProjectPath("/projects/project-1", {
        expectedRoomId: closeState?.roomId,
        requestingSessionId: "desktop-session",
        acknowledgedParticipantSessionIds: closeState?.otherParticipants.map(
          (participant) => participant.sessionId,
        ),
      }),
    ).rejects.toMatchObject({
      code: "PARTICIPANTS_CHANGED",
    });
    expect(room.lifecycle).toBe("active");
  });

  it("keeps every room open when one room fails during app-wide close", async () => {
    const writeProjectScene = vi.fn(
      async ({ projectPath }: { projectPath: string }) => {
        if (projectPath === "/projects/project-2") {
          throw new Error("project 2 storage failed");
        }
        return {};
      },
    );
    const service = createProjectRoomService({
      readProjectBundle: vi.fn(async (projectPath: string) =>
        bundle(path.basename(projectPath), projectPath),
      ),
      writeProjectScene,
      canonicalizeProjectPath: vi.fn(async (value) => value),
      randomId: vi
        .fn()
        .mockReturnValueOnce("room-id-1")
        .mockReturnValueOnce("room-id-2"),
      persistenceDebounceMs: 10_000,
    });
    const room1 = await service.openProject("/projects/project-1");
    const room2 = await service.openProject("/projects/project-2");
    for (const [room, sessionId] of [
      [room1, "desktop-session-1"],
      [room2, "desktop-session-2"],
    ] as const) {
      room.join({
        actorId: "corestudio:desktop",
        sessionId,
        transport: "ipc",
        role: "desktop-editor",
        displayLabel: "CoreStudio",
      });
      room.applySceneOperation(sessionId, {
        ...room.identity,
        operationId: `operation-${sessionId}`,
        baseSequence: room.sequence,
        elements: [
          {
            ...room.getSnapshot().scene.elements[0],
            version: 2,
            x: 100,
          },
        ],
      });
    }

    await expect(
      service.closeProjectPaths([
        {
          projectPath: room1.identity.canonicalProjectPath,
          expectedRoomId: room1.identity.roomId,
          acknowledgedParticipantSessionIds: ["desktop-session-1"],
        },
        {
          projectPath: room2.identity.canonicalProjectPath,
          expectedRoomId: room2.identity.roomId,
          acknowledgedParticipantSessionIds: ["desktop-session-2"],
        },
      ]),
    ).rejects.toThrow("project 2 storage failed");

    expect(service.manager.list()).toEqual([room1, room2]);
    expect(room1.lifecycle).toBe("active");
    expect(room2.lifecycle).toBe("storage-error");
  });

  it("closes all rooms only after app-wide close persistence succeeds", async () => {
    const service = createProjectRoomService({
      readProjectBundle: vi.fn(async (projectPath: string) =>
        bundle(path.basename(projectPath), projectPath),
      ),
      writeProjectScene: vi.fn(async () => ({})),
      canonicalizeProjectPath: vi.fn(async (value) => value),
      randomId: vi
        .fn()
        .mockReturnValueOnce("room-id-1")
        .mockReturnValueOnce("room-id-2"),
      persistenceDebounceMs: 10_000,
    });
    const room1 = await service.openProject("/projects/project-1");
    const room2 = await service.openProject("/projects/project-2");

    await expect(
      service.closeProjectPaths([
        {
          projectPath: room1.identity.canonicalProjectPath,
          expectedRoomId: room1.identity.roomId,
          acknowledgedParticipantSessionIds: [],
        },
        {
          projectPath: room2.identity.canonicalProjectPath,
          expectedRoomId: room2.identity.roomId,
          acknowledgedParticipantSessionIds: [],
        },
      ]),
    ).resolves.toBe(2);

    expect(service.manager.size).toBe(0);
    expect(room1.lifecycle).toBe("closed");
    expect(room2.lifecycle).toBe("closed");
  });

  it("does not partially close when the app-wide room set changes", async () => {
    const service = createProjectRoomService({
      readProjectBundle: vi.fn(async (projectPath: string) =>
        bundle(path.basename(projectPath), projectPath),
      ),
      writeProjectScene: vi.fn(async () => ({})),
      canonicalizeProjectPath: vi.fn(async (value) => value),
      randomId: vi
        .fn()
        .mockReturnValueOnce("room-id-1")
        .mockReturnValueOnce("room-id-2"),
    });
    const room1 = await service.openProject("/projects/project-1");
    const room2 = await service.openProject("/projects/project-2");

    await expect(
      service.closeProjectPaths(
        [
          {
            projectPath: room1.identity.canonicalProjectPath,
            expectedRoomId: room1.identity.roomId,
            acknowledgedParticipantSessionIds: [],
          },
        ],
        { requireExactRoomSet: true },
      ),
    ).rejects.toMatchObject({ code: "PARTICIPANTS_CHANGED" });

    expect(service.manager.list()).toEqual([room1, room2]);
    expect(room1.lifecycle).toBe("active");
    expect(room2.lifecycle).toBe("active");
  });
});
