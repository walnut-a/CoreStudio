import type {
  CleanProjectCacheResult,
  ProjectAssetPayload,
  ProjectHealthReport,
  ProjectRepairFileDetail,
  RebuildProjectThumbnailsResult,
} from "../../shared/desktopBridgeTypes";
import type { ImageRecordMap } from "../../shared/projectTypes";
import { copy } from "../copy";

export type ThumbnailMaintenanceState = {
  status: "pending" | "failed";
  total: number;
  message?: string;
};

export interface ProjectRepairReport {
  generatedCount: number;
  skippedCount: number;
  failedCount: number;
  repairedGenerationRecordCount: number;
  restoredImageRecordCount: number;
  skippedImageRecordCount: number;
  backupPath?: string | null;
  skippedDetails: ProjectRepairFileDetail[];
  failedDetails: ProjectRepairFileDetail[];
}

export interface BuildProjectRepairReportInput {
  result: RebuildProjectThumbnailsResult;
  restoredCount: number;
  skippedRestoreCount: number;
}

export interface ProjectRepairCompletionNotice {
  generatedCount: number;
  skippedCount: number;
  failedCount: number;
  backupPath?: string | null;
  repairedGenerationRecordCount: number;
  restoredImageRecordCount: number;
  skippedImageRecordCount: number;
}

export interface BuildProjectRepairCompletionViewModelInput {
  result: RebuildProjectThumbnailsResult;
  metadataRepair: Pick<
    ApplyProjectRepairImageRecordUpdatesResult,
    "repairedGenerationRecordFileIds"
  >;
  restoredCount: number;
  skippedRestoreCount: number;
}

export interface BuildProjectRepairCompletionStateInput<
  TProject extends { projectPath: string; imageRecords: ImageRecordMap },
> extends BuildProjectRepairCompletionViewModelInput {
  activeProject: TProject | null | undefined;
  projectPath: string;
}

export interface ProjectRepairCompletionMessages {
  thumbnailsRepaired: (
    generatedCount: number,
    skippedCount: number,
    failedCount: number,
    backupPath: string | null | undefined,
    repairedGenerationRecordCount: number,
    restoredImageRecordCount: number,
    skippedImageRecordCount: number,
  ) => string;
}

export interface BuildProjectRepairCompletionUiStateInput {
  notice: ProjectRepairCompletionNotice;
  messages: ProjectRepairCompletionMessages;
}

export interface BuildProjectRepairCompletionResultStateInput<
  TProject extends { projectPath: string; imageRecords: ImageRecordMap },
> extends BuildProjectRepairCompletionStateInput<TProject> {
  messages: ProjectRepairCompletionMessages;
}

export interface ProjectRepairCompletionViewModel {
  repairReport: ProjectRepairReport;
  thumbnailMaintenance: ProjectThumbnailMaintenanceResult;
  notice: ProjectRepairCompletionNotice;
}

export interface ProjectRepairCompletionState<
  TProject extends { projectPath: string; imageRecords: ImageRecordMap },
> extends ProjectRepairCompletionViewModel {
  activeProjectUpdate: TProject | null;
}

export interface ProjectRepairCompletionResultState<
  TProject extends { projectPath: string; imageRecords: ImageRecordMap },
> extends ProjectRepairCompletionState<TProject> {
  uiState: ProjectMaintenanceUiState;
}

export interface ApplyProjectRepairImageRecordUpdatesInput {
  imageRecords: ImageRecordMap;
  repairedGenerationRecordFileIds: readonly string[];
}

export interface BuildProjectRepairActiveProjectUpdateInput<
  TProject extends { projectPath: string; imageRecords: ImageRecordMap },
> {
  activeProject: TProject | null | undefined;
  projectPath: string;
  repairedGenerationRecordFileIds: readonly string[];
}

export interface BuildProjectRepairMetadataUpdateInput<
  TProject extends { imageRecords: ImageRecordMap },
> {
  project: TProject;
  repairedGenerationRecordFileIds: readonly string[];
}

export interface BuildProjectRepairResultStateInput<
  TProject extends { imageRecords: ImageRecordMap },
> {
  project: TProject;
  result: RebuildProjectThumbnailsResult;
  loadedPreviewFileIds: ReadonlySet<string>;
  loadedOriginalFileIds: ReadonlySet<string>;
}

export interface ProjectRepairMetadataUpdate<
  TProject extends { imageRecords: ImageRecordMap },
> {
  project: TProject;
  metadataRepair: ApplyProjectRepairImageRecordUpdatesResult;
}

export interface ProjectRepairResultState<
  TProject extends { imageRecords: ImageRecordMap },
> {
  metadataUpdate: ProjectRepairMetadataUpdate<TProject>;
  fileIdsToRefresh: string[];
}

export interface ApplyProjectRepairImageRecordUpdatesResult {
  imageRecords: ImageRecordMap;
  changed: boolean;
  repairedGenerationRecordFileIds: readonly string[];
}

export type ProjectRepairSceneRefreshPlan<TProject> =
  | {
      action: "skip";
      reason: "no-restored-scene" | "project-changed";
      restoredCount: number;
      skippedCount: number;
    }
  | {
      action: "refresh";
      sceneJson: string;
      fileIds: string[];
      activeProject: TProject;
    };

export interface BuildProjectRepairSceneRefreshPlanInput<TProject> {
  projectPath: string;
  activeProject: TProject | null | undefined;
  restoredSceneJson?: string | null;
  restoredBoardFileIds: readonly string[];
}

