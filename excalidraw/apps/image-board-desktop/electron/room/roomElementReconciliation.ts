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
): T[] =>
  [...elements].sort((left, right) => {
    if (typeof left.index !== "string" || typeof right.index !== "string") {
      return 0;
    }
    if (left.index < right.index) {
      return -1;
    }
    if (left.index > right.index) {
      return 1;
    }
    return left.id.localeCompare(right.id);
  });
