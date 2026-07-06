import { newImageElement } from "@excalidraw/element";

import type { FileId } from "@excalidraw/element/types";
import type { ExcalidrawElement } from "@excalidraw/element/types";

import type { ImagePlacement } from "./project/imagePlacement";
import { appendElementsWithSyncedIndices } from "./sceneOrder";
import { buildSelectedElementIdsFromElements } from "./selectionState";

export interface GeneratedImageSceneAsset {
  fileId: string;
  width: number;
  height: number;
}

export const buildGeneratedImageSceneElements = ({
  assets,
  placements,
}: {
  assets: readonly GeneratedImageSceneAsset[];
  placements: readonly ImagePlacement[];
}) =>
  assets.map((asset, index) =>
    newImageElement({
      type: "image",
      fileId: asset.fileId as FileId,
      status: "saved",
      scale: [1, 1],
      x: placements[index].x,
      y: placements[index].y,
      width: placements[index].width,
      height: placements[index].height,
    }),
  );

export const buildSelectedElementIdsForElements =
  buildSelectedElementIdsFromElements;

export const buildGeneratedImageSceneUpdate = <
  AppStateValue extends object,
>({
  existingElements,
  appState,
  assets,
  placements,
}: {
  existingElements: readonly ExcalidrawElement[];
  appState: AppStateValue;
  assets: readonly GeneratedImageSceneAsset[];
  placements: readonly ImagePlacement[];
}) => {
  const newElements = buildGeneratedImageSceneElements({
    assets,
    placements,
  });
  const selectedElementIds = buildSelectedElementIdsForElements(newElements);

  return {
    elements: appendElementsWithSyncedIndices(existingElements, newElements),
    appState: {
      ...appState,
      selectedElementIds,
    },
    selectedElementIds,
    newElements,
  };
};
