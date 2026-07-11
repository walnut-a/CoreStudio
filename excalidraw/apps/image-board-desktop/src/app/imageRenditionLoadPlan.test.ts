import { describe, expect, it, vi } from "vitest";

import type { AppState } from "@excalidraw/excalidraw/types";

import {
  addImageRenditionFileIdState,
  applyEmptyImageRenditionTrackingSets,
  applyImageRenditionLoadingState,
  applyLoadedImageRenditionAssetsState,
  buildActiveImageRenditionSceneSnapshot,
  buildEmptyImageRenditionTrackingSets,
  buildViewportImageRenditionSceneSnapshot,
  buildVisibleImageRenditionLoadPlan,
  buildImageRenditionLoadedState,
  buildImageRenditionLoadingState,
  createVisibleImageRenditionLoadRendererActions,
  groupImageRenditionRequests,
  readImageRenditionAssetsForRequests,
  readInitialImageRenditionAssets,
  readInitialProjectImageRenditionAssets,
  clearImageRenditionLoadingState,
  removeImageRenditionFileIdState,
  scheduleImageRenditionLoadAction,
} from "./imageRenditionLoadPlan";
import type { ImageRenditionRequest } from "./imageRenditions";
import type {
  DesktopProjectBundle,
  ProjectAssetPayload,
} from "../shared/desktopBridgeTypes";
import type { ImageRecordMap } from "../shared/projectTypes";

const baseAppState = {
  width: 500,
  height: 400,
  scrollX: -100,
  scrollY: -80,
  zoom: { value: 1 },
} as unknown as AppState;

