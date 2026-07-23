import type { DesktopProjectBundle } from "../shared/desktopBridgeTypes";
import type { ImageRecordMap, ProjectManifest } from "../shared/projectTypes";
import { clearTimerRefAction } from "./timerRefController";

export interface AutosaveSnapshot<
  Elements = unknown,
  AppStateValue = unknown,
  Files = unknown,
> {
  project: DesktopProjectBundle;
  elements: Elements;
  appState: AppStateValue;
  files: Files;
  expectedSceneHash: string | null;
}

export interface SceneSnapshot<
  Elements = unknown,
  AppStateValue = unknown,
  Files = unknown,
> {
  elements: Elements;
  appState: AppStateValue;
  files: Files;
}

export type ScheduleAutosaveResult =
  | {
      status: "scheduled";
      timerId: number;
    }
  | {
      status: "skipped";
    };

export type FlushPendingAutosaveResult =
  | {
      status: "flushed";
    }
  | {
      status: "drained";
    }
  | {
      status: "failed";
    };

export interface AutosaveWriteFailure<Snapshot> {
  snapshot: Snapshot;
  error: unknown;
  strict: boolean;
}

export const buildAutosaveSceneProjectUpdate = ({
  activeProject,
  projectPath,
  sceneJson,
  imageRecords,
  nextProjectManifest,
}: {
  activeProject: DesktopProjectBundle | null | undefined;
  projectPath: string;
  sceneJson: string;
  imageRecords: ImageRecordMap;
  nextProjectManifest: ProjectManifest | null | undefined | void;
}): DesktopProjectBundle | null => {
  if (activeProject?.projectPath !== projectPath) {
    return null;
  }

  return {
    ...activeProject,
    project: nextProjectManifest || activeProject.project,
    sceneJson,
    imageRecords,
  };
};

export const scheduleAutosaveSnapshotAction = <Snapshot>({
  snapshot,
  delayMs,
  clearTimer,
  setPendingSnapshot,
  takePendingSnapshot,
  setTimerId,
  scheduleTimeout,
  writeSnapshot,
  handleWriteError,
}: {
  snapshot: Snapshot;
  delayMs: number;
  clearTimer: () => void;
  setPendingSnapshot: (snapshot: Snapshot) => void;
  takePendingSnapshot: () => Snapshot | null;
  setTimerId: (timerId: number | null) => void;
  scheduleTimeout: (callback: () => void, delayMs: number) => number;
  writeSnapshot: (snapshot: Snapshot) => Promise<void>;
  handleWriteError: (failure: AutosaveWriteFailure<Snapshot>) => void;
}): ScheduleAutosaveResult => {
  setPendingSnapshot(snapshot);
  clearTimer();

  const timerId = scheduleTimeout(() => {
    setTimerId(null);
    const pendingSnapshot = takePendingSnapshot();
    if (!pendingSnapshot) {
      return;
    }

    void writeSnapshot(pendingSnapshot).catch((error) => {
      handleWriteError({
        snapshot: pendingSnapshot,
        error,
        strict: false,
      });
    });
  }, delayMs);
  setTimerId(timerId);

  return {
    status: "scheduled",
    timerId,
  };
};

export const flushPendingAutosaveAction = async <Snapshot>({
  strict,
  clearTimer,
  takePendingSnapshot,
  writeSnapshot,
  waitForQueue,
  handleWriteError,
}: {
  strict: boolean;
  clearTimer: () => void;
  takePendingSnapshot: () => Snapshot | null;
  writeSnapshot: (snapshot: Snapshot) => Promise<void>;
  waitForQueue: () => Promise<void>;
  handleWriteError: (failure: AutosaveWriteFailure<Snapshot>) => void;
}): Promise<FlushPendingAutosaveResult> => {
  clearTimer();

  const snapshot = takePendingSnapshot();
  if (snapshot) {
    try {
      await writeSnapshot(snapshot);
      return {
        status: "flushed",
      };
    } catch (error) {
      handleWriteError({
        snapshot,
        error,
        strict,
      });
      if (strict) {
        throw error;
      }
      return {
        status: "failed",
      };
    }
  }

  try {
    await waitForQueue();
  } catch (error) {
    if (strict) {
      throw error;
    }
  }

  return {
    status: "drained",
  };
};

