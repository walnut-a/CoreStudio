import { describe, expect, it } from "vitest";

import { buildSelectedGenerationTask } from "./selectionState";
import type { GenerationTaskRecord } from "./components/ImageInspector";

describe("buildSelectedGenerationTask", () => {
  it("returns the same task reference for the selected placeholder", () => {
    const task: GenerationTaskRecord = {
      status: "error",
      provider: "zenmux",
      model: "google/gemini-2.5-flash-image",
      prompt: "保留机械结构比例",
      negativePrompt: "",
      seed: null,
      width: 1024,
      height: 1024,
      startedAt: "2026-04-15T10:00:00.000Z",
      errorMessage: "生成失败",
      rawError: "raw error",
      stack: null,
    };

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
