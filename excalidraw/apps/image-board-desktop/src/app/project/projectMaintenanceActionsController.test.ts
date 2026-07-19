import { describe, expect, it, vi } from "vitest";

import {
  applyEmptyThumbnailMaintenanceState,
  applyProjectMaintenanceAssetSceneState,
  applyProjectMaintenanceActionState,
  applyProjectMaintenanceUiState,
  createProjectMaintenanceActionStateRendererApplier,
  createProjectMaintenanceRendererActions,
  createProjectRepairSceneRefreshRendererActions,
  createProjectThumbnailAssetRefreshRendererActions,
  createProjectThumbnailRebuildRendererActions,
  runProjectCacheCleanAction,
  runProjectHealthInspectionAction,
  runProjectRepairAction,
  runProjectThumbnailRebuildAction,
} from "./projectMaintenanceActionsController";

import type {
  CleanProjectCacheResult,
  ProjectAssetPayload,
  ProjectHealthReport,
  RebuildProjectThumbnailsResult,
} from "../../shared/desktopBridgeTypes";
import type { ImageRecordMap } from "../../shared/projectTypes";

const messages = {
  noProject: "请先打开项目。",
  noImages: "当前项目没有图片。",
  thumbnailsFailed: "项目数据修复失败。",
  thumbnailsRepaired: (
    generatedCount: number,
    skippedCount: number,
    failedCount: number,
    backupPath?: string | null,
    repairedGenerationRecordCount?: number,
    restoredImageRecordCount?: number,
    skippedImageRecordCount?: number,
  ) =>
    `修复完成：${generatedCount}/${skippedCount}/${failedCount}/${backupPath ?? "无备份"}/${repairedGenerationRecordCount}/${restoredImageRecordCount}/${skippedImageRecordCount}`,
  healthChecking: "正在检查项目数据",
  healthCheckFailed: "项目检查失败。",
  healthNeedsRepair: (
    errorCount: number,
    warningCount: number,
    repairableCount: number,
  ) => `发现 ${errorCount} 个错误、${warningCount} 个警告，其中 ${repairableCount} 项可修复。`,
  healthHasInfo: (infoCount: number) => `发现 ${infoCount} 条提示。`,
  healthHealthy: (imageRecordCount: number, generatedImageRecordCount: number) =>
    `项目正常：${imageRecordCount} 张图片，${generatedImageRecordCount} 张生成图。`,
  cacheCleanFailed: "缓存清理失败。",
  cacheCleaned: (removedFileCount: number, removedBytes: number) =>
    `已清理 ${removedFileCount} 个缓存文件，释放 ${removedBytes} 字节。`,
};

const createImageRecords = (): ImageRecordMap => ({
  "image-1": {
    fileId: "image-1",
    assetPath: "assets/image-1.png",
    sourceType: "generated",
    provider: "gemini",
    model: "model",
    width: 1024,
    height: 1024,
    createdAt: "2026-07-04T08:00:00.000Z",
    mimeType: "image/png",
  },
});

const createProject = () => ({
  projectPath: "/Projects/CoreStudio/工业设计助手",
  imageRecords: createImageRecords(),
});

const createRepairResult = (
  patch: Partial<RebuildProjectThumbnailsResult> = {},
): RebuildProjectThumbnailsResult => ({
  generatedFileIds: ["image-1"],
  skippedFileIds: [],
  failedFileIds: [],
  repairedGenerationRecordFileIds: ["image-1"],
  restoredBoardFileIds: ["image-1"],
  restoredSceneJson: "{\"type\":\"excalidraw\"}",
  skippedDetails: [],
  failedDetails: [],
  backupPath: "/tmp/project/backup.zip",
  ...patch,
});

const createHealthReport = (
  patch: Partial<ProjectHealthReport> = {},
): ProjectHealthReport => ({
  checkedAt: "2026-07-04T08:00:00.000Z",
  projectPath: "/Projects/CoreStudio/工业设计助手",
  imageRecordCount: 1,
  generatedImageRecordCount: 1,
  sceneImageFileCount: 1,
  missingImageRecordFileIds: [],
  missingAssetFileIds: [],
  missingThumbnailFileIds: [],
  missingPreviewFileIds: [],
  orphanImageRecordFileIds: [],
  orphanGeneratedImageRecordFileIds: [],
  incompleteGenerationRecordFileIds: [],
  brokenParentFileIds: [],
  brokenPromptReferenceFileIds: [],
  issues: [],
  summary: {
    errorCount: 0,
    warningCount: 0,
    repairableCount: 0,
  },
  ...patch,
});

describe("applyProjectMaintenanceUiState", () => {
  it("sets the project error and shows a project notice when provided", () => {
    const setProjectError = vi.fn();
    const showProjectNotice = vi.fn();
    const clearProjectNotice = vi.fn();

    applyProjectMaintenanceUiState({
      uiState: {
        projectError: null,
        projectNotice: "项目数据已修复。",
      },
      setProjectError,
      showProjectNotice,
      clearProjectNotice,
    });

    expect(setProjectError).toHaveBeenCalledWith(null);
    expect(showProjectNotice).toHaveBeenCalledWith("项目数据已修复。");
    expect(clearProjectNotice).not.toHaveBeenCalled();
  });

  it("clears the visible project notice when no notice should be shown", () => {
    const setProjectError = vi.fn();
    const showProjectNotice = vi.fn();
    const clearProjectNotice = vi.fn();

    applyProjectMaintenanceUiState({
      uiState: {
        projectError: "项目检查失败。",
        projectNotice: null,
      },
      setProjectError,
      showProjectNotice,
      clearProjectNotice,
    });

    expect(setProjectError).toHaveBeenCalledWith("项目检查失败。");
    expect(showProjectNotice).not.toHaveBeenCalled();
    expect(clearProjectNotice).toHaveBeenCalled();
  });
});