export interface BuildProjectRepairSceneRefreshResultInput {
  restoredBoardFileIds: readonly string[];
  loadedAssetCount: number;
}

export interface BuildProjectRepairSceneApplyStateInput<
  TProject extends { imageRecords: ImageRecordMap; sceneJson: string },
  TElements,
  TAppState,
  TFiles extends Record<string, unknown>,
> {
  activeProject: TProject;
  imageRecords: ImageRecordMap;
  sceneJson: string;
  elements: TElements;
  appState: TAppState;
  currentFiles: TFiles;
  files: TFiles;
}

export interface ProjectRepairSceneApplyState<
  TProject extends { imageRecords: ImageRecordMap; sceneJson: string },
  TElements,
  TAppState,
  TFiles extends Record<string, unknown>,
> {
  scene: {
    elements: TElements;
    appState: TAppState;
    files: TFiles;
  };
  project: TProject;
}

export interface ProjectRepairSceneRefreshResult {
  restoredCount: number;
  skippedCount: number;
}

export interface BuildProjectThumbnailRefreshFileIdsInput {
  generatedFileIds: readonly string[];
  skippedFileIds?: readonly string[];
  loadedPreviewFileIds: ReadonlySet<string>;
  loadedOriginalFileIds: ReadonlySet<string>;
}

export interface FilterProjectThumbnailRefreshAssetsInput {
  assets: readonly ProjectAssetPayload[];
  loadedPreviewFileIds: ReadonlySet<string>;
  loadedOriginalFileIds: ReadonlySet<string>;
}

export type ProjectThumbnailMaintenanceResult = ThumbnailMaintenanceState | null;

export interface BuildProjectThumbnailRebuildResultStateInput {
  result: RebuildProjectThumbnailsResult;
  loadedPreviewFileIds: ReadonlySet<string>;
  loadedOriginalFileIds: ReadonlySet<string>;
}

export interface ProjectThumbnailRebuildResultState {
  thumbnailMaintenance: ProjectThumbnailMaintenanceResult;
  fileIdsToRefresh: string[];
}

export interface ProjectStatusToastViewModel {
  message: string;
  tone: "success" | "pending" | "failed";
  hasDetails: boolean;
}

export type ProjectHealthInspectionNotice =
  | {
      kind: "needs-repair";
      errorCount: number;
      warningCount: number;
      repairableCount: number;
    }
  | {
      kind: "has-info";
      infoCount: number;
    }
  | {
      kind: "healthy";
      imageRecordCount: number;
      generatedImageRecordCount: number;
    };

export interface ProjectHealthInspectionNoticeMessages {
  needsRepair: (
    errorCount: number,
    warningCount: number,
    repairableCount: number,
  ) => string;
  hasInfo: (infoCount: number) => string;
  healthy: (
    imageRecordCount: number,
    generatedImageRecordCount: number,
  ) => string;
}

export interface BuildProjectHealthInspectionNoticeTextInput {
  notice: ProjectHealthInspectionNotice;
  messages: ProjectHealthInspectionNoticeMessages;
}

export interface BuildProjectHealthInspectionSuccessUiStateInput {
  notice: ProjectHealthInspectionNotice;
  messages: ProjectHealthInspectionNoticeMessages;
}

export interface BuildProjectHealthInspectionResultStateInput {
  report: ProjectHealthReport;
  messages: ProjectHealthInspectionNoticeMessages;
}

export interface ProjectHealthInspectionSuccessState {
  projectHealthReport: ProjectHealthReport;
  projectHealthReportOpen: boolean;
  projectRepairReport: ProjectRepairReport | null;
  thumbnailMaintenance: ThumbnailMaintenanceState | null;
  notice: ProjectHealthInspectionNotice;
}

export interface ProjectHealthInspectionResultState
  extends ProjectHealthInspectionSuccessState {
  uiState: ProjectMaintenanceUiState;
}

export interface ProjectRepairStartState {
  projectHealthReport: ProjectHealthReport | null;
  projectHealthReportOpen: boolean;
  projectRepairReport: ProjectRepairReport | null;
  thumbnailMaintenance: ThumbnailMaintenanceState;
}

export interface ProjectRepairStartResultState
  extends ProjectRepairStartState {
  uiState: ProjectMaintenanceUiState;
}

export interface ProjectHealthInspectionStartState {
  projectHealthReport: ProjectHealthReport | null;
  projectHealthReportOpen: boolean;
  projectRepairReport: ProjectRepairReport | null;
  thumbnailMaintenance: ThumbnailMaintenanceState;
}

export interface ProjectHealthInspectionStartResultState
  extends ProjectHealthInspectionStartState {
  uiState: ProjectMaintenanceUiState;
}

export interface ProjectCacheCleanStartResultState {
  uiState: ProjectMaintenanceUiState;
}

export interface ProjectCacheCleanFailureResultState {
  uiState: ProjectMaintenanceUiState;
}

export interface ProjectRepairFailureState {
  projectHealthReport: ProjectHealthReport | null;
  projectHealthReportOpen: boolean;
  projectRepairReport: ProjectRepairReport | null;
  thumbnailMaintenance: ThumbnailMaintenanceState;
}

export interface ProjectRepairFailureResultState
  extends ProjectRepairFailureState {
  uiState: ProjectMaintenanceUiState;
}

export interface ProjectThumbnailRebuildFailureState {
  thumbnailMaintenance: ThumbnailMaintenanceState;
}

