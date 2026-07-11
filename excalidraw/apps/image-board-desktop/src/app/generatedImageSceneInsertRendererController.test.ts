import { CaptureUpdateAction } from "@excalidraw/element";

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

const createAsset = (
  fileId = "generated-file",
): PersistedImageAssetInput => ({
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
  }) as AppState;

describe("createGeneratedImageSceneInsertRendererActions", () => {
  it("skips asset insertion when the canvas is not ready and ready is not required", async () => {
    const assertActiveProject = vi.fn();
    const flushPendingAutosave = vi.fn();
    const actions = createGeneratedImageSceneInsertRendererActions({
      getEditorApi: () => null,
      getActiveProject: () => null,
      assertActiveProject,
      getSavedSceneHash: () => null,
      getPreviousBatchBounds: () => null,
      setPreviousBatchBounds: vi.fn(),
      updateWorkspaceOverlay: vi.fn(),
      setActiveProject: vi.fn(),
      setPendingSnapshot: vi.fn(),
      flushPendingAutosave,
      getFallbackCreatedAt: () => Date.parse("2026-07-06T00:02:00.000Z"),
    });

    await actions.insertAssets([createAsset()], {});

    expect(assertActiveProject).toHaveBeenCalledTimes(1);
    expect(flushPendingAutosave).not.toHaveBeenCalled();
  });

  it("inserts generated assets into the canvas and writes the autosave snapshot", async () => {
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
    const setPendingSnapshot = vi.fn();
    const setPreviousBatchBounds = vi.fn();
    const updateWorkspaceOverlay = vi.fn(() => null);
    const flushPendingAutosave = vi.fn(async () => ({ status: "flushed" }));
    const assertActiveProject = vi.fn();

    const actions = createGeneratedImageSceneInsertRendererActions({
      getEditorApi: () => api as unknown as GeneratedImageSceneInsertEditorApi,
      getActiveProject: () => project,
      assertActiveProject,
      getSavedSceneHash: () => "scene-hash",
      getPreviousBatchBounds: () => null,
      setPreviousBatchBounds,
      updateWorkspaceOverlay,
      setActiveProject,
      setPendingSnapshot,
      flushPendingAutosave,
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
    expect(setPendingSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        project: expect.objectContaining({
          projectPath: project.projectPath,
        }),
        expectedSceneHash: "scene-hash",
      }),
    );
    expect(flushPendingAutosave).toHaveBeenCalledWith({ strict: true });
  });
});
