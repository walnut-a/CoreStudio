import { expect, it, vi } from "vitest";
import type { AppState } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/element/types";
import type {
  DesktopProjectBundle,
  ProjectAssetPayload,
} from "../shared/desktopBridgeTypes";
import {
  buildEmptyImageRenditionTrackingSets,
  createVisibleImageRenditionLoadRendererActions,
} from "./imageRenditionLoadPlan";

const fixture = () => {
  const elements = ["a", "b", "c", "d", "e"].map((id) => ({
    id,
    type: "image",
    fileId: id,
    isDeleted: false,
    x: 0,
    y: 0,
    width: 800,
    height: 600,
  })) as ExcalidrawElement[];
  const scene = {
    elements,
    appState: {
      width: 1000,
      height: 800,
      scrollX: 0,
      scrollY: 0,
      zoom: { value: 1 },
    } as AppState,
    files: {},
  };
  const project = {
    projectPath: "/fixture",
    imageRecords: Object.fromEntries(
      elements.map((e: any) => [
        e.fileId,
        {
          fileId: e.fileId,
          assetPath: `${e.fileId}.png`,
          width: 1600,
          height: 1200,
        },
      ]),
    ),
  } as DesktopProjectBundle;
  const sets = buildEmptyImageRenditionTrackingSets();
  const asset = (fileId: string, rendition = "original") =>
    ({
      fileId,
      rendition,
      width: 1600,
      height: 1200,
      mimeType: "image/png",
      dataBase64: "test",
    } as ProjectAssetPayload);
  const readAssets = vi.fn(
    async ({ fileIds, rendition }: { fileIds: string[]; rendition: string }) =>
      fileIds.map((id) => asset(id, rendition)),
  );
  const prepareAssets = vi.fn(
    async (assets: readonly ProjectAssetPayload[]) => assets,
  );
  const applyAssetsToScene = vi.fn(() => true);
  const reader = { getAppState: () => scene.appState };
  const readerRef = { current: reader as typeof reader | null };
  const actions = createVisibleImageRenditionLoadRendererActions({
    delayMs: 220,
    getProject: () => project,
    getSceneReader: () => readerRef.current,
    getDevicePixelRatio: () => 1,
    getLatestScene: () => scene,
    getTimerId: () => null,
    clearTimer: vi.fn(),
    setTimerId: vi.fn(),
    scheduleTimeout: vi.fn(),
    getLoadedPreviewFileIds: () => sets.loadedPreviewFileIds,
    getLoadedOriginalFileIds: () => sets.loadedOriginalFileIds,
    getLoadingPreviewFileIds: () => sets.loadingPreviewFileIds,
    getLoadingOriginalFileIds: () => sets.loadingOriginalFileIds,
    setLoadedPreviewFileIds: (v) => (sets.loadedPreviewFileIds = v),
    setLoadedOriginalFileIds: (v) => (sets.loadedOriginalFileIds = v),
    setLoadingPreviewFileIds: (v) => (sets.loadingPreviewFileIds = v),
    setLoadingOriginalFileIds: (v) => (sets.loadingOriginalFileIds = v),
    setLatestScene: vi.fn(),
    readAssets,
    prepareAssets,
    applyAssetsToScene,
    yieldToRenderer: async () => {},
  });
  return {
    actions,
    readerRef,
    scene,
    sets,
    project,
    asset,
    readAssets,
    prepareAssets,
    applyAssetsToScene,
  };
};

it("limits reads to two files and waits for their decoding before reading the next batch", async () => {
  const f = fixture();
  let finishDecode!: () => void;
  f.prepareAssets.mockImplementationOnce(
    () =>
      new Promise<readonly ProjectAssetPayload[]>(
        (resolve) =>
          (finishDecode = () => resolve([f.asset("a"), f.asset("b")])),
      ),
  );
  const loading = f.actions.load(f.scene);
  await vi.waitFor(() => expect(f.prepareAssets).toHaveBeenCalledOnce());
  expect(f.readAssets).toHaveBeenCalledTimes(1);
  expect(f.readAssets.mock.calls[0][0].fileIds).toHaveLength(2);
  expect(f.applyAssetsToScene).not.toHaveBeenCalled();
  finishDecode();
  await expect(loading).resolves.toEqual({ status: "applied", assetCount: 5 });
  expect(f.readAssets).toHaveBeenCalledTimes(3);
});

