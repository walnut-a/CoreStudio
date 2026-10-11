import { getDefaultAppState } from "@excalidraw/excalidraw/appState";
import { API } from "@excalidraw/excalidraw/tests/helpers/api";
import type { AppState } from "@excalidraw/excalidraw/types";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createCurrentProjectBundleOpenRendererActions,
  createCurrentProjectEditorInitializingRendererActions,
  createCurrentProjectEditorReadyRendererActions,
  createCurrentProjectEntryRendererActions,
  createCurrentProjectOpenSequenceRendererActions,
  createCurrentProjectUpdateRendererActions,
  createProjectViewClearRendererActions,
} from "./currentProjectApplyController";
import {
  formatProjectOpenError,
  formatProjectSaveBeforeOpenError,
} from "./currentProjectState";
import { serializeSceneForProject } from "./project/sceneSerialization";

import type {
  DesktopProjectBundle,
  ProjectAssetPayload,
} from "../shared/desktopBridgeTypes";
import type {
  ProjectBundleOpenAssetReadInput,
  ProjectBundleOpenData,
  ProjectBundleOpenLatestScene,
} from "./currentProjectOpenData";

const project = (name: string): DesktopProjectBundle => ({
  projectPath: `/projects/${name}`,
  project: {
    formatVersion: 1,
    appVersion: "test",
    name,
    createdAt: "2026-07-04T00:00:00.000Z",
    updatedAt: "2026-07-04T00:00:00.000Z",
    sceneFile: "scene.excalidraw.json",
    imageRecordsFile: "image-records.json",
    assetsDir: "assets",
    exportsDir: "exports",
    agentAccess: { enabled: true, token: "test-token" },
  },
  sceneJson: serializeSceneForProject({ elements: [], appState: {} }),
  imageRecords: {},
});

// 组合生产入口、序列校验、场景恢复和状态应用；只替换桌面/画布边界。
const setup = () => {
  const state = {
    project: project("original") as DesktopProjectBundle | null,
    loading: false,
    initializing: false,
    visibleLoading: false,
    initializingNonce: null as number | null,
    error: null as string | null,
    sequence: 0,
    initialData: null as ProjectBundleOpenData["initialData"] | null,
    reportOpen: true,
  };
  const editorApiRef = { current: null as { id: string } | null };
  const latestSceneRef = {
    current: null as ProjectBundleOpenLatestScene | null,
  };
  const projectRenderNonceRef = { current: 0 };
  const sequence = createCurrentProjectOpenSequenceRendererActions({
    getCurrentSequence: () => state.sequence,
    setCurrentSequenceRef: (value) => {
      state.sequence = value;
    },
  });
  const update = createCurrentProjectUpdateRendererActions({
    getPreviousProject: () => state.project,
    setCurrentProjectRef: (value) => {
      state.project = value;
    },
    setCurrentProject: () => {},
    setProjectHealthReport: () => {},
    setProjectRepairReport: () => {},
    setProjectHealthReportOpen: (value) => {
      state.reportOpen = value;
    },
    notifyProjectState: () => {},
    syncAgentBridgeStatus: () => {},
  });
  const initializing = createCurrentProjectEditorInitializingRendererActions({
    getCurrentRenderNonce: () => state.initializingNonce,
    setCurrentRenderNonceRef: (value) => {
      state.initializingNonce = value;
    },
    setInitializingRef: (value) => {
      state.initializing = value;
    },
    setInitializing: (value) => {
      state.visibleLoading = value;
    },
    getEditorApi: () => editorApiRef.current,
    scheduleFallbackTimeout: window.setTimeout,
    clearFallbackTimeout: window.clearTimeout,
  });
  const common = {
    beginProjectOpen: sequence.begin,
    isCurrentProjectOpen: sequence.isCurrent,
    flushProjectRoom: vi.fn(async () => {}),
    setProjectError: (value: string | null) => {
      state.error = value;
    },
    setLoadingProject: (value: boolean) => {
      state.loading = value;
    },
    clearProjectNotice: () => {},
    formatSaveBeforeOpenError: formatProjectSaveBeforeOpenError,
    formatOpenError: formatProjectOpenError,
    updateEditorInitializing: initializing.update,
    updateCurrentProject: update.update,
    setInitialData: (value: ProjectBundleOpenData["initialData"] | null) => {
      state.initialData = value;
    },
    editorApiRef,
    latestSceneRef,
    projectRenderNonceRef,
    lastCanvasPointerRef: { current: null },
    lastBatchBoundsRef: { current: null },
    setSelectedRecord: () => {},
    setSelectedTask: () => {},
    resetImageRenditionState: () => {},
    resetGenerationTrackingState: () => {},
    loadRecentProjectsState: vi.fn(async () => {}),
  };
  const readProjectAssets = vi.fn(
    async (
      _input: ProjectBundleOpenAssetReadInput,
    ): Promise<ProjectAssetPayload[]> => [],
  );
  const bundle = createCurrentProjectBundleOpenRendererActions({
    ...common,
    readProjectAssets,
    getDevicePixelRatio: () => 1,
    getFallbackCreatedAt: () => 1,
    setThumbnailMaintenance: () => {},
    markImageAssetRenditionsLoaded: () => {},
    setProjectRenderNonce: () => {},
    updateSceneImageFileIds: () => {},
    scheduleVisibleImageRenditionLoad: () => {},
    safeModeOpenedMessage: "安全模式",
    showProjectNotice: () => {},
    rebuildMissingThumbnails: () => {},
  });
  const clear = createProjectViewClearRendererActions({
    ...common,
    setSceneImageFileIds: () => {},
  });
  const bridge = {
    createProject: vi.fn(async () => project("created")),
    openProject: vi.fn(
      async (): Promise<DesktopProjectBundle | null> => project("opened"),
    ),
    openRecentProject: vi.fn(async (path: string) => ({
      ...project("recent"),
      projectPath: path,
    })),
    revealProjectInFinder: vi.fn(async () => {}),
  };
  const actions = createCurrentProjectEntryRendererActions({
    ...common,
    getBridge: () => bridge,
    getCurrentProject: () => state.project,
    openProjectBundle: bundle.open,
    clearProjectViewState: clear.clear,
    formatCreateError: formatProjectOpenError,
    formatRevealError: formatProjectOpenError,
  });
  const ready = createCurrentProjectEditorReadyRendererActions({
    getCurrentRenderNonce: () => projectRenderNonceRef.current,
    getLatestScene: () => latestSceneRef.current,
    setEditorApi: (api: { id: string }) => {
      editorApiRef.current = api;
    },
    flushQueuedImageFilesToCanvas: () => {},
    scheduleVisibleImageRenditionLoad: () => {},
    requestAnimationFrame: null,
    scheduleTimeout: window.setTimeout,
    clearInitializing: (nonce) => initializing.update(false, nonce),
  });
  return {
    ...common,
    state,
    actions,
    bridge,
    bundle,
    update,
    initializing,
    ready,
    readProjectAssets,
  };
};

