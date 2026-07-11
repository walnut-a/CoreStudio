import { describe, expect, it, vi } from "vitest";

import type { BinaryFileData, BinaryFiles } from "@excalidraw/excalidraw/types";

import { createDesktopProjectAssetSceneApplyRendererAction } from "./projectAssetSceneApplyRendererController";

import type {
  DesktopProjectBundle,
  ProjectAssetPayload,
} from "../shared/desktopBridgeTypes";
import type { ProjectManifest } from "../shared/projectTypes";

const createProjectManifest = (name: string): ProjectManifest => ({
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
  projectPath = "/projects/industrial",
): DesktopProjectBundle => ({
  projectPath,
  project: createProjectManifest("工业设计助手"),
  sceneJson: "{}",
  imageRecords: {
    "image-file": {
      fileId: "image-file",
      assetPath: "assets/image-file.png",
      sourceType: "generated",
      width: 1024,
      height: 1024,
      createdAt: "2026-07-05T00:00:00.000Z",
      mimeType: "image/png",
    },
  },
});

const createAsset = (
  fileId = "image-file",
  patch: Partial<ProjectAssetPayload> = {},
): ProjectAssetPayload => ({
  fileId,
  mimeType: "image/png",
  dataBase64: `${fileId}-base64`,
  width: 128,
  height: 128,
  createdAt: "2026-07-06T00:00:00.000Z",
  rendition: "thumbnail",
  ...patch,
});

const createScene = (files: BinaryFiles = {}) => ({
  elements: [],
  appState: {},
  files,
});

describe("createDesktopProjectAssetSceneApplyRendererAction", () => {
  it("applies project asset payloads to the active scene through the editor api", () => {
    const activeProject = createProject();
    const replaceFiles = vi.fn();
    const queueFiles = vi.fn();
    const setLatestScene = vi.fn();
    const applyAssets = createDesktopProjectAssetSceneApplyRendererAction({
      getActiveProject: () => activeProject,
      getLatestScene: () =>
        createScene({
          existing: {
            id: "existing",
          } as BinaryFileData,
        }),
      getFallbackCreatedAt: () => Date.parse("2026-07-07T00:00:00.000Z"),
      getEditorApi: () => ({
        replaceFiles,
      }),
      queueFiles,
      setLatestScene,
    });

    expect(applyAssets(activeProject, [createAsset()])).toBe(true);

    expect(replaceFiles).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "image-file",
        dataURL: "data:image/png;base64,image-file-base64",
        created: Date.parse("2026-07-05T00:00:00.000Z"),
      }),
    ]);
    expect(queueFiles).not.toHaveBeenCalled();
    expect(setLatestScene).toHaveBeenCalledWith(
      expect.objectContaining({
        files: expect.objectContaining({
          existing: expect.objectContaining({ id: "existing" }),
          "image-file": expect.objectContaining({ id: "image-file" }),
        }),
      }),
    );
  });

  it("queues files when the editor api is not ready", () => {
    const activeProject = createProject();
    const queueFiles = vi.fn();
    const applyAssets = createDesktopProjectAssetSceneApplyRendererAction({
      getActiveProject: () => activeProject,
      getLatestScene: () => createScene(),
      getFallbackCreatedAt: () => Date.parse("2026-07-07T00:00:00.000Z"),
      getEditorApi: () => null,
      queueFiles,
      setLatestScene: vi.fn(),
    });

    expect(applyAssets(activeProject, [createAsset()])).toBe(true);
    expect(queueFiles).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "image-file",
      }),
    ]);
  });

  it("skips stale project assets without touching the canvas", () => {
    const activeProject = createProject("/projects/current");
    const replaceFiles = vi.fn();
    const queueFiles = vi.fn();
    const setLatestScene = vi.fn();
    const applyAssets = createDesktopProjectAssetSceneApplyRendererAction({
      getActiveProject: () => activeProject,
      getLatestScene: () => createScene(),
      getFallbackCreatedAt: () => Date.parse("2026-07-07T00:00:00.000Z"),
      getEditorApi: () => ({
        replaceFiles,
      }),
      queueFiles,
      setLatestScene,
    });

    expect(applyAssets(createProject("/projects/old"), [createAsset()])).toBe(
      false,
    );
    expect(replaceFiles).not.toHaveBeenCalled();
    expect(queueFiles).not.toHaveBeenCalled();
    expect(setLatestScene).not.toHaveBeenCalled();
  });
});
