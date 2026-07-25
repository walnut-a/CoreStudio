import {
  orderByFractionalIndex,
  syncInvalidIndices,
} from "@excalidraw/element";
import { shouldDiscardRemoteElement } from "@excalidraw/excalidraw/data/reconcile";
import { describe, expect, it } from "vitest";

import {
  chooseAuthoritativeRoomElement,
  orderRoomSceneElements,
  type RoomSceneElement,
} from "./roomElementReconciliation";

const element = (
  id: string,
  version: number,
  versionNonce: number,
): RoomSceneElement => ({
  id,
  version,
  versionNonce,
  index: "a0",
  isDeleted: false,
});

describe("chooseAuthoritativeRoomElement", () => {
  it.each([
    { localVersion: 2, localNonce: 20, remoteVersion: 1, remoteNonce: 10 },
    { localVersion: 1, localNonce: 20, remoteVersion: 2, remoteNonce: 10 },
    { localVersion: 2, localNonce: 10, remoteVersion: 2, remoteNonce: 20 },
    { localVersion: 2, localNonce: 20, remoteVersion: 2, remoteNonce: 10 },
  ])(
    "matches Excalidraw version and nonce conflict resolution",
    ({ localVersion, localNonce, remoteVersion, remoteNonce }) => {
      const local = element("element-1", localVersion, localNonce);
      const remote = element("element-1", remoteVersion, remoteNonce);
      const upstreamDiscardsRemote = shouldDiscardRemoteElement(
        {
          editingTextElement: null,
          resizingElement: null,
          newElement: null,
        } as any,
        local as any,
        remote as any,
      );

      expect(chooseAuthoritativeRoomElement(local, remote)).toBe(
        upstreamDiscardsRemote ? local : remote,
      );
    },
  );

  it("keeps isDeleted tombstones when the deleting version wins", () => {
    const local = element("element-1", 3, 30);
    const deleted = {
      ...element("element-1", 4, 40),
      isDeleted: true,
    };

    expect(chooseAuthoritativeRoomElement(local, deleted)).toBe(deleted);
  });

  it.each([
    "image",
    "rectangle",
    "diamond",
    "ellipse",
    "line",
    "arrow",
    "freedraw",
    "text",
    "frame",
  ])("preserves the complete %s element payload", (type) => {
    const local = {
      ...element(`${type}-1`, 1, 10),
      type,
      x: 0,
      customData: { source: "initial" },
    };
    const remote = {
      ...local,
      version: 2,
      versionNonce: 20,
      x: 100,
      customData: { source: "remote" },
      groupIds: ["group-1"],
      boundElements: [{ id: "bound-1", type: "arrow" }],
    };

    expect(chooseAuthoritativeRoomElement(local, remote)).toEqual(remote);
  });

  it("accepts restoration when a newer live version supersedes a tombstone", () => {
    const deleted = {
      ...element("element-1", 4, 40),
      isDeleted: true,
    };
    const restored = {
      ...deleted,
      version: 5,
      versionNonce: 50,
      isDeleted: false,
    };

    expect(chooseAuthoritativeRoomElement(deleted, restored)).toBe(restored);
  });
});

describe("orderRoomSceneElements", () => {
  it.each([
    [
      "duplicate indices",
      [
        { id: "A", index: "a1" },
        { id: "B", index: "a1" },
        { id: "C", index: "a2" },
      ],
    ],
    [
      "missing indices",
      [
        { id: "A", index: "a1" },
        { id: "B", index: null },
        { id: "C", index: "a2" },
      ],
    ],
    [
      "malformed indices",
      [
        { id: "A", index: "a1" },
        { id: "B", index: "not-an-order-key" },
        { id: "C", index: "a2" },
      ],
    ],
  ])("matches Excalidraw ordering for %s", (_label, values) => {
    const sceneElements = values.map((value, index) => ({
      ...element(value.id, 1, 100 + index),
      index: value.index,
    }));
    const upstreamElements = sceneElements.map((value) => ({
      ...structuredClone(value),
      type: "rectangle",
    })) as any[];
    const expected = syncInvalidIndices(
      orderByFractionalIndex(upstreamElements),
    );

    const actual = orderRoomSceneElements(sceneElements);

    expect(actual.map(({ id, index }) => ({ id, index }))).toEqual(
      expected.map(({ id, index }) => ({ id, index })),
    );
  });
});
