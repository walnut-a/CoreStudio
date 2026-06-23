import { describe, expect, it } from "vitest";

import type { AppState } from "@excalidraw/excalidraw/types";

import {
  getImageFileIdsNearViewport,
  getImageRenditionRequestsNearViewport,
} from "./imageRenditions";
import type { ImageRecordMap } from "../shared/projectTypes";

const baseAppState = {
  width: 500,
  height: 400,
  scrollX: -100,
  scrollY: -80,
  zoom: { value: 1 },
} as unknown as AppState;

describe("imageRenditions", () => {
  it("selects image file ids near the current viewport and skips images already loaded as original", () => {
    const fileIds = getImageFileIdsNearViewport({
      elements: [
        {
          id: "inside",
          type: "image",
          isDeleted: false,
          fileId: "inside-file",
          x: 120,
          y: 120,
          width: 160,
          height: 120,
        },
        {
          id: "outside",
          type: "image",
          isDeleted: false,
          fileId: "outside-file",
          x: 900,
          y: 900,
          width: 160,
          height: 120,
        },
        {
          id: "loaded",
          type: "image",
          isDeleted: false,
          fileId: "loaded-file",
          x: 220,
          y: 160,
          width: 160,
          height: 120,
        },
        {
          id: "missing-record",
          type: "image",
          isDeleted: false,
          fileId: "missing-record-file",
          x: 240,
          y: 180,
          width: 160,
          height: 120,
        },
      ] as any,
      appState: baseAppState,
      imageRecords: {
        "inside-file": {
          fileId: "inside-file",
          assetPath: "assets/inside.png",
          sourceType: "imported",
          width: 160,
          height: 120,
          createdAt: "2026-04-12T12:00:00.000Z",
          mimeType: "image/png",
        },
        "outside-file": {
          fileId: "outside-file",
          assetPath: "assets/outside.png",
          sourceType: "imported",
          width: 160,
          height: 120,
          createdAt: "2026-04-12T12:00:00.000Z",
          mimeType: "image/png",
        },
        "loaded-file": {
          fileId: "loaded-file",
          assetPath: "assets/loaded.png",
          sourceType: "imported",
          width: 160,
          height: 120,
          createdAt: "2026-04-12T12:00:00.000Z",
          mimeType: "image/png",
        },
      },
      loadedOriginalFileIds: new Set(["loaded-file"]),
      loadingOriginalFileIds: new Set(),
      viewportPaddingRatio: 0,
    });

    expect(fileIds).toEqual(["inside-file"]);
  });

  it("uses zoom and viewport padding while selecting nearby images", () => {
    const fileIds = getImageFileIdsNearViewport({
      elements: [
        {
          id: "near",
          type: "image",
          isDeleted: false,
          fileId: "near-file",
          x: 580,
          y: 470,
          width: 100,
          height: 100,
        },
      ] as any,
      appState: {
        ...baseAppState,
        zoom: { value: 2 },
      } as unknown as AppState,
      imageRecords: {
        "near-file": {
          fileId: "near-file",
          assetPath: "assets/near.png",
          sourceType: "imported",
          width: 100,
          height: 100,
          createdAt: "2026-04-12T12:00:00.000Z",
          mimeType: "image/png",
        },
      },
      loadedOriginalFileIds: new Set(),
      loadingOriginalFileIds: new Set(),
      viewportPaddingRatio: 1,
    });

    expect(fileIds).toEqual(["near-file"]);
  });

  it("keeps zoomed-out views on thumbnail or placeholder assets instead of loading originals", () => {
    const fileIds = getImageFileIdsNearViewport({
      elements: [
        {
          id: "inside",
          type: "image",
          isDeleted: false,
          fileId: "inside-file",
          x: 120,
          y: 120,
          width: 160,
          height: 120,
        },
      ] as any,
      appState: {
        ...baseAppState,
        zoom: { value: 0.2 },
      } as unknown as AppState,
      imageRecords: {
        "inside-file": {
          fileId: "inside-file",
          assetPath: "assets/inside.png",
          sourceType: "imported",
          width: 160,
          height: 120,
          createdAt: "2026-04-12T12:00:00.000Z",
          mimeType: "image/png",
        },
      },
      loadedOriginalFileIds: new Set(),
      loadingOriginalFileIds: new Set(),
      viewportPaddingRatio: 0,
    });

    expect(fileIds).toEqual([]);
  });

  it("loads originals below the zoom threshold when the image is large enough on screen", () => {
    const fileIds = getImageFileIdsNearViewport({
      elements: [
        {
          id: "large",
          type: "image",
          isDeleted: false,
          fileId: "large-file",
          x: 120,
          y: 120,
          width: 1200,
          height: 900,
        },
      ] as any,
      appState: {
        ...baseAppState,
        zoom: { value: 0.2 },
      } as unknown as AppState,
      imageRecords: {
        "large-file": {
          fileId: "large-file",
          assetPath: "assets/large.png",
          sourceType: "imported",
          width: 1200,
          height: 900,
          createdAt: "2026-04-12T12:00:00.000Z",
          mimeType: "image/png",
        },
      },
      loadedOriginalFileIds: new Set(),
      loadingOriginalFileIds: new Set(),
      viewportPaddingRatio: 0,
    });

    expect(fileIds).toEqual(["large-file"]);
  });

  it("requests preview before original as image screen size grows", () => {
    const elements = [
      {
        id: "large",
        type: "image",
        isDeleted: false,
        fileId: "large-file",
        x: 120,
        y: 120,
        width: 1200,
        height: 900,
      },
    ] as any;
    const imageRecords = {
      "large-file": {
        fileId: "large-file",
        assetPath: "assets/large.png",
        sourceType: "imported",
        width: 3000,
        height: 2000,
        createdAt: "2026-04-12T12:00:00.000Z",
        mimeType: "image/png",
      },
    } satisfies ImageRecordMap;

    expect(
      getImageRenditionRequestsNearViewport({
        elements,
        appState: {
          ...baseAppState,
          zoom: { value: 0.08 },
        } as unknown as AppState,
        imageRecords,
        loadedPreviewFileIds: new Set(),
        loadingPreviewFileIds: new Set(),
        loadedOriginalFileIds: new Set(),
        loadingOriginalFileIds: new Set(),
        viewportPaddingRatio: 0,
      }),
    ).toEqual([]);

    expect(
      getImageRenditionRequestsNearViewport({
        elements,
        appState: {
          ...baseAppState,
          zoom: { value: 0.3 },
        } as unknown as AppState,
        imageRecords,
        loadedPreviewFileIds: new Set(),
        loadingPreviewFileIds: new Set(),
        loadedOriginalFileIds: new Set(),
        loadingOriginalFileIds: new Set(),
        viewportPaddingRatio: 0,
      }),
    ).toEqual([{ fileId: "large-file", rendition: "preview" }]);

    expect(
      getImageRenditionRequestsNearViewport({
        elements,
        appState: {
          ...baseAppState,
          zoom: { value: 1.2 },
        } as unknown as AppState,
        imageRecords,
        loadedPreviewFileIds: new Set(["large-file"]),
        loadingPreviewFileIds: new Set(),
        loadedOriginalFileIds: new Set(),
        loadingOriginalFileIds: new Set(),
        viewportPaddingRatio: 0,
      }),
    ).toEqual([{ fileId: "large-file", rendition: "original" }]);
  });

  it("uses device pixel ratio when deciding to load original images", () => {
    const elements = [
      {
        id: "retina-large",
        type: "image",
        isDeleted: false,
        fileId: "retina-file",
        x: 120,
        y: 120,
        width: 720,
        height: 480,
      },
    ] as any;
    const imageRecords = {
      "retina-file": {
        fileId: "retina-file",
        assetPath: "assets/retina.png",
        sourceType: "imported",
        width: 2400,
        height: 1600,
        createdAt: "2026-04-12T12:00:00.000Z",
        mimeType: "image/png",
      },
    } satisfies ImageRecordMap;

    expect(
      getImageRenditionRequestsNearViewport({
        elements,
        appState: {
          ...baseAppState,
          zoom: { value: 1 },
        } as unknown as AppState,
        imageRecords,
        loadedPreviewFileIds: new Set(["retina-file"]),
        loadingPreviewFileIds: new Set(),
        loadedOriginalFileIds: new Set(),
        loadingOriginalFileIds: new Set(),
        viewportPaddingRatio: 0,
        devicePixelRatio: 1,
      }),
    ).toEqual([]);

    expect(
      getImageRenditionRequestsNearViewport({
        elements,
        appState: {
          ...baseAppState,
          zoom: { value: 1 },
        } as unknown as AppState,
        imageRecords,
        loadedPreviewFileIds: new Set(["retina-file"]),
        loadingPreviewFileIds: new Set(),
        loadedOriginalFileIds: new Set(),
        loadingOriginalFileIds: new Set(),
        viewportPaddingRatio: 0,
        devicePixelRatio: 2,
      }),
    ).toEqual([{ fileId: "retina-file", rendition: "original" }]);
  });
});