describe("applyProjectMaintenanceActionState", () => {
  it("applies an empty thumbnail maintenance state through the injected setter", () => {
    const setThumbnailMaintenance = vi.fn();

    const state = applyEmptyThumbnailMaintenanceState({
      setThumbnailMaintenance,
    });

    expect(state).toBeNull();
    expect(setThumbnailMaintenance).toHaveBeenCalledWith(null);
    expect(setThumbnailMaintenance).toHaveBeenCalledTimes(1);
  });

  it("applies reports, thumbnail maintenance, active project update, and UI state", () => {
    const project = createProject();
    const healthReport = createHealthReport();
    const repairReport = {
      generatedCount: 1,
      skippedCount: 0,
      failedCount: 0,
      repairedGenerationRecordCount: 1,
      restoredImageRecordCount: 1,
      skippedImageRecordCount: 0,
      skippedDetails: [],
      failedDetails: [],
      backupPath: "/tmp/project/backup.zip",
    };
    const setProjectHealthReport = vi.fn();
    const setProjectHealthReportOpen = vi.fn();
    const setProjectRepairReport = vi.fn();
    const setThumbnailMaintenance = vi.fn();
    const updateCurrentProject = vi.fn();
    const setProjectError = vi.fn();
    const showProjectNotice = vi.fn();
    const clearProjectNotice = vi.fn();

    applyProjectMaintenanceActionState({
      state: {
        projectHealthReport: healthReport,
        projectHealthReportOpen: true,
        projectRepairReport: repairReport,
        thumbnailMaintenance: {
          status: "failed",
          total: 2,
        },
        activeProjectUpdate: project,
        uiState: {
          projectError: null,
          projectNotice: "修复完成。",
        },
      },
      setProjectHealthReport,
      setProjectHealthReportOpen,
      setProjectRepairReport,
      setThumbnailMaintenance,
      updateCurrentProject,
      setProjectError,
      showProjectNotice,
      clearProjectNotice,
    });

    expect(setProjectHealthReport).toHaveBeenCalledWith(healthReport);
    expect(setProjectHealthReportOpen).toHaveBeenCalledWith(true);
    expect(setProjectRepairReport).toHaveBeenCalledWith(repairReport);
    expect(setThumbnailMaintenance).toHaveBeenCalledWith({
      status: "failed",
      total: 2,
    });
    expect(updateCurrentProject).toHaveBeenCalledWith(project);
    expect(setProjectError).toHaveBeenCalledWith(null);
    expect(showProjectNotice).toHaveBeenCalledWith("修复完成。");
    expect(clearProjectNotice).not.toHaveBeenCalled();
  });

  it("does not touch optional report fields that are not present", () => {
    const setProjectHealthReport = vi.fn();
    const setProjectHealthReportOpen = vi.fn();
    const setProjectRepairReport = vi.fn();
    const setThumbnailMaintenance = vi.fn();
    const updateCurrentProject = vi.fn();

    applyProjectMaintenanceActionState({
      state: {
        uiState: {
          projectError: null,
          projectNotice: null,
        },
      },
      setProjectHealthReport,
      setProjectHealthReportOpen,
      setProjectRepairReport,
      setThumbnailMaintenance,
      updateCurrentProject,
      setProjectError: vi.fn(),
      showProjectNotice: vi.fn(),
      clearProjectNotice: vi.fn(),
    });

    expect(setProjectHealthReport).not.toHaveBeenCalled();
    expect(setProjectHealthReportOpen).not.toHaveBeenCalled();
    expect(setProjectRepairReport).not.toHaveBeenCalled();
    expect(setThumbnailMaintenance).not.toHaveBeenCalled();
    expect(updateCurrentProject).not.toHaveBeenCalled();
  });
});

describe("createProjectMaintenanceActionStateRendererApplier", () => {
  it("creates an applier that keeps project maintenance patch wiring in the owner", () => {
    const project = createProject();
    const setProjectHealthReport = vi.fn();
    const setProjectHealthReportOpen = vi.fn();
    const setProjectRepairReport = vi.fn();
    const setThumbnailMaintenance = vi.fn();
    const updateCurrentProject = vi.fn();
    const setProjectError = vi.fn();
    const showProjectNotice = vi.fn();
    const clearProjectNotice = vi.fn();

    const applyState = createProjectMaintenanceActionStateRendererApplier({
      setProjectHealthReport,
      setProjectHealthReportOpen,
      setProjectRepairReport,
      setThumbnailMaintenance,
      updateCurrentProject,
      setProjectError,
      showProjectNotice,
      clearProjectNotice,
    });

    applyState({
      projectHealthReport: createHealthReport(),
      projectHealthReportOpen: true,
      projectRepairReport: {
        generatedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        repairedGenerationRecordCount: 0,
        restoredImageRecordCount: 0,
        skippedImageRecordCount: 0,
        skippedDetails: [],
        failedDetails: [],
        backupPath: null,
      },
      thumbnailMaintenance: {
        status: "pending",
        total: 1,
      },
      activeProjectUpdate: project,
      uiState: {
        projectError: null,
        projectNotice: "维护完成。",
      },
    });

    expect(setProjectHealthReport).toHaveBeenCalledWith(
      expect.objectContaining({
        projectPath: "/Projects/CoreStudio/工业设计助手",
      }),
    );
    expect(setProjectHealthReportOpen).toHaveBeenCalledWith(true);
    expect(setProjectRepairReport).toHaveBeenCalledWith(
      expect.objectContaining({
        backupPath: null,
      }),
    );
    expect(setThumbnailMaintenance).toHaveBeenCalledWith({
      status: "pending",
      total: 1,
    });
    expect(updateCurrentProject).toHaveBeenCalledWith(project);
    expect(setProjectError).toHaveBeenCalledWith(null);
    expect(showProjectNotice).toHaveBeenCalledWith("维护完成。");
    expect(clearProjectNotice).not.toHaveBeenCalled();
  });
});

