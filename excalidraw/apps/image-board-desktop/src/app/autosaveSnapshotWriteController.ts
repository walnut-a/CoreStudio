import type { AppState } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/element/types";

import type { DesktopProjectBundle } from "../shared/desktopBridgeTypes";
import type { ImageRecordMap, ProjectManifest } from "../shared/projectTypes";
import {
  type AutosaveWriteFailure,
  buildAutosaveSceneProjectUpdate,
  resolveQueuedAutosaveExpectedSceneHash,
  shouldRestoreFailedAutosaveSnapshot,
  type AutosaveSnapshot,
} from "./autosaveProjectState";

type WriteProjectScene = (input: {
  projectPath: string;
  sceneJson: string;
  expectedSceneHash: string | null;
}) => Promise<ProjectManifest | null | undefined | void>;

export type AutosaveSnapshotWriteActionResult =
  | {
      status: "written";
      project: DesktopProjectBundle;
      sceneJson: string;
      imageRecords: ImageRecordMap;
    }
  | {
      status: "stale-project";
      sceneJson: string;
      imageRecords: ImageRecordMap;
    };

export const runQueuedAutosaveSnapshotWriteAction = <Snapshot extends {
  project: DesktopProjectBundle;
  expectedSceneHash: string | null;
}>({
  snapshot,
  currentQueue,
  activeProject,
  savedSceneHash,
  setQueue,
  writeSnapshot,
}: {
  snapshot: Snapshot;
  currentQueue: Promise<unknown>;
  activeProject: DesktopProjectBundle | null;
  savedSceneHash: string | null;
  setQueue: (queue: Promise<void>) => void;
  writeSnapshot: (snapshot: Snapshot) => Promise<void>;
}): {
  promise: Promise<void>;
} => {
  const promise = currentQueue
    .catch(() => undefined)
    .then(() =>
      writeSnapshot({
        ...snapshot,
        expectedSceneHash: resolveQueuedAutosaveExpectedSceneHash({
          activeProject,
          snapshotProjectPath: snapshot.project.projectPath,
          savedSceneHash,
          snapshotExpectedSceneHash: snapshot.expectedSceneHash,
        }),
      }),
    );

  setQueue(promise);

  return {
    promise,
  };
};

export const runAutosaveSnapshotWriteFailureAction = <Snapshot extends {
  project: DesktopProjectBundle;
}>({
  snapshot,
  error,
  strict,
  activeProject,
  hasPendingAutosave,
  setPendingSnapshot,
  reportError,
}: {
  snapshot: Snapshot;
  error: unknown;
  strict: boolean;
  activeProject: DesktopProjectBundle | null;
  hasPendingAutosave: boolean;
  setPendingSnapshot: (snapshot: Snapshot) => void;
  reportError: (error: unknown) => void;
}) => {
  if (
    shouldRestoreFailedAutosaveSnapshot({
      activeProject,
      snapshotProjectPath: snapshot.project.projectPath,
      hasPendingAutosave,
    })
  ) {
    setPendingSnapshot(snapshot);
  }

  if (!strict) {
    reportError(error);
  }
};

export interface AutosaveSnapshotWriteRendererActionsInput<
  Elements extends readonly ExcalidrawElement[],
  AppStateValue extends AppState,
  Files,
> {
  getActiveProject: () => DesktopProjectBundle | null;
  hasPendingAutosave: () => boolean;
  getPendingSnapshot: () => AutosaveSnapshot<Elements, AppStateValue, Files> | null;
  setPendingSnapshot: (
    snapshot: AutosaveSnapshot<Elements, AppStateValue, Files> | null,
  ) => void;
  getCurrentQueue: () => Promise<unknown>;
  setQueue: (queue: Promise<void>) => void;
  getSavedSceneHash: () => string | null;
  persistUnknownCanvasImages: (
    project: DesktopProjectBundle,
    elements: Elements,
    files: Files,
  ) => Promise<ImageRecordMap>;
  serializeScene: (scene: {
    elements: Elements;
    appState: AppStateValue;
  }) => string;
  writeProjectScene: WriteProjectScene;
  setActiveProject: (project: DesktopProjectBundle) => void;
  updateSelectedInspector: (input: {
    elements: Elements;
    appState: AppStateValue;
    imageRecords: ImageRecordMap;
  }) => void;
  reportError: (error: unknown) => void;
}

