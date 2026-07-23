import { beforeEach, describe, expect, it, vi } from "vitest";

const { exportToBlob } = vi.hoisted(() => ({
  exportToBlob: vi.fn(),
}));

vi.mock("@excalidraw/utils", () => ({
  exportToBlob,
}));

import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import type { ProjectAssetPayload } from "../shared/desktopBridgeTypes";
import type { ImageRecordMap } from "../shared/projectTypes";
import { setActiveDesktopLocale } from "./copy";

import {
  buildSelectionReferenceOriginalImageLoadPlan,
  createSelectionReferenceOriginalSceneRendererActions,
  buildSelectionReferenceSummary,
  buildSelectionReference,
  extractReferenceTextNotes,
  getGenerationReferenceAnchorBounds,
  getSelectionReferenceSignature,
  getSelectedReferenceImageFileIds,
  getSelectedReferenceElements,
  stripSelectionReferenceThumbnails,
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

  it("extracts unique selected image file ids for original reference loading", () => {
    expect(
      getSelectedReferenceImageFileIds({
        elements: [
          {
            id: "image-a",
            type: "image",
            isDeleted: false,
            groupIds: [],
            fileId: "file-a",
          },
          {
            id: "text-1",
            type: "text",
            isDeleted: false,
            groupIds: [],
            text: "保留边角",
          },
          {
            id: "image-b",
            type: "image",
            isDeleted: false,
            groupIds: ["group-1"],
            fileId: "file-b",
          },
          {
            id: "image-c",
            type: "image",
            isDeleted: false,
            groupIds: ["group-1"],
            fileId: "file-a",
          },
          {
            id: "shape-1",
            type: "rectangle",
            isDeleted: false,
            groupIds: ["group-1"],
          },
        ] as any,
        appState: {
          ...baseAppState,
          selectedElementIds: {
            "image-a": true,
            "text-1": true,
          },
          selectedGroupIds: {
            "group-1": true,
          },
        },
        files: {},
      }),
    ).toEqual(["file-a", "file-b"]);
  });

  it("builds the original image load plan from selected reference images", () => {
    expect(
      buildSelectionReferenceOriginalImageLoadPlan({
        elements: [
          {
            id: "image-a",
            type: "image",
            isDeleted: false,
            groupIds: [],
            fileId: "file-a",
          },
          {
            id: "image-b",
            type: "image",
            isDeleted: false,
            groupIds: ["group-1"],
            fileId: "file-b",
          },
          {
            id: "image-c",
            type: "image",
            isDeleted: false,
            groupIds: ["group-1"],
            fileId: "file-a",
          },
        ] as any,
        appState: {
          ...baseAppState,
          selectedElementIds: {
            "image-a": true,
          },
          selectedGroupIds: {
            "group-1": true,
          },
        },
        files: {},
      }),
    ).toEqual({
      action: "load",
      fileIds: ["file-a", "file-b"],
    });

    expect(buildSelectionReferenceOriginalImageLoadPlan(null)).toEqual({
      action: "skip",
    });
  });

  it("loads selected reference originals and merges them into the scene", async () => {
    const scene = {
      elements: [
        {
          id: "image-a",
          type: "image",
          isDeleted: false,
          groupIds: [],
          fileId: "file-a",
        },
      ] as any,
      appState: {
        ...baseAppState,
        selectedElementIds: {
          "image-a": true as true,
        },
      },
      files: {
        existing: { id: "existing" },
      } as unknown as BinaryFiles,
    };
    const imageRecords: ImageRecordMap = {
      "file-a": {
        fileId: "file-a",
        assetPath: "assets/file-a.png",
        sourceType: "generated",
        width: 1024,
        height: 1024,
        mimeType: "image/png",
        createdAt: "2026-07-05T00:00:00.000Z",
      },
    };
    const project = {
      imageRecords,
    };
    const asset: ProjectAssetPayload = {
      fileId: "file-a",
      mimeType: "image/png",
      dataBase64: "AAA",
      width: 1024,
      height: 1024,
      createdAt: "2026-07-06T00:00:00.000Z",
      rendition: "original",
    };
    const readOriginalAssets = vi.fn(async () => [asset]);
    const actions = createSelectionReferenceOriginalSceneRendererActions({
      getProject: () => project,
      readOriginalAssets,
      getTimestamp: () => 1234,
    });

    await expect(actions.load(scene)).resolves.toEqual({
      ...scene,
      files: {
        existing: { id: "existing" },
        "file-a": expect.objectContaining({
          id: "file-a",
          dataURL: "data:image/png;base64,AAA",
          created: Date.parse("2026-07-05T00:00:00.000Z"),
        }),
      },
    });
    expect(readOriginalAssets).toHaveBeenCalledWith(project, ["file-a"]);
  });

  it("skips original scene loading when project or selected images are missing", async () => {
    const readOriginalAssets = vi.fn();
    const actions = createSelectionReferenceOriginalSceneRendererActions({
      getProject: () => null,
      readOriginalAssets,
    });
    const scene = {
      elements: [] as any,
      appState: baseAppState,
      files: {} as any,
    };

    await expect(actions.load(scene)).resolves.toBe(scene);
    expect(readOriginalAssets).not.toHaveBeenCalled();
  });

  it("describes selected reference items in selection order", () => {
    const imageDataUrl = "data:image/png;base64,cmlnaHQtaW1hZ2U=";
    const reference = buildSelectionReferenceSummary({
      elements: [
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
          id: "image-right",
          type: "image",
          isDeleted: false,
          groupIds: [],
          fileId: "file-right",
          x: 260,
          y: 20,
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
        id: "image-right",
        index: 1,
        kind: "image",
        label: "图片",
        fileId: "file-right",
        thumbnailDataUrl: imageDataUrl,
      },
      {
        id: "text-left",
        index: 2,
        kind: "text",
        label: "文本：磨砂银色",
      },
      {
        id: "shape-bottom",
        index: 3,
        kind: "shape",
        label: "矩形",
      },
    ]);
    expect(reference?.source).toEqual({
      elementIds: ["image-right", "text-left", "shape-bottom"],
      fileIds: ["file-right"],
    });
  });

  it("localizes generated reference labels without translating selected text", () => {
    setActiveDesktopLocale("en");
    const reference = buildSelectionReferenceSummary({
      elements: [
        {
          id: "image-1",
          type: "image",
          isDeleted: false,
          groupIds: [],
          fileId: "file-1",
        },
        {
          id: "text-1",
          type: "text",
          isDeleted: false,
          groupIds: [],
          text: "保留中文标注",
        },
        {
          id: "shape-1",
          type: "rectangle",
          isDeleted: false,
          groupIds: [],
        },
      ] as any,
      appState: {
        ...baseAppState,
        selectedElementIds: {
          "image-1": true,
          "text-1": true,
          "shape-1": true,
        },
      },
      files: {},
    });

    expect(reference?.items?.map((item) => item.label)).toEqual([
      "Image",
      "Text: 保留中文标注",
      "Rectangle",
    ]);
    setActiveDesktopLocale("zh-CN");
  });

  it("strips thumbnail data from reference items before persisting request state", () => {
    expect(
      stripSelectionReferenceThumbnails({
        enabled: true,
        elementCount: 2,
        textCount: 0,
        items: [
          {
            id: "image-1",
            index: 1,
            kind: "image",
            label: "图片",
            fileId: "file-1",
            thumbnailDataUrl: "data:image/png;base64,thumb",
          },
          {
            id: "text-1",
            index: 2,
            kind: "text",
            label: "文本：说明",
          },
        ],
      }),
    ).toEqual({
      enabled: true,
      elementCount: 2,
      textCount: 0,
      items: [
        {
          id: "image-1",
          index: 1,
          kind: "image",
          label: "图片",
          fileId: "file-1",
        },
        {
          id: "text-1",
          index: 2,
          kind: "text",
          label: "文本：说明",
        },
      ],
    });
  });

  it("keeps empty reference payloads stable when stripping thumbnails", () => {
    const reference = {
      enabled: true,
      elementCount: 0,
      textCount: 0,
    };

    expect(stripSelectionReferenceThumbnails(null)).toBeNull();
    expect(stripSelectionReferenceThumbnails(reference)).toBe(reference);
  });

  it("keeps selection order in the reference signature", () => {
    const scene = {
      elements: [
        {
          id: "image-left",
          type: "image",
          isDeleted: false,
          groupIds: [],
        },
        {
          id: "image-right",
          type: "image",
          isDeleted: false,
          groupIds: [],
        },
      ],
      files: {},
    };

    expect(
      getSelectionReferenceSignature({
        ...scene,
        appState: {
          ...baseAppState,
          selectedElementIds: {
            "image-left": true,
            "image-right": true,
          },
        },
      } as any),
    ).toBe("image-left|image-right");

    expect(
      getSelectionReferenceSignature({
        ...scene,
        appState: {
          ...baseAppState,
          selectedElementIds: {
            "image-right": true,
            "image-left": true,
          },
        },
      } as any),
    ).toBe("image-right|image-left");
  });

  it("changes the reference signature when a selected image asset changes", () => {
    const buildScene = ({
      fileId,
      dataURL,
    }: {
      fileId: string;
      dataURL: string;
    }) =>
      ({
        elements: [
          {
            id: "image-1",
            type: "image",
            isDeleted: false,
            groupIds: [],
            fileId,
            version: 1,
          },
        ],
        appState: {
          ...baseAppState,
          selectedElementIds: {
            "image-1": true,
          },
        },
        files: {
          [fileId]: {
            id: fileId,
            mimeType: "image/png",
            dataURL,
            created: 1,
          },
        },
      } as any);

    const initialSignature = getSelectionReferenceSignature(
      buildScene({
        fileId: "file-before",
        dataURL: "data:image/png;base64,YmVmb3Jl",
      }),
    );
    const replacedFileSignature = getSelectionReferenceSignature(
      buildScene({
        fileId: "file-after",
        dataURL: "data:image/png;base64,YWZ0ZXI=",
      }),
    );
    const refreshedAssetSignature = getSelectionReferenceSignature(
      buildScene({
        fileId: "file-before",
        dataURL: "data:image/png;base64,cmVmcmVzaGVk",
      }),
    );

    expect(replacedFileSignature).not.toBe(initialSignature);
    expect(refreshedAssetSignature).not.toBe(initialSignature);
  });

  it("distinguishes same-length image payloads with identical endings", () => {
    const file = {
      id: "file-1",
      mimeType: "image/png",
      dataURL:
        "data:image/png;base64,AAAA-this-suffix-is-longer-than-twenty-four",
      created: 1,
    };
    const scene = {
      elements: [
        {
          id: "image-1",
          type: "image",
          isDeleted: false,
          groupIds: [],
          fileId: "file-1",
          version: 1,
        },
      ],
      appState: {
        ...baseAppState,
        selectedElementIds: { "image-1": true },
      },
      files: { "file-1": file },
    } as any;
    const initialSignature = getSelectionReferenceSignature(scene);
    file.dataURL =
      "data:image/png;base64,BBBB-this-suffix-is-longer-than-twenty-four";

    expect(getSelectionReferenceSignature(scene)).not.toBe(initialSignature);
  });

  it("returns selected bounds only when generation reference is enabled", () => {
    const scene = {
      elements: [
        {
          id: "rect-1",
          type: "rectangle",
          isDeleted: false,
          groupIds: [],
          x: 10,
          y: 20,
          width: 100,
          height: 80,
          angle: 0,
        },
        {
          id: "image-1",
          type: "image",
          isDeleted: false,
          groupIds: [],
          fileId: "file-1",
          x: 180,
          y: 40,
          width: 60,
          height: 90,
          angle: 0,
        },
      ],
      appState: {
        ...baseAppState,
        selectedElementIds: {
          "rect-1": true,
          "image-1": true,
        },
      },
      files: {},
    } as any;

    expect(
      getGenerationReferenceAnchorBounds(
        {
          reference: {
            enabled: true,
          },
        },
        scene,
      ),
    ).toEqual({
      x: 10,
      y: 20,
      width: 230,
      height: 110,
    });

    expect(
      getGenerationReferenceAnchorBounds(
        {
          reference: {
            enabled: false,
          },
        },
        scene,
      ),
    ).toBeNull();
    expect(
      getGenerationReferenceAnchorBounds(
        {
          reference: {
            enabled: true,
          },
        },
        null,
      ),
    ).toBeNull();
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
