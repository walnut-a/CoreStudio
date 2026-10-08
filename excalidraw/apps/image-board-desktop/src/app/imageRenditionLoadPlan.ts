import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";

import type {
  DesktopProjectBundle,
  ProjectAssetPayload,
} from "../shared/desktopBridgeTypes";
import type {
  ImageAssetRequestRendition,
  ImageRecordMap,
} from "../shared/projectTypes";
import {
  getImageRenditionRequestsNearViewport,
  type ImageRenditionRequest,
} from "./imageRenditions";
import {
  createImageRenditionRuntime,
  loadAdaptiveImageRenditions,
  type ImageRenditionRuntime,
} from "./imageRenditionScheduler";
import {
  planImageRenditions,
  takeImageRenditionBatch,
} from "./imageRenditionPolicy";
import { clearTimerRefAction } from "./timerRefController";

export interface ImageRenditionFileIdState {
  previewFileIds: string[];
  originalFileIds: string[];
}

export interface ImageRenditionLoadPlan {
  requests: ImageRenditionRequest[];
  loadingState: ImageRenditionFileIdState;
}

export type ImageRenditionLoadScheduleResult =
  | {
      status: "skipped";
      reason: "missing-scene";
    }
  | {
      status: "scheduled";
      timerId: number;
    };

export interface MutableImageRenditionFileIdSets {
  previewFileIds: Set<string>;
  originalFileIds: Set<string>;
}

export interface ImageRenditionTrackingSets {
  loadedPreviewFileIds: Set<string>;
  loadingPreviewFileIds: Set<string>;
  loadedOriginalFileIds: Set<string>;
  loadingOriginalFileIds: Set<string>;
}

export interface ApplyEmptyImageRenditionTrackingSetsInput {
  setLoadedPreviewFileIds: (fileIds: Set<string>) => void;
  setLoadingPreviewFileIds: (fileIds: Set<string>) => void;
  setLoadedOriginalFileIds: (fileIds: Set<string>) => void;
  setLoadingOriginalFileIds: (fileIds: Set<string>) => void;
}

export interface ImageRenditionSceneSnapshot {
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
}

export interface ImageRenditionSceneSnapshotReader {
  getSceneElementsIncludingDeleted?: () => readonly ExcalidrawElement[];
  getAppState?: () => Partial<AppState>;
  getFiles?: () => BinaryFiles;
}

export interface ImageRenditionViewportState {
  scrollX: number;
  scrollY: number;
  zoom: AppState["zoom"];
}

export interface ScheduleImageRenditionLoadActionInput<TScene> {
  scene: TScene | null;
  delayMs: number;
  getLatestScene: () => TScene | null;
  clearExistingTimer: () => void;
  setTimerId: (timerId: number | null) => void;
  scheduleTimeout: (callback: () => void, delayMs: number) => number;
  loadScene: (scene: TScene) => void;
}

export const scheduleImageRenditionLoadAction = <TScene>({
  scene,
  delayMs,
  getLatestScene,
  clearExistingTimer,
  setTimerId,
  scheduleTimeout,
  loadScene,
}: ScheduleImageRenditionLoadActionInput<TScene>): ImageRenditionLoadScheduleResult => {
  if (!scene) {
    return {
      status: "skipped",
      reason: "missing-scene",
    };
  }

  clearExistingTimer();
  const timerId = scheduleTimeout(() => {
    setTimerId(null);
    loadScene(getLatestScene() ?? scene);
  }, delayMs);
  setTimerId(timerId);

  return {
    status: "scheduled",
    timerId,
  };
};

export const groupImageRenditionRequests = (
  requests: readonly ImageRenditionRequest[],
) =>
  requests.reduce((groups, request) => {
    const fileIds = groups.get(request.rendition) ?? [];
    fileIds.push(request.fileId);
    groups.set(request.rendition, fileIds);
    return groups;
  }, new Map<ImageAssetRequestRendition, string[]>());

export const buildImageRenditionLoadingState = (
  requests: readonly ImageRenditionRequest[],
): ImageRenditionFileIdState =>
  requests.reduce<ImageRenditionFileIdState>(
    (state, request) => {
      if (request.rendition === "original") {
        state.originalFileIds.push(request.fileId);
      } else if (request.rendition === "preview") {
        state.previewFileIds.push(request.fileId);
      }
      return state;
    },
    { previewFileIds: [], originalFileIds: [] },
  );

