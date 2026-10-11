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
});
