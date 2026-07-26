import { randomInt } from "node:crypto";

import {
  generateNKeysBetween,
  validateOrderKey,
} from "@excalidraw/fractional-indexing";

import type { ProjectRoomSceneElement } from "../../src/shared/projectRoomProtocol";

export type RoomSceneElement = ProjectRoomSceneElement;

export const chooseAuthoritativeRoomElement = <T extends RoomSceneElement>(
  current: T | undefined,
  incoming: T,
): T => {
  if (!current) {
    return incoming;
  }
  if (current.version > incoming.version) {
    return current;
  }
  if (current.version < incoming.version) {
    return incoming;
  }
  return current.versionNonce <= incoming.versionNonce ? current : incoming;
};

export const orderRoomSceneElements = <T extends RoomSceneElement>(
  elements: readonly T[],
): T[] => {
  const isValidIndex = (index: unknown): index is string => {
    if (typeof index !== "string" || index.length === 0) {
      return false;
    }
    try {
      validateOrderKey(index);
      return true;
    } catch {
      return false;
    }
  };

  const ordered = elements.map((element) => structuredClone(element));
  ordered.sort((left, right) => {
    const leftIndex = left.index;
    const rightIndex = right.index;
    const leftHasValidIndex = isValidIndex(leftIndex);
    const rightHasValidIndex = isValidIndex(rightIndex);
    if (leftHasValidIndex && rightHasValidIndex) {
      if (leftIndex < rightIndex) {
        return -1;
      }
      if (leftIndex > rightIndex) {
        return 1;
      }
      return left.id.localeCompare(right.id);
    }
    if (leftHasValidIndex) {
      return -1;
    }
    if (rightHasValidIndex) {
      return 1;
    }
    return left.id.localeCompare(right.id);
  });

  let lowerBound: string | null = null;
  let position = 0;
  while (position < ordered.length) {
    const currentIndex = ordered[position].index;
    if (
      isValidIndex(currentIndex) &&
      (lowerBound === null || lowerBound < currentIndex)
    ) {
      lowerBound = currentIndex;
      position += 1;
      continue;
    }

    let upperBoundPosition = position + 1;
    while (upperBoundPosition < ordered.length) {
      const candidate = ordered[upperBoundPosition].index;
      if (
        isValidIndex(candidate) &&
        (lowerBound === null || lowerBound < candidate)
      ) {
        break;
      }
      upperBoundPosition += 1;
    }
    const upperBound =
      upperBoundPosition < ordered.length
        ? (ordered[upperBoundPosition].index as string)
        : null;
    const replacementIndices = generateNKeysBetween(
      lowerBound,
      upperBound,
      upperBoundPosition - position,
    );
    for (let offset = 0; offset < replacementIndices.length; offset += 1) {
      const element = ordered[position + offset];
      element.index = replacementIndices[offset];
      element.version += 1;
      element.versionNonce = randomInt(0, 2 ** 31);
      (element as ProjectRoomSceneElement).updated = Date.now();
    }
    lowerBound = replacementIndices.at(-1) ?? lowerBound;
    position = upperBoundPosition;
  }

  return ordered;
};
