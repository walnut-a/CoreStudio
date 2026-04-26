import { beforeEach, describe, expect, it, vi } from "vitest";

const { exportToBlob } = vi.hoisted(() => ({
  exportToBlob: vi.fn(),
}));

vi.mock("@excalidraw/utils", () => ({
  exportToBlob,
}));

import type { AppState } from "@excalidraw/excalidraw/types";

import {
  buildSelectionReferenceSummary,
  buildSelectionReference,
  extractReferenceTextNotes,
  getSelectedReferenceElements,
} from "./selectionReference";

const baseAppState = {
  selectedElementIds: {},
  selectedGroupIds: {},
  viewBackgroundColor: "#ffffff",
} as unknown as AppState;

describe("selectionReference", () => {
  beforeEach(() => {
    exportToBlob.mockReset();
  });

  it("collects directly selected elements and selected groups together", () => {
    const elements = getSelectedReferenceElements({
      elements: [
        {
          id: "rect-1",
          type: "rectangle",
          isDeleted: false,
          groupIds: [],
        },
        {
          id: "text-1",
          type: "text",
          isDeleted: false,
          groupIds: ["group-1"],
          text: "保留这个按键",
        },
        {
          id: "ellipse-1",
          type: "ellipse",
          isDeleted: false,
          groupIds: ["group-1"],
        },
      ] as any,
      appState: {
        ...baseAppState,
        selectedElementIds: {
          "rect-1": true,
        },
        selectedGroupIds: {
          "group-1": true,
        },
      },
      files: {},
    });

    expect(elements.map((element) => element.id)).toEqual([
      "rect-1",
      "text-1",
      "ellipse-1",
    ]);
  });

  it("extracts trimmed text lines from selected text elements", () => {
    expect(
      extractReferenceTextNotes([
        {
          id: "text-1",
          type: "text",
          isDeleted: false,
          text: " 保留外轮廓 \n\n 把按键做薄 ",
        },
        {
          id: "arrow-1",
          type: "arrow",
          isDeleted: false,
        },
      ] as any),
    ).toEqual(["保留外轮廓", "把按键做薄"]);
  });

  it("describes selected reference items in canvas reading order", () => {
    const imageDataUrl = "data:image/png;base64,cmlnaHQtaW1hZ2U=";
    const reference = buildSelectionReferenceSummary({
      elements: [
        {
          id: "image-right",
          type: "image",
          isDeleted: false,
          groupIds: [],
          fileId: "file-right",
          x: 260,
          y: 20,
        },
        {
          id: "text-left",
          type: "text",
          isDeleted: false,
          groupIds: [],
          x: 40,
          y: 10,
          text: "磨砂银色\n低饱和",
        },
        {
          id: "shape-bottom",
          type: "rectangle",
          isDeleted: false,
          groupIds: [],
          x: 30,
          y: 220,
        },
      ] as any,
      appState: {
        ...baseAppState,
        selectedElementIds: {
          "image-right": true,
          "text-left": true,
          "shape-bottom": true,
        },
      },
      files: {
        "file-right": {
          id: "file-right",
          mimeType: "image/png",
          dataURL: imageDataUrl,
          created: Date.now(),
        },
      } as any,
    });

    expect(reference?.items).toEqual([
      {
        id: "text-left",
        index: 1,
        kind: "text",
        label: "文本：磨砂银色",
      },
      {
        id: "image-right",
        index: 2,
        kind: "image",
        label: "图片",
        thumbnailDataUrl: imageDataUrl,
      },
      {
        id: "shape-bottom",
        index: 3,
        kind: "shape",
        label: "矩形",
      },
    ]);
  });

  it("builds a PNG reference payload from the current selection", async () => {
    exportToBlob.mockResolvedValue(
      new Blob(["reference-image"], { type: "image/png" }),
    );

    const reference = await buildSelectionReference({
      scene: {
        elements: [
          {
            id: "text-1",
            type: "text",
            isDeleted: false,
            groupIds: [],
            text: "保留右上角状态灯",
          },
        ] as any,
        appState: {
          ...baseAppState,
          selectedElementIds: {
            "text-1": true,
          },
        },
        files: {},
      },
      includeImage: true,
    });

    expect(exportToBlob).toHaveBeenCalled();
    expect(reference).toMatchObject({
      enabled: true,
      elementCount: 1,
      textCount: 1,
      textNotes: ["保留右上角状态灯"],
      image: {
        mimeType: "image/png",
        dataBase64: "cmVmZXJlbmNlLWltYWdl",
      },
    });
  });

  it("uses the original binary file when the selection is a single image element", async () => {
    const reference = await buildSelectionReference({
      scene: {
        elements: [
          {
            id: "image-1",
            type: "image",
            isDeleted: false,
            groupIds: [],
            fileId: "file-1",
          },
        ] as any,
        appState: {
          ...baseAppState,
          selectedElementIds: {
            "image-1": true,
          },
        },
        files: {
          "file-1": {
            id: "file-1",
            mimeType: "image/png",
            dataURL: "data:image/png;base64,b3JpZ2luYWwtaW1hZ2U=",
            created: Date.now(),
          },
        } as any,
      },
      includeImage: true,
      imageRecords: {
        "file-1": {
          fileId: "file-1",
          assetPath: "assets/file-1.png",
          sourceType: "generated",
          provider: "zenmux",
          model: "google/gemini-3-pro-image-preview",
          width: 1024,
          height: 1024,
          createdAt: new Date().toISOString(),
          mimeType: "image/png",
          parentFileId: "file-0",
        },
      },
    });

    expect(exportToBlob).not.toHaveBeenCalled();
    expect(reference).toMatchObject({
      enabled: true,
      elementCount: 1,
      textCount: 0,
      image: {
        mimeType: "image/png",
        dataBase64: "b3JpZ2luYWwtaW1hZ2U=",
      },
      debug: {
        fileId: "file-1",
        sourceType: "generated",
        sourceProvider: "zenmux",
        sourceModel: "google/gemini-3-pro-image-preview",
        parentFileId: "file-0",
      },
    });
  });

  it("returns null when there is no current selection", async () => {
    await expect(
      buildSelectionReference({
        scene: {
          elements: [],
          appState: baseAppState,
          files: {},
        },
        includeImage: false,
      }),
    ).resolves.toBeNull();
    expect(exportToBlob).not.toHaveBeenCalled();
  });
});