describe("applyProjectMaintenanceAssetSceneState", () => {
  it("applies matching project maintenance assets to canvas files and latest scene", () => {
    const activeProject = createProject();
    const scene = {
      elements: [{ id: "element-a" }],
      appState: { zoom: { value: 1 } },
      files: {
        existing: { id: "existing" },
      },
    };
    const files = {
      "image-1": { id: "image-1" },
    };
    const applyFilesToCanvas = vi.fn();
    const setLatestScene = vi.fn();

    expect(
      applyProjectMaintenanceAssetSceneState({
        activeProject,
        projectPath: activeProject.projectPath,
        assetCount: 1,
        scene,
        buildFiles: () => files,
        applyFilesToCanvas,
        setLatestScene,
      }),
    ).toBe(true);

    expect(applyFilesToCanvas).toHaveBeenCalledWith([{ id: "image-1" }]);
    expect(setLatestScene).toHaveBeenCalledWith({
      ...scene,
      files: {
        existing: { id: "existing" },
        "image-1": { id: "image-1" },
      },
    });
  });

  it("skips project maintenance asset application without side effects", () => {
    const applyFilesToCanvas = vi.fn();
    const setLatestScene = vi.fn();
    const buildFiles = vi.fn(() => ({
      "image-1": { id: "image-1" },
    }));

    expect(
      applyProjectMaintenanceAssetSceneState({
        activeProject: null,
        projectPath: "/Projects/CoreStudio/工业设计助手",
        assetCount: 1,
        scene: {
          files: {},
        },
        buildFiles,
        applyFilesToCanvas,
        setLatestScene,
      }),
    ).toBe(false);

    expect(buildFiles).not.toHaveBeenCalled();
    expect(applyFilesToCanvas).not.toHaveBeenCalled();
    expect(setLatestScene).not.toHaveBeenCalled();
  });
});

