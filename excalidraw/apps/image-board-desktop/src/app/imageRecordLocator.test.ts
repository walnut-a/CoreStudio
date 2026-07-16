import { describe, expect, it, vi } from "vitest";

import {
  buildImageRecordLocateFeedback,
  createImageRecordLocatorRendererActions,
  runImageRecordLocateFeedbackAction,
  runImageRecordLocateRendererAction,
  runPromptReferenceLocateRendererAction,
  runPromptReferenceLocateAction,
  resolveImageRecordLocateTarget,
  resolvePromptReferenceLocateTargets,
} from "./imageRecordLocator";

import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { ImageRecord } from "../shared/projectTypes";
import { setActiveDesktopLocale } from "./copy";

type LocateTestApi = Pick<
  ExcalidrawImperativeAPI,
  "getSceneElementsIncludingDeleted" | "updateScene" | "setViewport"
>;

const createImageElement = (
  patch: Partial<ExcalidrawElement> & { id: string; fileId: string },
): ExcalidrawElement => {
  const { id, fileId, ...rest } = patch;
  return {
    id,
    type: "image",
    fileId,
    isDeleted: false,
    groupIds: [],
    x: 0,
    y: 0,
    width: 320,
    height: 320,
    ...rest,
  } as ExcalidrawElement;
};

const createRecord = (
  patch: Partial<ImageRecord> & { fileId: string },
): ImageRecord => {
  const { fileId, ...rest } = patch;
  return {
    fileId,
    assetPath: `assets/${fileId}.png`,
    sourceType: "generated",
    generationOrigin: "acp-agent",
    width: 1024,
    height: 1024,
    createdAt: "2026-07-02T08:00:00.000Z",
    mimeType: "image/png",
    ...rest,
  };
};

describe("resolveImageRecordLocateTarget", () => {
  it("locates a live image element by file id", () => {
    const element = createImageElement({
      id: "element-1",
      fileId: "file-1",
    });

    expect(
      resolveImageRecordLocateTarget({
        fileId: "file-1",
        elements: [element],
        imageRecords: null,
      }),
    ).toEqual({
      kind: "direct",
      element,
      fileId: "file-1",
    });
  });

  it("falls back to the result image that references a missing source file", () => {
    const referencingElement = createImageElement({
      id: "element-result",
      fileId: "file-result",
    });
    const referencingRecord = createRecord({
      fileId: "file-result",
      promptReferences: [
        {
          id: "reference-1",
          index: 1,
          label: "参考图 1",
          kind: "image",
          fileIds: ["file-source"],
        },
      ],
    });

    expect(
      resolveImageRecordLocateTarget({
        fileId: "file-source",
        elements: [referencingElement],
        imageRecords: {
          "file-result": referencingRecord,
        },
      }),
    ).toEqual({
      kind: "referenced-by-result",
      element: referencingElement,
      fileId: "file-source",
      referencingRecord,
    });
  });

  it("returns missing when neither the record nor a referencing result is on board", () => {
    expect(
      resolveImageRecordLocateTarget({
        fileId: "file-missing",
        elements: [
          createImageElement({
            id: "element-deleted",
            fileId: "file-missing",
            isDeleted: true,
          }),
        ],
        imageRecords: {
          "file-result": createRecord({
            fileId: "file-result",
            promptReferences: [
              {
                id: "reference-1",
                index: 1,
                label: "参考图 1",
                kind: "image",
                fileIds: ["file-missing"],
              },
            ],
          }),
        },
      }),
    ).toEqual({
      kind: "missing",
      fileId: "file-missing",
    });
  });
});

