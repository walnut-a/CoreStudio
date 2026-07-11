import { describe, expect, it, vi } from "vitest";

import {
  applyProjectRepairImageRecordUpdates,
  buildProjectMissingThumbnailFileIds,
  buildProjectRepairActiveProjectUpdate,
  buildProjectRepairMetadataUpdate,
  buildProjectRepairCompletionState,
  buildProjectRepairCompletionResultState,
  buildProjectRepairResultState,
  buildProjectThumbnailRefreshFileIds,
  buildProjectRepairCompletionViewModel,
  buildProjectRepairSceneRefreshPlan,
  buildProjectRepairSceneRefreshResult,
  buildProjectRepairStartState,
  buildProjectRepairStartResultState,
  buildProjectHealthInspectionStartState,
  buildProjectHealthInspectionStartResultState,
  buildProjectRepairReadiness,
  buildProjectHealthInspectionReadiness,
  buildProjectCacheCleanReadiness,
  buildProjectRepairBlockedUiState,
  buildProjectHealthInspectionBlockedUiState,
  buildProjectCacheCleanBlockedUiState,
  buildProjectCacheCleanStartResultState,
  buildProjectCacheCleanFailureResultState,
  buildProjectMaintenanceUiNoticeAction,
  buildProjectMaintenanceStartUiState,
  buildProjectMaintenanceFailureUiState,
  buildProjectRepairCompletionUiState,
  buildProjectCacheCleanSuccessUiState,
  buildProjectThumbnailRebuildReadiness,
  buildProjectMaintenanceAssetApplyPlan,
  buildProjectMaintenanceAssetSceneApplyState,
  buildProjectMaintenanceSceneFilesUpdate,
  buildProjectRepairSceneApplyState,
  buildProjectRepairFailureState,
  buildProjectRepairFailureResultState,
  buildProjectHealthInspectionFailureState,
  buildProjectHealthInspectionFailureResultState,
  buildProjectThumbnailMaintenanceFailure,
  buildProjectThumbnailMaintenancePending,
  buildProjectThumbnailMaintenanceFromMissingFileIds,
  buildProjectThumbnailMaintenanceFromRepairResult,
  buildProjectThumbnailRebuildResultState,
  buildProjectHealthInspectionSuccess,
  buildProjectHealthInspectionResultState,
  buildProjectHealthInspectionSuccessUiState,
  buildProjectHealthInspectionNoticeText,
  buildProjectRepairReport,
  buildProjectStatusToastViewModel,
  filterProjectThumbnailRefreshAssets,
  shouldApplyProjectMaintenanceResult,
} from "./projectMaintenanceController";

import type {
  ProjectAssetPayload,
  ProjectHealthReport,
  RebuildProjectThumbnailsResult,
} from "../../shared/desktopBridgeTypes";
import type { ImageRecordMap } from "../../shared/projectTypes";
import type { ProjectRepairReport } from "./projectMaintenanceController";

const createImageRecord = (
  fileId: string,
  patch: Partial<ImageRecordMap[string]> = {},
): ImageRecordMap[string] => ({
  fileId,
  assetPath: `assets/${fileId}.png`,
  sourceType: "generated",
  provider: "gemini",
  model: "model",
  width: 1024,
  height: 1024,
  createdAt: "2026-07-03T00:00:00.000Z",
  mimeType: "image/png",
  ...patch,
});

const createProjectAssetPayload = (
  fileId: string,
  patch: Partial<ProjectAssetPayload> = {},
): ProjectAssetPayload => ({
  fileId,
  mimeType: "image/png",
  dataBase64: "base64",
  width: 1024,
  height: 1024,
  createdAt: "2026-07-03T00:00:00.000Z",
  rendition: "thumbnail",
  ...patch,
});

const createRepairResult = (
  patch: Partial<RebuildProjectThumbnailsResult> = {},
): RebuildProjectThumbnailsResult => ({
  generatedFileIds: ["generated-1", "generated-2"],
  skippedFileIds: ["skipped-1"],
  failedFileIds: ["failed-1"],
  repairedGenerationRecordFileIds: ["legacy-generated"],
  repairedAcpOutputFileIds: ["acp-output"],
  restoredBoardFileIds: ["restored-1", "restored-2"],
  skippedDetails: [
    {
      fileId: "skipped-1",
      reason: "thumbnail-cache-exists",
      message: "缓存已存在",
    },
  ],
  failedDetails: [
    {
      fileId: "failed-1",
      reason: "thumbnail-rebuild-failed",
      message: "缓存重建失败",
    },
  ],
  backupPath: "/tmp/project/backups/backup.zip",
  ...patch,
});

const createHealthReport = (
  issueCount: number,
): ProjectHealthReport =>
  ({
    checkedAt: "2026-07-03T00:00:00.000Z",
    projectPath: "/tmp/project",
    imageRecordCount: 1,
    generatedImageRecordCount: 1,
    sceneImageFileCount: 0,
    missingImageRecordFileIds: [],
    missingAssetFileIds: [],
    missingThumbnailFileIds: [],
    missingPreviewFileIds: [],
    orphanImageRecordFileIds: [],
    orphanGeneratedImageRecordFileIds: [],
    incompleteGenerationRecordFileIds: [],
    brokenParentFileIds: [],
    brokenPromptReferenceFileIds: [],
    issues: Array.from({ length: issueCount }, (_, index) => ({
      code: "orphan-generated-record",
      severity: "warning",
      fileId: `file-${index}`,
      message: "生成图未显示在画板",
      repairable: true,
    })),
    summary: {
      errorCount: 0,
      warningCount: issueCount,
      repairableCount: issueCount,
    },
  }) satisfies ProjectHealthReport;

const createRepairReport = (
  patch: Partial<ProjectRepairReport> = {},
): ProjectRepairReport => ({
  generatedCount: 0,
  skippedCount: 0,
  failedCount: 0,
  repairedGenerationRecordCount: 0,
  repairedAcpOutputCount: 0,
  restoredImageRecordCount: 0,
  skippedImageRecordCount: 0,
  skippedDetails: [],
  failedDetails: [],
  ...patch,
});

describe("buildProjectRepairReport", () => {
  it("normalizes project repair results into the dialog report shape", () => {
    expect(
      buildProjectRepairReport({
        result: createRepairResult(),
        restoredCount: 1,
        skippedRestoreCount: 3,
      }),
    ).toEqual({
      generatedCount: 2,
      skippedCount: 1,
      failedCount: 1,
      repairedGenerationRecordCount: 1,
      repairedAcpOutputCount: 1,
      restoredImageRecordCount: 2,
      skippedImageRecordCount: 3,
      skippedDetails: [
        {
          fileId: "skipped-1",
          reason: "thumbnail-cache-exists",
          message: "缓存已存在",
        },
      ],
      failedDetails: [
        {
          fileId: "failed-1",
          reason: "thumbnail-rebuild-failed",
          message: "缓存重建失败",
        },
      ],
      backupPath: "/tmp/project/backups/backup.zip",
    });
  });
});

