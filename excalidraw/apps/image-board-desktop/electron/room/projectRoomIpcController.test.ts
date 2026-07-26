import { describe, expect, it, vi } from "vitest";

import { createProjectRoom } from "./projectRoom";
import { createProjectRoomIpcController } from "./projectRoomIpcController";

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

describe("ProjectRoomIpcController", () => {
  it("joins a trusted desktop participant and receives its own updates", async () => {
    const room = createRoom();
    const onEvent = vi.fn();
    const controller = createProjectRoomIpcController({
      openProject: vi.fn(async () => room),
    });

    const snapshot = await controller.join(
      {
        projectPath: "/projects/project-1",
        sessionId: "desktop-session",
      },
      onEvent,
    );
    const result = await controller.applySceneOperation("desktop-session", {
      ...room.identity,
      operationId: "operation-1",
      baseSequence: snapshot.sequence,
      elements: [
        {
          ...snapshot.scene.elements[0],
          version: 2,
          x: 100,
        },
      ],
    });

    expect(snapshot.participants).toEqual([
      {
        actorId: "corestudio:desktop",
        sessionId: "desktop-session",
        transport: "ipc",
        role: "desktop-editor",
        displayLabel: "CoreStudio",
      },
    ]);
    expect(result).toMatchObject({
      type: "operation.accepted",
      sequence: 1,
    });
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "scene.update",
        originSessionId: "desktop-session",
      }),
    );
  });

  it("does not accept operations before a desktop session joins", async () => {
    const controller = createProjectRoomIpcController({
      openProject: vi.fn(),
    });

    await expect(
      controller.applySceneOperation("missing-session", {
        projectId: "project-1",
        canonicalProjectPath: "/projects/project-1",
        roomId: "room-1",
        sessionEpoch: 1,
        operationId: "operation-1",
        baseSequence: 0,
        elements: [],
      }),
    ).rejects.toMatchObject({ code: "SESSION_NOT_FOUND" });
  });

  it("returns an authoritative snapshot for an already joined desktop session", async () => {
    const room = createRoom();
    const controller = createProjectRoomIpcController({
      openProject: vi.fn(async () => room),
    });
    await controller.join(
      {
        projectPath: "/projects/project-1",
        sessionId: "desktop-session",
      },
      vi.fn(),
    );

    const snapshot = controller.resync("desktop-session");

    expect(snapshot).toEqual(room.getSnapshot());
    expect(snapshot.participants).toHaveLength(1);
  });

  it("leaves the bound room and stops delivering events", async () => {
    const room = createRoom();
    const onEvent = vi.fn();
    const controller = createProjectRoomIpcController({
      openProject: vi.fn(async () => room),
    });
    await controller.join(
      {
        projectPath: "/projects/project-1",
        sessionId: "desktop-session",
      },
      onEvent,
    );

    expect(controller.leave("desktop-session")).toBe(true);
    await expect(
      controller.applySceneOperation("desktop-session", {
        ...room.identity,
        operationId: "operation-after-leave",
        baseSequence: 0,
        elements: [],
      }),
    ).rejects.toMatchObject({ code: "SESSION_NOT_FOUND" });
  });

  it("validates image assets before allowing the desktop operation into the room", async () => {
    const room = createRoom();
    const validateOperationAssets = vi.fn().mockRejectedValue(
      Object.assign(new Error("missing image asset"), {
        code: "PERSISTENCE_FAILED",
      }),
    );
    const controller = createProjectRoomIpcController({
      openProject: vi.fn(async () => room),
      validateOperationAssets,
    });
    await controller.join(
      {
        projectPath: "/projects/project-1",
        sessionId: "desktop-session",
      },
      vi.fn(),
    );
    const operation = {
      ...room.identity,
      operationId: "operation-image",
      baseSequence: 0,
      elements: [
        {
          id: "image-1",
          type: "image",
          fileId: "file-missing",
          version: 1,
          versionNonce: 20,
          isDeleted: false,
        },
      ],
    };

    await expect(
      controller.applySceneOperation("desktop-session", operation),
    ).rejects.toMatchObject({ code: "PERSISTENCE_FAILED" });
    expect(validateOperationAssets).toHaveBeenCalledWith(room, operation);
    expect(room.sequence).toBe(0);
  });
});