export interface ProjectHealthInspectionFailureState {
  projectHealthReport: ProjectHealthReport | null;
  projectHealthReportOpen: boolean;
  projectRepairReport: ProjectRepairReport | null;
  thumbnailMaintenance: ThumbnailMaintenanceState | null;
}

export interface ProjectHealthInspectionFailureResultState
  extends ProjectHealthInspectionFailureState {
  uiState: ProjectMaintenanceUiState;
}

export type ProjectRepairReadinessReason =
  | "no-project"
  | "no-images"
  | "missing-capability";

export type ProjectHealthInspectionReadinessReason =
  | "no-project"
  | "missing-capability";

export type ProjectCacheCleanReadinessReason =
  | "no-project"
  | "missing-capability";

export type ProjectThumbnailRebuildReadinessReason =
  | "no-files"
  | "missing-capability";

export interface ProjectMaintenanceUiState {
  projectError: string | null;
  projectNotice: string | null;
}

export type ProjectMaintenanceUiNoticeAction =
  | {
      action: "show";
      message: string;
    }
  | {
      action: "clear";
    };

export interface ProjectMaintenanceBlockedMessages {
  noProject: string;
  noImages: string;
  thumbnailsFailed: string;
  healthCheckFailed: string;
  cacheCleanFailed: string;
}

export interface BuildProjectRepairBlockedUiStateInput {
  reason: ProjectRepairReadinessReason;
  messages: Pick<
    ProjectMaintenanceBlockedMessages,
    "noProject" | "noImages" | "thumbnailsFailed"
  >;
}

export interface BuildProjectHealthInspectionBlockedUiStateInput {
  reason: ProjectHealthInspectionReadinessReason;
  messages: Pick<
    ProjectMaintenanceBlockedMessages,
    "noProject" | "healthCheckFailed"
  >;
}

export interface BuildProjectCacheCleanBlockedUiStateInput {
  reason: ProjectCacheCleanReadinessReason;
  messages: Pick<
    ProjectMaintenanceBlockedMessages,
    "noProject" | "cacheCleanFailed"
  >;
}

export interface ProjectCacheCleanSuccessMessages {
  cacheCleaned: (removedFileCount: number, removedBytes: number) => string;
}

export interface BuildProjectCacheCleanSuccessUiStateInput {
  result: CleanProjectCacheResult;
  messages: ProjectCacheCleanSuccessMessages;
}

export type ProjectRepairReadiness<
  TProject extends { imageRecords: ImageRecordMap },
  TRepairProjectThumbnails,
> =
  | {
      status: "blocked";
      reason: ProjectRepairReadinessReason;
    }
  | {
      status: "ready";
      project: TProject;
      repairProjectThumbnails: TRepairProjectThumbnails;
      fileIds: string[];
      startState: ProjectRepairStartResultState;
    };

export type ProjectHealthInspectionReadiness<
  TProject extends { imageRecords: ImageRecordMap },
  TInspectProjectHealth,
> =
  | {
      status: "blocked";
      reason: ProjectHealthInspectionReadinessReason;
    }
  | {
      status: "ready";
      project: TProject;
      inspectProjectHealth: TInspectProjectHealth;
      fileIds: string[];
      startState: ProjectHealthInspectionStartResultState;
    };

export type ProjectCacheCleanReadiness<
  TProject extends { projectPath: string },
  TCleanProjectCache,
> =
  | {
      status: "blocked";
      reason: ProjectCacheCleanReadinessReason;
    }
  | {
      status: "ready";
      project: TProject;
      cleanProjectCache: TCleanProjectCache;
      startState: ProjectCacheCleanStartResultState;
    };

export type ProjectThumbnailRebuildReadiness<
  TProject,
  TRebuildProjectThumbnails,
> =
  | {
      status: "skip";
      reason: "no-files";
    }
  | {
      status: "blocked";
      reason: "missing-capability";
      fileIds: string[];
      failureState: ProjectThumbnailRebuildFailureState;
    }
  | {
      status: "ready";
      project: TProject;
      rebuildProjectThumbnails: TRebuildProjectThumbnails;
      fileIds: string[];
    };

export interface BuildProjectRepairReadinessInput<
  TProject extends { imageRecords: ImageRecordMap },
  TRepairProjectThumbnails,
> {
  project: TProject | null | undefined;
  repairProjectThumbnails: TRepairProjectThumbnails | null | undefined;
}

export interface BuildProjectHealthInspectionReadinessInput<
  TProject extends { imageRecords: ImageRecordMap },
  TInspectProjectHealth,
> {
  project: TProject | null | undefined;
  inspectProjectHealth: TInspectProjectHealth | null | undefined;
  pendingMessage: string;
}

export interface BuildProjectCacheCleanReadinessInput<
  TProject extends { projectPath: string },
  TCleanProjectCache,
> {
  project: TProject | null | undefined;
  cleanProjectCache: TCleanProjectCache | null | undefined;
}

export interface BuildProjectThumbnailRebuildReadinessInput<
  TProject,
  TRebuildProjectThumbnails,
> {
  project: TProject;
  fileIds: readonly string[];
  rebuildProjectThumbnails: TRebuildProjectThumbnails | null | undefined;
}

export interface ShouldApplyProjectMaintenanceResultInput {
  activeProjectPath: string | null | undefined;
  projectPath: string;
}

export type ProjectMaintenanceAssetApplyPlan<
  TProject extends { projectPath: string },