describe("buildProjectRepairCompletionViewModel", () => {
  it("builds report, maintenance state, and notice inputs from a finished repair", () => {
    const result = createRepairResult({
      generatedFileIds: ["generated-1", "generated-2", "generated-3"],
      skippedFileIds: ["skipped-1", "skipped-2"],
      failedFileIds: ["failed-1"],
      restoredBoardFileIds: ["restored-1", "restored-2"],
      repairedGenerationRecordFileIds: ["legacy-from-electron"],
      backupPath: "/tmp/project/backups/backup.zip",
    });

    expect(
      buildProjectRepairCompletionViewModel({
        result,
        metadataRepair: {
          repairedGenerationRecordFileIds: [
            "legacy-from-controller",
            "legacy-from-acp",
          ],
        },
        restoredCount: 1,
        skippedRestoreCount: 4,
      }),
    ).toEqual({
      repairReport: {
        generatedCount: 3,
        skippedCount: 2,
        failedCount: 1,
        repairedGenerationRecordCount: 1,
        repairedAcpOutputCount: 1,
        restoredImageRecordCount: 2,
        skippedImageRecordCount: 4,
        skippedDetails: result.skippedDetails,
        failedDetails: result.failedDetails,
        backupPath: "/tmp/project/backups/backup.zip",
      },
      thumbnailMaintenance: {
        status: "failed",
        total: 1,
      },
      notice: {
        generatedCount: 3,
        skippedCount: 2,
        failedCount: 1,
        backupPath: "/tmp/project/backups/backup.zip",
        repairedGenerationRecordCount: 2,
        restoredImageRecordCount: 2,
        skippedImageRecordCount: 4,
      },
    });
  });
});

describe("buildProjectRepairCompletionState", () => {
  it("combines repair completion view state and active project metadata update", () => {
    const activeProject = {
      projectPath: "/tmp/project",
      name: "工业设计助手",
      imageRecords: {
        legacy: createImageRecord("legacy"),
      },
    };
    const recoveredAcpRecord = createImageRecord("acp-output", {
      generationOrigin: "acp-agent",
    });

    expect(
      buildProjectRepairCompletionState({
        activeProject,
        projectPath: "/tmp/project",
        result: createRepairResult({
          generatedFileIds: ["generated-a"],
          skippedFileIds: ["skipped-a"],
          failedFileIds: [],
          repairedAcpOutputRecords: {
            "acp-output": recoveredAcpRecord,
          },
        }),
        metadataRepair: {
          repairedGenerationRecordFileIds: ["legacy"],
        },
        repairedAcpOutputRecords: {
          "acp-output": recoveredAcpRecord,
        },
        restoredCount: 2,
        skippedRestoreCount: 1,
      }),
    ).toMatchObject({
      activeProjectUpdate: {
        ...activeProject,
        imageRecords: {
          legacy: {
            ...activeProject.imageRecords.legacy,
            generationOrigin: "corestudio",
          },
          "acp-output": recoveredAcpRecord,
        },
      },
      repairReport: {
        generatedCount: 1,
        skippedCount: 1,
        failedCount: 0,
        restoredImageRecordCount: 2,
        skippedImageRecordCount: 1,
      },
      thumbnailMaintenance: null,
      notice: {
        generatedCount: 1,
        skippedCount: 1,
        failedCount: 0,
        repairedGenerationRecordCount: 1,
        restoredImageRecordCount: 2,
        skippedImageRecordCount: 1,
      },
    });
  });

  it("combines repair completion state and UI notice", () => {
    const activeProject = {
      projectPath: "/tmp/project",
      imageRecords: {
        legacy: createImageRecord("legacy"),
      },
    };

    expect(
      buildProjectRepairCompletionResultState({
        activeProject,
        projectPath: "/tmp/project",
        result: createRepairResult({
          generatedFileIds: ["generated-a", "generated-b"],
          skippedFileIds: ["skipped-a"],
          failedFileIds: [],
          backupPath: "/tmp/project/backups/backup.zip",
        }),
        metadataRepair: {
          repairedGenerationRecordFileIds: ["legacy"],
        },
        repairedAcpOutputRecords: {},
        restoredCount: 3,
        skippedRestoreCount: 4,
        messages: {
          thumbnailsRepaired: (
            generatedCount,
            skippedCount,
            failedCount,
            backupPath,
            repairedGenerationRecordCount,
            restoredImageRecordCount,
            skippedImageRecordCount,
          ) =>
            [
              generatedCount,
              skippedCount,
              failedCount,
              backupPath,
              repairedGenerationRecordCount,
              restoredImageRecordCount,
              skippedImageRecordCount,
            ].join("|"),
        },
      }),
    ).toMatchObject({
      activeProjectUpdate: {
        imageRecords: {
          legacy: {
            ...activeProject.imageRecords.legacy,
            generationOrigin: "corestudio",
          },
        },
      },
      repairReport: {
        generatedCount: 2,
        skippedCount: 1,
        failedCount: 0,
        restoredImageRecordCount: 3,
        skippedImageRecordCount: 4,
      },
      thumbnailMaintenance: null,
      uiState: {
        projectError: null,
        projectNotice: "2|1|0|/tmp/project/backups/backup.zip|1|3|4",
      },
    });
  });

  it("does not update the active project when it changed before repair completion", () => {
    const activeProject = {
      projectPath: "/tmp/other-project",
      imageRecords: {
        legacy: createImageRecord("legacy"),
      },
    };

    const result = buildProjectRepairCompletionState({
      activeProject,
      projectPath: "/tmp/project",
      result: createRepairResult({
        repairedGenerationRecordFileIds: ["legacy"],
      }),
      metadataRepair: {
        repairedGenerationRecordFileIds: ["legacy"],
      },
      repairedAcpOutputRecords: {},
      restoredCount: 0,
      skippedRestoreCount: 0,
    });

    expect(result.activeProjectUpdate).toBeNull();
  });
});