describe("runProjectRepairAction", () => {
  it("applies blocked UI state when no project is open", async () => {
    const applyState = vi.fn();

    await expect(
      runProjectRepairAction({
        project: null,
        repairProjectThumbnails: vi.fn(),
        getActiveProject: () => null,
        loadedPreviewFileIds: new Set(),
        loadedOriginalFileIds: new Set(),
        messages,
        formatError: (error, fallback) =>
          error instanceof Error ? error.message : fallback,
        refreshThumbnailAssets: vi.fn(),
        refreshSceneFromRepair: vi.fn(),
        applyState,
      }),
    ).resolves.toEqual({ status: "blocked" });

    expect(applyState).toHaveBeenCalledWith({
      uiState: {
        projectError: "请先打开项目。",
        projectNotice: null,
      },
    });
  });

  it("repairs the active project and applies refreshed project state", async () => {
    const project = createProject();
    const repairProjectThumbnails = vi.fn().mockResolvedValue(createRepairResult());
    const refreshThumbnailAssets = vi.fn().mockResolvedValue(undefined);
    const refreshSceneFromRepair = vi
      .fn()
      .mockResolvedValue({ restoredCount: 1, skippedCount: 0 });
    const applyState = vi.fn();

    await expect(
      runProjectRepairAction({
        project,
        repairProjectThumbnails,
        getActiveProject: () => project,
        loadedPreviewFileIds: new Set(),
        loadedOriginalFileIds: new Set(),
        messages,
        formatError: (error, fallback) =>
          error instanceof Error ? error.message : fallback,
        refreshThumbnailAssets,
        refreshSceneFromRepair,
        applyState,
      }),
    ).resolves.toEqual({ status: "applied" });

    expect(repairProjectThumbnails).toHaveBeenCalledWith({
      projectPath: "/Projects/CoreStudio/工业设计助手",
      fileIds: ["image-1"],
      force: true,
      createBackup: true,
    });
    expect(applyState).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        projectHealthReport: null,
        projectHealthReportOpen: false,
        projectRepairReport: null,
        thumbnailMaintenance: {
          status: "pending",
          total: 1,
        },
        uiState: {
          projectError: null,
          projectNotice: null,
        },
      }),
    );
    expect(refreshThumbnailAssets).toHaveBeenCalledWith({
      project,
      fileIds: ["image-1"],
    });
    expect(refreshSceneFromRepair).toHaveBeenCalledWith(
      expect.objectContaining({
        project: expect.objectContaining({
          imageRecords: expect.objectContaining({
            "image-1": expect.objectContaining({
              generationOrigin: "corestudio",
            }),
          }),
        }),
        imageRecords: expect.objectContaining({
          "image-1": expect.objectContaining({
            generationOrigin: "corestudio",
          }),
        }),
        restoredSceneJson: "{\"type\":\"excalidraw\"}",
        restoredBoardFileIds: ["image-1"],
      }),
    );
    expect(applyState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        activeProjectUpdate: expect.objectContaining({
          imageRecords: expect.objectContaining({
            "image-1": expect.objectContaining({
              generationOrigin: "corestudio",
            }),
          }),
        }),
        projectRepairReport: expect.objectContaining({
          generatedCount: 1,
          skippedCount: 0,
          failedCount: 0,
          repairedGenerationRecordCount: 1,
          restoredImageRecordCount: 1,
        }),
        thumbnailMaintenance: null,
        uiState: {
          projectError: null,
          projectNotice:
            "修复完成：1/0/0//tmp/project/backup.zip/1/1/0",
        },
      }),
    );
  });

  it("ignores a completed repair when the active project changed", async () => {
    const project = createProject();
    const applyState = vi.fn();
    const refreshThumbnailAssets = vi.fn();
    const refreshSceneFromRepair = vi.fn();

    await expect(
      runProjectRepairAction({
        project,
        repairProjectThumbnails: vi.fn().mockResolvedValue(createRepairResult()),
        getActiveProject: () => ({
          projectPath: "/Projects/CoreStudio/另一个项目",
          imageRecords: createImageRecords(),
        }),
        loadedPreviewFileIds: new Set(),
        loadedOriginalFileIds: new Set(),
        messages,
        formatError: (error, fallback) =>
          error instanceof Error ? error.message : fallback,
        refreshThumbnailAssets,
        refreshSceneFromRepair,
        applyState,
      }),
    ).resolves.toEqual({ status: "stale" });

    expect(applyState).toHaveBeenCalledTimes(1);
    expect(refreshThumbnailAssets).not.toHaveBeenCalled();
    expect(refreshSceneFromRepair).not.toHaveBeenCalled();
  });

  it("applies failure state only when the project is still active", async () => {
    const project = createProject();
    const applyState = vi.fn();

    await expect(
      runProjectRepairAction({
        project,
        repairProjectThumbnails: vi
          .fn()
          .mockRejectedValue(new Error("修复失败")),
        getActiveProject: () => project,
        loadedPreviewFileIds: new Set(),
        loadedOriginalFileIds: new Set(),
        messages,
        formatError: (error, fallback) =>
          error instanceof Error ? error.message : fallback,
        refreshThumbnailAssets: vi.fn(),
        refreshSceneFromRepair: vi.fn(),
        applyState,
      }),
    ).resolves.toEqual({ status: "failed" });

    expect(applyState).toHaveBeenLastCalledWith({
      projectHealthReport: null,
      projectHealthReportOpen: false,
      projectRepairReport: null,
      thumbnailMaintenance: {
        status: "failed",
        total: 1,
      },
      uiState: {
        projectError: "修复失败",
        projectNotice: null,
      },
    });
  });

  it("uses the owner fallback message when repair fails without an injected formatter", async () => {
    const project = createProject();
    const applyState = vi.fn();

    await expect(
      runProjectRepairAction({
        project,
        repairProjectThumbnails: vi.fn().mockRejectedValue(""),
        getActiveProject: () => project,
        loadedPreviewFileIds: new Set(),
        loadedOriginalFileIds: new Set(),
        messages,
        refreshThumbnailAssets: vi.fn(),
        refreshSceneFromRepair: vi.fn(),
        applyState,
      }),
    ).resolves.toEqual({ status: "failed" });

    expect(applyState).toHaveBeenLastCalledWith({
      projectHealthReport: null,
      projectHealthReportOpen: false,
      projectRepairReport: null,
      thumbnailMaintenance: {
        status: "failed",
        total: 1,
      },
      uiState: {
        projectError: "项目数据修复失败。",
        projectNotice: null,
      },
    });
  });
});

