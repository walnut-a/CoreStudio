import { arrayToMap } from "@excalidraw/common";
import {
  syncMovedIndices,
  validateFractionalIndices,
} from "@excalidraw/element";
import type { ExcalidrawElement } from "@excalidraw/element/types";

export const appendElementsWithSyncedIndices = (
  existingElements: readonly ExcalidrawElement[],
  appendedElements: readonly ExcalidrawElement[],
) => {
  const nextElements = [...existingElements, ...appendedElements];
  const orderedElements = syncMovedIndices(
    nextElements,
    arrayToMap(appendedElements),
  );

  validateFractionalIndices(orderedElements, {
    shouldThrow: true,
    includeBoundTextValidation: false,
    ignoreLogs: true,
  });

  return orderedElements;
};