describe("project maintenance start states", () => {
  it("builds the initial state for project data repair", () => {
    expect(buildProjectRepairStartState(["file-a", "file-b"])).toEqual({
      projectHealthReport: null,
      projectHealthReportOpen: false,
      projectRepairReport: null,
      thumbnailMaintenance: {
        status: "pending",
        total: 2,
      },
    });
  });

  it("combines project data repair start state and UI reset", () => {
    expect(buildProjectRepairStartResultState(["file-a", "file-b"])).toEqual({
      projectHealthReport: null,
      projectHealthReportOpen: false,
      projectRepairReport: null,
      thumbnailMaintenance: {
        status: "pending",
        total: 2,
      },
      uiState: {
        projectError: null,
        projectNotice: null,
      },
    });
  });

  it("builds the initial state for project health inspection", () => {
    expect(
      buildProjectHealthInspectionStartState(
        ["file-a"],
        "正在检查项目数据",
      ),
    ).toEqual({
      projectHealthReport: null,
      projectHealthReportOpen: false,
      projectRepairReport: null,
      thumbnailMaintenance: {
        status: "pending",
        total: 1,
        message: "正在检查项目数据",
      },
    });
  });

  it("combines project health inspection start state and UI reset", () => {
    expect(
      buildProjectHealthInspectionStartResultState(
        ["file-a"],
        "正在检查项目数据",
      ),
    ).toEqual({
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
    });
  });
});

describe("project maintenance readiness", () => {
  it("checks whether a project repair can start", () => {
    const project = {
      imageRecords: {
        "file-a": createImageRecord("file-a"),
      },
    };
    const repairProjectThumbnails = () => "repair";

    expect(
      buildProjectRepairReadiness({
        project: null,
        repairProjectThumbnails,
      }),
    ).toEqual({
      status: "blocked",
      reason: "no-project",
    });

    expect(
      buildProjectRepairReadiness({
        project: {
          imageRecords: {},
        },
        repairProjectThumbnails,
      }),
    ).toEqual({
      status: "blocked",
      reason: "no-images",
    });

    expect(
      buildProjectRepairReadiness({
        project,
        repairProjectThumbnails: null,
      }),
    ).toEqual({
      status: "blocked",
      reason: "missing-capability",
    });

    expect(
      buildProjectRepairReadiness({
        project,
        repairProjectThumbnails,
      }),
    ).toEqual({
      status: "ready",
      project,
      repairProjectThumbnails,
      fileIds: ["file-a"],
      startState: {
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
      },
    });
  });

  it("checks whether a project health inspection can start", () => {
    const project = {
      imageRecords: {
        "file-a": createImageRecord("file-a"),
      },
    };
    const inspectProjectHealth = () => "inspect";

    expect(
      buildProjectHealthInspectionReadiness({
        project: null,
        inspectProjectHealth,
        pendingMessage: "正在检查项目数据",
      }),
    ).toEqual({
      status: "blocked",
      reason: "no-project",
    });

    expect(
      buildProjectHealthInspectionReadiness({
        project,
        inspectProjectHealth: null,
        pendingMessage: "正在检查项目数据",
      }),
    ).toEqual({
      status: "blocked",
      reason: "missing-capability",
    });

    expect(
      buildProjectHealthInspectionReadiness({
        project,
        inspectProjectHealth,
        pendingMessage: "正在检查项目数据",
      }),
    ).toEqual({
      status: "ready",
      project,
      inspectProjectHealth,
      fileIds: ["file-a"],
      startState: {
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
      },
    });
  });

  it("checks whether project cache cleanup can start", () => {
    const project = {
      projectPath: "/tmp/project",
    };
    const cleanProjectCache = () => "clean";

    expect(
      buildProjectCacheCleanReadiness({
        project: null,
        cleanProjectCache,
      }),
    ).toEqual({
      status: "blocked",
      reason: "no-project",
    });

    expect(
      buildProjectCacheCleanReadiness({
        project,
        cleanProjectCache: null,
      }),
    ).toEqual({
      status: "blocked",
      reason: "missing-capability",
    });

    expect(
      buildProjectCacheCleanReadiness({
        project,
        cleanProjectCache,
      }),
    ).toEqual({
      status: "ready",
      project,
      cleanProjectCache,
      startState: {
        uiState: {
          projectError: null,
          projectNotice: null,
        },
      },
    });
  });

  it("checks whether missing thumbnail rebuild can start", () => {
    const project = {
      projectPath: "/tmp/project",
      imageRecords: {},
    };
    const rebuildProjectThumbnails = () => "rebuild";

    expect(
      buildProjectThumbnailRebuildReadiness({
        project,
        fileIds: [],
        rebuildProjectThumbnails,
      }),
    ).toEqual({
      status: "skip",
      reason: "no-files",
    });

    expect(
      buildProjectThumbnailRebuildReadiness({
        project,
        fileIds: ["a", "b", "a"],
        rebuildProjectThumbnails: null,
      }),
    ).toEqual({
      status: "blocked",
      reason: "missing-capability",
      fileIds: ["a", "b"],
      failureState: {
        thumbnailMaintenance: {
          status: "failed",
          total: 2,
        },
      },
    });

    expect(
      buildProjectThumbnailRebuildReadiness({
        project,
        fileIds: ["a", "b", "a"],
        rebuildProjectThumbnails,
      }),
    ).toEqual({
      status: "ready",
      project,
      rebuildProjectThumbnails,
      fileIds: ["a", "b"],
    });
  });
});

describe("project maintenance blocked UI states", () => {
  const messages = {
    noProject: "请先打开项目",
    noImages: "当前项目没有图片",
    thumbnailsFailed: "项目修复失败",
    healthCheckFailed: "项目检查失败",
    cacheCleanFailed: "缓存清理失败",
  };

  it("maps project repair blockers to either an inline notice or project error", () => {
    expect(
      buildProjectRepairBlockedUiState({
        reason: "no-images",
        messages,
      }),
    ).toEqual({
      projectError: null,
      projectNotice: "当前项目没有图片",
    });

    expect(
      buildProjectRepairBlockedUiState({
        reason: "no-project",
        messages,
      }),
    ).toEqual({
      projectError: "请先打开项目",
      projectNotice: null,
    });

    expect(
      buildProjectRepairBlockedUiState({
        reason: "missing-capability",
        messages,
      }),
    ).toEqual({
      projectError: "项目修复失败",
      projectNotice: null,
    });
  });

  it("maps health inspection blockers to project errors", () => {
    expect(
      buildProjectHealthInspectionBlockedUiState({
        reason: "no-project",
        messages,
      }),
    ).toEqual({
      projectError: "请先打开项目",
      projectNotice: null,
    });

    expect(
      buildProjectHealthInspectionBlockedUiState({
        reason: "missing-capability",
        messages,
      }),
    ).toEqual({
      projectError: "项目检查失败",
      projectNotice: null,
    });
  });

  it("maps cache cleanup blockers to project errors", () => {
    expect(
      buildProjectCacheCleanBlockedUiState({
        reason: "no-project",
        messages,
      }),
    ).toEqual({
      projectError: "请先打开项目",
      projectNotice: null,
    });

    expect(
      buildProjectCacheCleanBlockedUiState({
        reason: "missing-capability",
        messages,
      }),
    ).toEqual({
      projectError: "缓存清理失败",
      projectNotice: null,
    });
  });
});

