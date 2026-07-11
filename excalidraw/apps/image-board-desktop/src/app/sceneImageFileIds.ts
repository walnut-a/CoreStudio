import type { ExcalidrawElement } from "@excalidraw/element/types";

import { collectAgentImageFileIds } from "./agent/agentCommandHandlers";
import { areStringArraysEqual } from "./arrayState";

export const buildSceneImageFileIdsState = ({
  currentFileIds,
  elements,
}: {
  currentFileIds: string[];
  elements: readonly ExcalidrawElement[];
}) => {
  const nextFileIds = collectAgentImageFileIds(elements);
  return areStringArraysEqual(currentFileIds, nextFileIds)
    ? currentFileIds
    : nextFileIds;
};

export interface SceneImageFileIdsRendererActions {
  update: (elements: readonly ExcalidrawElement[]) => void;
}

export const createSceneImageFileIdsRendererActions = ({
  setSceneImageFileIds,
}: {
  setSceneImageFileIds: (
    updater: (currentFileIds: string[]) => string[],
  ) => void;
}): SceneImageFileIdsRendererActions => ({
  update: (elements) => {
    setSceneImageFileIds((currentFileIds) =>
      buildSceneImageFileIdsState({
        currentFileIds,
        elements,
      }),
    );
  },
});
