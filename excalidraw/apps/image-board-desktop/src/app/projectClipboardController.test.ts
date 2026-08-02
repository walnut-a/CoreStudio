import { describe, expect, it, vi } from "vitest";

import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { BinaryFiles } from "@excalidraw/excalidraw/types";

import { createProjectClipboardRendererActions } from "./projectClipboardController";
import type { DesktopProjectBundle } from "../shared/desktopBridgeTypes";

const project: DesktopProjectBundle = {
  projectPath: "/projects/source",
  project: {
    formatVersion: 1,
    appVersion: "test",
    projectId: "project-source",
    name: "源项目",
    createdAt: "2026-08-02T01:00:00.000Z",
    updatedAt: "2026-08-02T01:00:00.000Z",
    sceneFile: "scene.excalidraw.json",
    imageRecordsFile: "image-records.json",
    assetsDir: "assets",
    exportsDir: "exports",
    agentAccess: {
      enabled: true,
      token: "project-token",
    },
  },
  sceneJson: "{}",
  imageRecords: {
    "file-1": {
      fileId: "file-1",
      assetPath: "assets/file-1.png",
      sourceType: "imported",
      width: 2400,
      height: 1600,
      createdAt: "2026-08-02T01:00:00.000Z",
      mimeType: "image/png",
    },
  },
};

const imageElement = {
  id: "element-1",
  type: "image",
  fileId: "file-1",
  isDeleted: false,
} as ExcalidrawElement;

const thumbnailFiles = {
  "file-1": {
    id: "file-1",
    mimeType: "image/png",
    dataURL: "data:image/png;base64,dGh1bWJuYWls",
    created: Date.parse("2026-08-02T01:00:00.000Z"),
  },
} as unknown as BinaryFiles;

describe("createProjectClipboardRendererActions", () => {
  it("routes editable copy through the project-aware desktop clipboard", async () => {
    const writeProjectClipboard = vi.fn().mockResolvedValue(undefined);
    const actions = createProjectClipboardRendererActions({
      getProject: () => project,
      writeProjectClipboard,
      readProjectAssets: vi.fn(),
      getFallbackCreatedAt: () => 0,
    });

    await expect(actions.copyElements([imageElement])).resolves.toBe(false);
    expect(writeProjectClipboard).toHaveBeenCalledWith({
      projectPath: "/projects/source",
      elements: [imageElement],
    });
  });

  it("replaces thumbnail files with originals only for PNG export", async () => {
    const readProjectAssets = vi.fn().mockResolvedValue([
      {
        fileId: "file-1",
        mimeType: "image/png",
        dataBase64: "b3JpZ2luYWw=",
        width: 2400,
        height: 1600,
        createdAt: "2026-08-02T01:00:00.000Z",
        rendition: "original",
      },
    ]);
    const actions = createProjectClipboardRendererActions({
      getProject: () => project,
      writeProjectClipboard: vi.fn(),
      readProjectAssets,
      getFallbackCreatedAt: () => 0,
    });

    const exportFiles = await actions.preparePngExportFiles(
      [imageElement],
      thumbnailFiles,
    );

    expect(readProjectAssets).toHaveBeenCalledWith(
      project,
      ["file-1"],
      "original",
    );
    expect(exportFiles["file-1"].dataURL).toBe(
      "data:image/png;base64,b3JpZ2luYWw=",
    );
    expect(thumbnailFiles["file-1"].dataURL).toBe(
      "data:image/png;base64,dGh1bWJuYWls",
    );
  });
});