describe("project maintenance lifecycle UI states", () => {
  it("clears stale project maintenance messages when a maintenance action starts", () => {
    expect(buildProjectMaintenanceStartUiState()).toEqual({
      projectError: null,
      projectNotice: null,
    });
  });

  it("maps project maintenance failures to a project error", () => {
    expect(buildProjectMaintenanceFailureUiState("项目维护失败")).toEqual({
      projectError: "项目维护失败",
      projectNotice: null,
    });
  });

  it("combines project cache cleanup start state and UI reset", () => {
    expect(buildProjectCacheCleanStartResultState()).toEqual({
      uiState: {
        projectError: null,
        projectNotice: null,
      },
    });
  });

  it("combines project cache cleanup failure state and UI error", () => {
    expect(buildProjectCacheCleanFailureResultState("缓存清理失败")).toEqual({
      uiState: {
        projectError: "缓存清理失败",
        projectNotice: null,
      },
    });
  });
});

describe("buildProjectMaintenanceUiNoticeAction", () => {
  it("shows the project notice when the UI state has a notice", () => {
    expect(
      buildProjectMaintenanceUiNoticeAction({
        projectError: null,
        projectNotice: "项目检查完成",
      }),
    ).toEqual({
      action: "show",
      message: "项目检查完成",
    });
  });

  it("clears the project notice when the UI state has no notice", () => {
    expect(
      buildProjectMaintenanceUiNoticeAction({
        projectError: "项目维护失败",
        projectNotice: null,
      }),
    ).toEqual({
      action: "clear",
    });
  });
});

describe("project maintenance success UI states", () => {
  it("maps project repair completion notices to a project notice", () => {
    expect(
      buildProjectRepairCompletionUiState({
        notice: {
          generatedCount: 2,
          skippedCount: 1,
          failedCount: 0,
          backupPath: "/tmp/project/backups/backup.zip",
          repairedGenerationRecordCount: 3,
          restoredImageRecordCount: 4,
          skippedImageRecordCount: 5,
        },
        messages: {
          thumbnailsRepaired: (
            generatedCount,
            skippedCount,
            failedCount,
            backupPath,
            repairedGenerationRecordCount,
            restoredImageRecordCount,
            skippedImageRecordCount,
          ) =>
            [
              generatedCount,
              skippedCount,
              failedCount,
              backupPath,
              repairedGenerationRecordCount,
              restoredImageRecordCount,
              skippedImageRecordCount,
            ].join("|"),
        },
      }),
    ).toEqual({
      projectError: null,
      projectNotice: "2|1|0|/tmp/project/backups/backup.zip|3|4|5",
    });
  });

  it("maps project cache cleanup results to a project notice", () => {
    expect(
      buildProjectCacheCleanSuccessUiState({
        result: {
          removedFileCount: 3,
          removedBytes: 4096,
          skippedFileCount: 1,
        },
        messages: {
          cacheCleaned: (removedFileCount, removedBytes) =>
            `删除 ${removedFileCount} 个缓存文件，释放 ${removedBytes} 字节`,
        },
      }),
    ).toEqual({
      projectError: null,
      projectNotice: "删除 3 个缓存文件，释放 4096 字节",
    });
  });
});

describe("shouldApplyProjectMaintenanceResult", () => {
  it("allows stale async project maintenance results only for the current project", () => {
    expect(
      shouldApplyProjectMaintenanceResult({
        activeProjectPath: "/tmp/project",
        projectPath: "/tmp/project",
      }),
    ).toBe(true);

    expect(
      shouldApplyProjectMaintenanceResult({
        activeProjectPath: "/tmp/other-project",
        projectPath: "/tmp/project",
      }),
    ).toBe(false);

    expect(
      shouldApplyProjectMaintenanceResult({
        activeProjectPath: null,
        projectPath: "/tmp/project",
      }),
    ).toBe(false);
  });
});

describe("buildProjectMaintenanceAssetApplyPlan", () => {
  it("allows project maintenance assets to be applied only to the active matching project", () => {
    const activeProject = {
      projectPath: "/tmp/project",
      imageRecords: {
        "file-a": createImageRecord("file-a"),
      },
    };

    expect(
      buildProjectMaintenanceAssetApplyPlan({
        activeProject,
        projectPath: "/tmp/project",
        assetCount: 2,
      }),
    ).toEqual({
      action: "apply",
      activeProject,
    });

    expect(
      buildProjectMaintenanceAssetApplyPlan({
        activeProject,
        projectPath: "/tmp/project",
        assetCount: 0,
      }),
    ).toEqual({
      action: "skip",
      reason: "no-assets",
    });

    expect(
      buildProjectMaintenanceAssetApplyPlan({
        activeProject: {
          ...activeProject,
          projectPath: "/tmp/other-project",
        },
        projectPath: "/tmp/project",
        assetCount: 2,
      }),
    ).toEqual({
      action: "skip",
      reason: "project-changed",
    });

    expect(
      buildProjectMaintenanceAssetApplyPlan({
        activeProject: null,
        projectPath: "/tmp/project",
        assetCount: 2,
      }),
    ).toEqual({
      action: "skip",
      reason: "project-changed",
    });
  });
});

describe("buildProjectMaintenanceSceneFilesUpdate", () => {
  it("merges project maintenance files into the current scene without changing other scene state", () => {
    const scene = {
      elements: [{ id: "element-a" }],
      appState: { zoom: { value: 1 } },
      files: {
        existing: { id: "existing" },
      },
    };

    expect(
      buildProjectMaintenanceSceneFilesUpdate({
        scene,
        files: {
          added: { id: "added" },
        },
      }),
    ).toEqual({
      elements: scene.elements,
      appState: scene.appState,
      files: {
        existing: { id: "existing" },
        added: { id: "added" },
      },
    });
  });

  it("keeps an empty scene reference unchanged", () => {
    expect(
      buildProjectMaintenanceSceneFilesUpdate({
        scene: null,
        files: {
          added: { id: "added" },
        },
      }),
    ).toBeNull();
  });
});