> =
  | {
      action: "apply";
      activeProject: TProject;
    }
  | {
      action: "skip";
      reason: "no-assets" | "project-changed";
    };

export type ProjectMaintenanceAssetSceneApplyState<
  TProject extends { projectPath: string },
  TScene extends { files: Record<string, unknown> },
  TFiles extends Record<string, unknown>,
> =
  | {
      action: "apply";
      activeProject: TProject;
      files: TFiles;
      filesToAdd: Array<TFiles[keyof TFiles]>;
      scene: TScene | null;
    }
  | {
      action: "skip";
      reason: "no-assets" | "project-changed" | "no-files";
    };

export interface BuildProjectMaintenanceAssetApplyPlanInput<
  TProject extends { projectPath: string },
> {
  activeProject: TProject | null | undefined;
  projectPath: string;
  assetCount: number;
}

export interface BuildProjectMaintenanceAssetSceneApplyStateInput<
  TProject extends { projectPath: string },
  TScene extends { files: Record<string, unknown> },
  TFiles extends Record<string, unknown>,
> extends BuildProjectMaintenanceAssetApplyPlanInput<TProject> {
  scene: TScene | null;
  buildFiles: (activeProject: TProject) => TFiles;
}

export interface BuildProjectMaintenanceSceneFilesUpdateInput<
  TScene extends { files: Record<string, unknown> },
  TFiles extends Record<string, unknown>,
> {
  scene: TScene | null;
  files: TFiles;
}

export interface BuildProjectStatusToastViewModelInput {
  projectNotice: string | null;
  thumbnailMaintenance: ThumbnailMaintenanceState | null;
  projectHealthReport: ProjectHealthReport | null;
  projectRepairReport: ProjectRepairReport | null;
}

export const buildProjectRepairReport = ({
  result,
  restoredCount,
  skippedRestoreCount,
}: BuildProjectRepairReportInput): ProjectRepairReport => {
  const restoredBoardFileCount = result.restoredBoardFileIds?.length ?? 0;
  const report: ProjectRepairReport = {
    generatedCount: result.generatedFileIds.length,
    skippedCount: result.skippedFileIds.length,
    failedCount: result.failedFileIds.length,
    repairedGenerationRecordCount:
      result.repairedGenerationRecordFileIds.length,
    restoredImageRecordCount: Math.max(restoredCount, restoredBoardFileCount),
    skippedImageRecordCount: skippedRestoreCount,
    skippedDetails: result.skippedDetails ?? [],
    failedDetails: result.failedDetails ?? [],
  };

  if (result.backupPath !== undefined) {
    report.backupPath = result.backupPath;
  }

  return report;
};

export const buildProjectRepairCompletionViewModel = ({
  result,
  metadataRepair,
  restoredCount,
  skippedRestoreCount,
}: BuildProjectRepairCompletionViewModelInput): ProjectRepairCompletionViewModel => {
  const repairReport = buildProjectRepairReport({
    result,
    restoredCount,
    skippedRestoreCount,
  });
  const notice: ProjectRepairCompletionNotice = {
    generatedCount: result.generatedFileIds.length,
    skippedCount: result.skippedFileIds.length,
    failedCount: result.failedFileIds.length,
    repairedGenerationRecordCount:
      metadataRepair.repairedGenerationRecordFileIds.length,
    restoredImageRecordCount: repairReport.restoredImageRecordCount,
    skippedImageRecordCount: skippedRestoreCount,
  };

  if (result.backupPath !== undefined) {
    notice.backupPath = result.backupPath;
  }

  return {
    repairReport,
    thumbnailMaintenance: buildProjectThumbnailMaintenanceFromRepairResult(
      result,
    ),
    notice,
  };
};

export const buildProjectRepairCompletionState = <
  TProject extends { projectPath: string; imageRecords: ImageRecordMap },
>({
  activeProject,
  projectPath,
  ...viewModelInput
}: BuildProjectRepairCompletionStateInput<TProject>): ProjectRepairCompletionState<TProject> => {
  const viewModel = buildProjectRepairCompletionViewModel(viewModelInput);
  return {
    ...viewModel,
    activeProjectUpdate: buildProjectRepairActiveProjectUpdate({
      activeProject,
      projectPath,
      repairedGenerationRecordFileIds:
        viewModelInput.metadataRepair.repairedGenerationRecordFileIds,
    }),
  };
};

export const buildProjectRepairCompletionUiState = ({
  notice,
  messages,
}: BuildProjectRepairCompletionUiStateInput): ProjectMaintenanceUiState => ({
  projectError: null,
  projectNotice: messages.thumbnailsRepaired(
    notice.generatedCount,
    notice.skippedCount,
    notice.failedCount,
    notice.backupPath,
    notice.repairedGenerationRecordCount,
    notice.restoredImageRecordCount,
    notice.skippedImageRecordCount,
  ),
});

export const buildProjectRepairCompletionResultState = <
  TProject extends { projectPath: string; imageRecords: ImageRecordMap },
>({
  messages,
  ...completionStateInput
}: BuildProjectRepairCompletionResultStateInput<TProject>): ProjectRepairCompletionResultState<TProject> => {
  const completionState = buildProjectRepairCompletionState(
    completionStateInput,
  );
  return {
    ...completionState,
    uiState: buildProjectRepairCompletionUiState({
      notice: completionState.notice,
      messages,
    }),
  };
};