describe("imageRenditionLoadPlan", () => {
  it("groups visible image requests by requested rendition", () => {
    const requests: ImageRenditionRequest[] = [
      { fileId: "preview-a", rendition: "preview" },
      { fileId: "original-a", rendition: "original" },
      { fileId: "preview-b", rendition: "preview" },
    ];

    expect(Array.from(groupImageRenditionRequests(requests).entries())).toEqual(
      [
        ["preview", ["preview-a", "preview-b"]],
        ["original", ["original-a"]],
      ],
    );
  });

  it("builds loading markers from pending visible image requests", () => {
    const requests: ImageRenditionRequest[] = [
      { fileId: "preview-file", rendition: "preview" },
      { fileId: "original-file", rendition: "original" },
    ];

    expect(buildImageRenditionLoadingState(requests)).toEqual({
      previewFileIds: ["preview-file"],
      originalFileIds: ["original-file"],
    });
  });

  it("marks original asset payloads as satisfying both original and preview state", () => {
    const assets: ProjectAssetPayload[] = [
      {
        fileId: "original-file",
        rendition: "original",
        mimeType: "image/png",
        dataBase64: "original",
        width: 1024,
        height: 1024,
        createdAt: "2026-07-04T00:00:00.000Z",
      },
      {
        fileId: "preview-file",
        rendition: "preview",
        mimeType: "image/png",
        dataBase64: "preview",
        width: 512,
        height: 512,
        createdAt: "2026-07-04T00:00:00.000Z",
      },
      {
        fileId: "thumbnail-file",
        rendition: "thumbnail",
        mimeType: "image/png",
        dataBase64: "thumbnail",
        width: 128,
        height: 128,
        createdAt: "2026-07-04T00:00:00.000Z",
      },
    ];

    expect(buildImageRenditionLoadedState(assets)).toEqual({
      previewFileIds: ["original-file", "preview-file"],
      originalFileIds: ["original-file"],
    });
  });

  it("applies loaded rendition assets to loaded tracking sets", () => {
    const sets = {
      previewFileIds: new Set(["existing-preview"]),
      originalFileIds: new Set(["existing-original"]),
    };
    const assets: ProjectAssetPayload[] = [
      {
        fileId: "original-file",
        rendition: "original",
        mimeType: "image/png",
        dataBase64: "original",
        width: 1024,
        height: 1024,
        createdAt: "2026-07-04T00:00:00.000Z",
      },
      {
        fileId: "preview-file",
        rendition: "preview",
        mimeType: "image/png",
        dataBase64: "preview",
        width: 512,
        height: 512,
        createdAt: "2026-07-04T00:00:00.000Z",
      },
    ];

    const state = applyLoadedImageRenditionAssetsState({
      assets,
      sets,
    });

    expect(state).toEqual({
      previewFileIds: ["original-file", "preview-file"],
      originalFileIds: ["original-file"],
    });
    expect(Array.from(sets.previewFileIds)).toEqual([
      "existing-preview",
      "original-file",
      "preview-file",
    ]);
    expect(Array.from(sets.originalFileIds)).toEqual([
      "existing-original",
      "original-file",
    ]);
  });

  it("applies and clears image rendition loading state", () => {
    const loadingState = {
      previewFileIds: ["preview-file", "original-file"],
      originalFileIds: ["original-file"],
    };
    const sets = {
      previewFileIds: new Set(["existing-preview"]),
      originalFileIds: new Set(["existing-original"]),
    };

    applyImageRenditionLoadingState({ loadingState, sets });

    expect(Array.from(sets.previewFileIds)).toEqual([
      "existing-preview",
      "preview-file",
      "original-file",
    ]);
    expect(Array.from(sets.originalFileIds)).toEqual([
      "existing-original",
      "original-file",
    ]);

    clearImageRenditionLoadingState({ loadingState, sets });

    expect(Array.from(sets.previewFileIds)).toEqual(["existing-preview"]);
    expect(Array.from(sets.originalFileIds)).toEqual(["existing-original"]);
  });

  it("adds rendition file id state to mutable tracking sets", () => {
    const sets = {
      previewFileIds: new Set(["existing-preview"]),
      originalFileIds: new Set(["existing-original"]),
    };

    addImageRenditionFileIdState(
      {
        previewFileIds: ["preview-file", "shared-file"],
        originalFileIds: ["original-file", "shared-file"],
      },
      sets,
    );

    expect(Array.from(sets.previewFileIds)).toEqual([
      "existing-preview",
      "preview-file",
      "shared-file",
    ]);
    expect(Array.from(sets.originalFileIds)).toEqual([
      "existing-original",
      "original-file",
      "shared-file",
    ]);
  });

  it("removes only the rendition file ids represented by the state", () => {
    const sets = {
      previewFileIds: new Set([
        "keep-preview",
        "preview-file",
        "shared-file",
      ]),
      originalFileIds: new Set([
        "keep-original",
        "original-file",
        "shared-file",
      ]),
    };

    removeImageRenditionFileIdState(
      {
        previewFileIds: ["preview-file", "shared-file"],
        originalFileIds: ["original-file", "shared-file"],
      },
      sets,
    );

    expect(Array.from(sets.previewFileIds)).toEqual(["keep-preview"]);
    expect(Array.from(sets.originalFileIds)).toEqual(["keep-original"]);
  });

  it("builds empty tracking sets for resetting rendition loading state", () => {
    const sets = buildEmptyImageRenditionTrackingSets();

    expect(sets.loadedPreviewFileIds.size).toBe(0);
    expect(sets.loadingPreviewFileIds.size).toBe(0);
    expect(sets.loadedOriginalFileIds.size).toBe(0);
    expect(sets.loadingOriginalFileIds.size).toBe(0);
    expect(sets.loadedPreviewFileIds).not.toBe(sets.loadingPreviewFileIds);
    expect(sets.loadedPreviewFileIds).not.toBe(sets.loadedOriginalFileIds);
    expect(sets.loadingOriginalFileIds).not.toBe(
      sets.loadedOriginalFileIds,
    );
  });

  it("applies empty tracking sets to the rendition tracking refs", () => {
    const setLoadedPreviewFileIds = vi.fn();
    const setLoadingPreviewFileIds = vi.fn();
    const setLoadedOriginalFileIds = vi.fn();
    const setLoadingOriginalFileIds = vi.fn();

    const sets = applyEmptyImageRenditionTrackingSets({
      setLoadedPreviewFileIds,
      setLoadingPreviewFileIds,
      setLoadedOriginalFileIds,
      setLoadingOriginalFileIds,
    });

    expect(sets.loadedPreviewFileIds.size).toBe(0);
    expect(sets.loadingPreviewFileIds.size).toBe(0);
    expect(sets.loadedOriginalFileIds.size).toBe(0);
    expect(sets.loadingOriginalFileIds.size).toBe(0);
    expect(setLoadedPreviewFileIds).toHaveBeenCalledWith(
      sets.loadedPreviewFileIds,
    );
    expect(setLoadingPreviewFileIds).toHaveBeenCalledWith(
      sets.loadingPreviewFileIds,
    );
    expect(setLoadedOriginalFileIds).toHaveBeenCalledWith(
      sets.loadedOriginalFileIds,
    );
    expect(setLoadingOriginalFileIds).toHaveBeenCalledWith(
      sets.loadingOriginalFileIds,
    );
  });

  it("builds the active scene snapshot from the latest Excalidraw API readings", () => {
    const fallbackElement = {
      id: "fallback",
      type: "image",
      isDeleted: false,
      fileId: "fallback-file",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    };
    const activeElement = {
      id: "active",
      type: "image",
      isDeleted: false,
      fileId: "active-file",
      x: 120,
      y: 120,
      width: 720,
      height: 480,
    };
    const fallbackScene = {
      elements: [fallbackElement] as any,
      appState: baseAppState,
      files: {
        "fallback-file": { id: "fallback-file" },
      } as any,
    };
    const activeFiles = {
      "active-file": { id: "active-file" },
    } as any;

    expect(
      buildActiveImageRenditionSceneSnapshot(fallbackScene, {
        getSceneElementsIncludingDeleted: () => [activeElement] as any,
        getAppState: () => ({
          scrollX: -240,
          zoom: { value: 1.75 },
        } as Partial<AppState>),
        getFiles: () => activeFiles,
      }),
    ).toEqual({
      elements: [activeElement],
      appState: {
        ...baseAppState,
        scrollX: -240,
        zoom: { value: 1.75 },
      },
      files: activeFiles,
    });
  });

  it("falls back to the provided scene when active API readings are unavailable", () => {
    const fallbackScene = {
      elements: [
        {
          id: "fallback",
          type: "image",
          isDeleted: false,
          fileId: "fallback-file",
          x: 0,
          y: 0,
          width: 100,
          height: 100,
        },
      ] as any,
      appState: baseAppState,
      files: {
        "fallback-file": { id: "fallback-file" },
      } as any,
    };

    expect(buildActiveImageRenditionSceneSnapshot(fallbackScene, {})).toEqual(
      fallbackScene,
    );
  });

  it("builds a viewport scene snapshot with explicit viewport values winning over API app state", () => {
    const fallbackElement = {
      id: "fallback",
      type: "image",
      isDeleted: false,
      fileId: "fallback-file",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    };
    const activeElement = {
      id: "active",
      type: "image",
      isDeleted: false,
      fileId: "active-file",
      x: 120,
      y: 120,
      width: 720,
      height: 480,
    };
    const fallbackScene = {
      elements: [fallbackElement] as any,
      appState: baseAppState,
      files: {
        "fallback-file": { id: "fallback-file" },
      } as any,
    };
    const activeFiles = {
      "active-file": { id: "active-file" },
    } as any;
    const nextZoom = { value: 2 } as AppState["zoom"];

    expect(
      buildViewportImageRenditionSceneSnapshot(
        fallbackScene,
        {
          getSceneElementsIncludingDeleted: () => [activeElement] as any,
          getAppState: () =>
            ({
              scrollX: -1,
              scrollY: -2,
              zoom: { value: 1.2 },
            } as Partial<AppState>),
          getFiles: () => activeFiles,
        },
        {
          scrollX: -320,
          scrollY: -180,
          zoom: nextZoom,
        },
      ),
    ).toEqual({
      elements: [activeElement],
      appState: {
        ...baseAppState,
        scrollX: -320,
        scrollY: -180,
        zoom: nextZoom,
      },
      files: activeFiles,
    });
  });

  it("reads requested image assets once per rendition and flattens the payloads", async () => {
    const requests: ImageRenditionRequest[] = [
      { fileId: "preview-a", rendition: "preview" },
      { fileId: "original-a", rendition: "original" },
      { fileId: "preview-b", rendition: "preview" },
    ];
    const previewAsset: ProjectAssetPayload = {
      fileId: "preview-a",
      rendition: "preview",
      mimeType: "image/png",
      dataBase64: "preview",
      width: 512,
      height: 512,
      createdAt: "2026-07-04T00:00:00.000Z",
    };
    const originalAsset: ProjectAssetPayload = {
      fileId: "original-a",
      rendition: "original",
      mimeType: "image/png",
      dataBase64: "original",
      width: 1024,
      height: 1024,
      createdAt: "2026-07-04T00:00:00.000Z",
    };
    const readAssets = vi.fn(async (rendition, fileIds) =>
      rendition === "preview" ? [previewAsset] : [originalAsset],
    );

    await expect(
      readImageRenditionAssetsForRequests(requests, readAssets),
    ).resolves.toEqual([previewAsset, originalAsset]);
    expect(readAssets).toHaveBeenCalledTimes(2);
    expect(readAssets).toHaveBeenNthCalledWith(1, "preview", [
      "preview-a",
      "preview-b",
    ]);
    expect(readAssets).toHaveBeenNthCalledWith(2, "original", ["original-a"]);
  });

  it("reads initial visible image renditions and falls back to an empty list on prefetch failure", async () => {
    const imageRecords = {
      "visible-file": {
        fileId: "visible-file",
        assetPath: "assets/visible.png",
        sourceType: "imported",
        width: 2400,
        height: 1600,
        createdAt: "2026-07-04T00:00:00.000Z",
        mimeType: "image/png",
      },
    } satisfies ImageRecordMap;
    const originalAsset: ProjectAssetPayload = {
      fileId: "visible-file",
      rendition: "original",
      mimeType: "image/png",
      dataBase64: "original",
      width: 2400,
      height: 1600,
      createdAt: "2026-07-04T00:00:00.000Z",
    };
    const readAssets = vi.fn(async () => [originalAsset]);

    await expect(
      readInitialImageRenditionAssets({
        elements: [
          {
            id: "visible",
            type: "image",
            isDeleted: false,
            fileId: "visible-file",
            x: 120,
            y: 120,
            width: 720,
            height: 480,
          },
        ] as any,
        appState: baseAppState,
        imageRecords,
        devicePixelRatio: 1,
        readAssets,
      }),
    ).resolves.toEqual([originalAsset]);
    expect(readAssets).toHaveBeenCalledWith("original", ["visible-file"]);

    readAssets.mockRejectedValueOnce(new Error("prefetch failed"));
    await expect(
      readInitialImageRenditionAssets({
        elements: [
          {
            id: "visible",
            type: "image",
            isDeleted: false,
            fileId: "visible-file",
            x: 120,
            y: 120,
            width: 720,
            height: 480,
          },
        ] as any,
        appState: baseAppState,
        imageRecords,
        devicePixelRatio: 1,
        readAssets,
      }),
    ).resolves.toEqual([]);
  });

  it("reads initial project image renditions from the project bundle", async () => {
    const originalAsset: ProjectAssetPayload = {
      fileId: "visible-file",
      rendition: "original",
      mimeType: "image/png",
      dataBase64: "original",
      width: 2400,
      height: 1600,
      createdAt: "2026-07-04T00:00:00.000Z",
    };
    const project = {
      projectPath: "/Users/example/project",
      imageRecords: {
        "visible-file": {
          fileId: "visible-file",
          assetPath: "assets/visible.png",
          sourceType: "imported",
          width: 2400,
          height: 1600,
          createdAt: "2026-07-04T00:00:00.000Z",
          mimeType: "image/png",
        },
      },
    } satisfies Pick<DesktopProjectBundle, "projectPath" | "imageRecords">;
    const readProjectAssets = vi.fn(async () => [originalAsset]);

    await expect(
      readInitialProjectImageRenditionAssets({
        project,
        scene: {
          elements: [
            {
              id: "visible",
              type: "image",
              isDeleted: false,
              fileId: "visible-file",
              x: 120,
              y: 120,
              width: 720,
              height: 480,
            },
          ] as any,
          appState: baseAppState,
        },
        devicePixelRatio: 1,
        readProjectAssets,
      }),
    ).resolves.toEqual([originalAsset]);
    expect(readProjectAssets).toHaveBeenCalledWith({
      projectPath: "/Users/example/project",
      fileIds: ["visible-file"],
      rendition: "original",
    });
  });

  it("skips initial image rendition prefetch when scene information is incomplete", async () => {
    const readAssets = vi.fn(async () => []);

    await expect(
      readInitialImageRenditionAssets({
        elements: [],
        appState: baseAppState,
        imageRecords: {},
        devicePixelRatio: 1,
        readAssets,
      }),
    ).resolves.toEqual([]);
    await expect(
      readInitialImageRenditionAssets({
        elements: [
          {
            id: "missing-state",
            type: "image",
            isDeleted: false,
            fileId: "missing-state-file",
            x: 120,
            y: 120,
            width: 720,
            height: 480,
          },
        ] as any,
        appState: null,
        imageRecords: {},
        devicePixelRatio: 1,
        readAssets,
      }),
    ).resolves.toEqual([]);
    expect(readAssets).not.toHaveBeenCalled();
  });

  it("builds a visible image rendition load plan with loading markers", () => {
    const imageRecords = {
      "visible-file": {
        fileId: "visible-file",
        assetPath: "assets/visible.png",
        sourceType: "imported",
        width: 2400,
        height: 1600,
        createdAt: "2026-07-04T00:00:00.000Z",
        mimeType: "image/png",
      },
    } satisfies ImageRecordMap;

    expect(
      buildVisibleImageRenditionLoadPlan({
        elements: [
          {
            id: "visible",
            type: "image",
            isDeleted: false,
            fileId: "visible-file",
            x: 120,
            y: 120,
            width: 720,
            height: 480,
          },
        ] as any,
        appState: baseAppState,
        imageRecords,
        loadedPreviewFileIds: new Set(["visible-file"]),
        loadingPreviewFileIds: new Set(),
        loadedOriginalFileIds: new Set(),
        loadingOriginalFileIds: new Set(),
        devicePixelRatio: 1,
      }),
    ).toEqual({
      requests: [{ fileId: "visible-file", rendition: "original" }],
      loadingState: {
        previewFileIds: [],
        originalFileIds: ["visible-file"],
      },
    });
  });

  it("skips visible image rendition load planning when no new rendition is needed", () => {
    const imageRecords = {
      "loaded-file": {
        fileId: "loaded-file",
        assetPath: "assets/loaded.png",
        sourceType: "imported",
        width: 2400,
        height: 1600,
        createdAt: "2026-07-04T00:00:00.000Z",
        mimeType: "image/png",
      },
    } satisfies ImageRecordMap;

    expect(
      buildVisibleImageRenditionLoadPlan({
        elements: [
          {
            id: "loaded",
            type: "image",
            isDeleted: false,
            fileId: "loaded-file",
            x: 120,
            y: 120,
            width: 720,
            height: 480,
          },
        ] as any,
        appState: baseAppState,
        imageRecords,
        loadedPreviewFileIds: new Set(["loaded-file"]),
        loadingPreviewFileIds: new Set(),
        loadedOriginalFileIds: new Set(["loaded-file"]),
        loadingOriginalFileIds: new Set(),
        devicePixelRatio: 1,
      }),
    ).toBeNull();
  });

  it("skips scheduling a visible image rendition load when no scene is available", () => {
    const clearExistingTimer = vi.fn();
    const scheduleTimeout = vi.fn();
    const setTimerId = vi.fn();
    const loadScene = vi.fn();

    expect(
      scheduleImageRenditionLoadAction({
        scene: null,
        delayMs: 120,
        getLatestScene: () => ({ id: "latest-scene" }),
        clearExistingTimer,
        setTimerId,
        scheduleTimeout,
        loadScene,
      }),
    ).toEqual({
      status: "skipped",
      reason: "missing-scene",
    });

    expect(clearExistingTimer).not.toHaveBeenCalled();
    expect(scheduleTimeout).not.toHaveBeenCalled();
    expect(setTimerId).not.toHaveBeenCalled();
    expect(loadScene).not.toHaveBeenCalled();
  });

  it("replaces the previous visible image rendition load timer and loads the latest scene", () => {
    const queuedScene = { id: "queued-scene" };
    const latestScene = { id: "latest-scene" };
    const clearExistingTimer = vi.fn();
    const setTimerId = vi.fn();
    const loadScene = vi.fn();
    const scheduledCallbacks: Array<() => void> = [];
    const scheduleTimeout = vi.fn((callback: () => void, delayMs: number) => {
      scheduledCallbacks.push(callback);
      expect(delayMs).toBe(180);
      return 77;
    });

    expect(
      scheduleImageRenditionLoadAction({
        scene: queuedScene,
        delayMs: 180,
        getLatestScene: () => latestScene,
        clearExistingTimer,
        setTimerId,
        scheduleTimeout,
        loadScene,
      }),
    ).toEqual({
      status: "scheduled",
      timerId: 77,
    });

    expect(clearExistingTimer).toHaveBeenCalledTimes(1);
    expect(scheduleTimeout).toHaveBeenCalledTimes(1);
    expect(setTimerId).toHaveBeenCalledWith(77);

    expect(scheduledCallbacks).toHaveLength(1);
    scheduledCallbacks[0]?.();

    expect(setTimerId).toHaveBeenLastCalledWith(null);
    expect(loadScene).toHaveBeenCalledWith(latestScene);
  });

  it("falls back to the queued scene when no latest scene exists during the load callback", () => {
    const queuedScene = { id: "queued-scene" };
    const setTimerId = vi.fn();
    const loadScene = vi.fn();
    const scheduledCallbacks: Array<() => void> = [];

    scheduleImageRenditionLoadAction({
      scene: queuedScene,
      delayMs: 180,
      getLatestScene: () => null,
      clearExistingTimer: vi.fn(),
      setTimerId,
      scheduleTimeout: (callback) => {
        scheduledCallbacks.push(callback);
        return 78;
      },
      loadScene,
    });

    expect(scheduledCallbacks).toHaveLength(1);
    scheduledCallbacks[0]?.();

    expect(setTimerId).toHaveBeenLastCalledWith(null);
    expect(loadScene).toHaveBeenCalledWith(queuedScene);
  });

  it("creates a visible rendition load handler that reads, applies, and tracks upgraded assets", async () => {
    const activeElement = {
      id: "visible",
      type: "image",
      isDeleted: false,
      fileId: "visible-file",
      x: 120,
      y: 120,
      width: 720,
      height: 480,
    };
    const scene = {
      elements: [] as any,
      appState: baseAppState,
      files: {} as any,
    };
    const activeScene = {
      elements: [activeElement] as any,
      appState: baseAppState,
      files: {
        "visible-file": { id: "visible-file" },
      } as any,
    };
    const project = {
      safeMode: false,
      imageRecords: {
        "visible-file": {
          fileId: "visible-file",
          assetPath: "assets/visible.png",
          sourceType: "imported",
          width: 2400,
          height: 1600,
          createdAt: "2026-07-04T00:00:00.000Z",
          mimeType: "image/png",
        },
      },
    } as unknown as DesktopProjectBundle;
    const originalAsset: ProjectAssetPayload = {
      fileId: "visible-file",
      rendition: "original",
      mimeType: "image/png",
      dataBase64: "original",
      width: 2400,
      height: 1600,
      createdAt: "2026-07-04T00:00:00.000Z",
    };
    const loadedPreviewFileIds = new Set(["visible-file"]);
    const loadingPreviewFileIds = new Set<string>();
    const loadedOriginalFileIds = new Set<string>();
    const loadingOriginalFileIds = new Set<string>();
    const setLatestScene = vi.fn();
    const readAssets = vi.fn(async () => [originalAsset]);
    const applyAssetsToScene = vi.fn(() => true);

    const actions = createVisibleImageRenditionLoadRendererActions({
      delayMs: 120,
      getProject: () => project,
      getSceneReader: () => ({
        getSceneElementsIncludingDeleted: () => activeScene.elements,
        getAppState: () => activeScene.appState,
        getFiles: () => activeScene.files,
      }),
      getDevicePixelRatio: () => 1,
      getLatestScene: () => activeScene,
      getTimerId: () => null,
      clearTimer: vi.fn(),
      setTimerId: vi.fn(),
      scheduleTimeout: vi.fn(),
      getLoadedPreviewFileIds: () => loadedPreviewFileIds,
      getLoadingPreviewFileIds: () => loadingPreviewFileIds,
      getLoadedOriginalFileIds: () => loadedOriginalFileIds,
      getLoadingOriginalFileIds: () => loadingOriginalFileIds,
      setLoadedPreviewFileIds: vi.fn(),
      setLoadingPreviewFileIds: vi.fn(),
      setLoadedOriginalFileIds: vi.fn(),
      setLoadingOriginalFileIds: vi.fn(),
      setLatestScene,
      readAssets,
      applyAssetsToScene,
    });

    await expect(actions.load(scene)).resolves.toEqual({
      status: "applied",
      assetCount: 1,
    });

    expect(setLatestScene).toHaveBeenCalledWith(activeScene);
    expect(readAssets).toHaveBeenCalledWith({
      project,
      rendition: "original",
      fileIds: ["visible-file"],
    });
    expect(applyAssetsToScene).toHaveBeenCalledWith(project, [originalAsset]);
    expect(Array.from(loadedPreviewFileIds)).toEqual(["visible-file"]);
    expect(Array.from(loadedOriginalFileIds)).toEqual(["visible-file"]);
    expect(Array.from(loadingPreviewFileIds)).toEqual([]);
    expect(Array.from(loadingOriginalFileIds)).toEqual([]);
  });

  it("creates scheduler and clear timer handlers for visible rendition loading", () => {
    const queuedScene = {
      elements: [] as any,
      appState: baseAppState,
      files: {} as any,
    };
    const latestScene = {
      elements: [
        {
          id: "visible",
          type: "image",
          isDeleted: false,
          fileId: "visible-file",
          x: 120,
          y: 120,
          width: 720,
          height: 480,
        },
      ] as any,
      appState: baseAppState,
      files: {
        "visible-file": { id: "visible-file" },
      } as any,
    };
    const project = {
      safeMode: false,
      imageRecords: {
        "visible-file": {
          fileId: "visible-file",
          assetPath: "assets/visible.png",
          sourceType: "imported",
          width: 2400,
          height: 1600,
          createdAt: "2026-07-04T00:00:00.000Z",
          mimeType: "image/png",
        },
      },
    } as unknown as DesktopProjectBundle;
    const clearedTimerIds: number[] = [];
    const scheduledCallbacks: Array<() => void> = [];
    let timerId: number | null = 41;
    const setLatestScene = vi.fn();
    const readAssets = vi.fn(async () => []);
    const applyAssetsToScene = vi.fn(() => true);
    const actions = createVisibleImageRenditionLoadRendererActions({
      delayMs: 180,
      getProject: () => project,
      getSceneReader: () => ({
        getSceneElementsIncludingDeleted: () => latestScene.elements,
        getAppState: () => latestScene.appState,
        getFiles: () => latestScene.files,
      }),
      getDevicePixelRatio: () => 1,
      getLoadedPreviewFileIds: () => new Set(["visible-file"]),
      getLoadingPreviewFileIds: () => new Set<string>(),
      getLoadedOriginalFileIds: () => new Set(["visible-file"]),
      getLoadingOriginalFileIds: () => new Set<string>(),
      setLoadedPreviewFileIds: vi.fn(),
      setLoadingPreviewFileIds: vi.fn(),
      setLoadedOriginalFileIds: vi.fn(),
      setLoadingOriginalFileIds: vi.fn(),
      getLatestScene: () => latestScene,
      getTimerId: () => timerId,
      clearTimer: (id) => {
        clearedTimerIds.push(id);
      },
      setTimerId: (id) => {
        timerId = id;
      },
      scheduleTimeout: (callback, delayMs) => {
        scheduledCallbacks.push(callback);
        expect(delayMs).toBe(180);
        return 42;
      },
      setLatestScene,
      readAssets,
      applyAssetsToScene,
    });

    expect(actions.schedule(queuedScene)).toEqual({
      status: "scheduled",
      timerId: 42,
    });
    expect(clearedTimerIds).toEqual([41]);
    expect(timerId).toBe(42);
    expect(scheduledCallbacks).toHaveLength(1);

    scheduledCallbacks[0]?.();

    expect(timerId).toBeNull();
    expect(setLatestScene).toHaveBeenCalledWith(latestScene);

    timerId = 43;
    expect(actions.clearTimer()).toEqual({
      status: "cleared",
      timerId: 43,
    });
    expect(clearedTimerIds).toEqual([41, 43]);
    expect(timerId).toBeNull();
  });

  it("resets visible rendition timers and tracking sets together", () => {
    let timerId: number | null = 51;
    const clearedTimerIds: number[] = [];
    let loadedPreviewFileIds = new Set(["preview-1"]);
    let loadingPreviewFileIds = new Set(["preview-loading"]);
    let loadedOriginalFileIds = new Set(["original-1"]);
    let loadingOriginalFileIds = new Set(["original-loading"]);
    const setLoadedPreviewFileIds = vi.fn((fileIds: Set<string>) => {
      loadedPreviewFileIds = fileIds;
    });
    const setLoadingPreviewFileIds = vi.fn((fileIds: Set<string>) => {
      loadingPreviewFileIds = fileIds;
    });
    const setLoadedOriginalFileIds = vi.fn((fileIds: Set<string>) => {
      loadedOriginalFileIds = fileIds;
    });
    const setLoadingOriginalFileIds = vi.fn((fileIds: Set<string>) => {
      loadingOriginalFileIds = fileIds;
    });

    const actions = createVisibleImageRenditionLoadRendererActions({
      delayMs: 180,
      getProject: () => null,
      getSceneReader: () => null,
      getDevicePixelRatio: () => 1,
      getLoadedPreviewFileIds: () => loadedPreviewFileIds,
      getLoadingPreviewFileIds: () => loadingPreviewFileIds,
      getLoadedOriginalFileIds: () => loadedOriginalFileIds,
      getLoadingOriginalFileIds: () => loadingOriginalFileIds,
      setLoadedPreviewFileIds,
      setLoadingPreviewFileIds,
      setLoadedOriginalFileIds,
      setLoadingOriginalFileIds,
      getLatestScene: () => null,
      getTimerId: () => timerId,
      clearTimer: (id) => {
        clearedTimerIds.push(id);
      },
      setTimerId: (id) => {
        timerId = id;
      },
      scheduleTimeout: vi.fn(),
      setLatestScene: vi.fn(),
      readAssets: vi.fn(async () => []),
      applyAssetsToScene: vi.fn(() => true),
    });

    const sets = actions.resetTracking();

    expect(clearedTimerIds).toEqual([51]);
    expect(timerId).toBeNull();
    expect(sets.loadedPreviewFileIds.size).toBe(0);
    expect(sets.loadingPreviewFileIds.size).toBe(0);
    expect(sets.loadedOriginalFileIds.size).toBe(0);
    expect(sets.loadingOriginalFileIds.size).toBe(0);
    expect(loadedPreviewFileIds).toBe(sets.loadedPreviewFileIds);
    expect(loadingPreviewFileIds).toBe(sets.loadingPreviewFileIds);
    expect(loadedOriginalFileIds).toBe(sets.loadedOriginalFileIds);
    expect(loadingOriginalFileIds).toBe(sets.loadingOriginalFileIds);
    expect(setLoadedPreviewFileIds).toHaveBeenCalledWith(
      sets.loadedPreviewFileIds,
    );
    expect(setLoadingPreviewFileIds).toHaveBeenCalledWith(
      sets.loadingPreviewFileIds,
    );
    expect(setLoadedOriginalFileIds).toHaveBeenCalledWith(
      sets.loadedOriginalFileIds,
    );
    expect(setLoadingOriginalFileIds).toHaveBeenCalledWith(
      sets.loadingOriginalFileIds,
    );
  });

  it("marks loaded rendition assets through the visible rendition renderer actions", () => {
    let loadedPreviewFileIds = new Set(["existing-preview"]);
    let loadedOriginalFileIds = new Set(["existing-original"]);
    const actions = createVisibleImageRenditionLoadRendererActions({
      delayMs: 180,
      getProject: () => null,
      getSceneReader: () => null,
      getDevicePixelRatio: () => 1,
      getLoadedPreviewFileIds: () => loadedPreviewFileIds,
      getLoadingPreviewFileIds: () => new Set(),
      getLoadedOriginalFileIds: () => loadedOriginalFileIds,
      getLoadingOriginalFileIds: () => new Set(),
      setLoadedPreviewFileIds: (fileIds) => {
        loadedPreviewFileIds = fileIds;
      },
      setLoadingPreviewFileIds: vi.fn(),
      setLoadedOriginalFileIds: (fileIds) => {
        loadedOriginalFileIds = fileIds;
      },
      setLoadingOriginalFileIds: vi.fn(),
      getLatestScene: () => null,
      getTimerId: () => null,
      clearTimer: vi.fn(),
      setTimerId: vi.fn(),
      scheduleTimeout: vi.fn(),
      setLatestScene: vi.fn(),
      readAssets: vi.fn(async () => []),
      applyAssetsToScene: vi.fn(() => true),
    });

    const state = actions.markLoaded([
      {
        fileId: "original-file",
        rendition: "original",
        mimeType: "image/png",
        dataBase64: "original",
        width: 1024,
        height: 1024,
        createdAt: "2026-07-04T00:00:00.000Z",
      },
      {
        fileId: "preview-file",
        rendition: "preview",
        mimeType: "image/png",
        dataBase64: "preview",
        width: 512,
        height: 512,
        createdAt: "2026-07-04T00:00:00.000Z",
      },
    ]);

    expect(state).toEqual({
      previewFileIds: ["original-file", "preview-file"],
      originalFileIds: ["original-file"],
    });
    expect(Array.from(loadedPreviewFileIds)).toEqual([
      "existing-preview",
      "original-file",
      "preview-file",
    ]);
    expect(Array.from(loadedOriginalFileIds)).toEqual([
      "existing-original",
      "original-file",
    ]);
  });

  it("skips visible rendition loading when the project is missing, scene reader is missing, or safe mode is active", async () => {
    const scene = {
      elements: [] as any,
      appState: baseAppState,
      files: {} as any,
    };
    const readAssets = vi.fn();
    const applyAssetsToScene = vi.fn();
    const baseInput = {
      delayMs: 120,
      getProject: () => null,
      getSceneReader: () => null,
      getDevicePixelRatio: () => 1,
      getLatestScene: () => scene,
      getTimerId: () => null,
      clearTimer: vi.fn(),
      setTimerId: vi.fn(),
      scheduleTimeout: vi.fn(),
      getLoadedPreviewFileIds: () => new Set<string>(),
      getLoadingPreviewFileIds: () => new Set<string>(),
      getLoadedOriginalFileIds: () => new Set<string>(),
      getLoadingOriginalFileIds: () => new Set<string>(),
      setLoadedPreviewFileIds: vi.fn(),
      setLoadingPreviewFileIds: vi.fn(),
      setLoadedOriginalFileIds: vi.fn(),
      setLoadingOriginalFileIds: vi.fn(),
      setLatestScene: vi.fn(),
      readAssets,
      applyAssetsToScene,
    };
    const actions = createVisibleImageRenditionLoadRendererActions(baseInput);

    await expect(actions.load(scene)).resolves.toEqual({
      status: "skipped",
      reason: "missing-project",
    });

    expect(readAssets).not.toHaveBeenCalled();
    expect(applyAssetsToScene).not.toHaveBeenCalled();

    const missingReaderActions = createVisibleImageRenditionLoadRendererActions({
      ...baseInput,
      getProject: () => ({ safeMode: false } as DesktopProjectBundle),
    });

    await expect(missingReaderActions.load(scene)).resolves.toEqual({
      status: "skipped",
      reason: "missing-scene-reader",
    });

    const safeModeActions = createVisibleImageRenditionLoadRendererActions({
      ...baseInput,
      getProject: () =>
        ({ safeMode: true, imageRecords: {} } as DesktopProjectBundle),
      getSceneReader: () => ({}),
    });

    await expect(safeModeActions.load(scene)).resolves.toEqual({
      status: "skipped",
      reason: "safe-mode",
    });
  });
});
