import { describe, expect, it, vi } from "vitest";
import type { AppState } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/element/types";

import type { ImageRecord } from "../shared/projectTypes";
import type { GenerationTaskRecord } from "./generationTaskState";
import { createSelectedInspectorRendererActions } from "./selectedInspectorRendererActions";

const createImageElement = (fileId: string): ExcalidrawElement =>
  ({
    id: "image-element",
    type: "image",
    fileId,
    isDeleted: false,
    groupIds: [],
    x: 0,
    y: 0,
    width: 320,
    height: 320,
  }) as unknown as ExcalidrawElement;

const createAppState = (): AppState =>
  ({
    selectedElementIds: {
      "image-element": true,
    },
  }) as unknown as AppState;

const createImageRecord = (fileId: string): ImageRecord => ({
  fileId,
  assetPath: `assets/${fileId}.png`,
  sourceType: "generated",
  generationOrigin: "corestudio",
  provider: "zenmux",
  model: "google/gemini-2.5-flash-image",
  width: 1024,
  height: 1024,
  createdAt: "2026-07-06T08:00:00.000Z",
  mimeType: "image/png",
});

const createTask = (prompt: string): GenerationTaskRecord => ({
  status: "pending",
  provider: "zenmux",
  model: "google/gemini-2.5-flash-image",
  prompt,
  negativePrompt: "",
  seed: null,
  width: 1024,
  height: 1024,
  startedAt: "2026-07-06T08:00:00.000Z",
});

describe("createSelectedInspectorRendererActions", () => {
  it("updates the selected record and task from the current generation task map", () => {
    const record = createImageRecord("file-1");
    const firstTask = createTask("第一版占位任务");
    const secondTask = createTask("第二版占位任务");
    let generationTasks = new Map<string, GenerationTaskRecord>([
      ["image-element", firstTask],
    ]);
    const setSelectedRecord = vi.fn();
    const setSelectedTask = vi.fn();
    const actions = createSelectedInspectorRendererActions({
      getGenerationTasks: () => generationTasks,
      setSelectedRecord,
      setSelectedTask,
    });

    const firstResult = actions.update({
      elements: [createImageElement("file-1")],
      appState: createAppState(),
      imageRecords: {
        "file-1": record,
      },
    });

    generationTasks = new Map([["image-element", secondTask]]);
    const secondResult = actions.update({
      elements: [createImageElement("file-1")],
      appState: createAppState(),
      imageRecords: {
        "file-1": record,
      },
    });

    expect(firstResult).toEqual({ record, task: firstTask });
    expect(secondResult).toEqual({ record, task: secondTask });
    expect(setSelectedRecord).toHaveBeenLastCalledWith(record);
    expect(setSelectedTask).toHaveBeenLastCalledWith(secondTask);
  });
});