export const createAutosaveSnapshotWriteRendererActions = <
  Elements extends readonly ExcalidrawElement[],
  AppStateValue extends AppState,
  Files,
>({
  getActiveProject,
  hasPendingAutosave,
  getPendingSnapshot,
  setPendingSnapshot,
  getCurrentQueue,
  setQueue,
  getSavedSceneHash,
  persistUnknownCanvasImages,
  serializeScene,
  writeProjectScene,
  setActiveProject,
  updateSelectedInspector,
  reportError,
}: AutosaveSnapshotWriteRendererActionsInput<
  Elements,
  AppStateValue,
  Files
>) => {
  type Snapshot = AutosaveSnapshot<Elements, AppStateValue, Files>;

  const write = async (snapshot: Snapshot) => {
    await runAutosaveSnapshotWriteAction({
      snapshot,
      getActiveProject,
      persistUnknownCanvasImages,
      serializeScene,
      writeProjectScene,
      setActiveProject,
      updateSelectedInspector,
    });
  };

  return {
    write,
    enqueue: (snapshot: Snapshot) =>
      runQueuedAutosaveSnapshotWriteAction({
        snapshot,
        currentQueue: getCurrentQueue(),
        activeProject: getActiveProject(),
        savedSceneHash: getSavedSceneHash(),
        setQueue,
        writeSnapshot: write,
      }).promise,
    takePending: () => {
      const snapshot = getPendingSnapshot();
      setPendingSnapshot(null);
      return snapshot;
    },
    handleWriteFailure: ({
      snapshot,
      error,
      strict,
    }: AutosaveWriteFailure<Snapshot>) =>
      runAutosaveSnapshotWriteFailureAction({
        snapshot,
        error,
        strict,
        activeProject: getActiveProject(),
        hasPendingAutosave: hasPendingAutosave(),
        setPendingSnapshot: (nextSnapshot) => {
          setPendingSnapshot(nextSnapshot);
        },
        reportError,
      }),
  };
};

export const runAutosaveSnapshotWriteAction = async <
  Elements extends readonly ExcalidrawElement[],
  AppStateValue extends AppState,
  Files,
>({
  snapshot,
  getActiveProject,
  persistUnknownCanvasImages,
  serializeScene,
  writeProjectScene,
  setActiveProject,
  updateSelectedInspector,
}: {
  snapshot: AutosaveSnapshot<Elements, AppStateValue, Files>;
  getActiveProject: () => DesktopProjectBundle | null;
  persistUnknownCanvasImages: (
    project: DesktopProjectBundle,
    elements: Elements,
    files: Files,
  ) => Promise<ImageRecordMap>;
  serializeScene: (scene: {
    elements: Elements;
    appState: AppStateValue;
  }) => string;
  writeProjectScene: WriteProjectScene;
  setActiveProject: (project: DesktopProjectBundle) => void;
  updateSelectedInspector: (input: {
    elements: Elements;
    appState: AppStateValue;
    imageRecords: ImageRecordMap;
  }) => void;
}): Promise<AutosaveSnapshotWriteActionResult> => {
  const imageRecords = await persistUnknownCanvasImages(
    snapshot.project,
    snapshot.elements,
    snapshot.files,
  );
  const sceneJson = serializeScene({
    elements: snapshot.elements,
    appState: snapshot.appState,
  });
  const nextProjectManifest = await writeProjectScene({
    projectPath: snapshot.project.projectPath,
    sceneJson,
    expectedSceneHash: snapshot.expectedSceneHash,
  });

  const nextProject = buildAutosaveSceneProjectUpdate({
    activeProject: getActiveProject(),
    projectPath: snapshot.project.projectPath,
    sceneJson,
    imageRecords,
    nextProjectManifest,
  });
  if (!nextProject) {
    return {
      status: "stale-project",
      sceneJson,
      imageRecords,
    };
  }

  setActiveProject(nextProject);
  updateSelectedInspector({
    elements: snapshot.elements,
    appState: snapshot.appState,
    imageRecords,
  });

  return {
    status: "written",
    project: nextProject,
    sceneJson,
    imageRecords,
  };
};
