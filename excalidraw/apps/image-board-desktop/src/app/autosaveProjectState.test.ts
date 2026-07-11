import { describe, expect, it, vi } from "vitest";

import type { DesktopProjectBundle } from "../shared/desktopBridgeTypes";
import type { ImageRecord, ProjectManifest } from "../shared/projectTypes";
import {
  applyProjectImageRecordsAutosaveSnapshotState,
  applyProjectImageRecordsSceneAutosaveState,
  buildProjectImageRecordsSceneAutosaveState,
  buildProjectImageRecordsAutosaveSnapshot,
  createAutosaveLifecycleRendererActions,
  createAutosaveRendererActions,
  flushPendingAutosaveAction,
  scheduleAutosaveSnapshotAction,
  startAutosaveBeforeUnloadFlushAction,
  startAutosaveFlushRequestSubscriptionAction,
  buildAutosaveSceneProjectUpdate,
  resolveQueuedAutosaveExpectedSceneHash,
  shouldRestoreFailedAutosaveSnapshot,
} from "./autosaveProjectState";

const createManifest = (
  name: string,
  overrides: Partial<ProjectManifest> = {},
): ProjectManifest => ({
  formatVersion: 1,
  appVersion: "test",
  name,
  createdAt: "2026-07-04T00:00:00.000Z",
  updatedAt: "2026-07-04T00:00:00.000Z",
  sceneFile: "scene.excalidraw.json",
  imageRecordsFile: "image-records.json",
  assetsDir: "assets",
  exportsDir: "exports",
  agentAccess: {
    token: `${name}-token`,
    enabled: true,
  },
  ...overrides,
});

const createProject = (
  projectPath: string,
  name = "测试项目",
): DesktopProjectBundle => ({
  projectPath,
  project: createManifest(name),
  sceneJson: "{}",
  imageRecords: {},
});

const createImageRecord = (fileId: string): ImageRecord => ({
  fileId,
  assetPath: `assets/${fileId}.png`,
  sourceType: "imported",
  width: 512,
  height: 512,
  createdAt: "2026-07-04T00:00:00.000Z",
  mimeType: "image/png",
});

describe("buildAutosaveSceneProjectUpdate", () => {
  it("returns null when autosave completed for a project that is no longer active", () => {
    expect(
      buildAutosaveSceneProjectUpdate({
        activeProject: createProject("/projects/other"),
        projectPath: "/projects/current",
        sceneJson: '{"type":"excalidraw"}',
        imageRecords: {
          "file-1": createImageRecord("file-1"),
        },
        nextProjectManifest: createManifest("新项目"),
      }),
    ).toBeNull();
  });

  it("updates the active project with the written scene, image records and returned manifest", () => {
    const activeProject = createProject("/projects/current", "旧项目");
    const nextProjectManifest = createManifest("新项目", {
      updatedAt: "2026-07-04T01:00:00.000Z",
    });
    const imageRecords = {
      "file-1": createImageRecord("file-1"),
    };

    expect(
      buildAutosaveSceneProjectUpdate({
        activeProject,
        projectPath: "/projects/current",
        sceneJson: '{"type":"excalidraw"}',
        imageRecords,
        nextProjectManifest,
      }),
    ).toEqual({
      ...activeProject,
      project: nextProjectManifest,
      sceneJson: '{"type":"excalidraw"}',
      imageRecords,
    });
  });

  it("keeps the active manifest when the write call does not return a manifest", () => {
    const activeProject = createProject("/projects/current", "当前项目");
    const imageRecords = {
      "file-1": createImageRecord("file-1"),
    };

    expect(
      buildAutosaveSceneProjectUpdate({
        activeProject,
        projectPath: "/projects/current",
        sceneJson: '{"type":"excalidraw"}',
        imageRecords,
        nextProjectManifest: null,
      }),
    ).toEqual({
      ...activeProject,
      sceneJson: '{"type":"excalidraw"}',
      imageRecords,
    });
  });
});

describe("buildProjectImageRecordsAutosaveSnapshot", () => {
  it("uses one updated project bundle for state and autosave snapshot", () => {
    const project = createProject("/projects/current", "当前项目");
    const imageRecords = {
      "file-1": createImageRecord("file-1"),
    };
    const elements = [{ id: "element-1" }];
    const appState = { selectedElementIds: { "element-1": true } };
    const files = { "file-1": { id: "file-1" } };

    expect(
      buildProjectImageRecordsAutosaveSnapshot({
        project,
        imageRecords,
        elements,
        appState,
        files,
        expectedSceneHash: "saved-hash",
      }),
    ).toEqual({
      project: {
        ...project,
        imageRecords,
      },
      snapshot: {
        project: {
          ...project,
          imageRecords,
        },
        elements,
        appState,
        files,
        expectedSceneHash: "saved-hash",
      },
    });
  });
});

