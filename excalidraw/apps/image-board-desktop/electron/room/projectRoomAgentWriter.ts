import { randomUUID } from "node:crypto";

import type { PreparedAgentWriterCommand } from "../../src/shared/agentBridgeTypes";
import {
  isProjectRoomSceneElement,
  type ProjectRoomSceneOperation,
} from "../../src/shared/projectRoomProtocol";
import type { ProjectRoom } from "./projectRoom";

export interface AgentWriteRequest {
  id: string;
  fingerprint: string;
}

interface AgentWriteReceipt extends Record<string, unknown> {
  inserted: boolean;
  roomId: string;
  roomSequence: number;
  persistedSequence: number;
  persisted: boolean;
  elementIds: string[];
}

interface WriteRequestEntry {
  fingerprint: string;
  receipt?: AgentWriteReceipt;
  pending?: Promise<AgentWriteReceipt>;
}

// The room owns the retry horizon. Do not evict successful IDs and silently
// reinterpret a retry as a new write. Closing the room releases these records.
const requestsByRoom = new WeakMap<
  ProjectRoom,
  Map<string, WriteRequestEntry>
>();
const MAX_REQUESTS_PER_ROOM = 4096;

const requestError = (message: string, details?: unknown) =>
  Object.assign(new Error(message), { code: "WRITEBACK_CONFLICT", details });

const parsePreparedCommand = (value: unknown): PreparedAgentWriterCommand => {
  if (
    !value ||
    typeof value !== "object" ||
    !("type" in value) ||
    value.type !== "agent-writer.prepared" ||
    !("elements" in value) ||
    !Array.isArray(value.elements) ||
    !value.elements.every(isProjectRoomSceneElement)
  ) {
    throw Object.assign(
      new Error("Agent writer did not produce a valid semantic operation."),
      { code: "BAD_REQUEST" },
    );
  }
  return value as PreparedAgentWriterCommand;
};

export const executeProjectRoomAgentWriterCommand = async ({
  room,
  actorId,
  displayLabel,
  prepare,
  persistAssets,
  validateOperation,
  dryRun = false,
  randomId = randomUUID,
  request,
}: {
  room: ProjectRoom;
  actorId: string;
  displayLabel: string;
  prepare: (context: {
    sessionId: string;
    identity: ProjectRoom["identity"];
    roomSequence: number;
    scene: ReturnType<ProjectRoom["getSnapshot"]>["scene"];
  }) => Promise<unknown>;
  persistAssets: (
    files: NonNullable<PreparedAgentWriterCommand["files"]>,
  ) => Promise<unknown>;
  validateOperation?: (operation: ProjectRoomSceneOperation) => Promise<void>;
  dryRun?: boolean;
  randomId?: () => string;
  request?: AgentWriteRequest;
}): Promise<AgentWriteReceipt> => {
  let entry: WriteRequestEntry | undefined;
  let entries: Map<string, WriteRequestEntry> | undefined;
  const requestKey = request ? JSON.stringify([actorId, request.id]) : null;
  if (request && !dryRun) {
    if (room.lifecycle === "closed" || room.lifecycle === "closing") {
      throw Object.assign(new Error("The request's project room has closed."), {
        code: "ROOM_CLOSED",
      });
    }
    entries = requestsByRoom.get(room) ?? new Map();
    requestsByRoom.set(room, entries);
    entry = entries.get(requestKey!);
    if (entry && entry.fingerprint !== request.fingerprint) {
      throw requestError(
        "This request ID was already used with different content.",
        { requestId: request.id },
      );
    }
    if (entry?.pending) {
      return entry.pending;
    }
    if (!entry) {
      if (entries.size >= MAX_REQUESTS_PER_ROOM) {
        throw requestError(
          "The room's write request history is full. Reconnect to a new room before starting more writes.",
        );
      }
      entry = { fingerprint: request.fingerprint };
      entries.set(requestKey!, entry);
    }
  }

  const persistReceipt = async (receipt: AgentWriteReceipt) => {
    try {
      if (room.persistedSequence < receipt.roomSequence) {
        await room.flushPersistence();
      }
    } catch (error) {
      const code =
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "PROJECT_STORAGE_DIVERGED"
          ? error.code
          : "PERSISTENCE_FAILED";
      throw Object.assign(
        new Error(error instanceof Error ? error.message : String(error)),
        {
          code,
          details: {
            ...(error && typeof error === "object" && "details" in error
              ? { cause: error.details }
              : {}),
            writeStatus: {
              ...receipt,
              accepted: true,
              persisted: false,
              persistedSequence: room.persistedSequence,
            },
          },
        },
      );
    }
    return structuredClone({
      ...receipt,
      persistedSequence: room.persistedSequence,
      persisted: room.persistedSequence >= receipt.roomSequence,
    });
  };

  const execute = async (): Promise<AgentWriteReceipt> => {
    if (entry?.receipt) {
      return persistReceipt(entry.receipt);
    }
    const sessionId = randomId();
    room.join({
      actorId,
      sessionId,
      transport: "command",
      role: "agent-writer",
      displayLabel,
    });
    try {
      const snapshot = room.getSnapshot();
      const command = parsePreparedCommand(
        await prepare({
          sessionId,
          identity: room.identity,
          roomSequence: snapshot.sequence,
          scene: snapshot.scene,
        }),
      );
      if (!dryRun && command.files?.length) {
        await persistAssets(command.files);
      }
      const operation: ProjectRoomSceneOperation = {
        ...room.identity,
        operationId: dryRun ? `dry-run:${sessionId}` : randomId(),
        baseSequence: snapshot.sequence,
        elements: command.elements,
      };
      await validateOperation?.(operation);
      if (dryRun) {
        return {
          ...(command.result ?? {}),
          dryRun: true,
          inserted: false,
          roomId: room.identity.roomId,
          roomSequence: snapshot.sequence,
          persistedSequence: room.persistedSequence,
          persisted: false,
          elementIds: command.elements.map((element) => element.id),
        };
      }
      const result = room.applyAgentCommandOperation(sessionId, operation);
      const receipt: AgentWriteReceipt = {
        ...(command.result ?? {}),
        ...(request ? { requestId: request.id } : {}),
        inserted: true,
        operationId: result.operationId,
        roomId: room.identity.roomId,
        roomSequence: result.sequence,
        persistedSequence: room.persistedSequence,
        persisted: room.persistedSequence >= result.sequence,
        elementIds: command.elements.map((element) => element.id),
        ...(command.files
          ? { fileIds: command.files.map((file) => file.fileId) }
          : {}),
      };
      if (entry) {
        entry.receipt = receipt;
      }
      return await persistReceipt(receipt);
    } finally {
      room.leave(sessionId);
    }
  };
  const pending = execute();
  if (entry) entry.pending = pending;
  try {
    return await pending;
  } catch (error) {
    if (entries && !entry?.receipt) entries.delete(requestKey!);
    if (request && !entry?.receipt) {
      throw Object.assign(
        new Error(error instanceof Error ? error.message : String(error)),
        {
          code:
            error && typeof error === "object" && "code" in error
              ? error.code
              : "COMMAND_FAILED",
          details: {
            ...(error && typeof error === "object" && "details" in error
              ? { cause: error.details }
              : {}),
            writeStatus: {
              requestId: request.id,
              accepted: false,
              persisted: false,
            },
          },
        },
      );
    }
    throw error;
  } finally {
    if (entry) entry.pending = undefined;
  }
};
