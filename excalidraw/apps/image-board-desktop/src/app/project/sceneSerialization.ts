import { loadFromBlob } from "@excalidraw/excalidraw/data/blob";
import { serializeAsJSON } from "@excalidraw/excalidraw/data/json";
import { getDefaultAppState } from "@excalidraw/excalidraw/appState";

import type {
  AppState,
  ExcalidrawInitialDataState,
} from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/element/types";

export const serializeSceneForProject = ({
  elements,
  appState,
}: {
  elements: readonly ExcalidrawElement[];
  appState: Partial<AppState>;
}) => {
  return serializeAsJSON(elements, appState, {}, "local");
};

export const deserializeSceneFromProject = async (
  sceneJson: string,
): Promise<ExcalidrawInitialDataState> => {
  const blob = new Blob([sceneJson], {
    type: "application/vnd.excalidraw+json",
  });

  const data = await loadFromBlob(blob, null, null, null);

  return {
    elements: data.elements,
    appState: data.appState ?? getDefaultAppState(),
    files: data.files,
  };
};
