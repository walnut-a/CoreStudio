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
  it("keeps old receipts at the history limit instead of silently re-executing them", async () => {
    const room = createRoom();
    const prepare = vi.fn(async () => ({
      type: "agent-writer.prepared",
      elements: [imageElement],
    }));
    const input = {
      room,
      actorId: "agent:a",
      displayLabel: "A",
      prepare,
      persistAssets: vi.fn(),
    };
    const first = await executeProjectRoomAgentWriterCommand({
      ...input,
      request: { id: "r0", fingerprint: "same" },
    });
    for (let i = 1; i < 4096; i++) {
      await executeProjectRoomAgentWriterCommand({
        ...input,
        request: { id: `r${i}`, fingerprint: "same" },
      });
    }
    await expect(
      executeProjectRoomAgentWriterCommand({
        ...input,
        request: { id: "over-limit", fingerprint: "same" },
      }),
    ).rejects.toMatchObject({ code: "WRITEBACK_CONFLICT" });
    expect(
      await executeProjectRoomAgentWriterCommand({
        ...input,
        request: { id: "r0", fingerprint: "same" },
      }),
    ).toMatchObject({
      operationId: first.operationId,
      elementIds: first.elementIds,
      persisted: true,
    });
    expect(prepare).toHaveBeenCalledTimes(4096);
    room.close();
    await expect(
      executeProjectRoomAgentWriterCommand({
        ...input,
        request: { id: "r0", fingerprint: "same" },
      }),
    ).rejects.toMatchObject({ code: "ROOM_CLOSED" });
  });
  it("replays an already saved receipt even if a later unrelated write cannot save", async () => {
    let fail = false;
    const room = createRoom(
      vi.fn(async () => {
        if (fail) throw new Error("later save failed");
        return { projectRevision: "r2" };
      }),
    );
    const input = {
      room,
      actorId: "agent:a",
      displayLabel: "A",
      prepare: async () => ({
        type: "agent-writer.prepared",
        elements: [imageElement],
      }),
      persistAssets: vi.fn(),
      request: { id: "saved-request", fingerprint: "original" },
    };
    const saved = await executeProjectRoomAgentWriterCommand(input);
    fail = true;
    await expect(
      executeProjectRoomAgentWriterCommand({
        ...input,
        request: { id: "later-request", fingerprint: "other" },
        prepare: async () => ({
          type: "agent-writer.prepared",
          elements: [{ ...imageElement, id: "later-image" }],
        }),
      }),
    ).rejects.toThrow("later save failed");
    await expect(executeProjectRoomAgentWriterCommand(input)).resolves.toEqual(
      saved,
    );
    room.close();
  });
  it("retries persistence without preparing or inserting an accepted request twice", async () => {
    let fail = true;
    const room = createRoom(
      vi.fn(async () => {
        if (fail) throw new Error("disk unavailable");
        return { projectRevision: "r2" };
      }),
    );
    const prepare = vi.fn(async () => ({
      type: "agent-writer.prepared",
      elements: [{ ...imageElement, id: `image-${Math.random()}` }],
    }));
    const input = {
      room,
      actorId: "agent:a",
      displayLabel: "A",
      prepare,
      persistAssets: vi.fn(),
      request: { id: "request-a", fingerprint: "image-content" },
    };
    await expect(
      executeProjectRoomAgentWriterCommand(input),
    ).rejects.toMatchObject({
      code: "PERSISTENCE_FAILED",
      details: {
        writeStatus: {
          requestId: "request-a",
          accepted: true,
          persisted: false,
        },
      },
    });
    fail = false;
    const result = await executeProjectRoomAgentWriterCommand(input);
    expect(result).toMatchObject({ requestId: "request-a", persisted: true });
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(room.sequence).toBe(1);
    expect(room.getSnapshot().scene.elements).toHaveLength(1);
    // A lost success response is safely replayed as the same receipt.
    expect(await executeProjectRoomAgentWriterCommand(input)).toEqual(result);
    room.close();
  });

  it("coalesces concurrent requests and rejects ID reuse with different content", async () => {
    const room = createRoom();
    const prepare = vi.fn(async () => ({
      type: "agent-writer.prepared",
      elements: [imageElement],
    }));
    const input = {
      room,
      actorId: "agent:a",
      displayLabel: "A",
      prepare,
      persistAssets: vi.fn(),
      request: { id: "request-a", fingerprint: "original" },
    };
    const results = await Promise.all([
      executeProjectRoomAgentWriterCommand(input),
      executeProjectRoomAgentWriterCommand(input),
    ]);
    expect(results[0]).toEqual(results[1]);
    expect(prepare).toHaveBeenCalledTimes(1);
    await expect(
      executeProjectRoomAgentWriterCommand({
        ...input,
        request: { id: "request-a", fingerprint: "changed" },
      }),
    ).rejects.toMatchObject({ code: "WRITEBACK_CONFLICT" });
    room.close();
  });

  it("allows retry after preparation failure and keeps actors isolated", async () => {
    const room = createRoom();
    const prepare = vi
      .fn()
      .mockRejectedValueOnce(new Error("prepare failed"))
      .mockResolvedValue({
        type: "agent-writer.prepared",
        elements: [imageElement],
      });
    const input = {
      room,
      actorId: "agent:a",
      displayLabel: "A",
      prepare,
      persistAssets: vi.fn(),
      request: { id: "request-a", fingerprint: "original" },
    };
    await expect(executeProjectRoomAgentWriterCommand(input)).rejects.toThrow(
      "prepare failed",
    );
    await executeProjectRoomAgentWriterCommand(input);
    await executeProjectRoomAgentWriterCommand({
      ...input,
      actorId: "agent:b",
    });
    expect(prepare).toHaveBeenCalledTimes(3);
    room.close();
  });

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

  it("prepares and validates a dry-run without changing or persisting the room", async () => {
    const persist = vi.fn(async () => ({ projectRevision: "r2" }));
    const room = createRoom(persist);
    const persistAssets = vi.fn(async () => undefined);

    await expect(
      executeProjectRoomAgentWriterCommand({
        room,
        actorId: "codex:thread-1",
        displayLabel: "任务 1",
        dryRun: true,
        randomId: vi.fn().mockReturnValueOnce("session-1"),
        prepare: async () => ({
          type: "agent-writer.prepared",
          elements: [imageElement],
          result: {
            diagramId: "diagram-1",
            format: "mermaid",
            elementCount: 1,
          },
        }),
        persistAssets,
      }),
    ).resolves.toMatchObject({
      diagramId: "diagram-1",
      format: "mermaid",
      elementCount: 1,
      dryRun: true,
      inserted: false,
      roomSequence: 0,
      persistedSequence: 0,
      persisted: false,
      elementIds: ["image-1"],
    });
    expect(persistAssets).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
    expect(room.sequence).toBe(0);
    expect(room.getSnapshot().scene.elements).toEqual([]);
    expect(room.getSnapshot().participants).toEqual([]);
  });
});