afterEach(() => vi.useRealTimers());

describe("项目打开与切换", () => {
  it("完成打开、就绪、同项目更新、切换与返回列表", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const h = setup();
    await h.actions.openRecentProject("/projects/recent");
    expect(h.state).toMatchObject({
      project: { projectPath: "/projects/recent" },
      loading: false,
      initializing: true,
      reportOpen: false,
    });
    expect(h.state.initialData?.elements).toEqual([]);
    h.ready.ready({ id: "canvas" }, h.projectRenderNonceRef.current);
    await vi.runAllTimersAsync();
    expect(h.state.initializing).toBe(false);
    h.state.reportOpen = true;
    h.update.update({ ...h.state.project!, imageRecords: {} });
    expect(h.state.reportOpen).toBe(true);
    await h.actions.createProject();
    expect(h.state).toMatchObject({
      project: { projectPath: "/projects/created" },
      reportOpen: false,
    });
    await h.actions.switchToProjectList();
    expect(h.state).toMatchObject({
      project: null,
      initialData: null,
      initializing: false,
    });
    expect(h.latestSceneRef.current).toBeNull();
    expect(h.editorApiRef.current).toBeNull();
  });

  it("保存失败时保留当前项目，成功重试后才切换", async () => {
    const h = setup();
    h.flushProjectRoom.mockRejectedValueOnce(new Error("磁盘已满"));
    await h.actions.openProject();
    expect(h.state.project?.projectPath).toBe("/projects/original");
    expect(h.state.error).toContain("磁盘已满");
    expect(h.readProjectAssets).not.toHaveBeenCalled();
    expect(h.state.loading).toBe(false);
    await h.actions.openProject();
    expect(h.state.project?.projectPath).toBe("/projects/opened");
    expect(h.state.error).toBeNull();
  });

  it.each([
    ["save", "resolve"],
    ["save", "reject"],
    ["read", "resolve"],
    ["read", "reject"],
  ] as const)(
    "忽略旧项目 %s 阶段延迟的 %s，不覆盖新项目与加载状态",
    async (stage, outcome) => {
      const h = setup();
      let finish!: () => void;
      const pending = <T>(value: T) =>
        new Promise<T>((resolve, reject) => {
          finish = () =>
            outcome === "resolve"
              ? resolve(value)
              : reject(new Error("过期操作失败"));
        });
      if (stage === "save") {
        h.flushProjectRoom.mockImplementationOnce(() => pending(undefined));
      } else {
        h.readProjectAssets.mockImplementationOnce(() => pending([]));
      }
      const stale = h.actions.openProject();
      await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
      await h.actions.createProject();
      const accepted = { ...h.state };
      finish();
      await stale;
      expect(h.state).toEqual(accepted);
    },
  );

  it("重新打开裁切图片时使用原始像素坐标，即使图片不在视口内", async () => {
    const h = setup();
    const cropped = API.createElement({
      type: "image",
      fileId: "image-file",
      x: 10000,
      y: 10000,
      width: 200,
      height: 200,
    });
    const crop = {
      x: 200,
      y: 100,
      width: 600,
      height: 600,
      naturalWidth: 1024,
      naturalHeight: 1024,
    };
    Object.assign(cropped, { crop });
    const saved = project("cropped");
    saved.imageRecords = {
      "image-file": {
        fileId: "image-file",
        assetPath: "assets/image.png",
        sourceType: "imported",
        mimeType: "image/png",
        width: 1024,
        height: 1024,
        createdAt: saved.project.createdAt,
      },
    };
    saved.sceneJson = serializeSceneForProject({
      elements: [cropped],
      appState: {
        ...getDefaultAppState(),
        width: 800,
        height: 600,
        zoom: { value: 0.05 },
      } as AppState,
    });
    h.bridge.openProject.mockResolvedValueOnce(saved);
    h.readProjectAssets.mockImplementation(async ({ rendition }) => [
      {
        fileId: "image-file",
        rendition,
        mimeType: "image/png",
        dataBase64: rendition,
        width: rendition === "thumbnail" ? 320 : 1024,
        height: rendition === "thumbnail" ? 320 : 1024,
        createdAt: saved.project.createdAt,
      },
    ]);
    await h.actions.openProject();
    expect(h.state.initialData?.files?.["image-file"].dataURL).toBe(
      "data:image/png;base64,original",
    );
    expect(h.latestSceneRef.current?.elements[0]).toMatchObject({ crop });
  });
});
