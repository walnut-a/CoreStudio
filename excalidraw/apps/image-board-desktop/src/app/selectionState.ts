import { CaptureUpdateAction } from "@excalidraw/element";
import type { ImageRecord } from "../shared/projectTypes";
import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { AppState } from "@excalidraw/excalidraw/types";

import type { GenerationTaskRecord } from "./generationTaskState";

export const buildSelectedElementIdsFromElements = (
  elements: readonly { id: string }[],
): AppState["selectedElementIds"] =>
  Object.fromEntries(
    elements.map((element) => [element.id, true as const]),
  ) as AppState["selectedElementIds"];

export const buildElementSelectionSceneUpdate = (
  elements: readonly { id: string }[],
) => ({
  appState: {
    selectedElementIds: buildSelectedElementIdsFromElements(elements),
    selectedGroupIds: {},
  },
  captureUpdate: CaptureUpdateAction.NEVER,
});

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
  generationTasks: ReadonlyMap<string, GenerationTaskRecord>,
) => {
  const selectedElementId = Object.keys(appState.selectedElementIds).find(
    (elementId) => appState.selectedElementIds[elementId],
  );
  if (!selectedElementId) {
    return null;
  }

  return generationTasks.get(selectedElementId) || null;
};

export const buildSelectedInspectorState = ({
  elements,
  appState,
  imageRecords,
  generationTasks,
}: {
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  imageRecords: Record<string, ImageRecord> | null;
  generationTasks: ReadonlyMap<string, GenerationTaskRecord>;
}) => ({
  record: buildSelectedImageRecord(elements, appState, imageRecords),
  task: buildSelectedGenerationTask(appState, generationTasks),
});