describe("buildProjectMaintenanceAssetSceneApplyState", () => {
  it("builds files to add and the next scene for matching project maintenance assets", () => {
    const activeProject = {
      projectPath: "/tmp/project",
      imageRecords: {
        "file-a": createImageRecord("file-a"),
      },
    };
    const scene = {
      elements: [{ id: "element-a" }],
      appState: { zoom: { value: 1 } },
      files: {
        existing: { id: "existing" },
      },
    };
    const files = {
      "file-a": { id: "file-a" },
    };

    expect(
      buildProjectMaintenanceAssetSceneApplyState({
        activeProject,
        projectPath: "/tmp/project",
        assetCount: 1,
        scene,
        buildFiles: () => files,
      }),
    ).toEqual({
      action: "apply",
      activeProject,
      files,
      filesToAdd: [{ id: "file-a" }],
      scene: {
        elements: scene.elements,
        appState: scene.appState,
        files: {
          existing: { id: "existing" },
          "file-a": { id: "file-a" },
        },
      },
    });
  });

  it("skips when there are no assets, the project changed, or no files were produced", () => {
    const activeProject = {
      projectPath: "/tmp/project",
    };
    const scene = {
      files: {},
    };
    const buildFiles = vi.fn(() => ({
      "file-a": { id: "file-a" },
    }));

    expect(
      buildProjectMaintenanceAssetSceneApplyState({
        activeProject,
        projectPath: "/tmp/project",
        assetCount: 0,
        scene,
        buildFiles,
      }),
    ).toEqual({
      action: "skip",
      reason: "no-assets",
    });

    expect(
      buildProjectMaintenanceAssetSceneApplyState({
        activeProject: {
          projectPath: "/tmp/other-project",
        },
        projectPath: "/tmp/project",
        assetCount: 1,
        scene,
        buildFiles,
      }),
    ).toEqual({
      action: "skip",
      reason: "project-changed",
    });

    expect(
      buildProjectMaintenanceAssetSceneApplyState({
        activeProject,
        projectPath: "/tmp/project",
        assetCount: 1,
        scene,
        buildFiles: () => ({}),
      }),
    ).toEqual({
      action: "skip",
      reason: "no-files",
    });
    expect(buildFiles).not.toHaveBeenCalled();
  });
});

describe("buildProjectRepairSceneApplyState", () => {
  it("builds the next scene and active project after a repaired scene refresh", () => {
    const activeProject = {
      projectPath: "/tmp/project",
      name: "工业设计助手",
      sceneJson: "old-scene",
      imageRecords: {
        old: createImageRecord("old"),
      },
    };
    const imageRecords: ImageRecordMap = {
      restored: createImageRecord("restored"),
    };
    const elements = [{ id: "restored-element" }];
    const appState = { zoom: { value: 1.25 } };

    expect(
      buildProjectRepairSceneApplyState({
        activeProject,
        imageRecords,
        sceneJson: "new-scene",
        elements,
        appState,
        currentFiles: {
          existing: { id: "existing" },
        },
        files: {
          restored: { id: "restored" },
        },
      }),
    ).toEqual({
      scene: {
        elements,
        appState,
        files: {
          existing: { id: "existing" },
          restored: { id: "restored" },
        },
      },
      project: {
        ...activeProject,
        imageRecords,
        sceneJson: "new-scene",
      },
    });
  });
});

describe("project maintenance failure states", () => {
  it("builds the failure state for project data repair", () => {
    expect(buildProjectRepairFailureState(["file-a", "file-b"])).toEqual({
      projectHealthReport: null,
      projectHealthReportOpen: false,
      projectRepairReport: null,
      thumbnailMaintenance: {
        status: "failed",
        total: 2,
      },
    });
  });

  it("combines project data repair failure state and UI error", () => {
    expect(
      buildProjectRepairFailureResultState(
        ["file-a", "file-b"],
        "项目修复失败",
      ),
    ).toEqual({
      projectHealthReport: null,
      projectHealthReportOpen: false,
      projectRepairReport: null,
      thumbnailMaintenance: {
        status: "failed",
        total: 2,
      },
      uiState: {
        projectError: "项目修复失败",
        projectNotice: null,
      },
    });
  });

  it("builds the failure state for project health inspection", () => {
    expect(buildProjectHealthInspectionFailureState()).toEqual({
      projectHealthReport: null,
      projectHealthReportOpen: false,
      projectRepairReport: null,
      thumbnailMaintenance: null,
    });
  });

  it("combines project health inspection failure state and UI error", () => {
    expect(
      buildProjectHealthInspectionFailureResultState("健康检查失败"),
    ).toEqual({
      projectHealthReport: null,
      projectHealthReportOpen: false,
      projectRepairReport: null,
      thumbnailMaintenance: null,
      uiState: {
        projectError: "健康检查失败",
        projectNotice: null,
      },
    });
  });
});

describe("buildProjectStatusToastViewModel", () => {
  it("prefers an explicit project notice while keeping report detail availability", () => {
    expect(
      buildProjectStatusToastViewModel({
        projectNotice: "项目数据修复完成。",
        thumbnailMaintenance: {
          status: "pending",
          total: 12,
        },
        projectHealthReport: createHealthReport(2),
        projectRepairReport: createRepairReport({
          failedCount: 1,
        }),
      }),
    ).toEqual({
      message: "项目数据修复完成。",
      tone: "success",
      hasDetails: true,
    });
  });

  it("summarizes pending and failed maintenance when no notice is visible", () => {
    expect(
      buildProjectStatusToastViewModel({
        projectNotice: null,
        thumbnailMaintenance: {
          status: "pending",
          total: 4,
        },
        projectHealthReport: null,
        projectRepairReport: null,
      }),
    ).toEqual({
      message: "正在修复 4 个图片资源",
      tone: "pending",
      hasDetails: false,
    });

    expect(
      buildProjectStatusToastViewModel({
        projectNotice: null,
        thumbnailMaintenance: {
          status: "failed",
          total: 2,
        },
        projectHealthReport: null,
        projectRepairReport: createRepairReport({
          skippedImageRecordCount: 1,
        }),
      }),
    ).toEqual({
      message: "2 个图片资源暂时不可用",
      tone: "failed",
      hasDetails: true,
    });
  });
});

describe("buildProjectHealthInspectionSuccess", () => {
  it("opens the report and asks for repair when health issues are present", () => {
    const result = buildProjectHealthInspectionSuccess(createHealthReport(2));

    expect(result.projectHealthReportOpen).toBe(true);
    expect(result.thumbnailMaintenance).toBeNull();
    expect(result.projectRepairReport).toBeNull();
    expect(result.notice).toEqual({
      kind: "needs-repair",
      errorCount: 0,
      warningCount: 2,
      repairableCount: 2,
    });
  });

  it("distinguishes info-only and healthy reports without opening an empty report", () => {
    const infoReport = createHealthReport(0);
    infoReport.issues = [
      {
        code: "missing-preview-cache",
        severity: "info",
        fileId: "preview-file",
        message: "预览缓存尚未生成",
        repairable: false,
      },
    ];

    expect(buildProjectHealthInspectionSuccess(infoReport)).toMatchObject({
      projectHealthReportOpen: true,
      notice: {
        kind: "has-info",
        infoCount: 1,
      },
    });

    const healthyReport = createHealthReport(0);
    expect(buildProjectHealthInspectionSuccess(healthyReport)).toMatchObject({
      projectHealthReportOpen: false,
      notice: {
        kind: "healthy",
        imageRecordCount: 1,
        generatedImageRecordCount: 1,
      },
    });
  });
});