describe("buildImageRecordLocateFeedback", () => {
  it("localizes generated locate notices", () => {
    setActiveDesktopLocale("en");
    const referencingRecord = createRecord({ fileId: "file-result" });

    expect(
      buildImageRecordLocateFeedback({
        kind: "referenced-by-result",
        element: createImageElement({
          id: "element-result",
          fileId: "file-result",
        }),
        fileId: "file-source",
        referencingRecord,
      }).noticeMessage,
    ).toBe(
      "This image is a reference for a later result. Located the board image that uses it.",
    );
    expect(
      buildImageRecordLocateFeedback({
        kind: "missing",
        fileId: "file-missing",
      }).noticeMessage,
    ).toBe(
      "This image record has no matching board element. Run project data repair to restore it to the canvas.",
    );
    setActiveDesktopLocale("zh-CN");
  });

  it("clears existing notices when a record is located directly", () => {
    expect(
      buildImageRecordLocateFeedback({
        kind: "direct",
        element: createImageElement({
          id: "element-1",
          fileId: "file-1",
        }),
        fileId: "file-1",
      }),
    ).toEqual({
      shouldLocateElement: true,
      noticeMessage: null,
      clearExistingNotice: true,
    });
  });

  it("explains when locating the result that references the source image", () => {
    const referencingRecord = createRecord({ fileId: "file-result" });

    expect(
      buildImageRecordLocateFeedback({
        kind: "referenced-by-result",
        element: createImageElement({
          id: "element-result",
          fileId: "file-result",
        }),
        fileId: "file-source",
        referencingRecord,
      }),
    ).toEqual({
      shouldLocateElement: true,
      noticeMessage: "这张图片是后续结果的参考图，已定位到引用它的画板图片。",
      clearExistingNotice: false,
    });
  });

  it("explains when the image record has no board element", () => {
    expect(
      buildImageRecordLocateFeedback({
        kind: "missing",
        fileId: "file-missing",
      }),
    ).toEqual({
      shouldLocateElement: false,
      noticeMessage:
        "这张图片记录没有对应画板元素，可以运行项目数据修复补回画布。",
      clearExistingNotice: false,
    });
  });
});

describe("runImageRecordLocateFeedbackAction", () => {
  it("locates a direct image record, clears project errors, and clears old notices", () => {
    const element = createImageElement({
      id: "element-1",
      fileId: "file-1",
    });
    const getElements = vi.fn(() => [element]);
    const getImageRecords = vi.fn(() => null);
    const updateScene = vi.fn();
    const setViewport = vi.fn();
    const setProjectError = vi.fn();
    const showProjectNotice = vi.fn();
    const clearProjectNotice = vi.fn();

    runImageRecordLocateFeedbackAction({
      fileId: "file-1",
      getElements,
      getImageRecords,
      updateScene,
      setViewport,
      setProjectError,
      showProjectNotice,
      clearProjectNotice,
    });

    expect(getElements).toHaveBeenCalledTimes(1);
    expect(getImageRecords).toHaveBeenCalledTimes(1);
    expect(updateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        appState: {
          selectedElementIds: {
            "element-1": true,
          },
          selectedGroupIds: {},
        },
      }),
    );
    expect(setViewport).toHaveBeenCalledWith({
      target: element,
      fit: "none",
      animation: {
        duration: 300,
      },
    });
    expect(setProjectError).toHaveBeenCalledWith(null);
    expect(showProjectNotice).not.toHaveBeenCalled();
    expect(clearProjectNotice).toHaveBeenCalledTimes(1);
  });

  it("locates a referencing result and shows the reference notice", () => {
    const element = createImageElement({
      id: "element-result",
      fileId: "file-result",
    });
    const referencingRecord = createRecord({ fileId: "file-result" });
    const getElements = vi.fn(() => [element]);
    const getImageRecords = vi.fn(() => ({
      "file-result": {
        ...referencingRecord,
        promptReferences: [
          {
            id: "reference-1",
            index: 1,
            label: "参考图 1",
            kind: "image" as const,
            fileIds: ["file-source"],
          },
        ],
      },
    }));
    const updateScene = vi.fn();
    const setViewport = vi.fn();
    const setProjectError = vi.fn();
    const showProjectNotice = vi.fn();
    const clearProjectNotice = vi.fn();

    runImageRecordLocateFeedbackAction({
      fileId: "file-source",
      getElements,
      getImageRecords,
      updateScene,
      setViewport,
      setProjectError,
      showProjectNotice,
      clearProjectNotice,
    });

    expect(getElements).toHaveBeenCalledTimes(1);
    expect(getImageRecords).toHaveBeenCalledTimes(1);
    expect(updateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        appState: {
          selectedElementIds: {
            "element-result": true,
          },
          selectedGroupIds: {},
        },
      }),
    );
    expect(setViewport).toHaveBeenCalledWith({
      target: element,
      fit: "none",
      animation: {
        duration: 300,
      },
    });
    expect(setProjectError).toHaveBeenCalledWith(null);
    expect(showProjectNotice).toHaveBeenCalledWith(
      "这张图片是后续结果的参考图，已定位到引用它的画板图片。",
    );
    expect(clearProjectNotice).not.toHaveBeenCalled();
  });
});