describe("applyProjectImageRecordsAutosaveSnapshotState", () => {
  it("applies the updated project and pending autosave snapshot", () => {
    const project = createProject("/projects/current", "当前项目");
    const imageRecords = {
      "file-1": createImageRecord("file-1"),
    };
    const elements = [{ id: "element-1" }];
    const appState = { selectedElementIds: { "element-1": true } };
    const files = { "file-1": { id: "file-1" } };
    const setProject = vi.fn();
    const setPendingSnapshot = vi.fn();

    const state = applyProjectImageRecordsAutosaveSnapshotState({
      project,
      imageRecords,
      elements,
      appState,
      files,
      expectedSceneHash: "saved-hash",
      setProject,
      setPendingSnapshot,
    });

    expect(state.project).toEqual({
      ...project,
      imageRecords,
    });
    expect(setProject).toHaveBeenCalledWith(state.project);
    expect(setPendingSnapshot).toHaveBeenCalledWith(state.snapshot);
    expect(state.snapshot).toEqual({
      project: state.project,
      elements,
      appState,
      files,
      expectedSceneHash: "saved-hash",
    });
  });
});

describe("buildProjectImageRecordsSceneAutosaveState", () => {
  it("uses the same scene and updated project for latest scene and pending autosave", () => {
    const project = createProject("/projects/current", "当前项目");
    const imageRecords = {
      "file-1": createImageRecord("file-1"),
    };
    const elements = [{ id: "element-1" }];
    const appState = { selectedElementIds: { "element-1": true } };
    const files = { "file-1": { id: "file-1" } };

    const state = buildProjectImageRecordsSceneAutosaveState({
      project,
      imageRecords,
      elements,
      appState,
      files,
      expectedSceneHash: "saved-hash",
    });

    expect(state.project).toEqual({
      ...project,
      imageRecords,
    });
    expect(state.scene).toEqual({
      elements,
      appState,
      files,
    });
    expect(state.snapshot).toEqual({
      project: state.project,
      elements,
      appState,
      files,
      expectedSceneHash: "saved-hash",
    });
  });
});

describe("applyProjectImageRecordsSceneAutosaveState", () => {
  it("applies the latest scene and pending autosave snapshot", () => {
    const project = createProject("/projects/current", "当前项目");
    const imageRecords = {
      "file-1": createImageRecord("file-1"),
    };
    const elements = [{ id: "element-1" }];
    const appState = { selectedElementIds: { "element-1": true } };
    const files = { "file-1": { id: "file-1" } };
    const setScene = vi.fn();
    const setPendingSnapshot = vi.fn();

    const state = applyProjectImageRecordsSceneAutosaveState({
      project,
      imageRecords,
      elements,
      appState,
      files,
      expectedSceneHash: "saved-hash",
      setScene,
      setPendingSnapshot,
    });

    expect(setScene).toHaveBeenCalledWith(state.scene);
    expect(setPendingSnapshot).toHaveBeenCalledWith(state.snapshot);
    expect(state.scene).toEqual({
      elements,
      appState,
      files,
    });
    expect(state.snapshot).toEqual({
      project: state.project,
      elements,
      appState,
      files,
      expectedSceneHash: "saved-hash",
    });
  });
});

describe("resolveQueuedAutosaveExpectedSceneHash", () => {
  it("uses the latest saved scene hash when the snapshot project is still active", () => {
    expect(
      resolveQueuedAutosaveExpectedSceneHash({
        activeProject: createProject("/projects/current"),
        snapshotProjectPath: "/projects/current",
        savedSceneHash: "latest-saved-hash",
        snapshotExpectedSceneHash: "snapshot-hash",
      }),
    ).toBe("latest-saved-hash");
  });

  it("keeps the snapshot hash when another project is active", () => {
    expect(
      resolveQueuedAutosaveExpectedSceneHash({
        activeProject: createProject("/projects/other"),
        snapshotProjectPath: "/projects/current",
        savedSceneHash: "latest-saved-hash",
        snapshotExpectedSceneHash: "snapshot-hash",
      }),
    ).toBe("snapshot-hash");
  });
});

