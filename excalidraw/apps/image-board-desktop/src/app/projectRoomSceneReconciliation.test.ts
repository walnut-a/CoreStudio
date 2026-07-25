import { syncInvalidIndices } from "@excalidraw/element";
import { describe, expect, it } from "vitest";

import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { AppState } from "@excalidraw/excalidraw/types";

import { reconcileProjectRoomScene } from "./projectRoomSceneReconciliation";

const elements = (
  values: Array<{
    id: string;
    version: number;
    versionNonce: number;
    x: number;
  }>,
) =>
  syncInvalidIndices(
    values.map(
      (value) =>
        ({
          ...value,
          type: "rectangle",
          isDeleted: false,
        } as ExcalidrawElement),
    ),
  );

describe("project room scene reconciliation", () => {
  it("keeps an element that is actively edited locally", () => {
    const local = elements([
      { id: "text-a", version: 1, versionNonce: 10, x: 10 },
    ]);
    const remote = elements([
      { id: "text-a", version: 2, versionNonce: 20, x: 200 },
    ]);

    const result = reconcileProjectRoomScene({
      localElements: local,
      remoteElements: remote,
      appState: {
        editingTextElement: local[0],
      } as AppState,
      snapshot: false,
    });

    expect(result[0]).toMatchObject({ id: "text-a", x: 10 });
  });

  it("uses the authoritative element when there is no active local edit", () => {
    const local = elements([
      { id: "shape-a", version: 1, versionNonce: 10, x: 10 },
    ]);
    const remote = elements([
      { id: "shape-a", version: 2, versionNonce: 20, x: 200 },
    ]);

    const result = reconcileProjectRoomScene({
      localElements: local,
      remoteElements: remote,
      appState: {} as AppState,
      snapshot: false,
    });

    expect(result[0]).toMatchObject({ id: "shape-a", x: 200 });
  });
});