describe("runImageRecordLocateRendererAction", () => {
  it("skips location when the Excalidraw API is not available", () => {
    const getImageRecords = vi.fn(() => null);
    const setProjectError = vi.fn();
    const showProjectNotice = vi.fn();
    const clearProjectNotice = vi.fn();

    expect(
      runImageRecordLocateRendererAction({
        fileId: "file-1",
        getApi: () => null,
        getImageRecords,
        setProjectError,
        showProjectNotice,
        clearProjectNotice,
      }),
    ).toBe(false);

    expect(getImageRecords).not.toHaveBeenCalled();
    expect(setProjectError).not.toHaveBeenCalled();
    expect(showProjectNotice).not.toHaveBeenCalled();
    expect(clearProjectNotice).not.toHaveBeenCalled();
  });

  it("locates an image record through the current Excalidraw API", () => {
    const element = createImageElement({
      id: "element-1",
      fileId: "file-1",
    });
    const api = {
      getSceneElementsIncludingDeleted: vi.fn(() => [element]),
      updateScene: vi.fn(),
      setViewport: vi.fn(),
    } as unknown as LocateTestApi;
    const setProjectError = vi.fn();
    const showProjectNotice = vi.fn();
    const clearProjectNotice = vi.fn();

    expect(
      runImageRecordLocateRendererAction({
        fileId: "file-1",
        getApi: () => api,
        getImageRecords: () => null,
        setProjectError,
        showProjectNotice,
        clearProjectNotice,
      }),
    ).toBe(true);

    expect(api.getSceneElementsIncludingDeleted).toHaveBeenCalledTimes(1);
    expect(api.updateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        appState: {
          selectedElementIds: {
            "element-1": true,
          },
          selectedGroupIds: {},
        },
      }),
    );
    expect(api.setViewport).toHaveBeenCalledWith({
      target: element,
      fit: "none",
      animation: {
        duration: 300,
      },
    });
    expect(setProjectError).toHaveBeenCalledWith(null);
  });
});

describe("resolvePromptReferenceLocateTargets", () => {
  it("locates live elements by prompt reference element ids and image file ids", () => {
    const shapeElement = {
      id: "shape-1",
      type: "rectangle",
      isDeleted: false,
      groupIds: [],
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    } as unknown as ExcalidrawElement;
    const imageElement = createImageElement({
      id: "image-1",
      fileId: "file-1",
    });

    expect(
      resolvePromptReferenceLocateTargets({
        reference: {
          id: "reference-1",
          index: 1,
          label: "参考图 1",
          kind: "image",
          elementIds: ["shape-1"],
          fileIds: ["file-1"],
        },
        elements: [shapeElement, imageElement],
      }),
    ).toEqual([shapeElement, imageElement]);
  });

  it("ignores deleted elements and non-image elements that only match file ids", () => {
    const deletedImage = createImageElement({
      id: "deleted-image",
      fileId: "file-1",
      isDeleted: true,
    });
    const textElement = {
      id: "text-1",
      type: "text",
      isDeleted: false,
      groupIds: [],
      x: 0,
      y: 0,
      width: 100,
      height: 30,
      fileId: "file-1",
    } as unknown as ExcalidrawElement;

    expect(
      resolvePromptReferenceLocateTargets({
        reference: {
          id: "reference-1",
          index: 1,
          label: "参考图 1",
          kind: "image",
          fileIds: ["file-1"],
        },
        elements: [deletedImage, textElement],
      }),
    ).toEqual([]);
  });
});

