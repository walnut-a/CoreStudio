import { describe, expect, it, vi } from "vitest";

import type {
  DesktopProjectBundle,
  ProjectAssetPayload,
} from "../shared/desktopBridgeTypes";
import {
  createOriginalProjectImageAssetReader,
  createProjectImageAssetReader,
  readProjectImageAssets,
} from "./projectImageAssetReader";

const createProject = (): DesktopProjectBundle => ({
  projectPath: "/Users/example/project",
  project: {
    formatVersion: 1,
    appVersion: "0.0.0-test",
    name: "Example",
    createdAt: "2026-07-05T00:00:00.000Z",
    updatedAt: "2026-07-05T00:00:00.000Z",
    sceneFile: "scene.excalidraw",
    imageRecordsFile: "image-records.json",
    assetsDir: "assets",
    exportsDir: "exports",
    agentAccess: {
      token: "project-token",
      enabled: true,
    },
  },
  sceneJson: "{}",
  imageRecords: {},
});

describe("projectImageAssetReader", () => {
  it("skips bridge reads when no file ids are requested", async () => {
    const readProjectAssetPayloads = vi.fn();

    await expect(
      readProjectImageAssets({
        project: createProject(),
        fileIds: [],
        rendition: "original",
        readProjectAssetPayloads,
      }),
    ).resolves.toEqual([]);
    expect(readProjectAssetPayloads).not.toHaveBeenCalled();
  });

  it("reads project image assets with the project path and rendition", async () => {
    const asset: ProjectAssetPayload = {
      fileId: "image-file",
      rendition: "preview",
      mimeType: "image/png",
      dataBase64: "payload",
      width: 512,
      height: 512,
      createdAt: "2026-07-05T00:00:00.000Z",
    };
    const readProjectAssetPayloads = vi.fn(async () => [asset]);

    await expect(
      readProjectImageAssets({
        project: createProject(),
        fileIds: ["image-file"],
        rendition: "preview",
        readProjectAssetPayloads,
      }),
    ).resolves.toEqual([asset]);
    expect(readProjectAssetPayloads).toHaveBeenCalledWith({
      projectPath: "/Users/example/project",
      fileIds: ["image-file"],
      rendition: "preview",
    });
  });

  it("creates the three-argument reader used by App command wiring", async () => {
    const asset: ProjectAssetPayload = {
      fileId: "image-file",
      rendition: "original",
      mimeType: "image/png",
      dataBase64: "payload",
      width: 1024,
      height: 1024,
      createdAt: "2026-07-05T00:00:00.000Z",
    };
    const readProjectAssetPayloads = vi.fn(async () => [asset]);
    const reader = createProjectImageAssetReader(readProjectAssetPayloads);

    await expect(
      reader(createProject(), ["image-file"], "original"),
    ).resolves.toEqual([asset]);
    expect(readProjectAssetPayloads).toHaveBeenCalledWith({
      projectPath: "/Users/example/project",
      fileIds: ["image-file"],
      rendition: "original",
    });
  });

  it("creates an original rendition reader for selection reference loading", async () => {
    const asset: ProjectAssetPayload = {
      fileId: "image-file",
      rendition: "original",
      mimeType: "image/png",
      dataBase64: "payload",
      width: 1024,
      height: 1024,
      createdAt: "2026-07-05T00:00:00.000Z",
    };
    const readProjectAssetPayloads = vi.fn(async () => [asset]);
    const readProjectAssets =
      createProjectImageAssetReader(readProjectAssetPayloads);
    const readOriginalAssets =
      createOriginalProjectImageAssetReader(readProjectAssets);

    await expect(
      readOriginalAssets(createProject(), ["image-file"]),
    ).resolves.toEqual([asset]);
    expect(readProjectAssetPayloads).toHaveBeenCalledWith({
      projectPath: "/Users/example/project",
      fileIds: ["image-file"],
      rendition: "original",
    });
  });
});
