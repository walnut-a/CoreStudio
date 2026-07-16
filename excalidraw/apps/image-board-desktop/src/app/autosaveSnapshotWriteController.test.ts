import type { AppState } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/element/types";
import { describe, expect, it, vi } from "vitest";

import type { DesktopProjectBundle } from "../shared/desktopBridgeTypes";
import type { ImageRecord, ProjectManifest } from "../shared/projectTypes";
import {
  createAutosaveSnapshotWriteRendererActions,
  runAutosaveSnapshotWriteAction,
  runAutosaveSnapshotWriteFailureAction,
  runQueuedAutosaveSnapshotWriteAction,
} from "./autosaveSnapshotWriteController";

const createManifest = (
  name: string,
  overrides: Partial<ProjectManifest> = {},
): ProjectManifest => ({
  formatVersion: 1,
  appVersion: "test",
  name,
  createdAt: "2026-07-05T00:00:00.000Z",
  updatedAt: "2026-07-05T00:00:00.000Z",
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
  imageRecords: Record<string, ImageRecord> = {},
): DesktopProjectBundle => ({
  projectPath,
  project: createManifest("当前项目"),
  sceneJson: "{}",
  imageRecords,
});

const createImageRecord = (fileId: string): ImageRecord => ({
  fileId,
  assetPath: `assets/${fileId}.png`,
  sourceType: "imported",
  width: 512,
  height: 512,
  createdAt: "2026-07-05T00:00:00.000Z",
  mimeType: "image/png",
});

const createImageElement = ({
  id,
  fileId,
}: {
  id: string;
  fileId: string;
}) =>
  ({
    id,
    type: "image",
    fileId,
  }) as unknown as ExcalidrawElement;

const createAppState = (selectedElementId: string) =>
  ({
    selectedElementIds: {
      [selectedElementId]: true,
    },
  }) as unknown as AppState;

describe("runAutosaveSnapshotWriteAction", () => {
  it("persists unknown canvas images, writes the scene, updates the active project and inspector state", async () => {
    const existingRecord = createImageRecord("file-1");
    const nextRecord = createImageRecord("file-2");
    const project = createProject("/projects/current", {
      "file-1": existingRecord,
    });
    const elements = [createImageElement({ id: "element-2", fileId: "file-2" })];
    const appState = createAppState("element-2");
    const files = {
      "file-2": {
        id: "file-2",
      },
    };
    const nextManifest = createManifest("当前项目", {
      updatedAt: "2026-07-05T00:01:00.000Z",
    });
    const persistUnknownCanvasImages = vi.fn(async () => ({
      "file-1": existingRecord,
      "file-2": nextRecord,
    }));
    const serializeScene = vi.fn(() => '{"type":"excalidraw"}');
    const writeProjectScene = vi.fn(async () => nextManifest);
    const setActiveProject = vi.fn();
    const updateSelectedInspector = vi.fn();

    const result = await runAutosaveSnapshotWriteAction({
      snapshot: {
        project,
        elements,
        appState,
        files,
        expectedSceneHash: "scene-hash",
      },
      getActiveProject: () => project,
      persistUnknownCanvasImages,
      serializeScene,
      writeProjectScene,
      setActiveProject,
      updateSelectedInspector,
    });

    expect(result.status).toBe("written");
    expect(persistUnknownCanvasImages).toHaveBeenCalledWith(
      project,
      elements,
      files,
    );
    expect(serializeScene).toHaveBeenCalledWith({
      elements,
      appState,
    });
    expect(writeProjectScene).toHaveBeenCalledWith({
      projectPath: "/projects/current",
      sceneJson: '{"type":"excalidraw"}',
      expectedSceneHash: "scene-hash",
    });
    expect(setActiveProject).toHaveBeenCalledWith({
      ...project,
      project: nextManifest,
      sceneJson: '{"type":"excalidraw"}',
      imageRecords: {
        "file-1": existingRecord,
        "file-2": nextRecord,
      },
    });
    expect(updateSelectedInspector).toHaveBeenCalledWith({
      elements,
      appState,
      imageRecords: {
        "file-1": existingRecord,
        "file-2": nextRecord,
      },
    });
  });

  it("skips active project and inspector updates when the project changed during the write", async () => {
    const project = createProject("/projects/current");
    const otherProject = createProject("/projects/other");
    const elements = [createImageElement({ id: "element-1", fileId: "file-1" })];
    const appState = createAppState("element-1");
    const files = {};
    const setActiveProject = vi.fn();
    const updateSelectedInspector = vi.fn();

    const result = await runAutosaveSnapshotWriteAction({
      snapshot: {
        project,
        elements,
        appState,
        files,
        expectedSceneHash: null,
      },
      getActiveProject: () => otherProject,
      persistUnknownCanvasImages: vi.fn(async () => ({})),
      serializeScene: vi.fn(() => "{}"),
      writeProjectScene: vi.fn(async () => createManifest("当前项目")),
      setActiveProject,
      updateSelectedInspector,
    });

    expect(result.status).toBe("stale-project");
    expect(setActiveProject).not.toHaveBeenCalled();
    expect(updateSelectedInspector).not.toHaveBeenCalled();
  });
});

describe("runQueuedAutosaveSnapshotWriteAction", () => {
  it("continues after a previous queued write failed and uses the latest scene hash for the active project", async () => {
    const project = createProject("/projects/current");
    const snapshot = {
      project,
      elements: [],
      appState: createAppState("element-1"),
      files: {},
      expectedSceneHash: "snapshot-hash",
    };
    const writeSnapshot = vi.fn(async () => undefined);
    const setQueue = vi.fn();
    const previousQueue = Promise.reject(new Error("旧写入失败"));
    previousQueue.catch(() => undefined);

    const result = runQueuedAutosaveSnapshotWriteAction({
      snapshot,
      currentQueue: previousQueue,
      activeProject: project,
      savedSceneHash: "latest-scene-hash",
      setQueue,
      writeSnapshot,
    });

    expect(setQueue).toHaveBeenCalledWith(result.promise);
    await result.promise;
    expect(writeSnapshot).toHaveBeenCalledWith({
      ...snapshot,
      expectedSceneHash: "latest-scene-hash",
    });
  });

  it("keeps the snapshot scene hash when the active project changed before the queued write", async () => {
    const project = createProject("/projects/current");
    const otherProject = createProject("/projects/other");
    const snapshot = {
      project,
      elements: [],
      appState: createAppState("element-1"),
      files: {},
      expectedSceneHash: "snapshot-hash",
    };
    const writeSnapshot = vi.fn(async () => undefined);

    const result = runQueuedAutosaveSnapshotWriteAction({
      snapshot,
      currentQueue: Promise.resolve(),
      activeProject: otherProject,
      savedSceneHash: "latest-scene-hash",
      setQueue: vi.fn(),
      writeSnapshot,
    });

    await result.promise;
    expect(writeSnapshot).toHaveBeenCalledWith({
      ...snapshot,
      expectedSceneHash: "snapshot-hash",
    });
  });
});

describe("runAutosaveSnapshotWriteFailureAction", () => {
  it("restores the failed snapshot and reports non-strict autosave errors", () => {
    const project = createProject("/projects/current");
    const snapshot = {
      project,
      elements: [],
      appState: createAppState("element-1"),
      files: {},
      expectedSceneHash: "scene-hash",
    };
    const error = new Error("保存失败");
    const setPendingSnapshot = vi.fn();
    const reportError = vi.fn();

    runAutosaveSnapshotWriteFailureAction({
      snapshot,
      error,
      strict: false,
      activeProject: project,
      hasPendingAutosave: false,
      setPendingSnapshot,
      reportError,
    });

    expect(setPendingSnapshot).toHaveBeenCalledWith(snapshot);
    expect(reportError).toHaveBeenCalledWith(error);
  });

  it("does not restore stale snapshots or report strict autosave errors", () => {
    const project = createProject("/projects/current");
    const snapshot = {
      project,
      elements: [],
      appState: createAppState("element-1"),
      files: {},
      expectedSceneHash: "scene-hash",
    };
    const setPendingSnapshot = vi.fn();
    const reportError = vi.fn();

    runAutosaveSnapshotWriteFailureAction({
      snapshot,
      error: new Error("保存失败"),
      strict: true,
      activeProject: createProject("/projects/other"),
      hasPendingAutosave: false,
      setPendingSnapshot,
      reportError,
    });

    expect(setPendingSnapshot).not.toHaveBeenCalled();
    expect(reportError).not.toHaveBeenCalled();
  });

  it("pauses autosave for a stale project snapshot without requeueing it", () => {
    const project = createProject("/projects/current");
    const snapshot = {
      project,
      elements: [],
      appState: createAppState("element-1"),
      files: {},
      expectedSceneHash: "scene-hash",
    };
    const error = Object.assign(
      new Error(
        "Error invoking remote method 'image-board:write-project-scene': Error: 画板文件已经被其他会话更新，已停止保存旧快照。",
      ),
      { code: "STALE_PROJECT_SNAPSHOT" },
    );
    const setPendingSnapshot = vi.fn();
    const reportError = vi.fn();
    const handleStaleSnapshot = vi.fn();

    runAutosaveSnapshotWriteFailureAction({
      snapshot,
      error,
      strict: false,
      activeProject: project,
      hasPendingAutosave: false,
      setPendingSnapshot,
      reportError,
      handleStaleSnapshot,
    });

    expect(setPendingSnapshot).not.toHaveBeenCalled();
    expect(reportError).not.toHaveBeenCalled();
    expect(handleStaleSnapshot).toHaveBeenCalledWith({
      error,
      projectPath: "/projects/current",
    });
  });
});

describe("createAutosaveSnapshotWriteRendererActions", () => {
  it("creates write, queue and pending snapshot helpers from the injected renderer state", async () => {
    const project = createProject("/projects/current");
    const nextManifest = createManifest("当前项目", {
      updatedAt: "2026-07-05T00:01:00.000Z",
    });
    const snapshot = {
      project,
      elements: [],
      appState: createAppState("element-1"),
      files: {},
      expectedSceneHash: "snapshot-hash",
    };
    const persistUnknownCanvasImages = vi.fn(async () => ({}));
    const serializeScene = vi.fn(() => "scene-json");
    const writeProjectScene = vi.fn(async () => nextManifest);
    const setActiveProject = vi.fn();
    const updateSelectedInspector = vi.fn();
    const setQueue = vi.fn();
    let pendingSnapshot: typeof snapshot | null = snapshot;
    const setPendingSnapshot = vi.fn((nextSnapshot) => {
      pendingSnapshot = nextSnapshot;
    });
    let currentQueue: Promise<unknown> = Promise.resolve();
    let activeProject: DesktopProjectBundle | null = project;
    let savedSceneHash: string | null = "latest-scene-hash";

    const actions = createAutosaveSnapshotWriteRendererActions({
      getActiveProject: () => activeProject,
      hasPendingAutosave: () => Boolean(pendingSnapshot),
      getPendingSnapshot: () => pendingSnapshot,
      setPendingSnapshot,
      getCurrentQueue: () => currentQueue,
      setQueue: (queue) => {
        currentQueue = queue;
        setQueue(queue);
      },
      getSavedSceneHash: () => savedSceneHash,
      persistUnknownCanvasImages,
      serializeScene,
      writeProjectScene,
      setActiveProject,
      updateSelectedInspector,
      reportError: vi.fn(),
    });

    await actions.write(snapshot);

    expect(writeProjectScene).toHaveBeenCalledWith({
      projectPath: "/projects/current",
      sceneJson: "scene-json",
      expectedSceneHash: "snapshot-hash",
    });

    const queuedPromise = actions.enqueue(snapshot);

    expect(setQueue).toHaveBeenCalledWith(queuedPromise);
    await queuedPromise;
    expect(writeProjectScene).toHaveBeenLastCalledWith({
      projectPath: "/projects/current",
      sceneJson: "scene-json",
      expectedSceneHash: "latest-scene-hash",
    });

    expect(actions.takePending()).toBe(snapshot);
    expect(pendingSnapshot).toBeNull();

    activeProject = createProject("/projects/other");
    savedSceneHash = "other-scene-hash";
    const staleQueuedPromise = actions.enqueue({
      ...snapshot,
      expectedSceneHash: "snapshot-hash",
    });
    await staleQueuedPromise;
    expect(writeProjectScene).toHaveBeenLastCalledWith({
      projectPath: "/projects/current",
      sceneJson: "scene-json",
      expectedSceneHash: "snapshot-hash",
    });
  });

  it("creates a write failure handler that reads the latest autosave state", () => {
    const project = createProject("/projects/current");
    const snapshot = {
      project,
      elements: [],
      appState: createAppState("element-1"),
      files: {},
      expectedSceneHash: "scene-hash",
    };
    const error = new Error("保存失败");
    const setPendingSnapshot = vi.fn();
    const reportError = vi.fn();
    let activeProject: DesktopProjectBundle | null = project;
    let hasPendingAutosave = false;

    const actions = createAutosaveSnapshotWriteRendererActions({
      getActiveProject: () => activeProject,
      hasPendingAutosave: () => hasPendingAutosave,
      getPendingSnapshot: () => null,
      setPendingSnapshot,
      getCurrentQueue: () => Promise.resolve(),
      setQueue: vi.fn(),
      getSavedSceneHash: () => null,
      persistUnknownCanvasImages: vi.fn(async () => ({})),
      serializeScene: vi.fn(() => "scene-json"),
      writeProjectScene: vi.fn(async () => createManifest("当前项目")),
      setActiveProject: vi.fn(),
      updateSelectedInspector: vi.fn(),
      reportError,
    });

    actions.handleWriteFailure({
      snapshot,
      error,
      strict: false,
    });

    expect(setPendingSnapshot).toHaveBeenCalledWith(snapshot);
    expect(reportError).toHaveBeenCalledWith(error);

    activeProject = createProject("/projects/other");
    hasPendingAutosave = true;
    setPendingSnapshot.mockClear();
    reportError.mockClear();

    actions.handleWriteFailure({
      snapshot,
      error,
      strict: true,
    });

    expect(setPendingSnapshot).not.toHaveBeenCalled();
    expect(reportError).not.toHaveBeenCalled();
  });
});
