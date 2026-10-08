import type {
  DesktopProjectBundle,
  ProjectAssetPayload,
} from "../shared/desktopBridgeTypes";
import type {
  CreateVisibleImageRenditionLoadRendererActionsInput,
  ImageRenditionSceneSnapshot,
  VisibleImageRenditionLoadRendererResult,
} from "./imageRenditionLoadPlan";
import {
  imageRenditionRevision,
  createImageRenditionCropGuard,
  planImageRenditions,
  takeImageRenditionBatch,
} from "./imageRenditionPolicy";

export const createImageRenditionRuntime = () => ({
  epoch: 0,
  runningEpoch: 0,
  running: null as Promise<VisibleImageRenditionLoadRendererResult> | null,
  // A missing/unsupported rendition must not trigger a read/decode loop.
  unavailable: new Map<string, { key: string; retryAfter: number }>(),
});
export type ImageRenditionRuntime = ReturnType<
  typeof createImageRenditionRuntime
>;
type Project = Pick<DesktopProjectBundle, "imageRecords"> & {
  projectPath?: string;
  safeMode?: boolean;
};

export const loadAdaptiveImageRenditions = <TProject extends Project>(
  options: CreateVisibleImageRenditionLoadRendererActionsInput<TProject>,
  scene: ImageRenditionSceneSnapshot,
  runtime: ImageRenditionRuntime,
  markLoaded: (assets: readonly ProjectAssetPayload[]) => unknown,
): Promise<VisibleImageRenditionLoadRendererResult> => {
  if (runtime.running) {
    return runtime.runningEpoch === runtime.epoch
      ? runtime.running
      : runtime.running.then(() =>
          loadAdaptiveImageRenditions(options, scene, runtime, markLoaded),
        );
  }
  runtime.runningEpoch = runtime.epoch;
  const epoch = runtime.epoch;
  const run = async (): Promise<VisibleImageRenditionLoadRendererResult> => {
    const project = options.getProject();
    const reader = options.getSceneReader();
    if (!project) {
      return { status: "skipped", reason: "missing-project" };
    }
    if (!reader) {
      return { status: "skipped", reason: "missing-scene-reader" };
    }
    if (project.safeMode) {
      return { status: "skipped", reason: "safe-mode" };
    }
    const isCurrent = () =>
      runtime.epoch === epoch &&
      !!options.getProject() &&
      options.getSceneReader() === reader &&
      options.getProject()?.projectPath === project.projectPath &&
      !options.getProject()?.safeMode;
    const snapshot = () => ({
      elements:
        options.getSceneReader()?.getSceneElementsIncludingDeleted?.() ??
        options.getLatestScene()?.elements ??
        scene.elements,
      appState: {
        ...scene.appState,
        ...(options.getSceneReader()?.getAppState?.() ??
          options.getLatestScene()?.appState ??
          {}),
      },
      files:
        options.getSceneReader()?.getFiles?.() ??
        options.getLatestScene()?.files ??
        scene.files,
    });
    const plan = () =>
      planImageRenditions({
        ...snapshot(),
        imageRecords: options.getProject()!.imageRecords,
        loadedPreviewFileIds: options.getLoadedPreviewFileIds(),
        loadedOriginalFileIds: options.getLoadedOriginalFileIds(),
        devicePixelRatio: options.getDevicePixelRatio(),
      });
    let count = 0;
    let discarded = false;
    options.setLatestScene(snapshot());
    try {
      while (isCurrent()) {
        const currentProject = options.getProject()!;
        const planned = plan();
        for (const [id, blocked] of runtime.unavailable) {
          const record = currentProject.imageRecords[id];
          if (
            !record ||
            blocked.key !==
              `${imageRenditionRevision(record)}:${planned.desired.get(id)}` ||
            blocked.retryAfter <= Date.now()
          ) {
            runtime.unavailable.delete(id);
          }
        }
        const requests = takeImageRenditionBatch(
          planned.requests.filter(
            (request) => !runtime.unavailable.has(request.fileId),
          ),
          currentProject.imageRecords,
        );
        if (!requests.length) {
          break;
        }
        const revisions = new Map(
          requests.map((request) => [
            request.fileId,
            imageRenditionRevision(currentProject.imageRecords[request.fileId]),
          ]),
        );
        const loadingPreview = options.getLoadingPreviewFileIds();
        const loadingOriginal = options.getLoadingOriginalFileIds();
        for (const request of requests) {
          (request.rendition === "original"
            ? loadingOriginal
            : loadingPreview
          ).add(request.fileId);
        }
        try {
          let assets: readonly ProjectAssetPayload[] = await options.readAssets(
            {
              project: currentProject,
              rendition: requests[0].rendition,
              fileIds: requests.map((request) => request.fileId),
            },
          );
          if (!isCurrent()) {
            return { status: "skipped", reason: "stale-scene" };
          }
          if (options.prepareAssets) {
            assets = await options.prepareAssets(assets);
          }
          if (!isCurrent()) {
            return { status: "skipped", reason: "stale-scene" };
          }
          const latest = plan();
          const records = options.getProject()!.imageRecords;
          const compatibleWithCrops = createImageRenditionCropGuard(
            snapshot().elements,
          );
          const accepted = assets.filter((asset) => {
            const request = requests.find(
              (item) => item.fileId === asset.fileId,
            );
            return (
              request &&
              records[asset.fileId] &&
              revisions.get(asset.fileId) ===
                imageRenditionRevision(records[asset.fileId]) &&
              latest.desired.get(asset.fileId) === request.rendition &&
              compatibleWithCrops(asset)
            );
          });
          discarded ||= accepted.length < assets.length;
          for (const request of requests) {
            const payload = accepted.find(
              (asset) => asset.fileId === request.fileId,
            );
            if (
              latest.desired.get(request.fileId) === request.rendition &&
              (!payload || payload.rendition !== request.rendition)
            ) {
              runtime.unavailable.set(request.fileId, {
                key: `${revisions.get(request.fileId)}:${request.rendition}`,
                retryAfter: payload ? Infinity : Date.now() + 10_000,
              });
            }
          }
          if (accepted.length) {
            if (!options.applyAssetsToScene(currentProject, accepted)) {
              return { status: "skipped", reason: "stale-scene" };
            }
            markLoaded(accepted);
            count += accepted.length;
          }
        } finally {
          for (const request of requests) {
            loadingPreview.delete(request.fileId);
            loadingOriginal.delete(request.fileId);
          }
        }
        if (isCurrent()) {
          await (options.yieldToRenderer?.() ??
            new Promise<void>((resolve) => setTimeout(resolve, 16)));
        }
      }
      return count
        ? { status: "applied", assetCount: count }
        : {
            status: "skipped",
            reason:
              discarded || !isCurrent() ? "stale-scene" : "no-rendition-needed",
          };
    } catch {
      return { status: "failed" };
    }
  };
  const pending = run().finally(() => {
    if (runtime.running === pending) {
      runtime.running = null;
    }
  });
  runtime.running = pending;
  return pending;
};