describe("runProjectThumbnailRebuildAction", () => {
  it("skips when there are no file ids to rebuild", async () => {
    const rebuildProjectThumbnails = vi.fn();
    const refreshThumbnailAssets = vi.fn();
    const applyThumbnailMaintenance = vi.fn();

    await expect(
      runProjectThumbnailRebuildAction({
        project: createProject(),
        fileIds: [],
        rebuildProjectThumbnails,
        getActiveProjectPath: () => "/Projects/CoreStudio/工业设计助手",
        loadedPreviewFileIds: new Set(),
        loadedOriginalFileIds: new Set(),
        refreshThumbnailAssets,
        applyThumbnailMaintenance,
      }),
    ).resolves.toEqual({ status: "skipped" });

    expect(rebuildProjectThumbnails).not.toHaveBeenCalled();
    expect(refreshThumbnailAssets).not.toHaveBeenCalled();
    expect(applyThumbnailMaintenance).not.toHaveBeenCalled();
  });

  it("applies failure maintenance when rebuild capability is missing", async () => {
    const applyThumbnailMaintenance = vi.fn();

    await expect(
      runProjectThumbnailRebuildAction({
        project: createProject(),
        fileIds: ["image-1", "image-1"],
        rebuildProjectThumbnails: null,
        getActiveProjectPath: () => "/Projects/CoreStudio/工业设计助手",
        loadedPreviewFileIds: new Set(),
        loadedOriginalFileIds: new Set(),
        refreshThumbnailAssets: vi.fn(),
        applyThumbnailMaintenance,
      }),
    ).resolves.toEqual({ status: "blocked" });

    expect(applyThumbnailMaintenance).toHaveBeenCalledWith({
      status: "failed",
      total: 1,
    });
  });

  it("rebuilds thumbnails for the active project and refreshes unloaded assets", async () => {
    const project = createProject();
    const rebuildProjectThumbnails = vi.fn().mockResolvedValue(
      createRepairResult({
        generatedFileIds: ["image-1", "image-2"],
        skippedFileIds: ["image-3"],
        failedFileIds: [],
        repairedGenerationRecordFileIds: [],
        restoredBoardFileIds: [],
        restoredSceneJson: undefined,
      }),
    );
    const refreshThumbnailAssets = vi.fn().mockResolvedValue(undefined);
    const applyThumbnailMaintenance = vi.fn();

    await expect(
      runProjectThumbnailRebuildAction({
        project,
        fileIds: ["image-1", "image-2", "image-2"],
        rebuildProjectThumbnails,
        getActiveProjectPath: () => "/Projects/CoreStudio/工业设计助手",
        loadedPreviewFileIds: new Set(["image-2"]),
        loadedOriginalFileIds: new Set(),
        refreshThumbnailAssets,
        applyThumbnailMaintenance,
      }),
    ).resolves.toEqual({ status: "applied" });

    expect(rebuildProjectThumbnails).toHaveBeenCalledWith({
      projectPath: "/Projects/CoreStudio/工业设计助手",
      fileIds: ["image-1", "image-2"],
    });
    expect(applyThumbnailMaintenance).toHaveBeenCalledWith(null);
    expect(refreshThumbnailAssets).toHaveBeenCalledWith({
      project,
      fileIds: ["image-1", "image-3"],
    });
  });

  it("ignores a completed rebuild when the active project changed", async () => {
    const applyThumbnailMaintenance = vi.fn();
    const refreshThumbnailAssets = vi.fn();

    await expect(
      runProjectThumbnailRebuildAction({
        project: createProject(),
        fileIds: ["image-1"],
        rebuildProjectThumbnails: vi.fn().mockResolvedValue(createRepairResult()),
        getActiveProjectPath: () => "/Projects/CoreStudio/另一个项目",
        loadedPreviewFileIds: new Set(),
        loadedOriginalFileIds: new Set(),
        refreshThumbnailAssets,
        applyThumbnailMaintenance,
      }),
    ).resolves.toEqual({ status: "stale" });

    expect(applyThumbnailMaintenance).not.toHaveBeenCalled();
    expect(refreshThumbnailAssets).not.toHaveBeenCalled();
  });
});

describe("createProjectThumbnailRebuildRendererActions", () => {
  it("creates a rebuild handler that reads latest active project and refreshes unloaded thumbnail assets", async () => {
    const project = createProject();
    const rebuiltResult = createRepairResult({
      generatedFileIds: ["image-1", "image-2"],
      skippedFileIds: ["image-3"],
      failedFileIds: [],
      repairedGenerationRecordFileIds: [],
      restoredBoardFileIds: [],
      restoredSceneJson: undefined,
    });
    const rebuildProjectThumbnails = vi.fn().mockResolvedValue(rebuiltResult);
    const loadedPreviewFileIds = new Set(["image-2"]);
    const loadedOriginalFileIds = new Set(["image-original"]);
    const image1Thumbnail = {
      fileId: "image-1",
      rendition: "thumbnail",
    } as ProjectAssetPayload;
    const image2Thumbnail = {
      fileId: "image-2",
      rendition: "thumbnail",
    } as ProjectAssetPayload;
    const readThumbnailAssets = vi
      .fn()
      .mockResolvedValue([image1Thumbnail, image2Thumbnail]);
    const applyThumbnailAssetsToScene = vi.fn();
    const applyThumbnailMaintenance = vi.fn();

    const actions = createProjectThumbnailRebuildRendererActions({
      getActiveProject: () => project,
      getLoadedPreviewFileIds: () => loadedPreviewFileIds,
      getLoadedOriginalFileIds: () => loadedOriginalFileIds,
      rebuildProjectThumbnails,
      readThumbnailAssets,
      applyThumbnailAssetsToScene,
      applyThumbnailMaintenance,
    });

    await expect(
      actions.rebuildMissing(project, ["image-1", "image-2"]),
    ).resolves.toEqual({ status: "applied" });

    expect(rebuildProjectThumbnails).toHaveBeenCalledWith({
      projectPath: project.projectPath,
      fileIds: ["image-1", "image-2"],
    });
    expect(readThumbnailAssets).toHaveBeenCalledWith({
      project,
      fileIds: ["image-1", "image-3"],
    });
    expect(applyThumbnailAssetsToScene).toHaveBeenCalledWith(project, [
      image1Thumbnail,
    ]);
    expect(applyThumbnailMaintenance).toHaveBeenCalledWith(null);
  });

  it("keeps stale rebuild results from refreshing the current scene", async () => {
    const project = createProject();
    const readThumbnailAssets = vi.fn();
    const applyThumbnailAssetsToScene = vi.fn();
    const applyThumbnailMaintenance = vi.fn();

    const actions = createProjectThumbnailRebuildRendererActions({
      getActiveProject: () => ({
        ...project,
        projectPath: "/Projects/CoreStudio/另一个项目",
      }),
      getLoadedPreviewFileIds: () => new Set(),
      getLoadedOriginalFileIds: () => new Set(),
      rebuildProjectThumbnails: vi.fn().mockResolvedValue(createRepairResult()),
      readThumbnailAssets,
      applyThumbnailAssetsToScene,
      applyThumbnailMaintenance,
    });

    await expect(
      actions.rebuildMissing(project, ["image-1"]),
    ).resolves.toEqual({ status: "stale" });

    expect(readThumbnailAssets).not.toHaveBeenCalled();
    expect(applyThumbnailAssetsToScene).not.toHaveBeenCalled();
    expect(applyThumbnailMaintenance).not.toHaveBeenCalled();
  });
});

