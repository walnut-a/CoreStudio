import {
  generateNKeysBetween,
  validateOrderKey,
} from "@excalidraw/fractional-indexing";
import type {
  ExcalidrawElement,
  FractionalIndex,
} from "@excalidraw/element/types";

const isValidOrderKey = (value: unknown): value is FractionalIndex => {
  if (typeof value !== "string" || !value) {
    return false;
  }
  try {
    validateOrderKey(value);
    return true;
  } catch {
    return false;
  }
};

const existingIndicesAreOrdered = (elements: readonly ExcalidrawElement[]) => {
  let previousIndex: FractionalIndex | null = null;
  for (const element of elements) {
    if (
      !isValidOrderKey(element.index) ||
      (previousIndex !== null && previousIndex >= element.index)
    ) {
      return false;
    }
    previousIndex = element.index;
  }
  return true;
};

export const appendElementsWithSyncedIndices = (
  existingElements: readonly ExcalidrawElement[],
  appendedElements: readonly ExcalidrawElement[],
) => {
  const preserveExistingIndices = existingIndicesAreOrdered(existingElements);
  const normalizedExistingIndices = preserveExistingIndices
    ? []
    : generateNKeysBetween(null, null, existingElements.length);
  const existing = preserveExistingIndices
    ? [...existingElements]
    : existingElements.map((element, index) => ({
        ...element,
        index: normalizedExistingIndices[index] as FractionalIndex,
      }));
  const lowerBound = existing.at(-1)?.index ?? null;
  const appendedIndices = generateNKeysBetween(
    lowerBound,
    null,
    appendedElements.length,
  );

  return [
    ...existing,
    ...appendedElements.map((element, index) => ({
      ...element,
      index: appendedIndices[index] as FractionalIndex,
    })),
  ];
};
