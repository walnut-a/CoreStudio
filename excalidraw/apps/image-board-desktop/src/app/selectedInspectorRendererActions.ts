import type { AppState } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/element/types";

import type { ImageRecord } from "../shared/projectTypes";
import type { GenerationTaskRecord } from "./generationTaskState";
import { buildSelectedInspectorState } from "./selectionState";

export const createSelectedInspectorRendererActions = ({
  getGenerationTasks,
  setSelectedRecord,
  setSelectedTask,
}: {
  getGenerationTasks: () => ReadonlyMap<string, GenerationTaskRecord>;
  setSelectedRecord: (record: ImageRecord | null) => void;
  setSelectedTask: (task: GenerationTaskRecord | null) => void;
}) => {
  const update = ({
    elements,
    appState,
    imageRecords,
  }: {
    elements: readonly ExcalidrawElement[];
    appState: AppState;
    imageRecords: Record<string, ImageRecord> | null;
  }) => {
    const selectedInspectorState = buildSelectedInspectorState({
      elements,
      appState,
      imageRecords,
      generationTasks: getGenerationTasks(),
    });
    setSelectedRecord(selectedInspectorState.record);
    setSelectedTask(selectedInspectorState.task);

    return selectedInspectorState;
  };

  return {
    update,
  };
};
