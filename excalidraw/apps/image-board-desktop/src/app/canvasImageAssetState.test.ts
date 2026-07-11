import { describe, expect, it, vi } from "vitest";

import type { ExcalidrawElement, FileId } from "@excalidraw/element/types";
import type { BinaryFileData, BinaryFiles } from "@excalidraw/excalidraw/types";

import type {
  PersistedImageAssetInput,
  ProjectAssetPayload,
} from "../shared/desktopBridgeTypes";
import type { ImageRecordMap } from "../shared/projectTypes";
import {
  applyEmptyQueuedExcalidrawBinaryFiles,
  applyQueuedExcalidrawBinaryFiles,
  buildEmptyQueuedExcalidrawBinaryFiles,
  buildExcalidrawBinaryFilesFlushPlan,
  buildExcalidrawBinaryFilesFromProjectAssets,
  buildExcalidrawBinaryFilesFromImageAssets,
  buildQueuedExcalidrawBinaryFiles,
  createQueuedExcalidrawBinaryFilesRendererActions,
  flushQueuedExcalidrawBinaryFilesToCanvas,
  buildUnknownCanvasImageAssetInputs,
} from "./canvasImageAssetState";

const createImageElement = (
  patch: Partial<ExcalidrawElement> & { id: string },
) => {
  const { id, ...elementPatch } = patch;
  return ({
    id,
    type: "image",
    isDeleted: false,
    fileId: toFileId("file-1"),
    width: 320,
    height: 240,
    ...elementPatch,
  }) as ExcalidrawElement;
};

const createRectangleElement = (id: string) =>
  ({
    id,
    type: "rectangle",
    isDeleted: false,
  }) as ExcalidrawElement;

const createBinaryFile = (
  id: string,
  patch: Partial<BinaryFileData> = {},
) =>
  ({
    id,
    mimeType: "image/png",
    dataURL: `data:image/png;base64,payload-${id}` as BinaryFileData["dataURL"],
    created: Date.parse("2026-07-04T01:02:03.000Z"),
    ...patch,
  }) as BinaryFileData;

const toFileId = (value: string) => value as FileId;

describe("buildUnknownCanvasImageAssetInputs", () => {
  it("builds imported asset inputs for image elements missing from project records", () => {
    const files: BinaryFiles = {
      "file-1": createBinaryFile("file-1"),
    };

    expect(
      buildUnknownCanvasImageAssetInputs({
        imageRecords: {},
        elements: [createImageElement({ id: "element-1" })],
        files,
      }),
    ).toEqual([
      {
        fileId: "file-1",
        dataBase64: "payload-file-1",
        mimeType: "image/png",
        width: 320,
        height: 240,
        sourceType: "imported",
        createdAt: "2026-07-04T01:02:03.000Z",
      },
    ]);
  });

  it("ignores existing records, deleted elements, non-image elements, missing file ids and missing binary files", () => {
    const files: BinaryFiles = {
      "known-file": createBinaryFile("known-file"),
      "deleted-file": createBinaryFile("deleted-file"),
    };
    const imageRecords: ImageRecordMap = {
      "known-file": {
        fileId: "known-file",
        assetPath: "assets/known-file.png",
        sourceType: "imported",
        width: 320,
        height: 240,
        createdAt: "2026-07-04T01:02:03.000Z",
        mimeType: "image/png",
      },
    };

    expect(
      buildUnknownCanvasImageAssetInputs({
        imageRecords,
        elements: [
          createImageElement({ id: "known", fileId: toFileId("known-file") }),
          createImageElement({
            id: "deleted",
            fileId: toFileId("deleted-file"),
            isDeleted: true,
          }),
          createRectangleElement("rect"),
          createImageElement({ id: "missing-file-id", fileId: null }),
          createImageElement({
            id: "missing-binary",
            fileId: toFileId("missing-file"),
          }),
        ],
        files,
      }),
    ).toEqual([]);
  });
});

const createPersistedAssetInput = (
  patch: Partial<PersistedImageAssetInput> = {},
): PersistedImageAssetInput => ({
  fileId: "file-1",
  dataBase64: "payload-file-1",
  mimeType: "image/png",
  width: 320,
  height: 240,
  createdAt: "2026-07-04T01:02:03.000Z",
  sourceType: "imported",
  ...patch,
});

