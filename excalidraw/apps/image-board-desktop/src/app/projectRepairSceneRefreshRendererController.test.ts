import { describe, expect, it, vi } from "vitest";

import { CaptureUpdateAction } from "@excalidraw/element";
import { getDefaultAppState } from "@excalidraw/excalidraw/appState";
import { API } from "@excalidraw/excalidraw/tests/helpers/api";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";

import { createDesktopProjectRepairSceneRefreshRendererActions } from "./projectRepairSceneRefreshRendererController";
import { serializeSceneForProject } from "./project/sceneSerialization";

import type {
  DesktopProjectBundle,
  ProjectAssetPayload,
} from "../shared/desktopBridgeTypes";
import type { ImageRecordMap, ProjectManifest } from "../shared/projectTypes";

const createProjectManifest = (name: string): ProjectManifest => ({
  formatVersion: 1,
  appVersion: "test",
  name,
  createdAt: "2026-07-05T00:00:00.000Z",
  updatedAt: "2026-07-05T00:00:00.000Z",
  sceneFile: "scene.excalidraw.json",
  imageRecordsFile: "image-records.json",
  assetsDir: "assets",
  exportsDir: "exports",
  agentAccess: {
    enabled: true,
    token: `${name}-token`,
  },
});

const createImageRecords = (): ImageRecordMap => ({
  "image-file": {
    fileId: "image-file",
    assetPath: "assets/image-file.png",
    sourceType: "generated",
    width: 1024,
    height: 1024,
    createdAt: "2026-07-04T00:00:00.000Z",
    mimeType: "image/png",
  },
});

const createProject = (): DesktopProjectBundle => ({
  projectPath: "/projects/industrial",
  project: createProjectManifest("工业设计助手"),
  sceneJson: serializeSceneForProject({
    elements: [],
    appState: getDefaultAppState(),
  }),
  imageRecords: createImageRecords(),
});

const createRestoredSceneJson = () =>
  serializeSceneForProject({
    elements: [
      API.createElement({
        type: "image",
        fileId: "image-file",
        width: 320,
        height: 240,
      }),
    ],
    appState: {
      ...getDefaultAppState(),
      width: 1200,
      height: 900,
      offsetTop: 0,
      offsetLeft: 0,
      selectedElementIds: { restored: true },
    } as unknown as AppState,
  });

const createThumbnailAsset = (): ProjectAssetPayload => ({
  fileId: "image-file",
  mimeType: "image/png",
  dataBase64: "thumbnail-base64",
  width: 128,
  height: 128,
  createdAt: "2026-07-05T00:00:00.000Z",
  rendition: "thumbnail",
});

describe("createDesktopProjectRepairSceneRefreshRendererActions", () => {
  it("loads restored scene thumbnails and applies the restored scene through the editor api", async () => {
    const project = createProject();
    const currentFiles: BinaryFiles = {};
    const readProjectAssets = vi.fn(async () => [createThumbnailAsset()]);
    const replaceFiles = vi.fn();
    const updateScene = vi.fn();
    const getAppState = vi.fn(() => ({
      ...getDefaultAppState(),
      scrollX: 345,
      scrollY: -120,
      zoom: { value: 0.75 },
      width: 1280,
      height: 720,
    }) as AppState);
    const queueFiles = vi.fn();
    const setLatestScene = vi.fn();
    const updateSceneImageFileIds = vi.fn();
    const scheduleVisibleImageRenditionLoad = vi.fn();
    const updateWorkspaceOverlay = vi.fn();
    const updateCurrentProject = vi.fn();
    const updateSelectedInspector = vi.fn();

    const actions = createDesktopProjectRepairSceneRefreshRendererActions({
      getActiveProject: () => project,
      getCurrentFiles: () => currentFiles,
      getFallbackCreatedAt: () => Date.parse("2026-07-06T00:00:00.000Z"),
      readProjectAssets,
      getEditorApi: () => ({
        replaceFiles,
        updateScene,
        getAppState,
      }),
      queueFiles,
      setLatestScene,
      updateSceneImageFileIds,
      scheduleVisibleImageRenditionLoad,
      updateWorkspaceOverlay,
      updateCurrentProject,
      updateSelectedInspector,
    });

    await expect(
      actions.refresh({
        project,
        imageRecords: createImageRecords(),
        restoredSceneJson: createRestoredSceneJson(),
        restoredBoardFileIds: ["image-file"],
      }),
    ).resolves.toEqual({
      restoredCount: 1,
      skippedCount: 0,
    });

    expect(readProjectAssets).toHaveBeenCalledWith({
      projectPath: "/projects/industrial",
      fileIds: ["image-file"],
      rendition: "thumbnail",
      thumbnailMode: "read-through",
    });
    expect(replaceFiles).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "image-file",
        dataURL: "data:image/png;base64,thumbnail-base64",
      }),
    ]);
    expect(updateScene).toHaveBeenCalledWith({
      elements: expect.arrayContaining([
        expect.objectContaining({
          type: "image",
          fileId: "image-file",
        }),
      ]),
      appState: expect.objectContaining({
        theme: "light",
        scrollX: 345,
        scrollY: -120,
        zoom: { value: 0.75 },
        width: 1280,
        height: 720,
      }),
      captureUpdate: CaptureUpdateAction.NEVER,
    });
    expect(queueFiles).not.toHaveBeenCalled();
    expect(setLatestScene).toHaveBeenCalledWith(
      expect.objectContaining({
        files: expect.objectContaining({
          "image-file": expect.objectContaining({ id: "image-file" }),
        }),
      }),
    );
    expect(updateCurrentProject).toHaveBeenCalledWith(
      expect.objectContaining({
        projectPath: "/projects/industrial",
        imageRecords: createImageRecords(),
      }),
    );
    expect(updateSelectedInspector).toHaveBeenCalledWith(
      expect.objectContaining({
        imageRecords: createImageRecords(),
      }),
    );
    expect(updateSceneImageFileIds).toHaveBeenCalled();
    expect(scheduleVisibleImageRenditionLoad).toHaveBeenCalled();
    expect(updateWorkspaceOverlay).toHaveBeenCalled();
  });

  it("queues restored scene files when the editor api is not ready", async () => {
    const project = createProject();
    const queueFiles = vi.fn();

    const actions = createDesktopProjectRepairSceneRefreshRendererActions({
      getActiveProject: () => project,
      getCurrentFiles: () => ({}),
      getFallbackCreatedAt: () => Date.parse("2026-07-06T00:00:00.000Z"),
      readProjectAssets: vi.fn(async () => [createThumbnailAsset()]),
      getEditorApi: () => null,
      queueFiles,
      setLatestScene: vi.fn(),
      updateSceneImageFileIds: vi.fn(),
      scheduleVisibleImageRenditionLoad: vi.fn(),
      updateWorkspaceOverlay: vi.fn(),
      updateCurrentProject: vi.fn(),
      updateSelectedInspector: vi.fn(),
    });

    await actions.refresh({
      project,
      imageRecords: createImageRecords(),
      restoredSceneJson: createRestoredSceneJson(),
      restoredBoardFileIds: ["image-file"],
    });

    expect(queueFiles).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "image-file",
        dataURL: "data:image/png;base64,thumbnail-base64",
      }),
    ]);
  });
});