export const buildImageRenditionLoadedState = (
  assets: readonly ProjectAssetPayload[],
): ImageRenditionFileIdState =>
  assets.reduce<ImageRenditionFileIdState>(
    (state, asset) => {
      if (asset.rendition === "original") {
        state.originalFileIds.push(asset.fileId);
        state.previewFileIds.push(asset.fileId);
      } else if (asset.rendition === "preview") {
        state.previewFileIds.push(asset.fileId);
      }
      return state;
    },
    { previewFileIds: [], originalFileIds: [] },
  );

export const addImageRenditionFileIdState = (
  state: ImageRenditionFileIdState,
  sets: MutableImageRenditionFileIdSets,
) => {
  state.previewFileIds.forEach((fileId) => sets.previewFileIds.add(fileId));
  state.originalFileIds.forEach((fileId) => sets.originalFileIds.add(fileId));
};

export interface ApplyLoadedImageRenditionAssetsStateInput {
  assets: readonly ProjectAssetPayload[];
  sets: MutableImageRenditionFileIdSets;
}

export const applyLoadedImageRenditionAssetsState = ({
  assets,
  sets,
}: ApplyLoadedImageRenditionAssetsStateInput): ImageRenditionFileIdState => {
  for (const asset of assets) {
    sets.previewFileIds.delete(asset.fileId);
    sets.originalFileIds.delete(asset.fileId);
  }
  const state = buildImageRenditionLoadedState(assets);
  addImageRenditionFileIdState(state, sets);
  return state;
};

export interface ImageRenditionLoadingStateActionInput {
  loadingState: ImageRenditionFileIdState;
  sets: MutableImageRenditionFileIdSets;
}

export const applyImageRenditionLoadingState = ({
  loadingState,
  sets,
}: ImageRenditionLoadingStateActionInput) => {
  addImageRenditionFileIdState(loadingState, sets);
};

export const removeImageRenditionFileIdState = (
  state: ImageRenditionFileIdState,
  sets: MutableImageRenditionFileIdSets,
) => {
  state.previewFileIds.forEach((fileId) => sets.previewFileIds.delete(fileId));
  state.originalFileIds.forEach((fileId) =>
    sets.originalFileIds.delete(fileId),
  );
};

export const clearImageRenditionLoadingState = ({
  loadingState,
  sets,
}: ImageRenditionLoadingStateActionInput) => {
  removeImageRenditionFileIdState(loadingState, sets);
};

export const buildEmptyImageRenditionTrackingSets =
  (): ImageRenditionTrackingSets => ({
    loadedPreviewFileIds: new Set(),
    loadingPreviewFileIds: new Set(),
    loadedOriginalFileIds: new Set(),
    loadingOriginalFileIds: new Set(),
  });

export const applyEmptyImageRenditionTrackingSets = ({
  setLoadedPreviewFileIds,
  setLoadingPreviewFileIds,
  setLoadedOriginalFileIds,
  setLoadingOriginalFileIds,
}: ApplyEmptyImageRenditionTrackingSetsInput): ImageRenditionTrackingSets => {
  const sets = buildEmptyImageRenditionTrackingSets();
  setLoadedPreviewFileIds(sets.loadedPreviewFileIds);
  setLoadingPreviewFileIds(sets.loadingPreviewFileIds);
  setLoadedOriginalFileIds(sets.loadedOriginalFileIds);
  setLoadingOriginalFileIds(sets.loadingOriginalFileIds);
  return sets;
};

export const buildActiveImageRenditionSceneSnapshot = (
  scene: ImageRenditionSceneSnapshot,
  reader: ImageRenditionSceneSnapshotReader,
): ImageRenditionSceneSnapshot => ({
  elements: reader.getSceneElementsIncludingDeleted?.() ?? scene.elements,
  appState: {
    ...scene.appState,
    ...(reader.getAppState?.() ?? {}),
  } as AppState,
  files: reader.getFiles?.() ?? scene.files,
});

export const buildViewportImageRenditionSceneSnapshot = (
  scene: ImageRenditionSceneSnapshot,
  reader: ImageRenditionSceneSnapshotReader,
  viewport: ImageRenditionViewportState,
): ImageRenditionSceneSnapshot => {
  const activeScene = buildActiveImageRenditionSceneSnapshot(scene, reader);
  return {
    ...activeScene,
    appState: {
      ...activeScene.appState,
      ...viewport,
    } as AppState,
  };
};