describe("createProjectThumbnailAssetRefreshRendererActions", () => {
  it("creates a refresh handler that filters loaded thumbnail assets before applying the scene assets", async () => {
    const project = createProject();
    const loadedPreviewFileIds = new Set(["image-2"]);
    const loadedOriginalFileIds = new Set(["image-3"]);
    const image1Thumbnail = {
      fileId: "image-1",
      rendition: "thumbnail",
    } as ProjectAssetPayload;
    const image2Thumbnail = {
      fileId: "image-2",
      rendition: "thumbnail",
    } as ProjectAssetPayload;
    const image3Thumbnail = {
      fileId: "image-3",
      rendition: "thumbnail",
    } as ProjectAssetPayload;
    const readThumbnailAssets = vi
      .fn()
      .mockResolvedValue([image1Thumbnail, image2Thumbnail, image3Thumbnail]);
    const applyThumbnailAssetsToScene = vi.fn();

    const actions = createProjectThumbnailAssetRefreshRendererActions({
      getLoadedPreviewFileIds: () => loadedPreviewFileIds,
      getLoadedOriginalFileIds: () => loadedOriginalFileIds,
      readThumbnailAssets,
      applyThumbnailAssetsToScene,
    });

    await expect(
      actions.refresh({
        project,
        fileIds: ["image-1", "image-2", "image-3"],
      }),
    ).resolves.toEqual({ status: "applied", appliedAssetCount: 1 });

    expect(readThumbnailAssets).toHaveBeenCalledWith({
      project,
      fileIds: ["image-1", "image-2", "image-3"],
    });
    expect(applyThumbnailAssetsToScene).toHaveBeenCalledWith(project, [
      image1Thumbnail,
    ]);
  });

  it("skips empty refresh requests without reading thumbnail assets", async () => {
    const readThumbnailAssets = vi.fn();
    const applyThumbnailAssetsToScene = vi.fn();

    const actions = createProjectThumbnailAssetRefreshRendererActions({
      getLoadedPreviewFileIds: () => new Set(),
      getLoadedOriginalFileIds: () => new Set(),
      readThumbnailAssets,
      applyThumbnailAssetsToScene,
    });

    await expect(
      actions.refresh({
        project: createProject(),
        fileIds: [],
      }),
    ).resolves.toEqual({ status: "skipped", appliedAssetCount: 0 });

    expect(readThumbnailAssets).not.toHaveBeenCalled();
    expect(applyThumbnailAssetsToScene).not.toHaveBeenCalled();
  });
});

describe("createProjectRepairSceneRefreshRendererActions", () => {
  it("refreshes a restored scene and applies canvas, project, and selection state", async () => {
    const project = {
      ...createProject(),
      sceneJson: "{\"type\":\"excalidraw\"}",
    };
    const imageRecords = createImageRecords();
    const restoredElements = [{ id: "element-a", type: "image" }];
    const restoredAppState = { selectedElementIds: { "element-a": true } };
    const thumbnailAsset = {
      fileId: "image-1",
      rendition: "thumbnail",
      mimeType: "image/png",
      dataBase64: "thumb",
      width: 128,
      height: 128,
      createdAt: "2026-07-04T08:00:00.000Z",
    } as ProjectAssetPayload;
    const currentFiles: Record<string, unknown> = {
      existing: { id: "existing" },
    };
    const builtFiles: Record<string, unknown> = {
      "image-1": { id: "image-1", dataURL: "data:image/png;base64,thumb" },
    };
    const setLatestScene = vi.fn();
    const applyCanvasScene = vi.fn();
    const updateSceneImageFileIds = vi.fn();
    const scheduleVisibleImageRenditionLoad = vi.fn();
    const updateWorkspaceOverlay = vi.fn();
    const updateCurrentProject = vi.fn();
    const updateSelectedInspector = vi.fn();

    const actions = createProjectRepairSceneRefreshRendererActions({
      getActiveProject: () => project,
      getCurrentFiles: () => currentFiles,
      getFallbackCreatedAt: () => 1000,
      deserializeScene: vi.fn(async () => ({
        elements: restoredElements,
        appState: restoredAppState,
      })),
      readThumbnailAssets: vi.fn(async () => [thumbnailAsset]),
      buildFiles: vi.fn(() => builtFiles),
      applyCanvasScene,
      setLatestScene,
      updateSceneImageFileIds,
      scheduleVisibleImageRenditionLoad,
      updateWorkspaceOverlay,
      updateCurrentProject,
      updateSelectedInspector,
    });

    await expect(
      actions.refresh({
        project,
        imageRecords,
        restoredSceneJson: "{\"restored\":true}",
        restoredBoardFileIds: ["image-1", "image-2"],
      }),
    ).resolves.toEqual({
      restoredCount: 2,
      skippedCount: 1,
    });

    expect(applyCanvasScene).toHaveBeenCalledWith({
      elements: restoredElements,
      appState: restoredAppState,
      files: builtFiles,
    });
    const nextScene = {
      elements: restoredElements,
      appState: restoredAppState,
      files: {
        existing: { id: "existing" },
        ...builtFiles,
      },
    };
    expect(setLatestScene).toHaveBeenCalledWith(nextScene);
    expect(updateSceneImageFileIds).toHaveBeenCalledWith(restoredElements);
    expect(scheduleVisibleImageRenditionLoad).toHaveBeenCalledWith(nextScene);
    expect(updateWorkspaceOverlay).toHaveBeenCalledWith(
      restoredElements,
      restoredAppState,
    );
    expect(updateCurrentProject).toHaveBeenCalledWith({
      ...project,
      imageRecords,
      sceneJson: "{\"restored\":true}",
    });
    expect(updateSelectedInspector).toHaveBeenCalledWith({
      elements: restoredElements,
      appState: restoredAppState,
      imageRecords,
    });
  });

  it("skips refresh side effects when the restored scene is absent or stale", async () => {
    const project = {
      ...createProject(),
      sceneJson: "{\"type\":\"excalidraw\"}",
    };
    const applyCanvasScene = vi.fn();
    const setLatestScene = vi.fn();

    const actions = createProjectRepairSceneRefreshRendererActions({
      getActiveProject: () => null,
      getCurrentFiles: () => ({}),
      getFallbackCreatedAt: () => 1000,
      deserializeScene: vi.fn(),
      readThumbnailAssets: vi.fn(),
      buildFiles: vi.fn(),
      applyCanvasScene,
      setLatestScene,
      updateSceneImageFileIds: vi.fn(),
      scheduleVisibleImageRenditionLoad: vi.fn(),
      updateWorkspaceOverlay: vi.fn(),
      updateCurrentProject: vi.fn(),
      updateSelectedInspector: vi.fn(),
    });

    await expect(
      actions.refresh({
        project,
        imageRecords: createImageRecords(),
        restoredSceneJson: "{\"restored\":true}",
        restoredBoardFileIds: ["image-1"],
      }),
    ).resolves.toEqual({
      restoredCount: 0,
      skippedCount: 1,
    });

    expect(applyCanvasScene).not.toHaveBeenCalled();
    expect(setLatestScene).not.toHaveBeenCalled();
  });
});

