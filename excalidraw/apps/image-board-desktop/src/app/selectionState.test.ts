import { describe, expect, it } from "vitest";
import { CaptureUpdateAction } from "@excalidraw/element";

import {
  buildElementSelectionSceneUpdate,
  buildSelectedElementIdsFromElements,
  buildSelectedGenerationTask,
  buildSelectedInspectorState,
} from "./selectionState";
import type { GenerationTaskRecord } from "./generationTaskState";
import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { AppState } from "@excalidraw/excalidraw/types";
import type { ImageRecord } from "../shared/projectTypes";

const createImageElement = ({
  id,
  fileId,
}: {
  id: string;
  fileId: string;
}): ExcalidrawElement =>
  ({
    id,
    type: "image",
    fileId,
    isDeleted: false,
    groupIds: [],
    x: 0,
    y: 0,
    width: 320,
    height: 320,
  }) as unknown as ExcalidrawElement;

const createImageRecord = (fileId: string): ImageRecord => ({
  fileId,
  assetPath: `assets/${fileId}.png`,
  sourceType: "generated",
  generationOrigin: "corestudio",
  provider: "zenmux",
  model: "google/gemini-2.5-flash-image",
  width: 1024,
  height: 1024,
  createdAt: "2026-07-04T08:00:00.000Z",
  mimeType: "image/png",
});

const createTask = (prompt = "保留机械结构比例"): GenerationTaskRecord => ({
  status: "error",
  provider: "zenmux",
  model: "google/gemini-2.5-flash-image",
  prompt,
  negativePrompt: "",
  seed: null,
  width: 1024,
  height: 1024,
  startedAt: "2026-04-15T10:00:00.000Z",
  errorMessage: "生成失败",
  rawError: "raw error",
  stack: null,
});

describe("buildSelectedElementIdsFromElements", () => {
  it("selects every provided element id", () => {
    expect(
      buildSelectedElementIdsFromElements([
        { id: "element-a" },
        { id: "element-b" },
      ]),
    ).toEqual({
      "element-a": true,
      "element-b": true,
    });
  });

  it("returns an empty selection when there are no elements", () => {
    expect(buildSelectedElementIdsFromElements([])).toEqual({});
  });
});

describe("buildElementSelectionSceneUpdate", () => {
  it("builds a non-capturing scene update that selects the provided elements only", () => {
    expect(
      buildElementSelectionSceneUpdate([
        { id: "element-a" },
        { id: "element-b" },
      ]),
    ).toEqual({
      appState: {
        selectedElementIds: {
          "element-a": true,
          "element-b": true,
        },
        selectedGroupIds: {},
      },
      captureUpdate: CaptureUpdateAction.NEVER,
    });
  });
});

describe("buildSelectedGenerationTask", () => {
  it("returns the same task reference for the selected placeholder", () => {
    const task = createTask();

    const tasks = new Map<string, GenerationTaskRecord>([["frame-1", task]]);

    const result = buildSelectedGenerationTask(
      {
        selectedElementIds: {
          "frame-1": true,
        },
      },
      tasks,
    );

    expect(result).toBe(task);
  });

  it("returns null when the selected element is not a generation placeholder", () => {
    const result = buildSelectedGenerationTask(
      {
        selectedElementIds: {
          "frame-1": true,
        },
      },
      new Map(),
    );

    expect(result).toBeNull();
  });
});

describe("buildSelectedInspectorState", () => {
  it("builds the selected image record and generation task together", () => {
    const record = createImageRecord("file-1");
    const task = createTask("生成失败的占位任务");

    const result = buildSelectedInspectorState({
      elements: [createImageElement({ id: "element-1", fileId: "file-1" })],
      appState: {
        selectedElementIds: {
          "element-1": true,
        },
      } as unknown as AppState,
      imageRecords: {
        "file-1": record,
      },
      generationTasks: new Map([["element-1", task]]),
    });

    expect(result).toEqual({
      record,
      task,
    });
  });
});
