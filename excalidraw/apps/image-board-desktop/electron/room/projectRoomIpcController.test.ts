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
    const result = controller.applySceneOperation("desktop-session", {
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
      final: true,
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

  it("does not accept operations before a desktop session joins", () => {
    const controller = createProjectRoomIpcController({
      openProject: vi.fn(),
    });

    expect(() =>
      controller.applySceneOperation("missing-session", {
        projectId: "project-1",
        canonicalProjectPath: "/projects/project-1",
        roomId: "room-1",
        sessionEpoch: 1,
        operationId: "operation-1",
        baseSequence: 0,
        elements: [],
        final: true,
      }),
    ).toThrowError(expect.objectContaining({ code: "SESSION_NOT_FOUND" }));
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
    expect(() =>
      controller.applySceneOperation("desktop-session", {
        ...room.identity,
        operationId: "operation-after-leave",
        baseSequence: 0,
        elements: [],
        final: true,
      }),
    ).toThrowError(expect.objectContaining({ code: "SESSION_NOT_FOUND" }));
  });
});