export const applyProjectRepairImageRecordUpdates = ({
  imageRecords,
  repairedGenerationRecordFileIds,
}: ApplyProjectRepairImageRecordUpdatesInput): ApplyProjectRepairImageRecordUpdatesResult => {
  let nextImageRecords: ImageRecordMap | null = null;

  repairedGenerationRecordFileIds.forEach((fileId) => {
    const record = (nextImageRecords ?? imageRecords)[fileId];
    if (!record || record.sourceType !== "generated" || record.generationOrigin) {
      return;
    }

    nextImageRecords ??= { ...imageRecords };
    nextImageRecords[fileId] = {
      ...record,
      generationOrigin: "corestudio",
    };
  });

  return {
    imageRecords: nextImageRecords ?? imageRecords,
    changed: Boolean(nextImageRecords),
    repairedGenerationRecordFileIds,
  };
};

export const buildProjectRepairActiveProjectUpdate = <
  TProject extends { projectPath: string; imageRecords: ImageRecordMap },
>({
  activeProject,
  projectPath,
  repairedGenerationRecordFileIds,
}: BuildProjectRepairActiveProjectUpdateInput<TProject>): TProject | null => {
  if (!activeProject || activeProject.projectPath !== projectPath) {
    return null;
  }

  const metadataUpdate = buildProjectRepairMetadataUpdate({
    project: activeProject,
    repairedGenerationRecordFileIds,
  });

  return metadataUpdate.metadataRepair.changed ? metadataUpdate.project : null;
};

export const buildProjectRepairMetadataUpdate = <
  TProject extends { imageRecords: ImageRecordMap },
>({
  project,
  repairedGenerationRecordFileIds,
}: BuildProjectRepairMetadataUpdateInput<TProject>): ProjectRepairMetadataUpdate<TProject> => {
  const metadataRepair = applyProjectRepairImageRecordUpdates({
    imageRecords: project.imageRecords,
    repairedGenerationRecordFileIds,
  });

  return {
    metadataRepair,
    project: metadataRepair.changed
      ? {
          ...project,
          imageRecords: metadataRepair.imageRecords,
        }
      : project,
  };
};

export const buildProjectRepairResultState = <
  TProject extends { imageRecords: ImageRecordMap },
>({
  project,
  result,
  loadedPreviewFileIds,
  loadedOriginalFileIds,
}: BuildProjectRepairResultStateInput<TProject>): ProjectRepairResultState<TProject> => {
  return {
    metadataUpdate: buildProjectRepairMetadataUpdate({
      project,
      repairedGenerationRecordFileIds:
        result.repairedGenerationRecordFileIds ?? [],
    }),
    fileIdsToRefresh: buildProjectThumbnailRefreshFileIds({
      generatedFileIds: result.generatedFileIds,
      loadedPreviewFileIds,
      loadedOriginalFileIds,
    }),
  };
};

export const buildProjectRepairSceneRefreshPlan = <
  TProject extends { projectPath: string },
>({
  projectPath,
  activeProject,
  restoredSceneJson,
  restoredBoardFileIds,
}: BuildProjectRepairSceneRefreshPlanInput<TProject>): ProjectRepairSceneRefreshPlan<TProject> => {
  if (!restoredSceneJson || !restoredBoardFileIds.length) {
    return {
      action: "skip",
      reason: "no-restored-scene",
      restoredCount: restoredBoardFileIds.length,
      skippedCount: 0,
    };
  }

  if (!activeProject || activeProject.projectPath !== projectPath) {
    return {
      action: "skip",
      reason: "project-changed",
      restoredCount: 0,
      skippedCount: restoredBoardFileIds.length,
    };
  }

  return {
    action: "refresh",
    sceneJson: restoredSceneJson,
    fileIds: Array.from(restoredBoardFileIds),
    activeProject,
  };
};

export const buildProjectRepairSceneRefreshResult = ({
  restoredBoardFileIds,
  loadedAssetCount,
}: BuildProjectRepairSceneRefreshResultInput): ProjectRepairSceneRefreshResult => ({
  restoredCount: restoredBoardFileIds.length,
  skippedCount: Math.max(restoredBoardFileIds.length - loadedAssetCount, 0),
});

export const buildProjectRepairSceneApplyState = <
  TProject extends { imageRecords: ImageRecordMap; sceneJson: string },
  TElements,
  TAppState,
  TFiles extends Record<string, unknown>,
>({
  activeProject,
  imageRecords,
  sceneJson,
  elements,
  appState,
  currentFiles,
  files,
}: BuildProjectRepairSceneApplyStateInput<
  TProject,
  TElements,
  TAppState,
  TFiles
>): ProjectRepairSceneApplyState<TProject, TElements, TAppState, TFiles> => ({
  scene: {
    elements,
    appState,
    files: {
      ...currentFiles,
      ...files,
    },
  },
  project: {
    ...activeProject,
    imageRecords,
    sceneJson,
  },
});

export const buildProjectThumbnailRefreshFileIds = ({
  generatedFileIds,
  skippedFileIds = [],
  loadedPreviewFileIds,
  loadedOriginalFileIds,
}: BuildProjectThumbnailRefreshFileIdsInput): string[] =>
  Array.from(new Set([...generatedFileIds, ...skippedFileIds])).filter(
    (fileId) =>
      !loadedPreviewFileIds.has(fileId) && !loadedOriginalFileIds.has(fileId),
  );