describe("buildProjectHealthInspectionNoticeText", () => {
  const messages = {
    needsRepair: (
      errorCount: number,
      warningCount: number,
      repairableCount: number,
    ) => `repair:${errorCount}:${warningCount}:${repairableCount}`,
    hasInfo: (infoCount: number) => `info:${infoCount}`,
    healthy: (imageRecordCount: number, generatedImageRecordCount: number) =>
      `healthy:${imageRecordCount}:${generatedImageRecordCount}`,
  };

  it("formats project health inspection notices through injected copy functions", () => {
    expect(
      buildProjectHealthInspectionNoticeText({
        notice: {
          kind: "needs-repair",
          errorCount: 1,
          warningCount: 2,
          repairableCount: 3,
        },
        messages,
      }),
    ).toBe("repair:1:2:3");

    expect(
      buildProjectHealthInspectionNoticeText({
        notice: {
          kind: "has-info",
          infoCount: 4,
        },
        messages,
      }),
    ).toBe("info:4");

    expect(
      buildProjectHealthInspectionNoticeText({
        notice: {
          kind: "healthy",
          imageRecordCount: 5,
          generatedImageRecordCount: 6,
        },
        messages,
      }),
    ).toBe("healthy:5:6");
  });
});

describe("buildProjectHealthInspectionSuccessUiState", () => {
  const messages = {
    needsRepair: (
      errorCount: number,
      warningCount: number,
      repairableCount: number,
    ) => `repair:${errorCount}:${warningCount}:${repairableCount}`,
    hasInfo: (infoCount: number) => `info:${infoCount}`,
    healthy: (imageRecordCount: number, generatedImageRecordCount: number) =>
      `healthy:${imageRecordCount}:${generatedImageRecordCount}`,
  };

  it("maps health inspection success notices to project maintenance UI state", () => {
    expect(
      buildProjectHealthInspectionSuccessUiState({
        notice: {
          kind: "needs-repair",
          errorCount: 1,
          warningCount: 2,
          repairableCount: 3,
        },
        messages,
      }),
    ).toEqual({
      projectError: null,
      projectNotice: "repair:1:2:3",
    });
  });
});

describe("buildProjectHealthInspectionResultState", () => {
  const messages = {
    needsRepair: (
      errorCount: number,
      warningCount: number,
      repairableCount: number,
    ) => `repair:${errorCount}:${warningCount}:${repairableCount}`,
    hasInfo: (infoCount: number) => `info:${infoCount}`,
    healthy: (imageRecordCount: number, generatedImageRecordCount: number) =>
      `healthy:${imageRecordCount}:${generatedImageRecordCount}`,
  };

  it("combines health report state and success UI state when issues are present", () => {
    const report = createHealthReport(2);

    expect(
      buildProjectHealthInspectionResultState({
        report,
        messages,
      }),
    ).toEqual({
      projectHealthReport: report,
      projectHealthReportOpen: true,
      projectRepairReport: null,
      thumbnailMaintenance: null,
      notice: {
        kind: "needs-repair",
        errorCount: 0,
        warningCount: 2,
        repairableCount: 2,
      },
      uiState: {
        projectError: null,
        projectNotice: "repair:0:2:2",
      },
    });
  });

  it("keeps a healthy report closed while still returning a success notice", () => {
    const report = createHealthReport(0);

    expect(
      buildProjectHealthInspectionResultState({
        report,
        messages,
      }),
    ).toMatchObject({
      projectHealthReport: report,
      projectHealthReportOpen: false,
      projectRepairReport: null,
      thumbnailMaintenance: null,
      notice: {
        kind: "healthy",
        imageRecordCount: 1,
        generatedImageRecordCount: 1,
      },
      uiState: {
        projectError: null,
        projectNotice: "healthy:1:1",
      },
    });
  });
});

describe("applyProjectRepairImageRecordUpdates", () => {
  it("repairs legacy generated origins and merges recovered ACP output records", () => {
    const imageRecords: ImageRecordMap = {
      legacy: createImageRecord("legacy"),
      imported: createImageRecord("imported", {
        sourceType: "imported",
      }),
      existing: createImageRecord("existing", {
        generationOrigin: "acp-agent",
      }),
    };
    const recoveredAcpRecord = createImageRecord("acp-output", {
      generationOrigin: "acp-agent",
      generationTaskId: "task-1",
    });

    const result = applyProjectRepairImageRecordUpdates({
      imageRecords,
      repairedGenerationRecordFileIds: ["legacy", "missing", "existing"],
      repairedAcpOutputRecords: {
        "acp-output": recoveredAcpRecord,
      },
    });

    expect(result.changed).toBe(true);
    expect(result.imageRecords).toMatchObject({
      legacy: {
        generationOrigin: "corestudio",
      },
      imported: {
        sourceType: "imported",
      },
      existing: {
        generationOrigin: "acp-agent",
      },
      "acp-output": {
        generationOrigin: "acp-agent",
        generationTaskId: "task-1",
      },
    });
    expect(result.repairedGenerationRecordFileIds).toEqual([
      "legacy",
      "missing",
      "existing",
    ]);
    expect(result.repairedAcpOutputFileIds).toEqual(["acp-output"]);
    expect(result.imageRecords.imported.generationOrigin).toBeUndefined();
  });

  it("returns the original record map when the repair result contains no metadata changes", () => {
    const imageRecords: ImageRecordMap = {
      existing: createImageRecord("existing", {
        generationOrigin: "corestudio",
      }),
    };

    const result = applyProjectRepairImageRecordUpdates({
      imageRecords,
      repairedGenerationRecordFileIds: ["existing", "missing"],
      repairedAcpOutputRecords: {},
    });

    expect(result.changed).toBe(false);
    expect(result.imageRecords).toBe(imageRecords);
  });
});