export type ReadImageRenditionAssets = (
  rendition: ImageAssetRequestRendition,
  fileIds: string[],
) => Promise<ProjectAssetPayload[]>;

export const readImageRenditionAssetsForRequests = async (
  requests: readonly ImageRenditionRequest[],
  readAssets: ReadImageRenditionAssets,
) => {
  const fileIdsByRendition = groupImageRenditionRequests(requests);
  if (!fileIdsByRendition.size) {
    return [];
  }

  const assetsByRendition = await Promise.all(
    Array.from(fileIdsByRendition.entries()).map(([rendition, fileIds]) =>
      readAssets(rendition, fileIds),
    ),
  );

  return assetsByRendition.flat();
};

export const readInitialImageRenditionAssets = async ({
  elements = [],
  appState,
  imageRecords,
  devicePixelRatio,
  readAssets,
}: {
  elements?: readonly ExcalidrawElement[];
  appState?: Partial<AppState> | null;
  imageRecords: ImageRecordMap;
  devicePixelRatio: number;
  readAssets: ReadImageRenditionAssets;
}) => {
  if (!elements.length || !appState) {
    return [];
  }

  const requests = takeImageRenditionBatch(
    planImageRenditions({
      elements,
      appState: appState as AppState,
      imageRecords,
      devicePixelRatio,
      loadedPreviewFileIds: new Set(),
      loadedOriginalFileIds: new Set(),
    }).requests,
    imageRecords,
  );
  if (!requests.length) {
    return [];
  }

  try {
    return await readImageRenditionAssetsForRequests(requests, readAssets);
  } catch {
    return [];
  }
};

export interface ReadProjectImageRenditionAssetsInput {
  projectPath: string;
  fileIds: string[];
  rendition: ImageAssetRequestRendition;
}

export const readInitialProjectImageRenditionAssets = async ({
  project,
  scene,
  devicePixelRatio,
  readProjectAssets,
}: {
  project: Pick<DesktopProjectBundle, "projectPath" | "imageRecords">;
  scene: {
    elements?: readonly ExcalidrawElement[];
    appState?: Partial<AppState> | null;
  };
  devicePixelRatio: number;
  readProjectAssets: (
    input: ReadProjectImageRenditionAssetsInput,
  ) => Promise<ProjectAssetPayload[]>;
}) =>
  readInitialImageRenditionAssets({
    elements: scene.elements,
    appState: scene.appState,
    imageRecords: project.imageRecords,
    devicePixelRatio,
    readAssets: (rendition, fileIds) =>
      readProjectAssets({
        projectPath: project.projectPath,
        fileIds,
        rendition,
      }),
  });

export const buildVisibleImageRenditionLoadPlan = ({
  elements,
  appState,
  imageRecords,
  loadedPreviewFileIds,
  loadingPreviewFileIds,
  loadedOriginalFileIds,
  loadingOriginalFileIds,
  devicePixelRatio,
}: {
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  imageRecords: ImageRecordMap;
  loadedPreviewFileIds: ReadonlySet<string>;
  loadingPreviewFileIds: ReadonlySet<string>;
  loadedOriginalFileIds: ReadonlySet<string>;
  loadingOriginalFileIds: ReadonlySet<string>;
  devicePixelRatio: number;
}): ImageRenditionLoadPlan | null => {
  const requests = getImageRenditionRequestsNearViewport({
    elements,
    appState,
    imageRecords,
    loadedPreviewFileIds,
    loadingPreviewFileIds,
    loadedOriginalFileIds,
    loadingOriginalFileIds,
    devicePixelRatio,
  });
  if (!requests.length) {
    return null;
  }

  return {
    requests,
    loadingState: buildImageRenditionLoadingState(requests),
  };
};

type VisibleImageRenditionLoadProject = Pick<
  DesktopProjectBundle,
  "imageRecords"
> & {
  safeMode?: boolean;
};

export type VisibleImageRenditionLoadRendererResult =
  | {
      status: "skipped";
      reason:
        | "missing-project"
        | "missing-scene-reader"
        | "safe-mode"
        | "no-rendition-needed"
        | "stale-scene";
    }
  | {
      status: "applied";
      assetCount: number;
    }
  | {
      status: "failed";
    };

export interface CreateVisibleImageRenditionLoadRendererActionsInput<
  TProject extends VisibleImageRenditionLoadProject,
