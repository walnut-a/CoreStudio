import { describe, expect, it, vi } from "vitest";

import { createProjectRoom } from "./projectRoom";
import { executeProjectRoomAgentWriterCommand } from "./projectRoomAgentWriter";

const createRoom = (persist = vi.fn(async () => ({ projectRevision: "r2" }))) =>
  createProjectRoom({
    identity: {
      projectId: "project-1",
      canonicalProjectPath: "/projects/project-1",
      roomId: "room-1",
      sessionEpoch: 1,
    },
    initialScene: {
      elements: [],
      sharedSceneConfig: {},
    },
    persistedSequence: 0,
    projectRevision: "r1",
    persistence: { debounceMs: 10_000, persist },
  });

const imageElement = {
  id: "image-1",
  type: "image",
  fileId: "file-1",
  version: 1,
  versionNonce: 1,
  index: "a0",
  isDeleted: false,
};

describe("executeProjectRoomAgentWriterCommand", () => {
  it("persists assets, applies one room operation, and flushes it", async () => {
    const room = createRoom();
    const persistAssets = vi.fn(async () => undefined);

    await expect(
      executeProjectRoomAgentWriterCommand({
        room,
        actorId: "codex:thread-1",
        displayLabel: "任务 1",
        randomId: vi
          .fn()
          .mockReturnValueOnce("session-1")
          .mockReturnValueOnce("operation-1"),
        prepare: async () => ({
          type: "agent-writer.prepared",
          elements: [imageElement],
          files: [
            {
              fileId: "file-1",
              mimeType: "image/png",
              dataBase64: "aW1hZ2U=",
              width: 100,
              height: 100,
              createdAt: "2026-07-24T00:00:00.000Z",
              sourceType: "imported",
            },
          ],
        }),
        persistAssets,
      }),
    ).resolves.toMatchObject({
      inserted: true,
      operationId: "operation-1",
      roomSequence: 1,
      persisted: true,
      fileIds: ["file-1"],
    });
    expect(persistAssets).toHaveBeenCalledTimes(1);
    expect(room.getSnapshot().scene.elements).toEqual([imageElement]);
    expect(room.getSnapshot().participants).toEqual([]);
  });

  it("keeps the accepted room state and retained assets on persistence failure", async () => {
    const persist = vi.fn(async () => {
      throw new Error("disk unavailable");
    });
    const room = createRoom(persist);
    const persistAssets = vi.fn(async () => undefined);

    await expect(
      executeProjectRoomAgentWriterCommand({
        room,
        actorId: "codex:thread-1",
        displayLabel: "任务 1",
        randomId: vi
          .fn()
          .mockReturnValueOnce("session-1")
          .mockReturnValueOnce("operation-1"),
        prepare: async () => ({
          type: "agent-writer.prepared",
          elements: [imageElement],
          files: [
            {
              fileId: "file-1",
              mimeType: "image/png",
              dataBase64: "aW1hZ2U=",
              width: 100,
              height: 100,
              createdAt: "2026-07-24T00:00:00.000Z",
              sourceType: "imported",
            },
          ],
        }),
        persistAssets,
      }),
    ).rejects.toThrow("disk unavailable");
    expect(persistAssets).toHaveBeenCalledTimes(1);
    expect(room.getSnapshot().scene.elements).toEqual([imageElement]);
    expect(room.lifecycle).toBe("storage-error");
  });

  it("rejects malformed renderer output before changing the room", async () => {
    const room = createRoom();

    await expect(
      executeProjectRoomAgentWriterCommand({
        room,
        actorId: "codex:thread-1",
        displayLabel: "任务 1",
        randomId: () => "session-1",
        prepare: async () => ({ inserted: true }),
        persistAssets: vi.fn(),
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(room.sequence).toBe(0);
    expect(room.getSnapshot().participants).toEqual([]);
  });
});
