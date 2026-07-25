import { describe, expect, it } from "vitest";

import {
  isProjectRoomSceneOperation,
  PROJECT_ROOM_CAPABILITY_VERSION,
  PROJECT_ROOM_PROTOCOL_VERSION,
} from "./projectRoomProtocol";

const operation = {
  projectId: "project-1",
  canonicalProjectPath: "/projects/project-1",
  roomId: "room-1",
  sessionEpoch: 1,
  operationId: "operation-1",
  baseSequence: 0,
  elements: [
    {
      id: "element-1",
      version: 2,
      versionNonce: 10,
      index: "a0",
      isDeleted: true,
      x: 100,
    },
  ],
};

describe("project room protocol", () => {
  it("uses independent room and capability versions", () => {
    expect(PROJECT_ROOM_PROTOCOL_VERSION).toBe(2);
    expect(PROJECT_ROOM_CAPABILITY_VERSION).toBe(1);
  });

  it("accepts a complete scene operation including soft-delete tombstones", () => {
    expect(isProjectRoomSceneOperation(operation)).toBe(true);
  });

  it.each(["interactionId", "final"])(
    "rejects retired %s interaction metadata",
    (field) => {
      expect(
        isProjectRoomSceneOperation({
          ...operation,
          [field]: field === "final" ? true : "drag-1",
        }),
      ).toBe(false);
    },
  );

  it.each([
    [
      "missing element version",
      { ...operation, elements: [{ id: "element-1" }] },
    ],
    [
      "duplicate element ids",
      {
        ...operation,
        elements: [...operation.elements, operation.elements[0]],
      },
    ],
    ["negative base sequence", { ...operation, baseSequence: -1 }],
    ["empty operation id", { ...operation, operationId: "" }],
    ["forged actor id", { ...operation, actorId: "codex:forged" }],
    ["forged session id", { ...operation, sessionId: "forged-session" }],
    [
      "renderer-supplied image records",
      { ...operation, imageRecords: { forged: {} } },
    ],
  ])("rejects %s", (_caseName, value) => {
    expect(isProjectRoomSceneOperation(value)).toBe(false);
  });
});