describe("runPromptReferenceLocateAction", () => {
  it("locates all live prompt reference targets", () => {
    const shapeElement = {
      id: "shape-1",
      type: "rectangle",
      isDeleted: false,
      groupIds: [],
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    } as unknown as ExcalidrawElement;
    const imageElement = createImageElement({
      id: "image-1",
      fileId: "file-1",
    });
    const getElements = vi.fn(() => [shapeElement, imageElement]);
    const updateScene = vi.fn();
    const setViewport = vi.fn();

    runPromptReferenceLocateAction({
      reference: {
        id: "reference-1",
        index: 1,
        label: "参考图 1",
        kind: "image",
        elementIds: ["shape-1"],
        fileIds: ["file-1"],
      },
      getElements,
      updateScene,
      setViewport,
    });

    expect(getElements).toHaveBeenCalledTimes(1);
    expect(updateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        appState: {
          selectedElementIds: {
            "shape-1": true,
            "image-1": true,
          },
          selectedGroupIds: {},
        },
      }),
    );
    expect(setViewport).toHaveBeenCalledWith({
      target: [shapeElement, imageElement],
      fit: "none",
      animation: {
        duration: 300,
      },
    });
  });

  it("skips location when the prompt reference has no live targets", () => {
    const getElements = vi.fn(() => []);
    const updateScene = vi.fn();
    const setViewport = vi.fn();

    runPromptReferenceLocateAction({
      reference: {
        id: "reference-1",
        index: 1,
        label: "参考图 1",
        kind: "image",
        fileIds: ["missing-file"],
      },
      getElements,
      updateScene,
      setViewport,
    });

    expect(getElements).toHaveBeenCalledTimes(1);
    expect(updateScene).not.toHaveBeenCalled();
    expect(setViewport).not.toHaveBeenCalled();
  });
});

describe("runPromptReferenceLocateRendererAction", () => {
  it("skips location when the Excalidraw API is not available", () => {
    expect(
      runPromptReferenceLocateRendererAction({
        reference: {
          id: "reference-1",
          index: 1,
          label: "参考图 1",
          kind: "image",
          fileIds: ["file-1"],
        },
        getApi: () => null,
      }),
    ).toBe(false);
  });

  it("locates a prompt reference through the current Excalidraw API", () => {
    const imageElement = createImageElement({
      id: "image-1",
      fileId: "file-1",
    });
    const api = {
      getSceneElementsIncludingDeleted: vi.fn(() => [imageElement]),
      updateScene: vi.fn(),
      setViewport: vi.fn(),
    } as unknown as LocateTestApi;

    expect(
      runPromptReferenceLocateRendererAction({
        reference: {
          id: "reference-1",
          index: 1,
          label: "参考图 1",
          kind: "image",
          fileIds: ["file-1"],
        },
        getApi: () => api,
      }),
    ).toBe(true);

    expect(api.getSceneElementsIncludingDeleted).toHaveBeenCalledTimes(1);
    expect(api.updateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        appState: {
          selectedElementIds: {
            "image-1": true,
          },
          selectedGroupIds: {},
        },
      }),
    );
    expect(api.setViewport).toHaveBeenCalledWith({
      target: [imageElement],
      fit: "none",
      animation: {
        duration: 300,
      },
    });
  });
});

describe("createImageRecordLocatorRendererActions", () => {
  it("creates renderer actions for locating image records and prompt references", () => {
    const imageElement = createImageElement({
      id: "image-1",
      fileId: "file-1",
    });
    const api = {
      getSceneElementsIncludingDeleted: vi.fn(() => [imageElement]),
      updateScene: vi.fn(),
      setViewport: vi.fn(),
    } as unknown as LocateTestApi;
    const getApi = vi.fn(() => api);
    const getImageRecords = vi.fn(() => null);
    const setProjectError = vi.fn();
    const showProjectNotice = vi.fn();
    const clearProjectNotice = vi.fn();

    const actions = createImageRecordLocatorRendererActions({
      getApi,
      getImageRecords,
      setProjectError,
      showProjectNotice,
      clearProjectNotice,
    });

    expect(actions.locateImageRecord("file-1")).toBe(true);
    expect(
      actions.locatePromptReference({
        id: "reference-1",
        index: 1,
        label: "参考图 1",
        kind: "image",
        fileIds: ["file-1"],
      }),
    ).toBe(true);

    expect(getApi).toHaveBeenCalledTimes(2);
    expect(getImageRecords).toHaveBeenCalledTimes(1);
    expect(setProjectError).toHaveBeenCalledWith(null);
    expect(api.setViewport).toHaveBeenCalledTimes(2);
  });
});