describe("buildProjectRepairMetadataUpdate", () => {
  it("applies repaired metadata to the project and returns the metadata repair result", () => {
    const project = {
      projectPath: "/tmp/project",
      imageRecords: {
        legacy: createImageRecord("legacy"),
      },
    };
    const recoveredAcpRecord = createImageRecord("acp-output", {
      generationOrigin: "acp-agent",
    });

    const result = buildProjectRepairMetadataUpdate({
      project,
      repairedGenerationRecordFileIds: ["legacy"],
      repairedAcpOutputRecords: {
        "acp-output": recoveredAcpRecord,
      },
    });

    expect(result.metadataRepair).toMatchObject({
      changed: true,
      repairedGenerationRecordFileIds: ["legacy"],
      repairedAcpOutputFileIds: ["acp-output"],
    });
    expect(result.project).toEqual({
      ...project,
      imageRecords: {
        legacy: {
          ...project.imageRecords.legacy,
          generationOrigin: "corestudio",
        },
        "acp-output": recoveredAcpRecord,
      },
    });
  });

  it("keeps the original project reference when repaired metadata does not change records", () => {
    const project = {
      projectPath: "/tmp/project",
      imageRecords: {
        existing: createImageRecord("existing", {
          generationOrigin: "corestudio",
        }),
      },
    };

    const result = buildProjectRepairMetadataUpdate({
      project,
      repairedGenerationRecordFileIds: ["existing"],
      repairedAcpOutputRecords: {},
    });

    expect(result.metadataRepair.changed).toBe(false);
    expect(result.project).toBe(project);
  });
});

describe("buildProjectRepairResultState", () => {
  it("combines repaired metadata and thumbnail refresh ids from a project repair result", () => {
    const project = {
      name: "工业设计助手",
      imageRecords: {
        legacy: createImageRecord("legacy"),
      },
    };
    const recoveredAcpRecord = createImageRecord("acp-output", {
      generationOrigin: "acp-agent",
    });

    const result = buildProjectRepairResultState({
      project,
      result: createRepairResult({
        generatedFileIds: ["new-a", "loaded-preview", "loaded-original"],
        repairedGenerationRecordFileIds: ["legacy"],
        repairedAcpOutputRecords: {
          "acp-output": recoveredAcpRecord,
        },
      }),
      loadedPreviewFileIds: new Set(["loaded-preview"]),
      loadedOriginalFileIds: new Set(["loaded-original"]),
    });

    expect(result.fileIdsToRefresh).toEqual(["new-a"]);
    expect(result.repairedAcpOutputRecords).toEqual({
      "acp-output": recoveredAcpRecord,
    });
    expect(result.metadataUpdate.metadataRepair.changed).toBe(true);
    expect(result.metadataUpdate.project.imageRecords).toEqual({
      legacy: {
        ...project.imageRecords.legacy,
        generationOrigin: "corestudio",
      },
      "acp-output": recoveredAcpRecord,
    });
  });

  it("uses empty repair metadata when optional repaired record fields are absent", () => {
    const project = {
      imageRecords: {
        existing: createImageRecord("existing", {
          generationOrigin: "corestudio",
        }),
      },
    };

    const result = buildProjectRepairResultState({
      project,
      result: createRepairResult({
        generatedFileIds: [],
        repairedGenerationRecordFileIds: undefined,
        repairedAcpOutputRecords: undefined,
      }),
      loadedPreviewFileIds: new Set(),
      loadedOriginalFileIds: new Set(),
    });

    expect(result.fileIdsToRefresh).toEqual([]);
    expect(result.repairedAcpOutputRecords).toEqual({});
    expect(result.metadataUpdate.metadataRepair.changed).toBe(false);
    expect(result.metadataUpdate.project).toBe(project);
  });
});

describe("buildProjectRepairActiveProjectUpdate", () => {
  it("updates the active project with repaired metadata when it still matches the repaired project", () => {
    const activeProject = {
      projectPath: "/tmp/project",
      name: "工业设计助手",
      imageRecords: {
        legacy: createImageRecord("legacy"),
      },
    };
    const recoveredAcpRecord = createImageRecord("acp-output", {
      generationOrigin: "acp-agent",
    });

    expect(
      buildProjectRepairActiveProjectUpdate({
        activeProject,
        projectPath: "/tmp/project",
        repairedGenerationRecordFileIds: ["legacy"],
        repairedAcpOutputRecords: {
          "acp-output": recoveredAcpRecord,
        },
      }),
    ).toEqual({
      ...activeProject,
      imageRecords: {
        legacy: {
          ...activeProject.imageRecords.legacy,
          generationOrigin: "corestudio",
        },
        "acp-output": recoveredAcpRecord,
      },
    });
  });

  it("does not update when the active project changed or repair metadata has no changes", () => {
    const activeProject = {
      projectPath: "/tmp/project",
      imageRecords: {
        existing: createImageRecord("existing", {
          generationOrigin: "corestudio",
        }),
      },
    };

    expect(
      buildProjectRepairActiveProjectUpdate({
        activeProject,
        projectPath: "/tmp/other-project",
        repairedGenerationRecordFileIds: ["existing"],
        repairedAcpOutputRecords: {},
      }),
    ).toBeNull();

    expect(
      buildProjectRepairActiveProjectUpdate({
        activeProject,
        projectPath: "/tmp/project",
        repairedGenerationRecordFileIds: ["existing"],
        repairedAcpOutputRecords: {},
      }),
    ).toBeNull();
  });
});

describe("buildProjectThumbnailRefreshFileIds", () => {
  it("deduplicates generated and skipped ids while ignoring files that already have preview or original data", () => {
    expect(
      buildProjectThumbnailRefreshFileIds({
        generatedFileIds: ["generated-a", "generated-b", "generated-a"],
        skippedFileIds: ["skipped-a", "generated-b", "skipped-b"],
        loadedPreviewFileIds: new Set(["generated-b"]),
        loadedOriginalFileIds: new Set(["skipped-b"]),
      }),
    ).toEqual(["generated-a", "skipped-a"]);
  });
});

describe("buildProjectThumbnailRebuildResultState", () => {
  it("combines thumbnail maintenance and refresh ids from a rebuild result", () => {
    expect(
      buildProjectThumbnailRebuildResultState({
        result: createRepairResult({
          generatedFileIds: ["new-a", "loaded-preview", "loaded-original"],
          skippedFileIds: ["skipped-a", "new-a"],
          failedFileIds: ["failed-a", "failed-b"],
        }),
        loadedPreviewFileIds: new Set(["loaded-preview"]),
        loadedOriginalFileIds: new Set(["loaded-original"]),
      }),
    ).toEqual({
      thumbnailMaintenance: {
        status: "failed",
        total: 2,
      },
      fileIdsToRefresh: ["new-a", "skipped-a"],
    });
  });

  it("clears thumbnail maintenance when rebuild has no failures and no files need refresh", () => {
    expect(
      buildProjectThumbnailRebuildResultState({
        result: createRepairResult({
          generatedFileIds: ["loaded-preview"],
          skippedFileIds: [],
          failedFileIds: [],
        }),
        loadedPreviewFileIds: new Set(["loaded-preview"]),
        loadedOriginalFileIds: new Set(),
      }),
    ).toEqual({
      thumbnailMaintenance: null,
      fileIdsToRefresh: [],
    });
  });
});

