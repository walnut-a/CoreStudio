import { describe, expect, it } from "vitest";
import { newImageElement, newTextElement } from "@excalidraw/element";

import type { FileId } from "@excalidraw/element/types";
import type { BinaryFileData } from "@excalidraw/excalidraw/types";

import {
  buildAgentSceneBoard,
  buildAgentProjectContext,
  buildAgentSceneSnapshot,
  buildAgentSelectionContext,
  collectAgentImageFileIds,
  createAgentGenerationRequest,
  createAgentPromptTextElement,
} from "./agentCommandHandlers";

import type { PublicProviderSettings } from "../../shared/desktopBridgeTypes";
import type { ProjectAssetPayload } from "../../shared/desktopBridgeTypes";
import type { ImageRecordMap } from "../../shared/projectTypes";
import type { GenerationRequest } from "../../shared/providerTypes";

const providerSettings: PublicProviderSettings = {
  gemini: {
    isConfigured: true,
    defaultModel: "gemini-2.5-flash-image-preview",
    customModels: [],
    lastStatus: "success",
    lastCheckedAt: "2026-06-24T10:00:00.000Z",
    lastError: null,
  },
  zenmux: {
    isConfigured: false,
    defaultModel: "google/gemini-3-pro-image-preview",
    customModels: [
      {
        id: "custom-aspect",
        capabilityTemplate: "image-editing-aspect-ratio",
      },
    ],
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
  fal: {
    isConfigured: false,
    defaultModel: "fal-ai/flux/schnell",
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
  jimeng: {
    isConfigured: false,
    defaultModel: "jimeng-3.0",
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
  openai: {
    isConfigured: false,
    defaultModel: "gpt-image-1",
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
  openrouter: {
    isConfigured: false,
    defaultModel: "google/gemini-2.5-flash-image-preview",
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
};

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
  it("builds public project context without provider api keys", () => {
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
        },
        sceneJson: "{}",
        imageRecords,
      },
      {
        gemini: {
          ...providerSettings.gemini,
          apiKey: "must-not-leak",
        } as any,
      } as PublicProviderSettings,
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
    expect(JSON.stringify(context.providers)).not.toContain("must-not-leak");
    expect(context.availableCommands).toContain("scene.addPrompt");
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

  it("creates a normalized generation request with the agent prompt", () => {
    const baseRequest: GenerationRequest = {
      provider: "zenmux",
      model: "custom-aspect",
      prompt: "old prompt",
      width: 1280,
      height: 720,
      aspectRatio: null,
      imageCount: 4,
      seed: 22,
      reference: {
        enabled: false,
        elementCount: 0,
        textCount: 0,
      },
    };

    const request = createAgentGenerationRequest({
      baseRequest,
      prompt: "new prompt",
      useSelection: true,
      providerSettings,
    });

    expect(request.prompt).toBe("new prompt");
    expect(request.reference?.enabled).toBe(true);
    expect(request.imageCount).toBe(1);
    expect(request.model).toBe("custom-aspect");
  });

  it("clears UI selection references when the agent does not request selection", () => {
    const baseRequest: GenerationRequest = {
      provider: "zenmux",
      model: "custom-aspect",
      prompt: "old prompt",
      width: 1280,
      height: 720,
      aspectRatio: null,
      imageCount: 1,
      seed: null,
      reference: {
        enabled: true,
        elementCount: 1,
        textCount: 0,
        items: [
          {
            id: "image-1",
            index: 1,
            kind: "image",
            label: "图片",
          },
        ],
      },
    };

    const request = createAgentGenerationRequest({
      baseRequest,
      prompt: "agent prompt",
      useSelection: false,
      providerSettings,
    });

    expect(request.prompt).toBe("agent prompt");
    expect(request.reference).toBeNull();
  });
});
