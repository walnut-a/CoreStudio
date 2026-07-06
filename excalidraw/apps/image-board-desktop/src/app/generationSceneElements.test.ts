import { describe, expect, it } from "vitest";

import {
  buildGeneratedImageSceneElements,
  buildGeneratedImageSceneUpdate,
  buildSelectedElementIdsForElements,
} from "./generationSceneElements";

describe("buildGeneratedImageSceneElements", () => {
  it("creates saved image elements from persisted assets and placements", () => {
    const elements = buildGeneratedImageSceneElements({
      assets: [
        { fileId: "file-a", width: 1024, height: 1024 },
        { fileId: "file-b", width: 1536, height: 1024 },
      ],
      placements: [
        { x: 120, y: 240, width: 512, height: 512 },
        { x: 664, y: 240, width: 640, height: 426 },
      ],
    });

    expect(elements).toHaveLength(2);
    expect(elements[0]).toMatchObject({
      type: "image",
      fileId: "file-a",
      status: "saved",
      x: 120,
      y: 240,
      width: 512,
      height: 512,
    });
    expect(elements[0].scale).toEqual([1, 1]);
    expect(elements[1]).toMatchObject({
      type: "image",
      fileId: "file-b",
      status: "saved",
      x: 664,
      y: 240,
      width: 640,
      height: 426,
    });
  });
});

describe("buildSelectedElementIdsForElements", () => {
  it("selects every provided element id", () => {
    expect(
      buildSelectedElementIdsForElements([
        { id: "element-a" },
        { id: "element-b" },
      ]),
    ).toEqual({
      "element-a": true,
      "element-b": true,
    });
  });

  it("returns an empty selection for an empty element list", () => {
    expect(buildSelectedElementIdsForElements([])).toEqual({});
  });
});

describe("buildGeneratedImageSceneUpdate", () => {
  it("appends generated image elements and selects the newly inserted images", () => {
    const appState = {
      width: 1200,
      height: 800,
      selectedElementIds: {
        old: true,
      },
    };
    const update = buildGeneratedImageSceneUpdate({
      existingElements: [],
      appState,
      assets: [
        { fileId: "file-a", width: 1024, height: 1024 },
        { fileId: "file-b", width: 1536, height: 1024 },
      ],
      placements: [
        { x: 120, y: 240, width: 512, height: 512 },
        { x: 664, y: 240, width: 640, height: 426 },
      ],
    });

    expect(update.elements).toHaveLength(2);
    expect(update.newElements).toHaveLength(2);
    expect(update.newElements.map((element) => element.fileId)).toEqual([
      "file-a",
      "file-b",
    ]);
    expect(update.selectedElementIds).toEqual({
      [update.newElements[0].id]: true,
      [update.newElements[1].id]: true,
    });
    expect(update.appState).toEqual({
      ...appState,
      selectedElementIds: update.selectedElementIds,
    });
  });
});