export const filterProjectThumbnailRefreshAssets = ({
  assets,
  loadedPreviewFileIds,
  loadedOriginalFileIds,
}: FilterProjectThumbnailRefreshAssetsInput): ProjectAssetPayload[] =>
  assets.filter(
    (asset) =>
      asset.rendition === "thumbnail" &&
      !loadedPreviewFileIds.has(asset.fileId) &&
      !loadedOriginalFileIds.has(asset.fileId),
  );

export const shouldApplyProjectMaintenanceResult = ({
  activeProjectPath,
  projectPath,
}: ShouldApplyProjectMaintenanceResultInput): boolean =>
  activeProjectPath === projectPath;

export const buildProjectMaintenanceAssetApplyPlan = <
  TProject extends { projectPath: string },
>({
  activeProject,
  projectPath,
  assetCount,
}: BuildProjectMaintenanceAssetApplyPlanInput<TProject>): ProjectMaintenanceAssetApplyPlan<TProject> => {
  if (assetCount <= 0) {
    return {
      action: "skip",
      reason: "no-assets",
    };
  }

  if (
    !activeProject ||
    !shouldApplyProjectMaintenanceResult({
      activeProjectPath: activeProject.projectPath,
      projectPath,
    })
  ) {
    return {
      action: "skip",
      reason: "project-changed",
    };
  }

  return {
    action: "apply",
    activeProject,
  };
};

export const buildProjectMaintenanceSceneFilesUpdate = <
  TScene extends { files: Record<string, unknown> },
  TFiles extends Record<string, unknown>,
>({
  scene,
  files,
}: BuildProjectMaintenanceSceneFilesUpdateInput<TScene, TFiles>): TScene | null => {
  if (!scene) {
    return scene;
  }

  return {
    ...scene,
    files: {
      ...scene.files,
      ...files,
    },
  };
};

export const buildProjectMaintenanceAssetSceneApplyState = <
  TProject extends { projectPath: string },
  TScene extends { files: Record<string, unknown> },
  TFiles extends Record<string, unknown>,
>({
  activeProject,
  projectPath,
  assetCount,
  scene,
  buildFiles,
}: BuildProjectMaintenanceAssetSceneApplyStateInput<
  TProject,
  TScene,
  TFiles
>): ProjectMaintenanceAssetSceneApplyState<TProject, TScene, TFiles> => {
  const applyPlan = buildProjectMaintenanceAssetApplyPlan({
    activeProject,
    projectPath,
    assetCount,
  });
  if (applyPlan.action === "skip") {
    return applyPlan;
  }

  const files = buildFiles(applyPlan.activeProject);
  const filesToAdd = Object.values(files) as Array<TFiles[keyof TFiles]>;
  if (!filesToAdd.length) {
    return {
      action: "skip",
      reason: "no-files",
    };
  }

  return {
    action: "apply",
    activeProject: applyPlan.activeProject,
    files,
    filesToAdd,
    scene: buildProjectMaintenanceSceneFilesUpdate({
      scene,
      files,
    }),
  };
};

export const buildProjectThumbnailMaintenanceFromRepairResult = (
  result: RebuildProjectThumbnailsResult,
): ProjectThumbnailMaintenanceResult =>
  result.failedFileIds.length
    ? {
        status: "failed",
        total: result.failedFileIds.length,
      }
    : null;

export const buildProjectThumbnailRebuildResultState = ({
  result,
  loadedPreviewFileIds,
  loadedOriginalFileIds,
}: BuildProjectThumbnailRebuildResultStateInput): ProjectThumbnailRebuildResultState => ({
  thumbnailMaintenance: buildProjectThumbnailMaintenanceFromRepairResult(result),
  fileIdsToRefresh: buildProjectThumbnailRefreshFileIds({
    generatedFileIds: result.generatedFileIds,
    skippedFileIds: result.skippedFileIds,
    loadedPreviewFileIds,
    loadedOriginalFileIds,
  }),
});

export const buildProjectThumbnailMaintenanceFailure = (
  fileIds: readonly string[],
): ThumbnailMaintenanceState => ({
  status: "failed",
  total: fileIds.length,
});

export const buildProjectThumbnailMaintenancePending = (
  fileIds: readonly string[],
  message?: string,
): ThumbnailMaintenanceState => ({
  status: "pending",
  total: fileIds.length,
  ...(message ? { message } : {}),
});

export const buildProjectMissingThumbnailFileIds = (
  assets: readonly Pick<ProjectAssetPayload, "fileId" | "rendition">[],
): string[] =>
  Array.from(
    new Set(
      assets
        .filter((asset) => asset.rendition === "placeholder")
        .map((asset) => asset.fileId),
    ),
  );

export const buildProjectThumbnailMaintenanceFromMissingFileIds = (
  fileIds: readonly string[],
): ProjectThumbnailMaintenanceResult =>
  fileIds.length ? buildProjectThumbnailMaintenancePending(fileIds) : null;

export const buildProjectRepairStartState = (
  fileIds: readonly string[],
): ProjectRepairStartState => ({
  projectHealthReport: null,
  projectHealthReportOpen: false,
  projectRepairReport: null,
  thumbnailMaintenance: buildProjectThumbnailMaintenancePending(fileIds),
});

export const buildProjectRepairStartResultState = (
  fileIds: readonly string[],
): ProjectRepairStartResultState => ({
  ...buildProjectRepairStartState(fileIds),
  uiState: buildProjectMaintenanceStartUiState(),
});

