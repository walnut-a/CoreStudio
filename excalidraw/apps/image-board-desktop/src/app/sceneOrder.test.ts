import { describe, expect, it } from "vitest";

import { syncInvalidIndices, validateFractionalIndices } from "@excalidraw/element";
import { newFrameElement, newImageElement, newTextElement } from "@excalidraw/element";
import type { FileId } from "@excalidraw/element/types";

import { appendElementsWithSyncedIndices } from "./sceneOrder";

describe("appendElementsWithSyncedIndices", () => {
  it("assigns valid fractional indices to appended placeholders", () => {
    const existingImage = newImageElement({
      type: "image",
      fileId: "file-1" as FileId,
      status: "saved",
      scale: [1, 1],
      x: 0,
      y: 0,
      width: 200,
      height: 200,
    });

    const existingElements = syncInvalidIndices([existingImage]);

    const frame = newFrameElement({
      x: 220,
      y: 0,
      width: 200,
      height: 200,
    });
    const label = newTextElement({
      x: 320,
      y: 100,
      text: "生成中",
      fontSize: 24,
      textAlign: "center",
      verticalAlign: "middle",
      autoResize: true,
      frameId: frame.id,
    });

    const result = appendElementsWithSyncedIndices(existingElements, [frame, label]);

    expect(() =>
      validateFractionalIndices(result, {
        shouldThrow: true,
        includeBoundTextValidation: false,
        ignoreLogs: true,
      }),
    ).not.toThrow();
    expect(result.slice(-2).every((element) => typeof element.index === "string")).toBe(
      true,
    );
  });
});
