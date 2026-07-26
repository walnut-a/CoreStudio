import type { AppState } from "@excalidraw/excalidraw/types";

import {
  buildViewportImageRenditionSceneSnapshot,
  type ImageRenditionSceneSnapshot,
  type ImageRenditionSceneSnapshotReader,
} from "./imageRenditionLoadPlan";

export type ViewportChangeRendererActionResult =
  | { status: "updated" }
  | { status: "skipped"; reason: "missing-scene" };

export type ViewportChangeRendererActionsInput = {
  getScene: () => ImageRenditionSceneSnapshot | null;
  getSceneReader: () => ImageRenditionSceneSnapshotReader;
  setLatestScene: (scene: ImageRenditionSceneSnapshot) => void;
  scheduleVisibleImageRenditionLoad: (
    scene: ImageRenditionSceneSnapshot,
  ) => void;
  scheduleAgentBrowserRuntimeStatePublish: (
    scene: ImageRenditionSceneSnapshot,
  ) => void;
};

export const runViewportChangeRendererAction = ({
  scrollX,
  scrollY,
  zoom,
  scene,
  sceneReader,
  setLatestScene,
  scheduleVisibleImageRenditionLoad,
  scheduleAgentBrowserRuntimeStatePublish,
}: {
  scrollX: number;
  scrollY: number;
  zoom: AppState["zoom"];
  scene: ImageRenditionSceneSnapshot | null;
  sceneReader: ImageRenditionSceneSnapshotReader;
} & Omit<
  ViewportChangeRendererActionsInput,
  "getScene" | "getSceneReader"
>): ViewportChangeRendererActionResult => {
  if (!scene) {
    return { status: "skipped", reason: "missing-scene" };
  }

  const nextScene = buildViewportImageRenditionSceneSnapshot(
    scene,
    sceneReader,
    {
      scrollX,
      scrollY,
      zoom,
    },
  );
  setLatestScene(nextScene);
  scheduleVisibleImageRenditionLoad(nextScene);
  scheduleAgentBrowserRuntimeStatePublish(nextScene);

  return { status: "updated" };
};

export const createViewportChangeRendererActions = ({
  getScene,
  getSceneReader,
  setLatestScene,
  scheduleVisibleImageRenditionLoad,
  scheduleAgentBrowserRuntimeStatePublish,
}: ViewportChangeRendererActionsInput) => {
  const changeViewport = (
    scrollX: number,
    scrollY: number,
    zoom: AppState["zoom"],
  ) =>
    runViewportChangeRendererAction({
      scrollX,
      scrollY,
      zoom,
      scene: getScene(),
      sceneReader: getSceneReader(),
      setLatestScene,
      scheduleVisibleImageRenditionLoad,
      scheduleAgentBrowserRuntimeStatePublish,
    });

  return { changeViewport };
};