describe("filterProjectThumbnailRefreshAssets", () => {
  it("keeps only thumbnail assets that are still missing from the current scene files", () => {
    const thumbnailA = createProjectAssetPayload("thumbnail-a");
    const thumbnailB = createProjectAssetPayload("thumbnail-b");

    expect(
      filterProjectThumbnailRefreshAssets({
        assets: [
          thumbnailA,
          createProjectAssetPayload("preview-a", {
            rendition: "preview",
          }),
          createProjectAssetPayload("original-a", {
            rendition: "original",
          }),
          createProjectAssetPayload("already-preview"),
          createProjectAssetPayload("already-original"),
          thumbnailB,
        ],
        loadedPreviewFileIds: new Set(["already-preview"]),
        loadedOriginalFileIds: new Set(["already-original"]),
      }),
    ).toEqual([thumbnailA, thumbnailB]);
  });
});

describe("buildProjectThumbnailMaintenanceFromRepairResult", () => {
  it("reports failed thumbnail maintenance only when the repair result has failures", () => {
    expect(
      buildProjectThumbnailMaintenanceFromRepairResult(
        createRepairResult({
          failedFileIds: ["failed-a", "failed-b"],
        }),
      ),
    ).toEqual({
      status: "failed",
      total: 2,
    });

    expect(
      buildProjectThumbnailMaintenanceFromRepairResult(
        createRepairResult({
          failedFileIds: [],
        }),
      ),
    ).toBeNull();
  });
});

describe("buildProjectThumbnailMaintenanceFailure", () => {
  it("builds a failed maintenance state from the requested file count", () => {
    expect(buildProjectThumbnailMaintenanceFailure(["a", "b", "b"])).toEqual({
      status: "failed",
      total: 3,
    });
  });
});

describe("buildProjectThumbnailMaintenancePending", () => {
  it("builds pending maintenance state with an optional message", () => {
    expect(buildProjectThumbnailMaintenancePending(["a", "b"])).toEqual({
      status: "pending",
      total: 2,
    });

    expect(
      buildProjectThumbnailMaintenancePending(["a"], "正在检查项目数据"),
    ).toEqual({
      status: "pending",
      total: 1,
      message: "正在检查项目数据",
    });
  });
});

describe("buildProjectMissingThumbnailFileIds", () => {
  it("collects unique placeholder thumbnail file ids from project asset payloads", () => {
    expect(
      buildProjectMissingThumbnailFileIds([
        createProjectAssetPayload("missing-a", {
          rendition: "placeholder",
        }),
        createProjectAssetPayload("loaded-thumbnail"),
        createProjectAssetPayload("missing-a", {
          rendition: "placeholder",
        }),
        createProjectAssetPayload("loaded-original", {
          rendition: "original",
        }),
        createProjectAssetPayload("missing-b", {
          rendition: "placeholder",
        }),
      ]),
    ).toEqual(["missing-a", "missing-b"]);
  });
});

describe("buildProjectThumbnailMaintenanceFromMissingFileIds", () => {
  it("builds pending maintenance only when the opened project has missing thumbnail files", () => {
    expect(
      buildProjectThumbnailMaintenanceFromMissingFileIds(["a", "b", "b"]),
    ).toEqual({
      status: "pending",
      total: 3,
    });

    expect(buildProjectThumbnailMaintenanceFromMissingFileIds([])).toBeNull();
  });
});

describe("buildProjectRepairSceneRefreshPlan", () => {
  const activeProject = {
    projectPath: "/tmp/project",
    imageRecords: {},
  };

  it("skips scene refresh when the repair result has no restored scene payload", () => {
    expect(
      buildProjectRepairSceneRefreshPlan({
        projectPath: "/tmp/project",
        activeProject,
        restoredSceneJson: null,
        restoredBoardFileIds: ["file-1", "file-2"],
      }),
    ).toEqual({
      action: "skip",
      reason: "no-restored-scene",
      restoredCount: 2,
      skippedCount: 0,
    });

    expect(
      buildProjectRepairSceneRefreshPlan({
        projectPath: "/tmp/project",
        activeProject,
        restoredSceneJson: "{}",
        restoredBoardFileIds: [],
      }),
    ).toEqual({
      action: "skip",
      reason: "no-restored-scene",
      restoredCount: 0,
      skippedCount: 0,
    });
  });

  it("skips every restored board item when the active project changed", () => {
    expect(
      buildProjectRepairSceneRefreshPlan({
        projectPath: "/tmp/project-a",
        activeProject: {
          ...activeProject,
          projectPath: "/tmp/project-b",
        },
        restoredSceneJson: "{}",
        restoredBoardFileIds: ["file-1", "file-2", "file-3"],
      }),
    ).toEqual({
      action: "skip",
      reason: "project-changed",
      restoredCount: 0,
      skippedCount: 3,
    });

    expect(
      buildProjectRepairSceneRefreshPlan({
        projectPath: "/tmp/project-a",
        activeProject: null,
        restoredSceneJson: "{}",
        restoredBoardFileIds: ["file-1"],
      }),
    ).toEqual({
      action: "skip",
      reason: "project-changed",
      restoredCount: 0,
      skippedCount: 1,
    });
  });

  it("returns the scene payload and file ids when the current project still matches", () => {
    expect(
      buildProjectRepairSceneRefreshPlan({
        projectPath: "/tmp/project",
        activeProject,
        restoredSceneJson: "{\"type\":\"excalidraw\"}",
        restoredBoardFileIds: ["file-1", "file-2"],
      }),
    ).toEqual({
      action: "refresh",
      sceneJson: "{\"type\":\"excalidraw\"}",
      fileIds: ["file-1", "file-2"],
      activeProject,
    });
  });
});

describe("buildProjectRepairSceneRefreshResult", () => {
  it("summarizes restored scene refresh counts from requested ids and loaded assets", () => {
    expect(
      buildProjectRepairSceneRefreshResult({
        restoredBoardFileIds: ["file-1", "file-2", "file-3"],
        loadedAssetCount: 2,
      }),
    ).toEqual({
      restoredCount: 3,
      skippedCount: 1,
    });

    expect(
      buildProjectRepairSceneRefreshResult({
        restoredBoardFileIds: ["file-1"],
        loadedAssetCount: 3,
      }),
    ).toEqual({
      restoredCount: 1,
      skippedCount: 0,
    });
  });
});
