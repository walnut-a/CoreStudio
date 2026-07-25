import { randomUUID } from "node:crypto";

import type {
  PreparedAgentWriterCommand,
} from "../../src/shared/agentBridgeTypes";
import {
  isProjectRoomSceneElement,
  type ProjectRoomSceneOperation,
} from "../../src/shared/projectRoomProtocol";
import type { ProjectRoom } from "./projectRoom";

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
  randomId = randomUUID,
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
  validateOperation?: (
    operation: ProjectRoomSceneOperation,
  ) => Promise<void>;
  randomId?: () => string;
}) => {
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
    if (command.files?.length) {
      await persistAssets(command.files);
    }
    const operation: ProjectRoomSceneOperation = {
      ...room.identity,
      operationId: randomId(),
      baseSequence: snapshot.sequence,
      elements: command.elements,
    };
    await validateOperation?.(operation);
    const result = room.applyAgentCommandOperation(sessionId, operation);
    await room.flushPersistence();
    return {
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
  } finally {
    room.leave(sessionId);
  }
};