export interface AutosaveRendererActionsInput<Snapshot> {
  delayMs: number;
  getTimerId: () => number | null;
  clearTimer: (timerId: number) => void;
  setTimerId: (timerId: number | null) => void;
  setPendingSnapshot: (snapshot: Snapshot) => void;
  takePendingSnapshot: () => Snapshot | null;
  scheduleTimeout: (callback: () => void, delayMs: number) => number;
  writeSnapshot: (snapshot: Snapshot) => Promise<void>;
  waitForQueue: () => Promise<void>;
  handleWriteError: (failure: AutosaveWriteFailure<Snapshot>) => void;
}

export const createAutosaveRendererActions = <Snapshot>({
  delayMs,
  getTimerId,
  clearTimer,
  setTimerId,
  setPendingSnapshot,
  takePendingSnapshot,
  scheduleTimeout,
  writeSnapshot,
  waitForQueue,
  handleWriteError,
}: AutosaveRendererActionsInput<Snapshot>) => {
  const clearTimerRef = () =>
    clearTimerRefAction({
      getTimerId,
      clearTimer,
      setTimerId,
    });

  return {
    clearTimer: clearTimerRef,
    cancel: () => {
      clearTimerRef();
      const pendingSnapshot = takePendingSnapshot();
      return {
        status: "cancelled" as const,
        hadPendingSnapshot: pendingSnapshot !== null,
      };
    },
    schedule: (snapshot: Snapshot) =>
      scheduleAutosaveSnapshotAction({
        snapshot,
        delayMs,
        clearTimer: clearTimerRef,
        setPendingSnapshot,
        takePendingSnapshot,
        setTimerId,
        scheduleTimeout,
        writeSnapshot,
        handleWriteError,
      }),
    flush: ({ strict = false }: { strict?: boolean } = {}) =>
      flushPendingAutosaveAction({
        strict,
        clearTimer: clearTimerRef,
        takePendingSnapshot,
        writeSnapshot,
        waitForQueue,
        handleWriteError,
      }),
  };
};

export interface AutosaveLifecycleRendererActionsInput {
  addEventListener: (
    eventName: "beforeunload",
    listener: EventListener,
  ) => void;
  removeEventListener: (
    eventName: "beforeunload",
    listener: EventListener,
  ) => void;
  subscribeFlushRequest?:
    | ((listener: () => Promise<void> | void) => () => void)
    | null;
  flushBeforeUnload: () => Promise<FlushPendingAutosaveResult | void>;
  flushRequest: () => Promise<FlushPendingAutosaveResult | void>;
}

export const createAutosaveLifecycleRendererActions = ({
  addEventListener,
  removeEventListener,
  subscribeFlushRequest,
  flushBeforeUnload,
  flushRequest,
}: AutosaveLifecycleRendererActionsInput) => ({
  startBeforeUnloadFlush: () =>
    startAutosaveBeforeUnloadFlushAction({
      addEventListener,
      removeEventListener,
      flushPendingAutosave: flushBeforeUnload,
    }),
  subscribeFlushRequests: () =>
    startAutosaveFlushRequestSubscriptionAction({
      subscribeFlushRequest,
      flushPendingAutosave: flushRequest,
    }),
});

export const buildProjectImageRecordsAutosaveSnapshot = <
  Elements,
  AppStateValue,
  Files,
>({
  project,
  imageRecords,
  elements,
  appState,
  files,
  expectedSceneHash,
}: {
  project: DesktopProjectBundle;
  imageRecords: ImageRecordMap;
  elements: Elements;
  appState: AppStateValue;
  files: Files;
  expectedSceneHash: string | null;
}): {
  project: DesktopProjectBundle;
  snapshot: AutosaveSnapshot<Elements, AppStateValue, Files>;
} => {
  const nextProject = {
    ...project,
    imageRecords,
  };

  return {
    project: nextProject,
    snapshot: {
      project: nextProject,
      elements,
      appState,
      files,
      expectedSceneHash,
    },
  };
};

export const applyProjectImageRecordsAutosaveSnapshotState = <
  Elements,
  AppStateValue,
  Files,
>({
  project,
  imageRecords,
  elements,
  appState,
  files,
  expectedSceneHash,
  setProject,
  setPendingSnapshot,
}: {
  project: DesktopProjectBundle;
  imageRecords: ImageRecordMap;
  elements: Elements;
  appState: AppStateValue;
  files: Files;
  expectedSceneHash: string | null;
  setProject: (project: DesktopProjectBundle) => void;
  setPendingSnapshot: (
    snapshot: AutosaveSnapshot<Elements, AppStateValue, Files>,
  ) => void;
}) => {
  const state = buildProjectImageRecordsAutosaveSnapshot({
    project,
    imageRecords,
    elements,
    appState,
    files,
    expectedSceneHash,
  });

  setProject(state.project);
  setPendingSnapshot(state.snapshot);

  return state;
};

