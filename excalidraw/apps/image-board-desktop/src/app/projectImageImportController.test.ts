import { describe, expect, it, vi } from "vitest";

import type { ClipboardData } from "@excalidraw/excalidraw/clipboard";

import {
  createProjectImageImportRendererActions,
  runDesktopClipboardImagePasteAction,
  runProjectImageAssetInsertAction,
  runProjectImagesImportAction,
} from "./projectImageImportController";

import type {
  DesktopProjectBundle,
  ImportedImagePayload,
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
  sourceType: "imported",
  ...overrides,
});

const createImportedImage = (
  fileId: string,
  overrides: Partial<ImportedImagePayload> = {},
): ImportedImagePayload => ({
  fileId,
  fileName: `${fileId}.png`,
  mimeType: "image/png",
  dataBase64: "asset-payload",
  width: 512,
  height: 512,
  createdAt: "2026-07-05T00:00:00.000Z",
  ...overrides,
});

const createImageRecord = (
  fileId: string,
  overrides: Partial<ImageRecord> = {},
): ImageRecord => ({
  fileId,
  assetPath: `assets/${fileId}.png`,
  sourceType: "imported",
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

const createClipboardData = (
  overrides: Partial<ClipboardData> = {},
): ClipboardData =>
  ({
    elements: [],
    files: undefined,
    text: "",
    mixedContent: [],
    errorMessage: undefined,
    ...overrides,
  }) as ClipboardData;

describe("runProjectImageAssetInsertAction", () => {
  it("persists image assets, merges records into the active project, and inserts them into the scene", async () => {
    const project = createProject("/projects/current", {
      "existing-file": createImageRecord("existing-file"),
    });
    const persistedRecords = {
      "new-file": createImageRecord("new-file"),
    };
    const files = [createImageAsset("new-file")];
    const setActiveProject = vi.fn();
    const insertAssetsIntoScene = vi.fn().mockResolvedValue(undefined);
    const persistImageAssets = vi.fn().mockResolvedValue(persistedRecords);

    await expect(
      runProjectImageAssetInsertAction({
        project,
        files,
        activeProject: project,
        persistImageAssets,
        setActiveProject,
        insertAssetsIntoScene,
      }),
    ).resolves.toEqual({
      status: "inserted",
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
    expect(insertAssetsIntoScene).toHaveBeenCalledWith(files, {
      ...project.imageRecords,
      ...persistedRecords,
    });
  });

  it("passes insertion options through to the scene insert callback", async () => {
    const project = createProject("/projects/current");
    const files = [createImageAsset("file-1")];
    const insertionOptions = {
      anchorPoint: { x: 12, y: 24 },
    };

    const insertAssetsIntoScene = vi.fn().mockResolvedValue(undefined);

    await runProjectImageAssetInsertAction({
      project,
      files,
      activeProject: project,
      persistImageAssets: vi.fn().mockResolvedValue({
        "file-1": createImageRecord("file-1"),
      }),
      setActiveProject: vi.fn(),
      insertAssetsIntoScene,
      insertionOptions,
    });

    expect(insertAssetsIntoScene).toHaveBeenCalledWith(
      files,
      {
        "file-1": createImageRecord("file-1"),
      },
      insertionOptions,
    );
  });
});

describe("runProjectImagesImportAction", () => {
  it("imports desktop images as project assets and inserts them into the scene", async () => {
    const project = createProject("/projects/current");
    const importedImages = [createImportedImage("image-1")];
    const persistedRecord = createImageRecord("image-1");
    const importImages = vi.fn().mockResolvedValue(importedImages);
    const persistImageAssets = vi.fn().mockResolvedValue({
      "image-1": persistedRecord,
    });
    const insertAssetsIntoScene = vi.fn().mockResolvedValue(undefined);

    await expect(
      runProjectImagesImportAction({
        project,
        activeProject: project,
        importImages,
        persistImageAssets,
        setActiveProject: vi.fn(),
        insertAssetsIntoScene,
        formatError: () => "导入图片失败。",
        setProjectError: vi.fn(),
      }),
    ).resolves.toEqual({
      status: "imported",
      importedCount: 1,
    });

    expect(importImages).toHaveBeenCalledTimes(1);
    expect(persistImageAssets).toHaveBeenCalledWith({
      projectPath: "/projects/current",
      files: [
        {
          ...importedImages[0],
          sourceType: "imported",
        },
      ],
    });
    expect(insertAssetsIntoScene).toHaveBeenCalledWith(
      [
        {
          ...importedImages[0],
          sourceType: "imported",
        },
      ],
      {
        "image-1": persistedRecord,
      },
    );
  });

  it("skips importing when there is no active project", async () => {
    const importImages = vi.fn();

    await expect(
      runProjectImagesImportAction({
        project: null,
        activeProject: null,
        importImages,
        persistImageAssets: vi.fn(),
        setActiveProject: vi.fn(),
        insertAssetsIntoScene: vi.fn(),
        formatError: () => "导入图片失败。",
        setProjectError: vi.fn(),
      }),
    ).resolves.toEqual({ status: "skipped", reason: "missing-project" });

    expect(importImages).not.toHaveBeenCalled();
  });

  it("reports import failures with the provided project error formatter", async () => {
    const project = createProject("/projects/current");
    const error = new Error("import failed");
    const setProjectError = vi.fn();

    await expect(
      runProjectImagesImportAction({
        project,
        activeProject: project,
        importImages: vi.fn().mockRejectedValue(error),
        persistImageAssets: vi.fn(),
        setActiveProject: vi.fn(),
        insertAssetsIntoScene: vi.fn(),
        formatError: (input) =>
          input === error ? "导入图片失败：import failed" : "导入图片失败。",
        setProjectError,
      }),
    ).resolves.toEqual({ status: "failed", error });

    expect(setProjectError).toHaveBeenCalledWith("导入图片失败：import failed");
  });
});

describe("runDesktopClipboardImagePasteAction", () => {
  it("lets Excalidraw handle non-empty clipboard data without reading the desktop clipboard", async () => {
    const readClipboardImage = vi.fn();

    await expect(
      runDesktopClipboardImagePasteAction({
        data: createClipboardData({ text: "copied text" }),
        project: createProject("/projects/current"),
        activeProject: createProject("/projects/current"),
        readClipboardImage,
        persistImageAssets: vi.fn(),
        setActiveProject: vi.fn(),
        insertAssetsIntoScene: vi.fn(),
        insertionOptions: { anchorPoint: { x: 12, y: 24 } },
        formatError: () => "导入图片失败。",
        setProjectError: vi.fn(),
      }),
    ).resolves.toEqual({
      status: "skipped",
      reason: "clipboard-has-data",
      shouldContinuePaste: true,
    });

    expect(readClipboardImage).not.toHaveBeenCalled();
  });

  it("reads an empty desktop clipboard image, imports it, and consumes the paste", async () => {
    const project = createProject("/projects/current");
    const clipboardImage = createImportedImage("clipboard-image");
    const insertionOptions = { anchorPoint: { x: 12, y: 24 } };
    const insertAssetsIntoScene = vi.fn().mockResolvedValue(undefined);

    await expect(
      runDesktopClipboardImagePasteAction({
        data: createClipboardData(),
        project,
        activeProject: project,
        readClipboardImage: vi.fn().mockResolvedValue(clipboardImage),
        persistImageAssets: vi.fn().mockResolvedValue({
          "clipboard-image": createImageRecord("clipboard-image"),
        }),
        setActiveProject: vi.fn(),
        insertAssetsIntoScene,
        insertionOptions,
        formatError: () => "导入图片失败。",
        setProjectError: vi.fn(),
      }),
    ).resolves.toEqual({
      status: "pasted",
      shouldContinuePaste: false,
    });

    expect(insertAssetsIntoScene).toHaveBeenCalledWith(
      [
        {
          ...clipboardImage,
          sourceType: "imported",
        },
      ],
      {
        "clipboard-image": createImageRecord("clipboard-image"),
      },
      insertionOptions,
    );
  });

  it("reports clipboard import failures and consumes the paste", async () => {
    const project = createProject("/projects/current");
    const error = new Error("clipboard failed");
    const setProjectError = vi.fn();

    await expect(
      runDesktopClipboardImagePasteAction({
        data: createClipboardData(),
        project,
        activeProject: project,
        readClipboardImage: vi.fn().mockRejectedValue(error),
        persistImageAssets: vi.fn(),
        setActiveProject: vi.fn(),
        insertAssetsIntoScene: vi.fn(),
        insertionOptions: { anchorPoint: { x: 12, y: 24 } },
        formatError: (input) =>
          input === error ? "导入图片失败：clipboard failed" : "导入图片失败。",
        setProjectError,
      }),
    ).resolves.toEqual({
      status: "failed",
      error,
      shouldContinuePaste: false,
    });

    expect(setProjectError).toHaveBeenCalledWith(
      "导入图片失败：clipboard failed",
    );
  });
});

describe("createProjectImageImportRendererActions", () => {
  it("creates renderer actions that read the latest project and clipboard insertion options", async () => {
    const firstProject = createProject("/projects/first");
    const secondProject = createProject("/projects/second");
    const importedImage = createImportedImage("imported-image");
    const clipboardImage = createImportedImage("clipboard-image");
    const insertAssetsIntoScene = vi.fn().mockResolvedValue(undefined);
    const persistImageAssets = vi
      .fn()
      .mockResolvedValueOnce({
        "imported-image": createImageRecord("imported-image"),
      })
      .mockResolvedValueOnce({
        "clipboard-image": createImageRecord("clipboard-image"),
      });
    let currentProject: DesktopProjectBundle | null = firstProject;
    const clipboardInsertionOptions = {
      anchorPoint: { x: 16, y: 32 },
    };

    const actions = createProjectImageImportRendererActions({
      getProject: () => currentProject,
      getActiveProject: () => currentProject,
      importImages: vi.fn().mockResolvedValue([importedImage]),
      readClipboardImage: vi.fn().mockResolvedValue(clipboardImage),
      persistImageAssets,
      setActiveProject: vi.fn(),
      insertAssetsIntoScene,
      getClipboardInsertionOptions: () => clipboardInsertionOptions,
      formatError: () => "导入图片失败。",
      setProjectError: vi.fn(),
    });

    await expect(actions.importImages()).resolves.toEqual({
      status: "imported",
      importedCount: 1,
    });

    currentProject = secondProject;

    await expect(
      actions.pasteClipboardImage(createClipboardData()),
    ).resolves.toBe(false);

    expect(persistImageAssets).toHaveBeenNthCalledWith(1, {
      projectPath: "/projects/first",
      files: [
        {
          ...importedImage,
          sourceType: "imported",
        },
      ],
    });
    expect(persistImageAssets).toHaveBeenNthCalledWith(2, {
      projectPath: "/projects/second",
      files: [
        {
          ...clipboardImage,
          sourceType: "imported",
        },
      ],
    });
    expect(insertAssetsIntoScene).toHaveBeenNthCalledWith(
      2,
      [
        {
          ...clipboardImage,
          sourceType: "imported",
        },
      ],
      {
        "clipboard-image": createImageRecord("clipboard-image"),
      },
      clipboardInsertionOptions,
    );
  });
});
