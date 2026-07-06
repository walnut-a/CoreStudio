import { describe, expect, it, vi } from "vitest";

import type { ExcalidrawElement, FileId } from "@excalidraw/element/types";
import type { BinaryFileData, BinaryFiles } from "@excalidraw/excalidraw/types";

import {
  createProjectImageAssetPersistenceRendererActions,
  runProjectImageAssetPersistenceAction,
  runUnknownCanvasImageAssetPersistenceAction,
} from "./projectImageAssetPersistenceController";

import type {
  DesktopProjectBundle,
  PersistedImageAssetInput,
} from "../shared/desktopBridgeTypes";
import type { ImageRecord, ImageRecordMap } from "../shared/projectTypes";

const createImageAsset = (
  fileId: string,
  overrides: Partial<PersistedImageAssetInput> = {},
): PersistedImageAssetInput => ({
  fileId,
  mimeType: "image/png",
  dataBase64: "asset-payload",
  width: 512,
  height: 512,
  createdAt: "2026-07-05T00:00:00.000Z",
  sourceType: "generated",
  generationOrigin: "corestudio",
  ...overrides,
});

const createImageRecord = (
  fileId: string,
  overrides: Partial<ImageRecord> = {},
): ImageRecord => ({
  fileId,
  assetPath: `assets/${fileId}.png`,
  sourceType: "generated",
  generationOrigin: "corestudio",
  width: 512,
  height: 512,
  createdAt: "2026-07-05T00:00:00.000Z",
  mimeType: "image/png",
  ...overrides,
});