export const buildProjectImageRecordsSceneAutosaveState = <
  Elements,
  AppStateValue,
  Files,
>({
  project,
  imageRecords,
  elements,
  appState,
  files,
  expectedSceneHash,
}: {
  project: DesktopProjectBundle;
  imageRecords: ImageRecordMap;
  elements: Elements;
  appState: AppStateValue;
  files: Files;
  expectedSceneHash: string | null;
}): {
  project: DesktopProjectBundle;
  scene: SceneSnapshot<Elements, AppStateValue, Files>;
  snapshot: AutosaveSnapshot<Elements, AppStateValue, Files>;
} => {
  const scene = {
    elements,
    appState,
    files,
  };
  const autosaveState = buildProjectImageRecordsAutosaveSnapshot({
    project,
    imageRecords,
    elements,
    appState,
    files,
    expectedSceneHash,
  });

  return {
    project: autosaveState.project,
    scene,
    snapshot: autosaveState.snapshot,
  };
};

export const applyProjectImageRecordsSceneAutosaveState = <
  Elements,
  AppStateValue,
  Files,
>({
  project,
  imageRecords,
  elements,
  appState,
  files,
  expectedSceneHash,
  setScene,
  setPendingSnapshot,
}: {
  project: DesktopProjectBundle;
  imageRecords: ImageRecordMap;
  elements: Elements;
  appState: AppStateValue;
  files: Files;
  expectedSceneHash: string | null;
  setScene: (scene: SceneSnapshot<Elements, AppStateValue, Files>) => void;
  setPendingSnapshot: (
    snapshot: AutosaveSnapshot<Elements, AppStateValue, Files>,
  ) => void;
}) => {
  const state = buildProjectImageRecordsSceneAutosaveState({
    project,
    imageRecords,
    elements,
    appState,
    files,
    expectedSceneHash,
  });

  setScene(state.scene);
  setPendingSnapshot(state.snapshot);

  return state;
};

export const resolveQueuedAutosaveExpectedSceneHash = ({
  activeProject,
  snapshotProjectPath,
  savedSceneHash,
  snapshotExpectedSceneHash,
}: {
  activeProject: DesktopProjectBundle | null | undefined;
  snapshotProjectPath: string;
  savedSceneHash: string | null;
  snapshotExpectedSceneHash: string | null;
}): string | null => {
  if (activeProject?.projectPath === snapshotProjectPath) {
    return savedSceneHash;
  }

  return snapshotExpectedSceneHash;
};

export const shouldRestoreFailedAutosaveSnapshot = ({
  activeProject,
  snapshotProjectPath,
  hasPendingAutosave,
}: {
  activeProject: DesktopProjectBundle | null | undefined;
  snapshotProjectPath: string;
  hasPendingAutosave: boolean;
}): boolean =>
  activeProject?.projectPath === snapshotProjectPath && !hasPendingAutosave;

export const startAutosaveBeforeUnloadFlushAction = ({
  addEventListener,
  removeEventListener,
  flushPendingAutosave,
}: {
  addEventListener: (eventName: "beforeunload", listener: EventListener) => void;
  removeEventListener: (
    eventName: "beforeunload",
    listener: EventListener,
  ) => void;
  flushPendingAutosave: () => Promise<FlushPendingAutosaveResult | void>;
}): (() => void) => {
  const flushAutosave = () => {
    void flushPendingAutosave();
  };

  addEventListener("beforeunload", flushAutosave);

  return () => {
    removeEventListener("beforeunload", flushAutosave);
    void flushPendingAutosave();
  };
};

export const startAutosaveFlushRequestSubscriptionAction = ({
  subscribeFlushRequest,
  flushPendingAutosave,
}: {
  subscribeFlushRequest?:
    | ((listener: () => Promise<void> | void) => () => void)
    | null;
  flushPendingAutosave: () => Promise<FlushPendingAutosaveResult | void>;
}): (() => void) | undefined => {
  if (!subscribeFlushRequest) {
    return undefined;
  }

  return subscribeFlushRequest(async () => {
    await flushPendingAutosave();
  });
};