describe("shouldRestoreFailedAutosaveSnapshot", () => {
  it("allows restoring a failed snapshot for the still-active project", () => {
    expect(
      shouldRestoreFailedAutosaveSnapshot({
        activeProject: createProject("/projects/current"),
        snapshotProjectPath: "/projects/current",
        hasPendingAutosave: false,
      }),
    ).toBe(true);
  });

  it("does not restore a failed snapshot after switching projects", () => {
    expect(
      shouldRestoreFailedAutosaveSnapshot({
        activeProject: createProject("/projects/other"),
        snapshotProjectPath: "/projects/current",
        hasPendingAutosave: false,
      }),
    ).toBe(false);
  });

  it("does not overwrite a newer pending autosave snapshot", () => {
    expect(
      shouldRestoreFailedAutosaveSnapshot({
        activeProject: createProject("/projects/current"),
        snapshotProjectPath: "/projects/current",
        hasPendingAutosave: true,
      }),
    ).toBe(false);
  });
});

describe("scheduleAutosaveSnapshotAction", () => {
  it("stores the latest pending snapshot and writes it when the timer fires", () => {
    const snapshot = {
      project: createProject("/projects/current"),
      elements: [{ id: "element-1" }],
      appState: {},
      files: {},
      expectedSceneHash: "scene-hash",
    };
    let pendingSnapshot: typeof snapshot | null = null;
    let timerId: number | null = null;
    const clearTimer = vi.fn();
    const writeSnapshot = vi.fn().mockResolvedValue(undefined);
    const handleWriteError = vi.fn();
    const scheduledCallbacks: Array<() => void> = [];

    expect(
      scheduleAutosaveSnapshotAction({
        snapshot,
        delayMs: 700,
        clearTimer,
        setPendingSnapshot: (nextSnapshot) => {
          pendingSnapshot = nextSnapshot;
        },
        takePendingSnapshot: () => {
          const current = pendingSnapshot;
          pendingSnapshot = null;
          return current;
        },
        setTimerId: (nextTimerId) => {
          timerId = nextTimerId;
        },
        scheduleTimeout: (callback, delayMs) => {
          expect(delayMs).toBe(700);
          scheduledCallbacks.push(callback);
          return 91;
        },
        writeSnapshot,
        handleWriteError,
      }),
    ).toEqual({
      status: "scheduled",
      timerId: 91,
    });

    expect(clearTimer).toHaveBeenCalledTimes(1);
    expect(pendingSnapshot).toBe(snapshot);
    expect(timerId).toBe(91);

    scheduledCallbacks[0]?.();

    expect(timerId).toBeNull();
    expect(pendingSnapshot).toBeNull();
    expect(writeSnapshot).toHaveBeenCalledWith(snapshot);
    expect(handleWriteError).not.toHaveBeenCalled();
  });

  it("restores/report errors through the injected failure handler", async () => {
    const snapshot = {
      project: createProject("/projects/current"),
      elements: [],
      appState: {},
      files: {},
      expectedSceneHash: null,
    };
    let pendingSnapshot: typeof snapshot | null = snapshot;
    const error = new Error("write failed");
    const handleWriteError = vi.fn();
    const scheduledCallbacks: Array<() => void> = [];

    scheduleAutosaveSnapshotAction({
      snapshot,
      delayMs: 700,
      clearTimer: vi.fn(),
      setPendingSnapshot: (nextSnapshot) => {
        pendingSnapshot = nextSnapshot;
      },
      takePendingSnapshot: () => {
        const current = pendingSnapshot;
        pendingSnapshot = null;
        return current;
      },
      setTimerId: vi.fn(),
      scheduleTimeout: (callback) => {
        scheduledCallbacks.push(callback);
        return 92;
      },
      writeSnapshot: vi.fn().mockRejectedValue(error),
      handleWriteError,
    });

    scheduledCallbacks[0]?.();
    await Promise.resolve();

    expect(handleWriteError).toHaveBeenCalledWith({
      snapshot,
      error,
      strict: false,
    });
  });
});