export const buildProjectHealthInspectionStartState = (
  fileIds: readonly string[],
  message: string,
): ProjectHealthInspectionStartState => ({
  projectHealthReport: null,
  projectHealthReportOpen: false,
  projectRepairReport: null,
  thumbnailMaintenance: buildProjectThumbnailMaintenancePending(
    fileIds,
    message,
  ),
});

export const buildProjectHealthInspectionStartResultState = (
  fileIds: readonly string[],
  message: string,
): ProjectHealthInspectionStartResultState => ({
  ...buildProjectHealthInspectionStartState(fileIds, message),
  uiState: buildProjectMaintenanceStartUiState(),
});

export const buildProjectRepairReadiness = <
  TProject extends { imageRecords: ImageRecordMap },
  TRepairProjectThumbnails,
>({
  project,
  repairProjectThumbnails,
}: BuildProjectRepairReadinessInput<
  TProject,
  TRepairProjectThumbnails
>): ProjectRepairReadiness<TProject, TRepairProjectThumbnails> => {
  if (!project) {
    return {
      status: "blocked",
      reason: "no-project",
    };
  }

  const fileIds = Object.keys(project.imageRecords);
  if (!fileIds.length) {
    return {
      status: "blocked",
      reason: "no-images",
    };
  }

  if (!repairProjectThumbnails) {
    return {
      status: "blocked",
      reason: "missing-capability",
    };
  }

  return {
    status: "ready",
    project,
    repairProjectThumbnails,
    fileIds,
    startState: buildProjectRepairStartResultState(fileIds),
  };
};

export const buildProjectRepairBlockedUiState = ({
  reason,
  messages,
}: BuildProjectRepairBlockedUiStateInput): ProjectMaintenanceUiState => {
  if (reason === "no-images") {
    return {
      projectError: null,
      projectNotice: messages.noImages,
    };
  }

  return {
    projectError:
      reason === "no-project"
        ? messages.noProject
        : messages.thumbnailsFailed,
    projectNotice: null,
  };
};

export const buildProjectMaintenanceStartUiState = (): ProjectMaintenanceUiState => ({
  projectError: null,
  projectNotice: null,
});

export const buildProjectMaintenanceFailureUiState = (
  errorMessage: string,
): ProjectMaintenanceUiState => ({
  projectError: errorMessage,
  projectNotice: null,
});

export const buildProjectMaintenanceUiNoticeAction = ({
  projectNotice,
}: ProjectMaintenanceUiState): ProjectMaintenanceUiNoticeAction =>
  projectNotice
    ? {
        action: "show",
        message: projectNotice,
      }
    : {
        action: "clear",
      };

export const buildProjectCacheCleanStartResultState =
  (): ProjectCacheCleanStartResultState => ({
    uiState: buildProjectMaintenanceStartUiState(),
  });

export const buildProjectCacheCleanFailureResultState = (
  errorMessage: string,
): ProjectCacheCleanFailureResultState => ({
  uiState: buildProjectMaintenanceFailureUiState(errorMessage),
});

export const buildProjectHealthInspectionReadiness = <
  TProject extends { imageRecords: ImageRecordMap },
  TInspectProjectHealth,
>({
  project,
  inspectProjectHealth,
  pendingMessage,
}: BuildProjectHealthInspectionReadinessInput<
  TProject,
  TInspectProjectHealth
>): ProjectHealthInspectionReadiness<TProject, TInspectProjectHealth> => {
  if (!project) {
    return {
      status: "blocked",
      reason: "no-project",
    };
  }

  if (!inspectProjectHealth) {
    return {
      status: "blocked",
      reason: "missing-capability",
    };
  }

  const fileIds = Object.keys(project.imageRecords);

  return {
    status: "ready",
    project,
    inspectProjectHealth,
    fileIds,
    startState: buildProjectHealthInspectionStartResultState(
      fileIds,
      pendingMessage,
    ),
  };
};

export const buildProjectHealthInspectionBlockedUiState = ({
  reason,
  messages,
}: BuildProjectHealthInspectionBlockedUiStateInput): ProjectMaintenanceUiState => ({
  projectError:
    reason === "no-project"
      ? messages.noProject
      : messages.healthCheckFailed,
  projectNotice: null,
});

export const buildProjectCacheCleanReadiness = <
  TProject extends { projectPath: string },
  TCleanProjectCache,
>({
  project,
  cleanProjectCache,
}: BuildProjectCacheCleanReadinessInput<
  TProject,
  TCleanProjectCache
>): ProjectCacheCleanReadiness<TProject, TCleanProjectCache> => {
  if (!project) {
    return {
      status: "blocked",
      reason: "no-project",
    };
  }

  if (!cleanProjectCache) {
    return {
      status: "blocked",
      reason: "missing-capability",
    };
  }

  return {
    status: "ready",
    project,
    cleanProjectCache,
    startState: buildProjectCacheCleanStartResultState(),
  };
};

export const buildProjectCacheCleanBlockedUiState = ({
  reason,
  messages,
}: BuildProjectCacheCleanBlockedUiStateInput): ProjectMaintenanceUiState => ({
  projectError:
    reason === "no-project" ? messages.noProject : messages.cacheCleanFailed,
  projectNotice: null,
});

export const buildProjectCacheCleanSuccessUiState = ({
  result,
  messages,
}: BuildProjectCacheCleanSuccessUiStateInput): ProjectMaintenanceUiState => ({
  projectError: null,
  projectNotice: messages.cacheCleaned(
    result.removedFileCount,
    result.removedBytes,
  ),
});

export const buildProjectThumbnailRebuildReadiness = <
  TProject,
  TRebuildProjectThumbnails,