> {
  runtime?: ImageRenditionRuntime;
  yieldToRenderer?: () => Promise<void>;
  prepareAssets?: (
    assets: readonly ProjectAssetPayload[],
  ) => Promise<readonly ProjectAssetPayload[]>;
  delayMs: number;
  getProject: () => TProject | null | undefined;
  getSceneReader: () => ImageRenditionSceneSnapshotReader | null | undefined;
  getDevicePixelRatio: () => number;
  getLatestScene: () => ImageRenditionSceneSnapshot | null;
  getTimerId: () => number | null;
  clearTimer: (timerId: number) => void;
  setTimerId: (timerId: number | null) => void;
  scheduleTimeout: (callback: () => void, delayMs: number) => number;
  getLoadedPreviewFileIds: () => Set<string>;
  getLoadingPreviewFileIds: () => Set<string>;
  getLoadedOriginalFileIds: () => Set<string>;
  getLoadingOriginalFileIds: () => Set<string>;
  setLoadedPreviewFileIds: (fileIds: Set<string>) => void;
  setLoadingPreviewFileIds: (fileIds: Set<string>) => void;
  setLoadedOriginalFileIds: (fileIds: Set<string>) => void;
  setLoadingOriginalFileIds: (fileIds: Set<string>) => void;
  setLatestScene: (scene: ImageRenditionSceneSnapshot) => void;
  readAssets: (input: {
    project: TProject;
    rendition: ImageAssetRequestRendition;
    fileIds: string[];
  }) => Promise<ProjectAssetPayload[]>;
  applyAssetsToScene: (
    project: TProject,
    assets: readonly ProjectAssetPayload[],
  ) => boolean;
}

export interface VisibleImageRenditionLoadRendererActions {
  load: (
    scene: ImageRenditionSceneSnapshot,
  ) => Promise<VisibleImageRenditionLoadRendererResult>;
  schedule: (
    scene: ImageRenditionSceneSnapshot | null,
  ) => ImageRenditionLoadScheduleResult;
  markLoaded: (
    assets: readonly ProjectAssetPayload[],
  ) => ImageRenditionFileIdState;
  clearTimer: () => ReturnType<typeof clearTimerRefAction>;
  resetTracking: () => ImageRenditionTrackingSets;
}

export const createVisibleImageRenditionLoadRendererActions = <
  TProject extends VisibleImageRenditionLoadProject,
>(
  options: CreateVisibleImageRenditionLoadRendererActionsInput<TProject>,
): VisibleImageRenditionLoadRendererActions => {
  const {
    runtime = createImageRenditionRuntime(),
    delayMs,
    getLatestScene,
    getTimerId,
    clearTimer,
    setTimerId,
    scheduleTimeout,
    getLoadedPreviewFileIds,
    getLoadedOriginalFileIds,
    setLoadedPreviewFileIds,
    setLoadingPreviewFileIds,
    setLoadedOriginalFileIds,
    setLoadingOriginalFileIds,
  } = options;
  const markLoaded = (assets: readonly ProjectAssetPayload[]) =>
    applyLoadedImageRenditionAssetsState({
      assets,
      sets: {
        previewFileIds: getLoadedPreviewFileIds(),
        originalFileIds: getLoadedOriginalFileIds(),
      },
    });
  const load = (scene: ImageRenditionSceneSnapshot) =>
    loadAdaptiveImageRenditions(options, scene, runtime, markLoaded);

  const clearTimerRef = () =>
    clearTimerRefAction({
      getTimerId,
      clearTimer,
      setTimerId,
    });

  return {
    load,
    schedule: (scene) =>
      scheduleImageRenditionLoadAction({
        scene,
        delayMs,
        getLatestScene,
        clearExistingTimer: clearTimerRef,
        setTimerId,
        scheduleTimeout,
        loadScene: (activeScene) => {
          void load(activeScene);
        },
      }),
    markLoaded,
    clearTimer: () => {
      runtime.epoch++;
      return clearTimerRef();
    },
    resetTracking: () => {
      runtime.epoch++;
      runtime.unavailable.clear();
      clearTimerRef();
      return applyEmptyImageRenditionTrackingSets({
        setLoadedPreviewFileIds,
        setLoadingPreviewFileIds,
        setLoadedOriginalFileIds,
        setLoadingOriginalFileIds,
      });
    },
  };
};