it("discards an original that arrives after zooming back out, then can upgrade again", async () => {
  const f = fixture();
  let finish!: (assets: ProjectAssetPayload[]) => void;
  f.readAssets.mockImplementationOnce(
    () => new Promise((resolve) => (finish = resolve)),
  );
  const loading = f.actions.load(f.scene);
  await vi.waitFor(() => expect(f.readAssets).toHaveBeenCalledOnce());
  f.scene.appState.zoom = { value: 0.05 } as AppState["zoom"];
  finish([f.asset("a"), f.asset("b")]);
  await loading;
  expect(f.applyAssetsToScene).not.toHaveBeenCalled();
  f.scene.appState.zoom = { value: 1 } as AppState["zoom"];
  await f.actions.load(f.scene);
  expect(f.sets.loadedOriginalFileIds.size).toBe(5);
});

it("does not apply an obsolete asset revision or a result from a reset project", async () => {
  for (const reset of [false, true]) {
    const f = fixture();
    let finish!: (assets: ProjectAssetPayload[]) => void;
    f.readAssets.mockImplementationOnce(
      () => new Promise((resolve) => (finish = resolve)),
    );
    const loading = f.actions.load(f.scene);
    await vi.waitFor(() => expect(f.readAssets).toHaveBeenCalledOnce());
    if (reset) {
      f.actions.resetTracking();
    } else {
      f.project.imageRecords.a.assetPath = "replaced.png";
      f.scene.elements = [];
    }
    finish([f.asset("a")]);
    await loading;
    expect(f.applyAssetsToScene).not.toHaveBeenCalled();
    expect(f.sets.loadedOriginalFileIds.size).toBe(0);
  }
});

it("removes original and preview markers after a thumbnail replaces the displayed file", async () => {
  const f = fixture();
  f.actions.markLoaded([f.asset("a")]);
  f.scene.appState.zoom = { value: 0.05 } as AppState["zoom"];
  await f.actions.load(f.scene);
  expect(f.sets.loadedOriginalFileIds.has("a")).toBe(false);
  expect(f.sets.loadedPreviewFileIds.has("a")).toBe(false);
});

it("does not spin when a thumbnail request falls back to an original", async () => {
  const f = fixture();
  f.actions.markLoaded([f.asset("a")]);
  f.scene.appState.zoom = { value: 0.05 } as AppState["zoom"];
  f.readAssets.mockImplementation(async ({ fileIds }) =>
    fileIds.map((id) => f.asset(id)),
  );
  await f.actions.load(f.scene);
  await f.actions.load(f.scene);
  expect(f.readAssets).toHaveBeenCalledOnce();
});

it("resumes the current project after an obsolete in-flight batch finishes", async () => {
  const f = fixture();
  let finish!: (assets: ProjectAssetPayload[]) => void;
  f.readAssets.mockImplementationOnce(
    () => new Promise((resolve) => (finish = resolve)),
  );
  const oldLoad = f.actions.load(f.scene);
  await vi.waitFor(() => expect(f.readAssets).toHaveBeenCalledOnce());
  f.actions.resetTracking();
  const newLoad = f.actions.load(f.scene);
  finish([f.asset("a"), f.asset("b")]);
  await oldLoad;
  await expect(newLoad).resolves.toEqual({ status: "applied", assetCount: 5 });
  expect(f.sets.loadedOriginalFileIds.size).toBe(5);
});

it("rejects pending assets after the canvas reader is removed or replaced", async () => {
  for (const replace of [false, true]) {
    const f = fixture();
    let finish!: (assets: ProjectAssetPayload[]) => void;
    f.readAssets.mockImplementationOnce(
      () => new Promise((resolve) => (finish = resolve)),
    );
    const loading = f.actions.load(f.scene);
    await vi.waitFor(() => expect(f.readAssets).toHaveBeenCalledOnce());
    f.readerRef.current = replace
      ? {
          getAppState: () => ({
            ...f.scene.appState,
            zoom: { value: 0.05 } as AppState["zoom"],
          }),
        }
      : null;
    finish([f.asset("a"), f.asset("b")]);
    await loading;
    expect(f.applyAssetsToScene).not.toHaveBeenCalled();
  }
});

it("rejects assets when cropping begins during host predecode", async () => {
  const f = fixture();
  let finish!: (assets: readonly ProjectAssetPayload[]) => void;
  f.prepareAssets.mockImplementationOnce(
    () => new Promise((resolve) => (finish = resolve)),
  );
  const loading = f.actions.load(f.scene);
  await vi.waitFor(() => expect(f.prepareAssets).toHaveBeenCalledOnce());
  f.scene.appState.croppingElementId = "a";
  finish([f.asset("a"), f.asset("b")]);
  await loading;
  const applied = f.applyAssetsToScene.mock.calls.flatMap(
    (call) => (call as unknown as [unknown, ProjectAssetPayload[]])[1],
  );
  expect(applied.some((asset) => asset.fileId === "a")).toBe(false);
});
