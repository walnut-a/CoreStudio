import { describe, expect, it, vi } from "vitest";

import { getDefaultAppState } from "@excalidraw/excalidraw/appState";
import { API } from "@excalidraw/excalidraw/tests/helpers/api";
import type { AppState } from "@excalidraw/excalidraw/types";

import { prepareProjectBundleOpenData } from "./currentProjectOpenData";
import { serializeSceneForProject } from "./project/sceneSerialization";

import type {
  DesktopProjectBundle,
  ProjectAssetPayload,
} from "../shared/desktopBridgeTypes";
import type { ProjectManifest } from "../shared/projectTypes";

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

const createProjectAssetPayload = (
  fileId: string,
  patch: Partial<ProjectAssetPayload> = {},
): ProjectAssetPayload => ({
  fileId,
  mimeType: "image/png",
  dataBase64: `${fileId}-base64`,
  width: 1024,
  height: 1024,
  createdAt: "2026-07-05T00:00:00.000Z",
  rendition: "thumbnail",
  ...patch,
});

const createProject = (
  patch: Partial<DesktopProjectBundle> = {},
): DesktopProjectBundle => {
  const appState = {
    ...getDefaultAppState(),
    width: 1200,
    height: 900,
    scrollX: 0,
    scrollY: 0,
    zoom: { value: 1 },
  } as AppState;
  const image = API.createElement({
    type: "image",
    fileId: "image-file",
    x: 0,
    y: 0,
    width: 800,
    height: 800,
  });

  return {
    projectPath: "/projects/industrial",
    project: createProjectManifest("工业设计助手"),
    sceneJson: serializeSceneForProject({
      elements: [image],
      appState,
    }),
    imageRecords: {
      "image-file": {
        fileId: "image-file",
        assetPath: "assets/image-file.png",
        sourceType: "generated",
        width: 1024,
        height: 1024,
        createdAt: "2026-07-04T00:00:00.000Z",
        mimeType: "image/png",
      },
    },
    ...patch,
  };
};

describe("prepareProjectBundleOpenData", () => {
  it("prepares scene, thumbnail placeholders, visible rendition assets and project-open initial data", async () => {
    const project = createProject();
    const readProjectAssets = vi.fn(async (input) => {
      if (input.rendition === "thumbnail") {
        return [
          createProjectAssetPayload("image-file", {
            rendition: "placeholder",
            dataBase64: "thumbnail-placeholder",
          }),
        ];
      }
      return [
        createProjectAssetPayload("image-file", {
          rendition: input.rendition,
          dataBase64: `${input.rendition}-asset`,
          createdAt: "2026-07-05T00:00:00.000Z",
        }),
      ];
    });

    const prepared = await prepareProjectBundleOpenData({
      project,
      devicePixelRatio: 1,
      fallbackCreatedAt: Date.parse("2026-07-06T00:00:00.000Z"),
      readProjectAssets,
    });

    expect(readProjectAssets).toHaveBeenCalledWith({
      projectPath: "/projects/industrial",
      fileIds: ["image-file"],
      rendition: "thumbnail",
      thumbnailMode: "cache-only",
    });
    expect(readProjectAssets).toHaveBeenCalledWith({
      projectPath: "/projects/industrial",
      fileIds: ["image-file"],
      rendition: "original",
    });
    expect(prepared.assets.map((asset) => asset.rendition)).toEqual([
      "placeholder",
      "original",
    ]);
    expect(prepared.missingThumbnailFileIds).toEqual(["image-file"]);
    expect(prepared.thumbnailMaintenance).toEqual({
      status: "pending",
      total: 1,
    });
    expect(prepared.initialData.elements).toHaveLength(1);
    expect(prepared.initialData.files?.["image-file"]?.dataURL).toBe(
      "data:image/png;base64,original-asset",
    );
    expect(prepared.latestScene.files["image-file"]?.created).toBe(
      Date.parse("2026-07-04T00:00:00.000Z"),
    );
  });

  it("skips asset reads for safe mode projects but still restores the scene", async () => {
    const project = createProject({ safeMode: true });
    const readProjectAssets = vi.fn(async () => [
      createProjectAssetPayload("image-file"),
    ]);

    const prepared = await prepareProjectBundleOpenData({
      project,
      devicePixelRatio: 2,
      fallbackCreatedAt: Date.parse("2026-07-06T00:00:00.000Z"),
      readProjectAssets,
    });

    expect(readProjectAssets).not.toHaveBeenCalled();
    expect(prepared.assets).toEqual([]);
    expect(prepared.missingThumbnailFileIds).toEqual([]);
    expect(prepared.thumbnailMaintenance).toBeNull();
    expect(prepared.initialData.elements).toHaveLength(1);
    expect(prepared.initialData.files).toEqual({});
    expect(prepared.latestScene.files).toEqual({});
  });
});
