import { describe, expect, it } from "vitest";

import { newFrameElement } from "@excalidraw/element";

import type { GenerationRequest } from "../shared/providerTypes";
import {
  buildPendingGenerationFailureSceneUpdate,
  buildPendingGenerationPlaceholderSceneUpdate,
  buildPendingGenerationPlaceholders,
  buildPendingGenerationSlotReplacementSceneUpdate,
} from "./generationPlaceholderState";

const createRequest = (
  patch: Partial<GenerationRequest> = {},
): GenerationRequest => ({
  provider: "gemini",
  model: "google/gemini-3-pro-image-preview",
  prompt: "生成一张产品图",
  negativePrompt: "",
  aspectRatio: null,
  width: 1024,
  height: 1024,
  seed: null,
  imageCount: 1,
  reference: null,
  ...patch,
});

describe("buildPendingGenerationPlaceholders", () => {
  it("builds dashed frame and centered labels for multiple pending images", () => {
    const plan = buildPendingGenerationPlaceholders({
      request: createRequest({ imageCount: 2 }),
      placements: [
        { x: 10, y: 20, width: 100, height: 80 },
        { x: 140, y: 20, width: 120, height: 90 },
      ],
      createGroupId: (index) => `slot-${index + 1}`,
    });

    expect(plan.placeholderFrames).toHaveLength(2);
    expect(plan.placeholderElements).toHaveLength(4);
    expect(plan.slots).toEqual([
      {
        frameId: plan.placeholderFrames[0].id,
        labelId: plan.placeholderElements[1].id,
        fitReturnedImageSize: true,
      },
      {
        frameId: plan.placeholderFrames[1].id,
        labelId: plan.placeholderElements[3].id,
        fitReturnedImageSize: true,
      },
    ]);

    expect(plan.placeholderFrames[0]).toMatchObject({
      type: "frame",
      x: 10,
      y: 20,
      width: 100,
      height: 80,
      groupIds: ["slot-1"],
      backgroundColor: "#f4f2ff",
      strokeColor: "#6d5efc",
      strokeStyle: "dashed",
      strokeWidth: 2,
      roughness: 0,
      opacity: 80,
    });
    expect(plan.placeholderElements[1]).toMatchObject({
      type: "text",
      text: "生成中\n1/2",
      groupIds: ["slot-1"],
      frameId: plan.placeholderFrames[0].id,
      fontSize: 24,
      textAlign: "center",
      verticalAlign: "middle",
      autoResize: true,
      strokeColor: "#6d5efc",
      backgroundColor: "transparent",
      roughness: 0,
    });
    expect(plan.placeholderElements[3]).toMatchObject({
      type: "text",
      text: "生成中\n2/2",
      groupIds: ["slot-2"],
      frameId: plan.placeholderFrames[1].id,
    });
  });

  it("keeps a single placeholder label and fixed output size when request ratio is explicit", () => {
    const plan = buildPendingGenerationPlaceholders({
      request: createRequest({
        aspectRatio: "1:1",
        imageCount: 1,
      }),
      placements: [{ x: 0, y: 0, width: 64, height: 64 }],
      createGroupId: () => "slot-1",
    });

    expect(plan.placeholderElements[1]).toMatchObject({
      type: "text",
      text: "生成中",
    });
    expect(plan.slots).toEqual([
      {
        frameId: plan.placeholderFrames[0].id,
        labelId: plan.placeholderElements[1].id,
        fitReturnedImageSize: false,
      },
    ]);
  });
});

describe("buildPendingGenerationFailureSceneUpdate", () => {
  it("marks pending placeholder frames and labels as failed", () => {
    const plan = buildPendingGenerationPlaceholders({
      request: createRequest({ imageCount: 2 }),
      placements: [
        { x: 10, y: 20, width: 100, height: 80 },
        { x: 140, y: 20, width: 120, height: 90 },
      ],
      createGroupId: (index) => `slot-${index + 1}`,
    });
    const unrelatedElement = newFrameElement({
      x: 320,
      y: 40,
      width: 40,
      height: 40,
    });
    const sceneElements = [...plan.placeholderElements, unrelatedElement];

    const result = buildPendingGenerationFailureSceneUpdate({
      elements: sceneElements,
      slots: plan.slots,
    });

    expect(result.selectedElementIds).toEqual({
      [plan.slots[0].frameId]: true,
    });
    expect(result.elements[0]).toMatchObject({
      id: plan.slots[0].frameId,
      strokeColor: "#d14343",
      backgroundColor: "#fff1f2",
    });
    expect(result.elements[1]).toMatchObject({
      id: plan.slots[0].labelId,
      type: "text",
      text: "生成失败",
      originalText: "生成失败",
      strokeColor: "#d14343",
    });
    expect(result.elements[2]).toMatchObject({
      id: plan.slots[1].frameId,
      strokeColor: "#d14343",
      backgroundColor: "#fff1f2",
    });
    expect(result.elements[3]).toMatchObject({
      id: plan.slots[1].labelId,
      type: "text",
      text: "生成失败",
      originalText: "生成失败",
      strokeColor: "#d14343",
    });
    expect(result.elements[4]).toBe(unrelatedElement);
  });

  it("keeps scene elements unchanged when there are no pending slots", () => {
    const plan = buildPendingGenerationPlaceholders({
      request: createRequest(),
      placements: [{ x: 0, y: 0, width: 64, height: 64 }],
      createGroupId: () => "slot-1",
    });

    const result = buildPendingGenerationFailureSceneUpdate({
      elements: plan.placeholderElements,
      slots: [],
    });

    expect(result).toEqual({
      elements: plan.placeholderElements,
      selectedElementIds: undefined,
    });
  });
});

