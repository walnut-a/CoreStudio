import { describe, expect, it } from "vitest";

import type { ExcalidrawElement } from "@excalidraw/element/types";

import {
  buildSceneImageFileIdsState,
  createSceneImageFileIdsRendererActions,
} from "./sceneImageFileIds";

const createImageElement = ({
  id,
  fileId,
  isDeleted = false,
}: {
  id: string;
  fileId: string;
  isDeleted?: boolean;
}): ExcalidrawElement =>
  ({
    id,
    type: "image",
    fileId,
    isDeleted,
  }) as ExcalidrawElement;

const createTextElement = (id: string): ExcalidrawElement =>
  ({
    id,
    type: "text",
    isDeleted: false,
  }) as ExcalidrawElement;

describe("buildSceneImageFileIdsState", () => {
  it("keeps the current array reference when scene image file ids are unchanged", () => {
    const currentFileIds = ["file-1", "file-2"];

    const result = buildSceneImageFileIdsState({
      currentFileIds,
      elements: [
        createImageElement({ id: "image-1", fileId: "file-1" }),
        createImageElement({ id: "image-2", fileId: "file-2" }),
      ],
    });

    expect(result).toBe(currentFileIds);
  });

  it("returns the collected image file ids when the scene changes", () => {
    const currentFileIds = ["file-old"];

    const result = buildSceneImageFileIdsState({
      currentFileIds,
      elements: [
        createImageElement({ id: "image-1", fileId: "file-2" }),
        createImageElement({ id: "image-duplicate", fileId: "file-2" }),
        createTextElement("text-1"),
        createImageElement({
          id: "image-deleted",
          fileId: "file-deleted",
          isDeleted: true,
        }),
        createImageElement({ id: "image-3", fileId: "file-3" }),
      ],
    });

    expect(result).toEqual(["file-2", "file-3"]);
    expect(result).not.toBe(currentFileIds);
  });
});

describe("createSceneImageFileIdsRendererActions", () => {
  it("updates scene image file ids through the owner state builder", () => {
    let sceneImageFileIds = ["file-old"];
    const actions = createSceneImageFileIdsRendererActions({
      setSceneImageFileIds: (updater) => {
        sceneImageFileIds = updater(sceneImageFileIds);
      },
    });

    actions.update([
      createImageElement({ id: "image-1", fileId: "file-next" }),
      createImageElement({ id: "image-deleted", fileId: "file-deleted", isDeleted: true }),
      createTextElement("text-1"),
    ]);

    expect(sceneImageFileIds).toEqual(["file-next"]);
  });
});