const createProject = (
  projectPath: string,
  imageRecords: ImageRecordMap = {},
): DesktopProjectBundle => ({
  projectPath,
  project: {
    formatVersion: 1,
    appVersion: "test",
    name: "工业设计助手",
    createdAt: "2026-07-05T00:00:00.000Z",
    updatedAt: "2026-07-05T00:00:00.000Z",
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
  imageRecords,
});

const toFileId = (value: string) => value as FileId;

const createImageElement = (
  patch: Partial<ExcalidrawElement> & { id: string },
) =>
  ({
    type: "image",
    isDeleted: false,
    fileId: toFileId("file-1"),
    width: 320,
    height: 240,
    ...patch,
  }) as ExcalidrawElement;

const createBinaryFile = (
  id: string,
  patch: Partial<BinaryFileData> = {},
) =>
  ({
    id,
    mimeType: "image/png",
    dataURL: `data:image/png;base64,payload-${id}` as BinaryFileData["dataURL"],
    created: Date.parse("2026-07-05T01:02:03.000Z"),
    ...patch,
  }) as BinaryFileData;

describe("runProjectImageAssetPersistenceAction", () => {
  it("persists image assets and merges the returned records into the active project", async () => {
    const project = createProject("/projects/current", {
      "snapshot-file": createImageRecord("snapshot-file"),
    });
    const activeProject = createProject("/projects/current", {
      "active-file": createImageRecord("active-file"),
    });
    const persistedRecords = {
      "persisted-file": createImageRecord("persisted-file"),
    };
    const files = [createImageAsset("persisted-file")];
    const setActiveProject = vi.fn();
    const persistImageAssets = vi.fn().mockResolvedValue(persistedRecords);

    await expect(
      runProjectImageAssetPersistenceAction({
        projectPath: project.projectPath,
        projectImageRecords: project.imageRecords,
        activeProject,
        files,
        persistImageAssets,
        setActiveProject,
      }),
    ).resolves.toEqual({
      status: "persisted",
      persistedRecords,
      imageRecords: {
        ...activeProject.imageRecords,
        ...persistedRecords,
      },
    });

    expect(persistImageAssets).toHaveBeenCalledWith({
      projectPath: "/projects/current",
      files,
    });
    expect(setActiveProject).toHaveBeenCalledWith({
      ...activeProject,
      imageRecords: {
        ...activeProject.imageRecords,
        ...persistedRecords,
      },
    });
  });

  it("does not update the active project when the active project no longer matches", async () => {
    const project = createProject("/projects/current", {
      "snapshot-file": createImageRecord("snapshot-file"),
    });
    const activeProject = createProject("/projects/other", {
      "other-file": createImageRecord("other-file"),
    });
    const persistedRecords = {
      "persisted-file": createImageRecord("persisted-file"),
    };
    const setActiveProject = vi.fn();

    await expect(
      runProjectImageAssetPersistenceAction({
        projectPath: project.projectPath,
        projectImageRecords: project.imageRecords,
        activeProject,
        files: [createImageAsset("persisted-file")],
        persistImageAssets: vi.fn().mockResolvedValue(persistedRecords),
        setActiveProject,
      }),
    ).resolves.toMatchObject({
      status: "persisted",
      imageRecords: {
        ...project.imageRecords,
        ...persistedRecords,
      },
    });

    expect(setActiveProject).not.toHaveBeenCalled();
  });
});

describe("runUnknownCanvasImageAssetPersistenceAction", () => {
  it("persists canvas image files missing from project records", async () => {
    const project = createProject("/projects/current");
    const persistedRecords = {
      "file-1": createImageRecord("file-1", {
        sourceType: "imported",
        createdAt: "2026-07-05T01:02:03.000Z",
        width: 320,
        height: 240,
      }),
    };
    const persistImageAssets = vi.fn().mockResolvedValue(persistedRecords);
    const setActiveProject = vi.fn();
    const files: BinaryFiles = {
      "file-1": createBinaryFile("file-1"),
    };

    await expect(
      runUnknownCanvasImageAssetPersistenceAction({
        project,
        activeProject: project,
        elements: [createImageElement({ id: "image-1" })],
        files,
        persistImageAssets,
        setActiveProject,
      }),
    ).resolves.toEqual(persistedRecords);

    expect(persistImageAssets).toHaveBeenCalledWith({
      projectPath: "/projects/current",
      files: [
        {
          fileId: "file-1",
          dataBase64: "payload-file-1",
          mimeType: "image/png",
          width: 320,
          height: 240,
          sourceType: "imported",
          createdAt: "2026-07-05T01:02:03.000Z",
        },
      ],
    });
    expect(setActiveProject).toHaveBeenCalledWith({
      ...project,
      imageRecords: persistedRecords,
    });
  });

  it("returns the existing image records when the canvas has no unknown image files", async () => {
    const project = createProject("/projects/current", {
      "file-1": createImageRecord("file-1"),
    });
    const persistImageAssets = vi.fn();
    const setActiveProject = vi.fn();

    await expect(
      runUnknownCanvasImageAssetPersistenceAction({
        project,
        activeProject: project,
        elements: [createImageElement({ id: "image-1" })],
        files: {
          "file-1": createBinaryFile("file-1"),
        },
        persistImageAssets,
        setActiveProject,
      }),
    ).resolves.toBe(project.imageRecords);

    expect(persistImageAssets).not.toHaveBeenCalled();
    expect(setActiveProject).not.toHaveBeenCalled();
  });
});

describe("createProjectImageAssetPersistenceRendererActions", () => {
  it("creates a renderer action for generated asset persistence", async () => {
    const project = createProject("/projects/current", {
      "existing-file": createImageRecord("existing-file"),
    });
    const persistedRecords = {
      "persisted-file": createImageRecord("persisted-file"),
    };
    const files = [createImageAsset("persisted-file")];
    const persistImageAssets = vi.fn().mockResolvedValue(persistedRecords);
    const setActiveProject = vi.fn();
    const actions = createProjectImageAssetPersistenceRendererActions({
      getActiveProject: () => project,
      persistImageAssets,
      setActiveProject,
    });

    await expect(
      actions.persistProjectImageAssets({
        projectPath: project.projectPath,
        projectImageRecords: project.imageRecords,
        activeProject: project,
        files,
      }),
    ).resolves.toEqual({
      status: "persisted",
      persistedRecords,
      imageRecords: {
        ...project.imageRecords,
        ...persistedRecords,
      },
    });

    expect(persistImageAssets).toHaveBeenCalledWith({
      projectPath: "/projects/current",
      files,
    });
    expect(setActiveProject).toHaveBeenCalledWith({
      ...project,
      imageRecords: {
        ...project.imageRecords,
        ...persistedRecords,
      },
    });
  });

  it("creates a renderer action for unknown canvas image persistence using the latest active project", async () => {
    const project = createProject("/projects/current");
    const persistedRecords = {
      "file-1": createImageRecord("file-1", {
        sourceType: "imported",
      }),
    };
    const persistImageAssets = vi.fn().mockResolvedValue(persistedRecords);
    const setActiveProject = vi.fn();
    const files: BinaryFiles = {
      "file-1": createBinaryFile("file-1"),
    };
    const actions = createProjectImageAssetPersistenceRendererActions({
      getActiveProject: () => project,
      persistImageAssets,
      setActiveProject,
    });

    await expect(
      actions.persistUnknownCanvasImages(
        project,
        [createImageElement({ id: "image-1" })],
        files,
      ),
    ).resolves.toEqual(persistedRecords);

    expect(persistImageAssets).toHaveBeenCalledWith({
      projectPath: "/projects/current",
      files: [
        {
          fileId: "file-1",
          dataBase64: "payload-file-1",
          mimeType: "image/png",
          width: 320,
          height: 240,
          sourceType: "imported",
          createdAt: "2026-07-05T01:02:03.000Z",
        },
      ],
    });
    expect(setActiveProject).toHaveBeenCalledWith({
      ...project,
      imageRecords: persistedRecords,
    });
  });
});