describe("flushPendingAutosaveAction", () => {
  it("clears the autosave timer and writes the pending snapshot immediately", async () => {
    const snapshot = {
      project: createProject("/projects/current"),
      elements: [],
      appState: {},
      files: {},
      expectedSceneHash: null,
    };
    let pendingSnapshot: typeof snapshot | null = snapshot;
    const clearTimer = vi.fn();
    const writeSnapshot = vi.fn().mockResolvedValue(undefined);
    const waitForQueue = vi.fn();

    await expect(
      flushPendingAutosaveAction({
        strict: false,
        clearTimer,
        takePendingSnapshot: () => {
          const current = pendingSnapshot;
          pendingSnapshot = null;
          return current;
        },
        writeSnapshot,
        waitForQueue,
        handleWriteError: vi.fn(),
      }),
    ).resolves.toEqual({
      status: "flushed",
    });

    expect(clearTimer).toHaveBeenCalledTimes(1);
    expect(pendingSnapshot).toBeNull();
    expect(writeSnapshot).toHaveBeenCalledWith(snapshot);
    expect(waitForQueue).not.toHaveBeenCalled();
  });

  it("waits for the queued autosave when there is no pending snapshot", async () => {
    const waitForQueue = vi.fn().mockResolvedValue(undefined);

    await expect(
      flushPendingAutosaveAction({
        strict: false,
        clearTimer: vi.fn(),
        takePendingSnapshot: () => null,
        writeSnapshot: vi.fn(),
        waitForQueue,
        handleWriteError: vi.fn(),
      }),
    ).resolves.toEqual({
      status: "drained",
    });

    expect(waitForQueue).toHaveBeenCalledTimes(1);
  });

  it("restores failed pending snapshots and rethrows in strict mode", async () => {
    const snapshot = {
      project: createProject("/projects/current"),
      elements: [],
      appState: {},
      files: {},
      expectedSceneHash: null,
    };
    const error = new Error("strict autosave failed");
    const handleWriteError = vi.fn();

    await expect(
      flushPendingAutosaveAction({
        strict: true,
        clearTimer: vi.fn(),
        takePendingSnapshot: () => snapshot,
        writeSnapshot: vi.fn().mockRejectedValue(error),
        waitForQueue: vi.fn(),
        handleWriteError,
      }),
    ).rejects.toThrow(error);

    expect(handleWriteError).toHaveBeenCalledWith({
      snapshot,
      error,
      strict: true,
    });
  });
});

describe("createAutosaveRendererActions", () => {
  it("creates schedule, flush and clear timer handlers from the latest autosave refs", async () => {
    const snapshot = {
      project: createProject("/projects/current"),
      elements: [{ id: "element-1" }],
      appState: {},
      files: {},
      expectedSceneHash: "scene-hash",
    };
    let pendingSnapshot: typeof snapshot | null = null;
    let timerId: number | null = 41;
    const clearedTimerIds: number[] = [];
    const scheduledCallbacks: Array<() => void> = [];
    const writeSnapshot = vi.fn().mockResolvedValue(undefined);
    const waitForQueue = vi.fn().mockResolvedValue(undefined);
    const handleWriteError = vi.fn();
    const actions = createAutosaveRendererActions({
      delayMs: 700,
      getTimerId: () => timerId,
      clearTimer: (id) => {
        clearedTimerIds.push(id);
      },
      setTimerId: (id) => {
        timerId = id;
      },
      setPendingSnapshot: (nextSnapshot) => {
        pendingSnapshot = nextSnapshot;
      },
      takePendingSnapshot: () => {
        const current = pendingSnapshot;
        pendingSnapshot = null;
        return current;
      },
      scheduleTimeout: (callback, delayMs) => {
        expect(delayMs).toBe(700);
        scheduledCallbacks.push(callback);
        return 42;
      },
      writeSnapshot,
      waitForQueue,
      handleWriteError,
    });

    expect(actions.schedule(snapshot)).toEqual({
      status: "scheduled",
      timerId: 42,
    });
    expect(clearedTimerIds).toEqual([41]);
    expect(timerId).toBe(42);
    expect(pendingSnapshot).toBe(snapshot);

    scheduledCallbacks[0]?.();
    await Promise.resolve();

    expect(timerId).toBeNull();
    expect(pendingSnapshot).toBeNull();
    expect(writeSnapshot).toHaveBeenCalledWith(snapshot);
    expect(handleWriteError).not.toHaveBeenCalled();

    pendingSnapshot = snapshot;
    timerId = 43;
    await expect(actions.flush({ strict: true })).resolves.toEqual({
      status: "flushed",
    });
    expect(clearedTimerIds).toEqual([41, 43]);
    expect(writeSnapshot).toHaveBeenCalledTimes(2);

    timerId = 44;
    expect(actions.clearTimer()).toEqual({
      status: "cleared",
      timerId: 44,
    });
    expect(clearedTimerIds).toEqual([41, 43, 44]);
    expect(timerId).toBeNull();
  });
});