describe("runProjectHealthInspectionAction", () => {
  it("applies blocked UI state when no project is open", async () => {
    const applyState = vi.fn();

    await expect(
      runProjectHealthInspectionAction({
        project: null,
        inspectProjectHealth: vi.fn(),
        getActiveProjectPath: () => null,
        messages,
        formatError: (error, fallback) =>
          error instanceof Error ? error.message : fallback,
        applyState,
      }),
    ).resolves.toEqual({ status: "blocked" });

    expect(applyState).toHaveBeenCalledWith({
      uiState: {
        projectError: "请先打开项目。",
        projectNotice: null,
      },
    });
  });

  it("applies start and success state for the active project", async () => {
    const report = createHealthReport();
    const inspectProjectHealth = vi.fn().mockResolvedValue(report);
    const applyState = vi.fn();

    await expect(
      runProjectHealthInspectionAction({
        project: createProject(),
        inspectProjectHealth,
        getActiveProjectPath: () => "/Projects/CoreStudio/工业设计助手",
        messages,
        formatError: (error, fallback) =>
          error instanceof Error ? error.message : fallback,
        applyState,
      }),
    ).resolves.toEqual({ status: "applied" });

    expect(inspectProjectHealth).toHaveBeenCalledWith({
      projectPath: "/Projects/CoreStudio/工业设计助手",
    });
    expect(applyState).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        projectHealthReport: null,
        projectHealthReportOpen: false,
        projectRepairReport: null,
        thumbnailMaintenance: {
          status: "pending",
          total: 1,
          message: "正在检查项目数据",
        },
        uiState: {
          projectError: null,
          projectNotice: null,
        },
      }),
    );
    expect(applyState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        projectHealthReport: report,
        projectHealthReportOpen: false,
        projectRepairReport: null,
        thumbnailMaintenance: null,
        uiState: {
          projectError: null,
          projectNotice: "项目正常：1 张图片，1 张生成图。",
        },
      }),
    );
  });

  it("ignores a completed inspection when the active project changed", async () => {
    const applyState = vi.fn();

    await expect(
      runProjectHealthInspectionAction({
        project: createProject(),
        inspectProjectHealth: vi.fn().mockResolvedValue(createHealthReport()),
        getActiveProjectPath: () => "/Projects/CoreStudio/另一个项目",
        messages,
        formatError: (error, fallback) =>
          error instanceof Error ? error.message : fallback,
        applyState,
      }),
    ).resolves.toEqual({ status: "stale" });

    expect(applyState).toHaveBeenCalledTimes(1);
  });

  it("uses the owner fallback message when inspection fails without an injected formatter", async () => {
    const applyState = vi.fn();

    await expect(
      runProjectHealthInspectionAction({
        project: createProject(),
        inspectProjectHealth: vi.fn().mockRejectedValue(""),
        getActiveProjectPath: () => "/Projects/CoreStudio/工业设计助手",
        messages,
        applyState,
      }),
    ).resolves.toEqual({ status: "failed" });

    expect(applyState).toHaveBeenLastCalledWith({
      projectHealthReport: null,
      projectHealthReportOpen: false,
      projectRepairReport: null,
      thumbnailMaintenance: null,
      uiState: {
        projectError: "项目检查失败。",
        projectNotice: null,
      },
    });
  });
});

