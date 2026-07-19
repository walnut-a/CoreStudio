import { describe, expect, it } from "vitest";
import { newImageElement, newTextElement } from "@excalidraw/element";

import type { FileId } from "@excalidraw/element/types";
import type { BinaryFileData } from "@excalidraw/excalidraw/types";

import {
  buildAgentSceneBoard,
  buildAgentProjectContext,
  buildAgentSceneSnapshot,
  buildAgentSelectionContext,
  buildAgentImagePathList,
  collectAgentImageFileIds,
  createAgentPromptTextElement,
} from "./agentCommandHandlers";

import type { ProjectAssetPayload } from "../../shared/desktopBridgeTypes";
import type { ImageRecordMap } from "../../shared/projectTypes";

const imageRecords: ImageRecordMap = {
  "file-1": {
    fileId: "file-1",
    assetPath: "assets/file-1.png",
    sourceType: "generated",
    provider: "gemini",
    model: "gemini-2.5-flash-image-preview",
    prompt: "A compact sketch",
    seed: 123,
    width: 1024,
    height: 1024,
    createdAt: "2026-06-24T09:00:00.000Z",
    mimeType: "image/png",
    parentFileId: "parent-1",
  },
};

describe("agentCommandHandlers", () => {
  it("builds public project context without exposing built-in generation", () => {
    const context = buildAgentProjectContext(
      {
        projectPath: "/tmp/corestudio-project",
        project: {
          formatVersion: 1,
          appVersion: "1.2.0",
          name: "Shell concept",
          createdAt: "2026-06-23T10:00:00.000Z",
          updatedAt: "2026-06-24T10:00:00.000Z",
          sceneFile: "scene.excalidraw.json",
          imageRecordsFile: "image-records.json",
          assetsDir: "assets",
          exportsDir: "exports",
          agentAccess: {
            token: "project-token",
            enabled: true,
          },
        },
        sceneJson: "{}",
        imageRecords,
      },
    );

    expect(context.project).toEqual({
      projectPath: "/tmp/corestudio-project",
      name: "Shell concept",
      createdAt: "2026-06-23T10:00:00.000Z",
      updatedAt: "2026-06-24T10:00:00.000Z",
      formatVersion: 1,
    });
    expect(context.imageRecordCount).toBe(1);
    expect(context.imageRecords).toEqual([
      {
        fileId: "file-1",
        sourceType: "generated",
        provider: "gemini",
        model: "gemini-2.5-flash-image-preview",
        prompt: "A compact sketch",
        seed: 123,
        width: 1024,
        height: 1024,
        createdAt: "2026-06-24T09:00:00.000Z",
        parentFileId: "parent-1",
      },
    ]);
    expect(context.availableCommands).toContain("scene.addPrompt");
    expect(context.availableCommands).not.toContain("generate");
    expect(context).not.toHaveProperty("providers");
    expect(context).not.toHaveProperty("generation");
  });

  it("builds scene snapshots with element, file, image, text, and selection counts", () => {
    const image = newImageElement({
      type: "image",
      fileId: "file-1" as FileId,
      status: "saved",
      scale: [1, 1],
      x: 0,
      y: 0,
      width: 200,
      height: 160,
    });
    const text = newTextElement({
      x: 20,
      y: 30,
      text: "尺寸约束",
      fontSize: 20,
    });

    const snapshot = buildAgentSceneSnapshot(
      {
        elements: [image, text],
        appState: {
          selectedElementIds: {
            [image.id]: true,
          },
        },
        files: {
          "file-1": {
            id: "file-1" as FileId,
            mimeType: "image/png",
            dataURL:
              "data:image/png;base64,ZmFrZQ==" as BinaryFileData["dataURL"],
            created: 1,
          },
        },
      },
      imageRecords,
      '{"type":"excalidraw"}',
    );

    expect(snapshot).toMatchObject({
      sceneJson: '{"type":"excalidraw"}',
      elementCount: 2,
      imageElementCount: 1,
      textElementCount: 1,
      fileCount: 1,
      imageRecordCount: 1,
      selectedElementIds: [image.id],
    });
  });

  it("builds a render-ready browser board with image data URLs", () => {
    const image = newImageElement({
      type: "image",
      fileId: "file-1" as FileId,
      status: "saved",
      scale: [1, 1],
      x: 0,
      y: 0,
      width: 200,
      height: 160,
    });
    const missingImage = newImageElement({
      type: "image",
      fileId: "missing-file" as FileId,
      status: "saved",
      scale: [1, 1],
      x: 260,
      y: 0,
      width: 200,
      height: 160,
    });
    const text = newTextElement({
      x: 20,
      y: 30,
      text: "尺寸约束",
      fontSize: 20,
    });
    const assetPayloads: ProjectAssetPayload[] = [
      {
        fileId: "file-1",
        mimeType: "image/png",
        dataBase64: "ZmFrZQ==",
        width: 320,
        height: 240,
        createdAt: "2026-06-24T09:00:00.000Z",
        rendition: "preview",
      },
    ];

    const board = buildAgentSceneBoard({
      project: {
        projectPath: "/tmp/corestudio-project",
        project: {
          formatVersion: 1,
          appVersion: "1.2.0",
          name: "Shell concept",
          createdAt: "2026-06-23T10:00:00.000Z",
          updatedAt: "2026-06-24T10:00:00.000Z",
          sceneFile: "scene.excalidraw.json",
          imageRecordsFile: "image-records.json",
          assetsDir: "assets",
          exportsDir: "exports",
          agentAccess: {
            token: "project-token",
            enabled: true,
          },
        },
        sceneJson: "{}",
        imageRecords,
      },
      scene: {
        elements: [image, missingImage, text],
        appState: {
          selectedElementIds: {
            [image.id]: true,
          },
          selectedGroupIds: {},
          viewBackgroundColor: "#ffffff",
          scrollX: 12,
          scrollY: 24,
        },
        files: {},
      },
      imageRecords,
      assetPayloads,
      updatedAt: "2026-06-24T10:30:00.000Z",
    });

    expect(collectAgentImageFileIds([image, image, missingImage, text])).toEqual(
      ["file-1", "missing-file"],
    );
    expect(board.project).toEqual({
      projectPath: "/tmp/corestudio-project",
      name: "Shell concept",
      updatedAt: "2026-06-24T10:00:00.000Z",
    });
    expect(board.updatedAt).toBe("2026-06-24T10:30:00.000Z");
    expect(board.elements).toHaveLength(3);
    expect(board.files["file-1"]).toMatchObject({
      id: "file-1",
      mimeType: "image/png",
      dataURL: "data:image/png;base64,ZmFrZQ==",
    });
    expect(board.appState).toMatchObject({
      selectedElementIds: {
        [image.id]: true,
      },
      selectedGroupIds: {},
      viewBackgroundColor: "#ffffff",
      scrollX: 12,
      scrollY: 24,
    });
    expect(board.metrics).toMatchObject({
      elementCount: 3,
      imageElementCount: 2,
      textElementCount: 1,
      fileCount: 0,
      imageRecordCount: 1,
      selectedElementIds: [image.id],
    });
    expect(board.missingFileIds).toEqual(["missing-file"]);
  });

  it("builds local original image paths for selected image references", () => {
    const selectedImage = newImageElement({
      type: "image",
      fileId: "file-1" as FileId,
      status: "saved",
      scale: [1, 1],
      x: 0,
      y: 0,
      width: 200,
      height: 160,
    });
    const otherImage = newImageElement({
      type: "image",
      fileId: "file-2" as FileId,
      status: "saved",
      scale: [1, 1],
      x: 260,
      y: 0,
      width: 200,
      height: 160,
    });

    const result = buildAgentImagePathList({
      projectPath: "/tmp/corestudio-project",
      scene: {
        elements: [selectedImage, otherImage],
        appState: {
          selectedElementIds: {
            [selectedImage.id]: true,
          },
        },
      },
      imageRecords: {
        ...imageRecords,
        "file-2": {
          ...imageRecords["file-1"],
          fileId: "file-2",
          assetPath: "assets/file-2.png",
        },
      },
      selectionOnly: true,
    });

    expect(result).toEqual({
      projectPath: "/tmp/corestudio-project",
      selectionOnly: true,
      items: [
        {
          fileId: "file-1",
          path: "/tmp/corestudio-project/assets/file-1.png",
          assetPath: "assets/file-1.png",
          mimeType: "image/png",
          width: 1024,
          height: 1024,
          sourceType: "generated",
          createdAt: "2026-06-24T09:00:00.000Z",
          parentFileId: "parent-1",
        },
      ],
      missingFileIds: [],
    });
  });

  it("returns an unselected selection context for null references", () => {
    expect(buildAgentSelectionContext(null)).toEqual({ selected: false });
  });

  it("creates prompt text at the viewport center", () => {
    const element = createAgentPromptTextElement({
      text: "保留卡扣位置",
      viewportCenter: {
        x: 320,
        y: 240,
      },
    });

    expect(element.type).toBe("text");
    expect(element.text).toBe("保留卡扣位置");
    expect(element.x).toBe(320);
    expect(element.y).toBe(240);
  });

});