describe("buildPendingGenerationPlaceholderSceneUpdate", () => {
  it("appends pending placeholder elements and returns frames for viewport focus", () => {
    const plan = buildPendingGenerationPlaceholders({
      request: createRequest({ imageCount: 2 }),
      placements: [
        { x: 10, y: 20, width: 100, height: 80 },
        { x: 140, y: 20, width: 120, height: 90 },
      ],
      createGroupId: (index) => `slot-${index + 1}`,
    });
    const existingFrame = newFrameElement({
      x: -120,
      y: -80,
      width: 40,
      height: 40,
    });

    const update = buildPendingGenerationPlaceholderSceneUpdate({
      existingElements: [existingFrame],
      placeholderElements: plan.placeholderElements,
      placeholderFrames: plan.placeholderFrames,
    });

    expect(update.elements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: existingFrame.id }),
        expect.objectContaining({ id: plan.placeholderElements[0].id }),
        expect.objectContaining({ id: plan.placeholderElements[1].id }),
        expect.objectContaining({ id: plan.placeholderElements[2].id }),
        expect.objectContaining({ id: plan.placeholderElements[3].id }),
      ]),
    );
    expect(update.focusElements).toBe(plan.placeholderFrames);
  });

  it("does not request viewport focus when no placeholder frames exist", () => {
    const update = buildPendingGenerationPlaceholderSceneUpdate({
      existingElements: [],
      placeholderElements: [],
      placeholderFrames: [],
    });

    expect(update).toEqual({
      elements: [],
      focusElements: [],
    });
  });
});

describe("buildPendingGenerationSlotReplacementSceneUpdate", () => {
  it("replaces a selected pending slot with the returned image", () => {
    const plan = buildPendingGenerationPlaceholders({
      request: createRequest(),
      placements: [{ x: 20, y: 30, width: 320, height: 180 }],
      createGroupId: () => "slot-1",
    });

    const result = buildPendingGenerationSlotReplacementSceneUpdate({
      elements: plan.placeholderElements,
      selectedElementIds: {
        [plan.slots[0].labelId]: true,
      },
      slot: plan.slots[0],
      asset: {
        fileId: "generated-file",
        width: 1600,
        height: 800,
      },
    });

    if (!result) {
      throw new Error("Expected pending slot replacement update");
    }

    expect(result.imageElement).toMatchObject({
      type: "image",
      fileId: "generated-file",
      status: "saved",
      scale: [1, 1],
      width: 640,
      height: 320,
      x: -140,
      y: -40,
    });
    expect(result.selectedElementIds).toEqual({
      [result.imageElement.id]: true,
    });
    expect(result.elements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: plan.slots[0].frameId,
          isDeleted: true,
        }),
        expect.objectContaining({
          id: plan.slots[0].labelId,
          isDeleted: true,
        }),
        expect.objectContaining({
          id: result.imageElement.id,
          type: "image",
        }),
      ]),
    );
  });

  it("keeps explicit-ratio replacement images at the placeholder frame size", () => {
    const plan = buildPendingGenerationPlaceholders({
      request: createRequest({ aspectRatio: "1:1" }),
      placements: [{ x: 0, y: 0, width: 128, height: 96 }],
      createGroupId: () => "slot-1",
    });

    const result = buildPendingGenerationSlotReplacementSceneUpdate({
      elements: plan.placeholderElements,
      selectedElementIds: {},
      slot: plan.slots[0],
      asset: {
        fileId: "fixed-size-file",
        width: 1600,
        height: 800,
      },
    });

    expect(result?.imageElement).toMatchObject({
      fileId: "fixed-size-file",
      width: 128,
      height: 96,
      x: 0,
      y: 0,
    });
    expect(result?.selectedElementIds).toEqual({});
  });

  it("returns null when the pending frame no longer exists", () => {
    const plan = buildPendingGenerationPlaceholders({
      request: createRequest(),
      placements: [{ x: 0, y: 0, width: 64, height: 64 }],
      createGroupId: () => "slot-1",
    });

    const result = buildPendingGenerationSlotReplacementSceneUpdate({
      elements: plan.placeholderElements.filter(
        (element) => element.id !== plan.slots[0].frameId,
      ),
      selectedElementIds: {
        [plan.slots[0].frameId]: true,
      },
      slot: plan.slots[0],
      asset: {
        fileId: "missing-frame-file",
        width: 1024,
        height: 1024,
      },
    });

    expect(result).toBeNull();
  });
});