describe("createAutosaveLifecycleRendererActions", () => {
  it("creates the beforeunload flush lifecycle handler", () => {
    const listeners = new Map<string, EventListener>();
    const removeEventListener = vi.fn();
    const flushBeforeUnload = vi.fn().mockResolvedValue({
      status: "flushed",
    });
    const flushRequest = vi.fn();
    const actions = createAutosaveLifecycleRendererActions({
      addEventListener: (eventName, listener) => {
        listeners.set(eventName, listener);
      },
      removeEventListener,
      flushBeforeUnload,
      flushRequest,
    });

    const cleanup = actions.startBeforeUnloadFlush();
    listeners.get("beforeunload")?.(new Event("beforeunload"));
    cleanup();

    expect(flushBeforeUnload).toHaveBeenCalledTimes(2);
    expect(removeEventListener).toHaveBeenCalledWith(
      "beforeunload",
      listeners.get("beforeunload"),
    );
    expect(flushRequest).not.toHaveBeenCalled();
  });

  it("creates the desktop flush request subscription handler", async () => {
    const requestListeners: Array<() => Promise<void> | void> = [];
    const unsubscribe = vi.fn();
    const subscribeFlushRequest = vi.fn((listener) => {
      requestListeners.push(listener);
      return unsubscribe;
    });
    const flushBeforeUnload = vi.fn();
    const flushRequest = vi.fn().mockResolvedValue({
      status: "flushed",
    });
    const actions = createAutosaveLifecycleRendererActions({
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      subscribeFlushRequest,
      flushBeforeUnload,
      flushRequest,
    });

    const cleanup = actions.subscribeFlushRequests();

    expect(cleanup).toBe(unsubscribe);
    expect(requestListeners).toHaveLength(1);
    await requestListeners[0]?.();
    expect(flushRequest).toHaveBeenCalledTimes(1);
    expect(flushBeforeUnload).not.toHaveBeenCalled();
  });

  it("skips the flush request subscription when the bridge cannot subscribe", () => {
    const actions = createAutosaveLifecycleRendererActions({
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      flushBeforeUnload: vi.fn(),
      flushRequest: vi.fn(),
    });

    expect(actions.subscribeFlushRequests()).toBeUndefined();
  });
});

describe("startAutosaveBeforeUnloadFlushAction", () => {
  it("registers a beforeunload listener that flushes pending autosave", () => {
    const listeners = new Map<string, EventListener>();
    const flushPendingAutosave = vi.fn().mockResolvedValue(undefined);

    startAutosaveBeforeUnloadFlushAction({
      addEventListener: (eventName, listener) => {
        listeners.set(eventName, listener);
      },
      removeEventListener: vi.fn(),
      flushPendingAutosave,
    });

    listeners.get("beforeunload")?.(new Event("beforeunload"));

    expect(flushPendingAutosave).toHaveBeenCalledTimes(1);
  });

  it("removes the registered listener and flushes once more during cleanup", () => {
    const listeners = new Map<string, EventListener>();
    const removeEventListener = vi.fn();
    const flushPendingAutosave = vi.fn().mockResolvedValue(undefined);

    const cleanup = startAutosaveBeforeUnloadFlushAction({
      addEventListener: (eventName, listener) => {
        listeners.set(eventName, listener);
      },
      removeEventListener,
      flushPendingAutosave,
    });

    cleanup();

    expect(removeEventListener).toHaveBeenCalledWith(
      "beforeunload",
      listeners.get("beforeunload"),
    );
    expect(flushPendingAutosave).toHaveBeenCalledTimes(1);
  });
});

describe("startAutosaveFlushRequestSubscriptionAction", () => {
  it("skips when the desktop bridge cannot subscribe to flush requests", () => {
    const flushPendingAutosave = vi.fn().mockResolvedValue(undefined);

    expect(
      startAutosaveFlushRequestSubscriptionAction({
        subscribeFlushRequest: undefined,
        flushPendingAutosave,
      }),
    ).toBeUndefined();

    expect(flushPendingAutosave).not.toHaveBeenCalled();
  });

  it("subscribes to bridge flush requests and flushes autosave when triggered", async () => {
    const requestListeners: Array<() => Promise<void> | void> = [];
    const unsubscribe = vi.fn();
    const subscribeFlushRequest = vi.fn((listener) => {
      requestListeners.push(listener);
      return unsubscribe;
    });
    const flushPendingAutosave = vi.fn().mockResolvedValue({
      status: "flushed",
    });

    const cleanup = startAutosaveFlushRequestSubscriptionAction({
      subscribeFlushRequest,
      flushPendingAutosave,
    });

    expect(cleanup).toBe(unsubscribe);
    expect(requestListeners).toHaveLength(1);
    await requestListeners[0]?.();

    expect(flushPendingAutosave).toHaveBeenCalledTimes(1);
  });
});
