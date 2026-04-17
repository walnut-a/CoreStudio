import type { ImageRecord } from "../shared/projectTypes";
import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { AppState } from "@excalidraw/excalidraw/types";

import type { GenerationTaskRecord } from "./components/ImageInspector";

export const buildSelectedImageRecord = (
  elements: readonly ExcalidrawElement[],
  appState: AppState,
  imageRecords: Record<string, ImageRecord> | null,
) => {
  if (!imageRecords) {
    return null;
  }

  const selectedElementId = Object.keys(appState.selectedElementIds).find(
    (elementId) => appState.selectedElementIds[elementId],
  );
  if (!selectedElementId) {
    return null;
  }

  const selectedElement = elements.find((element) => element.id === selectedElementId);
  if (!selectedElement || selectedElement.type !== "image" || !selectedElement.fileId) {
    return null;
  }

  return imageRecords[selectedElement.fileId] || null;
};

export const buildSelectedGenerationTask = (
  appState: Pick<AppState, "selectedElementIds">,
  generationTasks: Map<string, GenerationTaskRecord>,
) => {
  const selectedElementId = Object.keys(appState.selectedElementIds).find(
    (elementId) => appState.selectedElementIds[elementId],
  );
  if (!selectedElementId) {
    return null;
  }

  return generationTasks.get(selectedElementId) || null;
};
