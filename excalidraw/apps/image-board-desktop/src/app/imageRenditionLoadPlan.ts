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

  const requests = getImageRenditionRequestsNearViewport({
    elements,
    appState: appState as AppState,
    imageRecords,
    loadedPreviewFileIds: new Set(),
    loadingPreviewFileIds: new Set(),
    loadedOriginalFileIds: new Set(),
    loadingOriginalFileIds: new Set(),
    devicePixelRatio,
  });
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

export const runVisibleImageRenditionLoadRendererAction = async <
  TProject extends VisibleImageRenditionLoadProject,
>({
  scene,
  project,
  sceneReader,
  devicePixelRatio,
  loadedPreviewFileIds,
  loadingPreviewFileIds,
  loadedOriginalFileIds,
  loadingOriginalFileIds,
  setLatestScene,
  readAssets,
  applyAssetsToScene,
}: {
  scene: ImageRenditionSceneSnapshot;
  project: TProject | null | undefined;
  sceneReader: ImageRenditionSceneSnapshotReader | null | undefined;
  devicePixelRatio: number;
  loadedPreviewFileIds: Set<string>;
  loadingPreviewFileIds: Set<string>;
  loadedOriginalFileIds: Set<string>;
  loadingOriginalFileIds: Set<string>;
  setLatestScene: (scene: ImageRenditionSceneSnapshot) => void;
  readAssets: CreateVisibleImageRenditionLoadRendererActionsInput<TProject>["readAssets"];
  applyAssetsToScene: CreateVisibleImageRenditionLoadRendererActionsInput<TProject>["applyAssetsToScene"];
}): Promise<VisibleImageRenditionLoadRendererResult> => {
  if (!project) {
    return { status: "skipped", reason: "missing-project" };
  }
  if (!sceneReader) {
    return { status: "skipped", reason: "missing-scene-reader" };
  }
  if (project.safeMode) {
    return { status: "skipped", reason: "safe-mode" };
  }

  const activeScene = buildActiveImageRenditionSceneSnapshot(
    scene,
    sceneReader,
  );
  setLatestScene(activeScene);

  const loadPlan = buildVisibleImageRenditionLoadPlan({
    elements: activeScene.elements,
    appState: activeScene.appState,
    imageRecords: project.imageRecords,
    loadedPreviewFileIds,
    loadingPreviewFileIds,
    loadedOriginalFileIds,
    loadingOriginalFileIds,
    devicePixelRatio,
  });

  if (!loadPlan) {
    return { status: "skipped", reason: "no-rendition-needed" };
  }

  const { requests, loadingState } = loadPlan;
  const loadingSets = {
    previewFileIds: loadingPreviewFileIds,
    originalFileIds: loadingOriginalFileIds,
  };
  applyImageRenditionLoadingState({
    loadingState,
    sets: loadingSets,
  });

  try {
    const assets = await readImageRenditionAssetsForRequests(
      requests,
      (rendition, fileIds) => readAssets({ project, rendition, fileIds }),
    );
    if (!applyAssetsToScene(project, assets)) {
      return { status: "skipped", reason: "stale-scene" };
    }
    applyLoadedImageRenditionAssetsState({
      assets,
      sets: {
        previewFileIds: loadedPreviewFileIds,
        originalFileIds: loadedOriginalFileIds,
      },
    });
    return { status: "applied", assetCount: assets.length };
  } catch {
    return { status: "failed" };
  } finally {
    clearImageRenditionLoadingState({
      loadingState,
      sets: loadingSets,
    });
  }
};

export const createVisibleImageRenditionLoadRendererActions = <
  TProject extends VisibleImageRenditionLoadProject,
>({
  delayMs,
  getProject,
  getSceneReader,
  getDevicePixelRatio,
  getLatestScene,
  getTimerId,
  clearTimer,
  setTimerId,
  scheduleTimeout,
  getLoadedPreviewFileIds,
  getLoadingPreviewFileIds,
  getLoadedOriginalFileIds,
  getLoadingOriginalFileIds,
  setLoadedPreviewFileIds,
  setLoadingPreviewFileIds,
  setLoadedOriginalFileIds,
  setLoadingOriginalFileIds,
  setLatestScene,
  readAssets,
  applyAssetsToScene,
}: CreateVisibleImageRenditionLoadRendererActionsInput<TProject>): VisibleImageRenditionLoadRendererActions => {
  const load = (scene: ImageRenditionSceneSnapshot) =>
    runVisibleImageRenditionLoadRendererAction({
      scene,
      project: getProject(),
      sceneReader: getSceneReader(),
      devicePixelRatio: getDevicePixelRatio(),
      loadedPreviewFileIds: getLoadedPreviewFileIds(),
      loadingPreviewFileIds: getLoadingPreviewFileIds(),
      loadedOriginalFileIds: getLoadedOriginalFileIds(),
      loadingOriginalFileIds: getLoadingOriginalFileIds(),
      setLatestScene,
      readAssets,
      applyAssetsToScene,
    });

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
    markLoaded: (assets) =>
      applyLoadedImageRenditionAssetsState({
        assets,
        sets: {
          previewFileIds: getLoadedPreviewFileIds(),
          originalFileIds: getLoadedOriginalFileIds(),
        },
      }),
    clearTimer: clearTimerRef,
    resetTracking: () => {
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