describe("buildExcalidrawBinaryFilesFromImageAssets", () => {
  it("builds Excalidraw binary files from persisted asset inputs", () => {
    expect(
      buildExcalidrawBinaryFilesFromImageAssets({
        assets: [createPersistedAssetInput()],
        fallbackCreatedAt: 123,
      }),
    ).toEqual([
      {
        id: "file-1",
        mimeType: "image/png",
        dataURL: "data:image/png;base64,payload-file-1",
        created: Date.parse("2026-07-04T01:02:03.000Z"),
      },
    ]);
  });

  it("uses the fallback timestamp when asset createdAt is invalid", () => {
    expect(
      buildExcalidrawBinaryFilesFromImageAssets({
        assets: [
          createPersistedAssetInput({
            createdAt: "not-a-date",
          }),
        ],
        fallbackCreatedAt: 456,
      }),
    ).toEqual([
      {
        id: "file-1",
        mimeType: "image/png",
        dataURL: "data:image/png;base64,payload-file-1",
        created: 456,
      },
    ]);
  });
});

const createProjectAssetPayload = (
  patch: Partial<ProjectAssetPayload> = {},
): ProjectAssetPayload => ({
  fileId: "file-1",
  mimeType: "image/png",
  dataBase64: "payload-file-1",
  width: 320,
  height: 240,
  createdAt: "2026-07-04T01:02:03.000Z",
  rendition: "preview",
  ...patch,
});

describe("buildExcalidrawBinaryFilesFromProjectAssets", () => {
  it("builds Excalidraw binary file map from project asset payloads", () => {
    expect(
      buildExcalidrawBinaryFilesFromProjectAssets({
        assets: [createProjectAssetPayload()],
        imageRecords: {
          "file-1": {
            fileId: "file-1",
            assetPath: "assets/file-1.png",
            sourceType: "generated",
            width: 320,
            height: 240,
            createdAt: "2026-07-05T02:03:04.000Z",
            mimeType: "image/png",
          },
        },
        fallbackCreatedAt: 123,
      }),
    ).toEqual({
      "file-1": {
        id: "file-1",
        mimeType: "image/png",
        dataURL: "data:image/png;base64,payload-file-1",
        created: Date.parse("2026-07-05T02:03:04.000Z"),
      },
    });
  });

  it("uses asset createdAt and fallback timestamp when record time is unavailable", () => {
    expect(
      buildExcalidrawBinaryFilesFromProjectAssets({
        assets: [
          createProjectAssetPayload({
            fileId: "asset-time",
            createdAt: "2026-07-06T03:04:05.000Z",
          }),
          createProjectAssetPayload({
            fileId: "fallback-time",
            createdAt: "not-a-date",
          }),
        ],
        imageRecords: {
          "asset-time": {
            fileId: "asset-time",
            assetPath: "assets/asset-time.png",
            sourceType: "imported",
            width: 320,
            height: 240,
            createdAt: "not-a-date",
            mimeType: "image/png",
          },
        },
        fallbackCreatedAt: 456,
      }),
    ).toEqual({
      "asset-time": {
        id: "asset-time",
        mimeType: "image/png",
        dataURL: "data:image/png;base64,payload-file-1",
        created: Date.parse("2026-07-06T03:04:05.000Z"),
      },
      "fallback-time": {
        id: "fallback-time",
        mimeType: "image/png",
        dataURL: "data:image/png;base64,payload-file-1",
        created: 456,
      },
    });
  });
});

describe("buildQueuedExcalidrawBinaryFiles", () => {
  it("builds a fresh empty queue for resetting pending canvas files", () => {
    const current = [createBinaryFile("file-1")];

    const resetQueue = buildEmptyQueuedExcalidrawBinaryFiles();

    expect(resetQueue).toEqual([]);
    expect(resetQueue).not.toBe(current);
    expect(current).toHaveLength(1);
  });

  it("applies a fresh empty queue through the injected queue setter", () => {
    const setQueuedFiles = vi.fn();

    const resetQueue = applyEmptyQueuedExcalidrawBinaryFiles({
      setQueuedFiles,
    });

    expect(resetQueue).toEqual([]);
    expect(setQueuedFiles).toHaveBeenCalledWith(resetQueue);
    expect(setQueuedFiles).toHaveBeenCalledTimes(1);
  });

  it("appends new files and replaces queued files with the same id", () => {
    expect(
      buildQueuedExcalidrawBinaryFiles({
        current: [
          createBinaryFile("file-1", {
            dataURL:
              "data:image/png;base64,current-1" as BinaryFileData["dataURL"],
          }),
          createBinaryFile("file-2", {
            dataURL:
              "data:image/png;base64,current-2" as BinaryFileData["dataURL"],
          }),
        ],
        next: [
          createBinaryFile("file-2", {
            dataURL: "data:image/png;base64,next-2" as BinaryFileData["dataURL"],
          }),
          createBinaryFile("file-3", {
            dataURL: "data:image/png;base64,next-3" as BinaryFileData["dataURL"],
          }),
        ],
      }).map((file) => [file.id, file.dataURL]),
    ).toEqual([
      ["file-1", "data:image/png;base64,current-1"],
      ["file-2", "data:image/png;base64,next-2"],
      ["file-3", "data:image/png;base64,next-3"],
    ]);
  });

  it("keeps the current queue unchanged when no new files are added", () => {
    const current = [createBinaryFile("file-1")];

    expect(
      buildQueuedExcalidrawBinaryFiles({
        current,
        next: [],
      }),
    ).toEqual(current);
  });

  it("applies queued binary files through the injected queue setter", () => {
    const current = [createBinaryFile("file-1")];
    const next = [createBinaryFile("file-2")];
    const setQueuedFiles = vi.fn();

    const queued = applyQueuedExcalidrawBinaryFiles({
      current,
      next,
      setQueuedFiles,
    });

    expect(queued.map((file) => file.id)).toEqual(["file-1", "file-2"]);
    expect(setQueuedFiles).toHaveBeenCalledWith(queued);
    expect(setQueuedFiles).toHaveBeenCalledTimes(1);
  });
});