>({
  project,
  fileIds,
  rebuildProjectThumbnails,
}: BuildProjectThumbnailRebuildReadinessInput<
  TProject,
  TRebuildProjectThumbnails
>): ProjectThumbnailRebuildReadiness<TProject, TRebuildProjectThumbnails> => {
  const uniqueFileIds = Array.from(new Set(fileIds));
  if (!uniqueFileIds.length) {
    return {
      status: "skip",
      reason: "no-files",
    };
  }

  if (!rebuildProjectThumbnails) {
    return {
      status: "blocked",
      reason: "missing-capability",
      fileIds: uniqueFileIds,
      failureState: {
        thumbnailMaintenance:
          buildProjectThumbnailMaintenanceFailure(uniqueFileIds),
      },
    };
  }

  return {
    status: "ready",
    project,
    rebuildProjectThumbnails,
    fileIds: uniqueFileIds,
  };
};

export const buildProjectRepairFailureState = (
  fileIds: readonly string[],
): ProjectRepairFailureState => ({
  projectHealthReport: null,
  projectHealthReportOpen: false,
  projectRepairReport: null,
  thumbnailMaintenance: buildProjectThumbnailMaintenanceFailure(fileIds),
});

export const buildProjectRepairFailureResultState = (
  fileIds: readonly string[],
  errorMessage: string,
): ProjectRepairFailureResultState => ({
  ...buildProjectRepairFailureState(fileIds),
  uiState: buildProjectMaintenanceFailureUiState(errorMessage),
});

export const buildProjectHealthInspectionFailureState = (): ProjectHealthInspectionFailureState => ({
  projectHealthReport: null,
  projectHealthReportOpen: false,
  projectRepairReport: null,
  thumbnailMaintenance: null,
});

export const buildProjectHealthInspectionFailureResultState = (
  errorMessage: string,
): ProjectHealthInspectionFailureResultState => ({
  ...buildProjectHealthInspectionFailureState(),
  uiState: buildProjectMaintenanceFailureUiState(errorMessage),
});

export const projectRepairReportHasDetails = (
  report: ProjectRepairReport | null,
) =>
  Boolean(
    report &&
      (report.failedDetails.length ||
        report.skippedDetails.length ||
        report.failedCount ||
        report.skippedImageRecordCount),
  );

export const buildProjectStatusToastViewModel = ({
  projectNotice,
  thumbnailMaintenance,
  projectHealthReport,
  projectRepairReport,
}: BuildProjectStatusToastViewModelInput): ProjectStatusToastViewModel | null => {
  const message =
    projectNotice ||
    (thumbnailMaintenance
      ? thumbnailMaintenance.message ??
        (thumbnailMaintenance.status === "pending"
          ? copy.projectRepair.thumbnailRepairing(thumbnailMaintenance.total)
          : copy.projectRepair.thumbnailUnavailable(thumbnailMaintenance.total))
      : null);

  if (!message) {
    return null;
  }

  return {
    message,
    tone: projectNotice
      ? "success"
      : thumbnailMaintenance?.status === "failed"
        ? "failed"
        : "pending",
    hasDetails: Boolean(
      projectHealthReport?.issues.length ||
        projectRepairReportHasDetails(projectRepairReport),
    ),
  };
};

export const buildProjectHealthInspectionSuccess = (
  report: ProjectHealthReport,
): ProjectHealthInspectionSuccessState => {
  const infoCount = report.issues.filter(
    (issue) => issue.severity === "info",
  ).length;
  const notice: ProjectHealthInspectionNotice =
    report.summary.errorCount || report.summary.warningCount
      ? {
          kind: "needs-repair",
          errorCount: report.summary.errorCount,
          warningCount: report.summary.warningCount,
          repairableCount: report.summary.repairableCount,
        }
      : infoCount
        ? {
            kind: "has-info",
            infoCount,
          }
        : {
            kind: "healthy",
            imageRecordCount: report.imageRecordCount,
            generatedImageRecordCount: report.generatedImageRecordCount,
          };

  return {
    projectHealthReport: report,
    projectHealthReportOpen: Boolean(report.issues.length),
    projectRepairReport: null,
    thumbnailMaintenance: null,
    notice,
  };
};

export const buildProjectHealthInspectionNoticeText = ({
  notice,
  messages,
}: BuildProjectHealthInspectionNoticeTextInput): string => {
  switch (notice.kind) {
    case "needs-repair":
      return messages.needsRepair(
        notice.errorCount,
        notice.warningCount,
        notice.repairableCount,
      );
    case "has-info":
      return messages.hasInfo(notice.infoCount);
    case "healthy":
      return messages.healthy(
        notice.imageRecordCount,
        notice.generatedImageRecordCount,
      );
  }
};

export const buildProjectHealthInspectionSuccessUiState = ({
  notice,
  messages,
}: BuildProjectHealthInspectionSuccessUiStateInput): ProjectMaintenanceUiState => ({
  projectError: null,
  projectNotice: buildProjectHealthInspectionNoticeText({
    notice,
    messages,
  }),
});

export const buildProjectHealthInspectionResultState = ({
  report,
  messages,
}: BuildProjectHealthInspectionResultStateInput): ProjectHealthInspectionResultState => {
  const successState = buildProjectHealthInspectionSuccess(report);
  return {
    ...successState,
    uiState: buildProjectHealthInspectionSuccessUiState({
      notice: successState.notice,
      messages,
    }),
  };
};
