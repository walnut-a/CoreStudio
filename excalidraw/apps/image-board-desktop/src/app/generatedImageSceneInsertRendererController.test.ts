import { CaptureUpdateAction } from "@excalidraw/element";
import { API } from "@excalidraw/excalidraw/tests/helpers/api";

import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import { describe, expect, it, vi } from "vitest";

import type {
  DesktopProjectBundle,
  PersistedImageAssetInput,
} from "../shared/desktopBridgeTypes";
import type { ImageRecordMap, ProjectManifest } from "../shared/projectTypes";
import {
  createGeneratedImageSceneInsertRendererActions,
  type GeneratedImageSceneInsertEditorApi,
} from "./generatedImageSceneInsertRendererController";

const createManifest = (name: string): ProjectManifest => ({
  formatVersion: 1,
  appVersion: "test",
  name,
  createdAt: "2026-07-06T00:00:00.000Z",
  updatedAt: "2026-07-06T00:00:00.000Z",
  sceneFile: "scene.excalidraw.json",
  imageRecordsFile: "image-records.json",
  assetsDir: "assets",
  exportsDir: "exports",
  agentAccess: {
    enabled: true,
    token: `${name}-token`,
  },
});

const createProject = (
  projectPath = "/projects/current",
  imageRecords: ImageRecordMap = {},
): DesktopProjectBundle => ({
  projectPath,
  project: createManifest("当前项目"),
  sceneJson: "{}",
  imageRecords,
});

const createAsset = (fileId = "generated-file"): PersistedImageAssetInput => ({
  fileId,
  dataBase64: `${fileId}-base64`,
  mimeType: "image/png",
  width: 1024,
  height: 768,
  sourceType: "generated",
  createdAt: "2026-07-06T00:01:00.000Z",
});

const createAppState = (): AppState =>
  ({
    width: 1200,
    height: 800,
    zoom: {
      value: 1,
    },
    scrollX: 0,
    scrollY: 0,
  } as AppState);

describe("createGeneratedImageSceneInsertRendererActions", () => {
  it("skips asset insertion when the canvas is not ready and ready is not required", async () => {
    const assertActiveProject = vi.fn();
    const flushProjectRoom = vi.fn();
    const actions = createGeneratedImageSceneInsertRendererActions({
      getEditorApi: () => null,
      getActiveProject: () => null,
      assertActiveProject,
      getPreviousBatchBounds: () => null,
      setPreviousBatchBounds: vi.fn(),
      setActiveProject: vi.fn(),
      flushProjectRoom,
      getFallbackCreatedAt: () => Date.parse("2026-07-06T00:02:00.000Z"),
    });

    await actions.insertAssets([createAsset()], {});

    expect(assertActiveProject).toHaveBeenCalledTimes(1);
    expect(flushProjectRoom).not.toHaveBeenCalled();
  });

  it("inserts generated assets into the canvas and flushes the room", async () => {
    const project = createProject();
    const nextImageRecords: ImageRecordMap = {
      "generated-file": {
        fileId: "generated-file",
        assetPath: "assets/generated-file.png",
        sourceType: "generated",
        width: 1024,
        height: 768,
        createdAt: "2026-07-06T00:01:00.000Z",
        mimeType: "image/png",
      },
    };
    const appState = createAppState();
    const elements: readonly ExcalidrawElement[] = [];
    const files: BinaryFiles = {};
    const addFiles = vi.fn();
    const updateScene = vi.fn();
    const api = {
      getAppState: vi.fn(() => appState),
      getSceneElementsIncludingDeleted: vi.fn(() => elements),
      addFiles,
      updateScene,
      getFiles: vi.fn(() => files),
    };
    const setActiveProject = vi.fn();
    const setPreviousBatchBounds = vi.fn();
    const flushProjectRoom = vi.fn(async () => ({ status: "flushed" }));
    const assertActiveProject = vi.fn();

    const actions = createGeneratedImageSceneInsertRendererActions({
      getEditorApi: () => api as unknown as GeneratedImageSceneInsertEditorApi,
      getActiveProject: () => project,
      assertActiveProject,
      getPreviousBatchBounds: () => null,
      setPreviousBatchBounds,
      setActiveProject,
      flushProjectRoom,
      getFallbackCreatedAt: () => Date.parse("2026-07-06T00:02:00.000Z"),
    });

    await actions.insertAssets([createAsset()], nextImageRecords, {
      expectedProjectPath: project.projectPath,
      requireReady: true,
    });

    expect(assertActiveProject).toHaveBeenNthCalledWith(1, project.projectPath);
    expect(assertActiveProject).toHaveBeenNthCalledWith(2, project.projectPath);
    expect(addFiles).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "generated-file",
        dataURL: "data:image/png;base64,generated-file-base64",
      }),
    ]);
    expect(updateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        elements: [
          expect.objectContaining({
            type: "image",
            fileId: "generated-file",
          }),
        ],
        appState: {
          selectedElementIds: expect.any(Object),
        },
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      }),
    );
    expect(setPreviousBatchBounds).toHaveBeenCalledWith(
      expect.objectContaining({
        width: expect.any(Number),
        height: expect.any(Number),
      }),
    );
    expect(setActiveProject).toHaveBeenCalledWith(
      expect.objectContaining({
        imageRecords: nextImageRecords,
      }),
    );
    expect(flushProjectRoom).toHaveBeenCalledWith({ strict: true });
  });

  it("places Agent images outside the bounds occupied by existing canvas elements", async () => {
    const project = createProject();
    const blockingElement = API.createElement({
      type: "rectangle",
      x: 280,
      y: 144,
      width: 640,
      height: 512,
    });
    const updateScene = vi.fn();
    const api = {
      getAppState: vi.fn(createAppState),
      getSceneElementsIncludingDeleted: vi.fn(() => [blockingElement]),
      addFiles: vi.fn(),
      updateScene,
      getFiles: vi.fn(() => ({})),
    };
    const actions = createGeneratedImageSceneInsertRendererActions({
      getEditorApi: () => api as unknown as GeneratedImageSceneInsertEditorApi,
      getActiveProject: () => project,
      assertActiveProject: vi.fn(),
      getPreviousBatchBounds: () => null,
      setPreviousBatchBounds: vi.fn(),
      setActiveProject: vi.fn(),
      flushProjectRoom: vi.fn(async () => ({ status: "flushed" })),
      getFallbackCreatedAt: () => Date.parse("2026-07-06T00:02:00.000Z"),
    });

    await actions.insertAssets(
      [createAsset()],
      {},
      {
        expectedProjectPath: project.projectPath,
        requireReady: true,
      },
    );

    const insertedElements = updateScene.mock.calls[0]?.[0]
      .elements as ExcalidrawElement[];
    const insertedImage = insertedElements.find(
      (element) => element.type === "image",
    );
    expect(insertedImage).toBeDefined();
    expect(
      insertedImage!.x < blockingElement.x + blockingElement.width &&
        insertedImage!.x + insertedImage!.width > blockingElement.x &&
        insertedImage!.y < blockingElement.y + blockingElement.height &&
        insertedImage!.y + insertedImage!.height > blockingElement.y,
    ).toBe(false);
  });
});
