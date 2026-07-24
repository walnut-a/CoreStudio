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
      final: true,
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
      final: true,
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
        final: true,
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
});