describe("runProjectCacheCleanAction", () => {
  it("applies success state for cache clean", async () => {
    const result: CleanProjectCacheResult = {
      removedFileCount: 3,
      removedBytes: 2048,
      skippedFileCount: 1,
    };
    const applyState = vi.fn();

    await expect(
      runProjectCacheCleanAction({
        project: createProject(),
        cleanProjectCache: vi.fn().mockResolvedValue(result),
        getActiveProjectPath: () => "/Projects/CoreStudio/工业设计助手",
        messages,
        formatError: (error, fallback) =>
          error instanceof Error ? error.message : fallback,
        applyState,
      }),
    ).resolves.toEqual({ status: "applied" });

    expect(applyState).toHaveBeenNthCalledWith(1, {
      uiState: {
        projectError: null,
        projectNotice: null,
      },
    });
    expect(applyState).toHaveBeenLastCalledWith({
      uiState: {
        projectError: null,
        projectNotice: "已清理 3 个缓存文件，释放 2048 字节。",
      },
    });
  });

  it("applies failure state only when the project is still active", async () => {
    const applyState = vi.fn();

    await expect(
      runProjectCacheCleanAction({
        project: createProject(),
        cleanProjectCache: vi.fn().mockRejectedValue(new Error("清理失败")),
        getActiveProjectPath: () => "/Projects/CoreStudio/工业设计助手",
        messages,
        formatError: (error, fallback) =>
          error instanceof Error ? error.message : fallback,
        applyState,
      }),
    ).resolves.toEqual({ status: "failed" });

    expect(applyState).toHaveBeenLastCalledWith({
      uiState: {
        projectError: "清理失败",
        projectNotice: null,
      },
    });
  });

  it("uses the owner fallback message when cache clean fails without an injected formatter", async () => {
    const applyState = vi.fn();

    await expect(
      runProjectCacheCleanAction({
        project: createProject(),
        cleanProjectCache: vi.fn().mockRejectedValue(""),
        getActiveProjectPath: () => "/Projects/CoreStudio/工业设计助手",
        messages,
        applyState,
      }),
    ).resolves.toEqual({ status: "failed" });

    expect(applyState).toHaveBeenLastCalledWith({
      uiState: {
        projectError: "缓存清理失败。",
        projectNotice: null,
      },
    });
  });
});

describe("createProjectMaintenanceRendererActions", () => {
  const createRendererActions = () => {
    let currentProject: ReturnType<typeof createProject> | null =
      createProject();
    const repairProjectThumbnails = vi
      .fn()
      .mockResolvedValue(createRepairResult());
    const inspectProjectHealth = vi.fn().mockResolvedValue(createHealthReport());
    const cleanProjectCache = vi.fn().mockResolvedValue({
      removedFileCount: 2,
      removedBytes: 1024,
      skippedFileCount: 0,
    } satisfies CleanProjectCacheResult);
    const refreshThumbnailAssets = vi.fn().mockResolvedValue(undefined);
    const refreshSceneFromRepair = vi
      .fn()
      .mockResolvedValue({ restoredCount: 1, skippedCount: 0 });
    const applyState = vi.fn();

    const actions = createProjectMaintenanceRendererActions({
      getProject: () => currentProject,
      getActiveProject: () => currentProject,
      getLoadedPreviewFileIds: () => new Set(),
      getLoadedOriginalFileIds: () => new Set(),
      repairProjectThumbnails,
      inspectProjectHealth,
      cleanProjectCache,
      messages,
      refreshThumbnailAssets,
      refreshSceneFromRepair,
      applyState,
    });

    return {
      actions,
      setCurrentProject: (
        project: ReturnType<typeof createProject> | null,
      ) => {
        currentProject = project;
      },
      repairProjectThumbnails,
      inspectProjectHealth,
      cleanProjectCache,
      refreshThumbnailAssets,
      refreshSceneFromRepair,
      applyState,
    };
  };

  it("creates a repair action that reads current project state at execution time", async () => {
    const {
      actions,
      setCurrentProject,
      repairProjectThumbnails,
      refreshThumbnailAssets,
      refreshSceneFromRepair,
      applyState,
    } = createRendererActions();
    setCurrentProject(null);

    await expect(actions.repair()).resolves.toEqual({ status: "blocked" });
    expect(repairProjectThumbnails).not.toHaveBeenCalled();

    setCurrentProject(createProject());
    await expect(actions.repair()).resolves.toEqual({ status: "applied" });

    expect(repairProjectThumbnails).toHaveBeenCalledWith({
      projectPath: "/Projects/CoreStudio/工业设计助手",
      fileIds: ["image-1"],
      force: true,
      createBackup: true,
    });
    expect(refreshThumbnailAssets).toHaveBeenCalledWith({
      project: expect.objectContaining({
        projectPath: "/Projects/CoreStudio/工业设计助手",
      }),
      fileIds: ["image-1"],
    });
    expect(refreshSceneFromRepair).toHaveBeenCalled();
    expect(applyState).toHaveBeenCalled();
  });

  it("creates health and cache actions that share the project maintenance runtime", async () => {
    const { actions, inspectProjectHealth, cleanProjectCache } =
      createRendererActions();

    await expect(actions.inspectHealth()).resolves.toEqual({
      status: "applied",
    });
    await expect(actions.cleanCache()).resolves.toEqual({ status: "applied" });

    expect(inspectProjectHealth).toHaveBeenCalledWith({
      projectPath: "/Projects/CoreStudio/工业设计助手",
    });
    expect(cleanProjectCache).toHaveBeenCalledWith({
      projectPath: "/Projects/CoreStudio/工业设计助手",
    });
  });

  it("creates a thumbnail maintenance reset action", () => {
    const { actions, applyState } = createRendererActions();

    const state = actions.resetThumbnailMaintenance();

    expect(state).toBeNull();
    expect(applyState).toHaveBeenCalledWith({
      thumbnailMaintenance: null,
      uiState: {
        projectError: null,
        projectNotice: null,
      },
    });
  });
});