describe("buildExcalidrawBinaryFilesFlushPlan", () => {
  it("keeps the queue when the canvas api is not ready", () => {
    const queued = [createBinaryFile("file-1")];

    expect(
      buildExcalidrawBinaryFilesFlushPlan({
        queued,
        canvasReady: false,
      }),
    ).toEqual({
      action: "skip",
      nextQueue: queued,
      filesToAdd: [],
    });
  });

  it("skips flushing an empty queue", () => {
    expect(
      buildExcalidrawBinaryFilesFlushPlan({
        queued: [],
        canvasReady: true,
      }),
    ).toEqual({
      action: "skip",
      nextQueue: [],
      filesToAdd: [],
    });
  });

  it("returns files to replace and clears the queue when the canvas is ready", () => {
    const queued = [createBinaryFile("file-1"), createBinaryFile("file-2")];

    expect(
      buildExcalidrawBinaryFilesFlushPlan({
        queued,
        canvasReady: true,
      }),
    ).toEqual({
      action: "replace-files",
      nextQueue: [],
      filesToAdd: queued,
    });
  });

  it("does not mutate the queue or replace files when the canvas is not ready", () => {
    const queued = [createBinaryFile("file-1")];
    const setQueuedFiles = vi.fn();
    const replaceFiles = vi.fn();

    const plan = flushQueuedExcalidrawBinaryFilesToCanvas({
      queued,
      replaceFiles: null,
      setQueuedFiles,
    });

    expect(plan.action).toBe("skip");
    expect(setQueuedFiles).not.toHaveBeenCalled();
    expect(replaceFiles).not.toHaveBeenCalled();
  });

  it("clears the queue and replaces files when the canvas is ready", () => {
    const queued = [createBinaryFile("file-1"), createBinaryFile("file-2")];
    const setQueuedFiles = vi.fn();
    const replaceFiles = vi.fn();

    const plan = flushQueuedExcalidrawBinaryFilesToCanvas({
      queued,
      replaceFiles,
      setQueuedFiles,
    });

    expect(plan.action).toBe("replace-files");
    expect(setQueuedFiles).toHaveBeenCalledWith([]);
    expect(replaceFiles).toHaveBeenCalledWith(queued);
  });
});

describe("createQueuedExcalidrawBinaryFilesRendererActions", () => {
  it("creates reset, queue and flush handlers over the injected queue ref", () => {
    let queuedFiles = [createBinaryFile("file-1")];
    const replaceFiles = vi.fn();
    const actions = createQueuedExcalidrawBinaryFilesRendererActions({
      getQueuedFiles: () => queuedFiles,
      setQueuedFiles: (files) => {
        queuedFiles = files;
      },
      getReplaceFiles: () => replaceFiles,
    });

    const resetQueue = actions.reset();
    expect(resetQueue).toEqual([]);
    expect(queuedFiles).toEqual([]);

    const queued = actions.queue([
      createBinaryFile("file-2"),
      createBinaryFile("file-3"),
    ]);
    expect(queued.map((file) => file.id)).toEqual(["file-2", "file-3"]);
    expect(queuedFiles.map((file) => file.id)).toEqual(["file-2", "file-3"]);

    const flushPlan = actions.flush();
    expect(flushPlan.action).toBe("replace-files");
    expect(queuedFiles).toEqual([]);
    expect(replaceFiles).toHaveBeenCalledWith(queued);
  });
});
