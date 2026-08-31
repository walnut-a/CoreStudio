import { describe, expect, it, vi } from "vitest";

import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import {
  locateAgentSceneElement,
  selectAgentSceneElements,
} from "./agentSceneNavigation";

const imageElement = {
  id: "image-element",
  type: "image",
  fileId: "file-1",
  isDeleted: false,
} as ExcalidrawElement;

const textElement = {
  id: "text-element",
  type: "text",
  isDeleted: false,
} as ExcalidrawElement;

const createApi = (elements: readonly ExcalidrawElement[]) =>
  ({
    getSceneElementsIncludingDeleted: () => elements,
    updateScene: vi.fn(),
    setViewport: vi.fn(),
  } as unknown as Pick<
    ExcalidrawImperativeAPI,
    "getSceneElementsIncludingDeleted" | "updateScene" | "setViewport"
  >);

describe("agent scene navigation", () => {
  it("locates by file id without persisting a scene update", () => {
    const api = createApi([imageElement, textElement]);

    const result = locateAgentSceneElement({
      api,
      imageRecords: {},
      fileId: "file-1",
    });

    expect(result).toEqual({
      located: true,
      locateKind: "direct",
      elementIds: ["image-element"],
      fileIds: ["file-1"],
      requestedFileIds: ["file-1"],
    });
    expect(api.updateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        appState: expect.objectContaining({
          selectedElementIds: { "image-element": true },
        }),
      }),
    );
    expect(api.setViewport).toHaveBeenCalledWith({
      target: imageElement,
      fit: "none",
      animation: { duration: 300 },
    });
  });

  it("replaces participant selection with bounded element and file ids", () => {
    const api = createApi([imageElement, textElement]);

    const result = selectAgentSceneElements({
      api,
      elementIds: ["text-element"],
      fileIds: ["file-1"],
    });

    expect(result).toEqual({
      selected: true,
      elementIds: ["image-element", "text-element"],
      fileIds: ["file-1"],
    });
    expect(api.updateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        appState: expect.objectContaining({
          selectedElementIds: {
            "image-element": true,
            "text-element": true,
          },
        }),
      }),
    );
  });
});
