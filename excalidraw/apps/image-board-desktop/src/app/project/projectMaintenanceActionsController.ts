import {
  buildProjectCacheCleanBlockedUiState,
  buildProjectCacheCleanFailureResultState,
  buildProjectCacheCleanReadiness,
  buildProjectCacheCleanSuccessUiState,
  buildProjectHealthInspectionBlockedUiState,
  buildProjectHealthInspectionFailureResultState,
  buildProjectHealthInspectionReadiness,
  buildProjectHealthInspectionResultState,
  buildProjectMaintenanceAssetSceneApplyState,
  buildProjectRepairBlockedUiState,
  buildProjectRepairCompletionResultState,
  buildProjectRepairFailureResultState,
  buildProjectRepairSceneApplyState,
  buildProjectRepairSceneRefreshPlan,
  buildProjectRepairSceneRefreshResult,
  buildProjectRepairReadiness,
  buildProjectRepairResultState,
  buildProjectThumbnailMaintenanceFailure,
  buildProjectThumbnailRebuildReadiness,
  buildProjectThumbnailRebuildResultState,
  buildProjectMaintenanceUiNoticeAction,
  filterProjectThumbnailRefreshAssets,
  shouldApplyProjectMaintenanceResult,
  type ProjectRepairReport,
  type ProjectMaintenanceUiState,
  type ThumbnailMaintenanceState,
} from "./projectMaintenanceController";

import type {
  CleanProjectCacheResult,
  ProjectAssetPayload,
  ProjectHealthReport,
  RebuildProjectThumbnailsResult,
} from "../../shared/desktopBridgeTypes";
import type { ImageRecordMap } from "../../shared/projectTypes";
import { formatUnknownErrorMessage } from "../generationErrorViewModel";

type FormatError = (error: unknown, fallbackMessage: string) => string;

type ProjectMaintenanceActionResult =
  | { status: "blocked" }
  | { status: "applied" }
  | { status: "failed" }
  | { status: "stale" }
  | { status: "skipped" };

interface ProjectMaintenanceActionProject {
  projectPath: string;
}

interface ProjectHealthInspectionProject
  extends ProjectMaintenanceActionProject {
  imageRecords: ImageRecordMap;
}

interface ProjectRepairActionProject extends ProjectMaintenanceActionProject {
  imageRecords: ImageRecordMap;
}

export interface ProjectMaintenanceActionStatePatch<TProject = never> {
  projectHealthReport?: ProjectHealthReport | null;
  projectHealthReportOpen?: boolean;
  projectRepairReport?: ProjectRepairReport | null;
  thumbnailMaintenance?: ThumbnailMaintenanceState | null;
  activeProjectUpdate?: TProject | null;
  uiState: ProjectMaintenanceUiState;
}

export interface ProjectMaintenanceUiStateApplier {
  setProjectError: (projectError: string | null) => void;
  showProjectNotice: (message: string) => void;
  clearProjectNotice: () => void;
}

export interface ProjectMaintenanceActionStateApplier<TProject>
  extends ProjectMaintenanceUiStateApplier {
  setProjectHealthReport: (report: ProjectHealthReport | null) => void;
  setProjectHealthReportOpen: (open: boolean) => void;
  setProjectRepairReport: (report: ProjectRepairReport | null) => void;
  setThumbnailMaintenance: (state: ThumbnailMaintenanceState | null) => void;
  updateCurrentProject: (project: TProject) => void;
}

export interface ApplyEmptyThumbnailMaintenanceStateInput {
  setThumbnailMaintenance: (state: ThumbnailMaintenanceState | null) => void;
}

export const applyEmptyThumbnailMaintenanceState = ({
  setThumbnailMaintenance,
}: ApplyEmptyThumbnailMaintenanceStateInput): null => {
  setThumbnailMaintenance(null);
  return null;
};

export const applyProjectMaintenanceUiState = ({
  uiState,
  setProjectError,
  showProjectNotice,
  clearProjectNotice,
}: {
  uiState: ProjectMaintenanceUiState;
} & ProjectMaintenanceUiStateApplier): void => {
  setProjectError(uiState.projectError);
  const noticeAction = buildProjectMaintenanceUiNoticeAction(uiState);
  if (noticeAction.action === "show") {
    showProjectNotice(noticeAction.message);
  } else {
    clearProjectNotice();
  }
};

export const applyProjectMaintenanceActionState = <TProject>({
  state,
  setProjectHealthReport,
  setProjectHealthReportOpen,
  setProjectRepairReport,
  setThumbnailMaintenance,
  updateCurrentProject,
  setProjectError,
  showProjectNotice,
  clearProjectNotice,
}: {
  state: ProjectMaintenanceActionStatePatch<TProject>;
} & ProjectMaintenanceActionStateApplier<TProject>): void => {
  if (state.projectHealthReport !== undefined) {
    setProjectHealthReport(state.projectHealthReport);
  }
  if (state.projectHealthReportOpen !== undefined) {
    setProjectHealthReportOpen(state.projectHealthReportOpen);
  }
  if (state.projectRepairReport !== undefined) {
    setProjectRepairReport(state.projectRepairReport);
  }
  if (state.thumbnailMaintenance !== undefined) {
    setThumbnailMaintenance(state.thumbnailMaintenance);
  }
  if (state.activeProjectUpdate) {
    updateCurrentProject(state.activeProjectUpdate);
  }
  applyProjectMaintenanceUiState({
    uiState: state.uiState,
    setProjectError,
    showProjectNotice,
    clearProjectNotice,
  });
};

export const createProjectMaintenanceActionStateRendererApplier =
  <TProject>(
    input: ProjectMaintenanceActionStateApplier<TProject>,
  ): ((state: ProjectMaintenanceActionStatePatch<TProject>) => void) =>
  (state) =>
    applyProjectMaintenanceActionState({
      ...input,
      state,
    });

export interface ProjectHealthInspectionMessages {
  noProject: string;
  healthChecking: string;
  healthCheckFailed: string;
  healthNeedsRepair: (
    errorCount: number,
    warningCount: number,
    repairableCount: number,
  ) => string;
  healthHasInfo: (infoCount: number) => string;
  healthHealthy: (
    imageRecordCount: number,
    generatedImageRecordCount: number,
  ) => string;
}

export interface ProjectCacheCleanMessages {
  noProject: string;
  cacheCleanFailed: string;
  cacheCleaned: (removedFileCount: number, removedBytes: number) => string;
}

export interface ProjectRepairMessages {
  noProject: string;
  noImages: string;
  thumbnailsFailed: string;
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

interface RunProjectHealthInspectionActionInput {
  project: ProjectHealthInspectionProject | null;
  inspectProjectHealth:
    | ((input: { projectPath: string }) => Promise<ProjectHealthReport>)
    | null
    | undefined;
  getActiveProjectPath: () => string | null | undefined;
  messages: ProjectHealthInspectionMessages;
  formatError?: FormatError;
  applyState: (state: ProjectMaintenanceActionStatePatch) => void;
}

interface RunProjectCacheCleanActionInput {
  project: ProjectMaintenanceActionProject | null;
  cleanProjectCache:
    | ((input: { projectPath: string }) => Promise<CleanProjectCacheResult>)
    | null
    | undefined;
  getActiveProjectPath: () => string | null | undefined;
  messages: ProjectCacheCleanMessages;
  formatError?: FormatError;
  applyState: (state: ProjectMaintenanceActionStatePatch) => void;
}

interface RunProjectRepairActionInput<
  TProject extends ProjectRepairActionProject,
> {
  project: TProject | null;
  repairProjectThumbnails:
    | ((input: {
        projectPath: string;
        fileIds: string[];
        force: boolean;
        createBackup: boolean;
      }) => Promise<RebuildProjectThumbnailsResult>)
    | null
    | undefined;
  getActiveProject: () => TProject | null | undefined;
  loadedPreviewFileIds: ReadonlySet<string>;
  loadedOriginalFileIds: ReadonlySet<string>;
  messages: ProjectRepairMessages;
  formatError?: FormatError;
  refreshThumbnailAssets: (input: {
    project: TProject;
    fileIds: string[];
  }) => Promise<void>;
  refreshSceneFromRepair: (input: {
    project: TProject;
    imageRecords: ImageRecordMap;
    restoredSceneJson?: string | null;
    restoredBoardFileIds: readonly string[];
  }) => Promise<{ restoredCount: number; skippedCount: number }>;
  applyState: (state: ProjectMaintenanceActionStatePatch<TProject>) => void;
}

interface RunProjectThumbnailRebuildActionInput<
  TProject extends ProjectMaintenanceActionProject,
> {
  project: TProject;
  fileIds: string[];
  rebuildProjectThumbnails:
    | ((input: {
        projectPath: string;
        fileIds: string[];
      }) => Promise<RebuildProjectThumbnailsResult>)
    | null
    | undefined;
  getActiveProjectPath: () => string | null | undefined;
  loadedPreviewFileIds: ReadonlySet<string>;
  loadedOriginalFileIds: ReadonlySet<string>;
  refreshThumbnailAssets: (input: {
    project: TProject;
    fileIds: string[];
  }) => Promise<void>;
  applyThumbnailMaintenance: (state: ThumbnailMaintenanceState | null) => void;
}

interface CreateProjectMaintenanceRendererActionsInput<
  TProject extends ProjectRepairActionProject,
> {
  getProject: () => TProject | null | undefined;
  getActiveProject: () => TProject | null | undefined;
  getLoadedPreviewFileIds: () => ReadonlySet<string>;
  getLoadedOriginalFileIds: () => ReadonlySet<string>;
  repairProjectThumbnails:
    | RunProjectRepairActionInput<TProject>["repairProjectThumbnails"]
    | null
    | undefined;
  inspectProjectHealth:
    | RunProjectHealthInspectionActionInput["inspectProjectHealth"]
    | null
    | undefined;
  cleanProjectCache:
    | RunProjectCacheCleanActionInput["cleanProjectCache"]
    | null
    | undefined;
  messages: ProjectRepairMessages &
    ProjectHealthInspectionMessages &
    ProjectCacheCleanMessages;
  refreshThumbnailAssets: RunProjectRepairActionInput<TProject>["refreshThumbnailAssets"];
  refreshSceneFromRepair: RunProjectRepairActionInput<TProject>["refreshSceneFromRepair"];
  applyState: (state: ProjectMaintenanceActionStatePatch<TProject>) => void;
}

interface CreateProjectThumbnailRebuildRendererActionsInput<
  TProject extends ProjectMaintenanceActionProject,
> {
  getActiveProject: () => TProject | null | undefined;
  getLoadedPreviewFileIds: () => ReadonlySet<string>;
  getLoadedOriginalFileIds: () => ReadonlySet<string>;
  rebuildProjectThumbnails:
    | RunProjectThumbnailRebuildActionInput<TProject>["rebuildProjectThumbnails"]
    | null
    | undefined;
  readThumbnailAssets: (input: {
    project: TProject;
    fileIds: string[];
  }) => Promise<readonly ProjectAssetPayload[]>;
  applyThumbnailAssetsToScene: (
    project: TProject,
    assets: readonly ProjectAssetPayload[],
  ) => void;
  applyThumbnailMaintenance: (state: ThumbnailMaintenanceState | null) => void;
}

interface ProjectThumbnailAssetRefreshRendererInput<
  TProject extends ProjectMaintenanceActionProject,
> {
  project: TProject;
  fileIds: string[];
}

interface CreateProjectThumbnailAssetRefreshRendererActionsInput<
  TProject extends ProjectMaintenanceActionProject,
> {
  getLoadedPreviewFileIds: () => ReadonlySet<string>;
  getLoadedOriginalFileIds: () => ReadonlySet<string>;
  readThumbnailAssets: (input: {
    project: TProject;
    fileIds: string[];
  }) => Promise<readonly ProjectAssetPayload[]>;
  applyThumbnailAssetsToScene: (
    project: TProject,
    assets: readonly ProjectAssetPayload[],
  ) => void;
}

export interface ProjectThumbnailAssetRefreshRendererResult {
  status: "skipped" | "applied";
  appliedAssetCount: number;
}

interface ProjectRepairSceneRefreshRendererProject
  extends ProjectRepairActionProject {
  sceneJson: string;
}

export interface ProjectRepairSceneRefreshRendererResult {
  restoredCount: number;
  skippedCount: number;
}

interface ProjectRepairSceneRefreshInput<
  TProject extends ProjectRepairSceneRefreshRendererProject,
> {
  project: TProject;
  imageRecords: ImageRecordMap;
  restoredSceneJson?: string | null;
  restoredBoardFileIds: readonly string[];
  forceRefresh?: boolean;
}

interface CreateProjectRepairSceneRefreshRendererActionsInput<
  TProject extends ProjectRepairSceneRefreshRendererProject,
  TElements extends readonly unknown[],
  TAppState,
  TFiles extends Record<string, unknown>,
> {
  getActiveProject: () => TProject | null | undefined;
  getCurrentFiles: () => TFiles;
  getFallbackCreatedAt: () => number;
  deserializeScene: (sceneJson: string) => Promise<{
    elements?: TElements;
    appState: TAppState;
  }>;
  readThumbnailAssets: (input: {
    project: TProject;
    fileIds: string[];
  }) => Promise<readonly ProjectAssetPayload[]>;
  buildFiles: (input: {
    assets: readonly ProjectAssetPayload[];
    imageRecords: ImageRecordMap;
    fallbackCreatedAt: number;
  }) => TFiles;
  applyCanvasScene: (input: {
    elements: TElements;
    appState: TAppState;
    files: TFiles;
  }) => void;
  setLatestScene: (scene: {
    elements: TElements;
    appState: TAppState;
    files: TFiles;
  }) => void;
  updateSceneImageFileIds: (elements: TElements) => void;
  scheduleVisibleImageRenditionLoad: (scene: {
    elements: TElements;
    appState: TAppState;
    files: TFiles;
  }) => void;
  updateWorkspaceOverlay: (elements: TElements, appState: TAppState) => void;
  updateCurrentProject: (project: TProject) => void;
  updateSelectedInspector: (input: {
    elements: TElements;
    appState: TAppState;
    imageRecords: ImageRecordMap;
  }) => void;
}

export interface ProjectMaintenanceRendererActions {
  repair: () => Promise<ProjectMaintenanceActionResult>;
  inspectHealth: () => Promise<ProjectMaintenanceActionResult>;
  cleanCache: () => Promise<ProjectMaintenanceActionResult>;
  resetThumbnailMaintenance: () => null;
}

export interface ProjectThumbnailRebuildRendererActions<
  TProject extends ProjectMaintenanceActionProject,
> {
  rebuildMissing: (
    project: TProject,
    fileIds: string[],
  ) => Promise<ProjectMaintenanceActionResult>;
}

export interface ProjectThumbnailAssetRefreshRendererActions<
  TProject extends ProjectMaintenanceActionProject,
> {
  refresh: (
    input: ProjectThumbnailAssetRefreshRendererInput<TProject>,
  ) => Promise<ProjectThumbnailAssetRefreshRendererResult>;
}

export interface ProjectRepairSceneRefreshRendererActions<
  TProject extends ProjectRepairSceneRefreshRendererProject,
> {
  refresh: (
    input: ProjectRepairSceneRefreshInput<TProject>,
  ) => Promise<ProjectRepairSceneRefreshRendererResult>;
}

interface ApplyProjectMaintenanceAssetSceneStateInput<
  TProject extends { projectPath: string },
  TScene extends { files: Record<string, unknown> },
  TFiles extends Record<string, unknown>,
> {
  activeProject: TProject | null | undefined;
  projectPath: string;
  assetCount: number;
  scene: TScene | null;
  buildFiles: (activeProject: TProject) => TFiles;
  applyFilesToCanvas: (filesToAdd: Array<TFiles[keyof TFiles]>) => void;
  setLatestScene: (scene: TScene | null) => void;
}

const isActiveProject = ({
  getActiveProjectPath,
  projectPath,
}: {
  getActiveProjectPath: () => string | null | undefined;
  projectPath: string;
}) =>
  shouldApplyProjectMaintenanceResult({
    activeProjectPath: getActiveProjectPath(),
    projectPath,
  });

export const applyProjectMaintenanceAssetSceneState = <
  TProject extends { projectPath: string },
  TScene extends { files: Record<string, unknown> },
  TFiles extends Record<string, unknown>,
>({
  activeProject,
  projectPath,
  assetCount,
  scene,
  buildFiles,
  applyFilesToCanvas,
  setLatestScene,
}: ApplyProjectMaintenanceAssetSceneStateInput<
  TProject,
  TScene,
  TFiles
>): boolean => {
  const applyState = buildProjectMaintenanceAssetSceneApplyState({
    activeProject,
    projectPath,
    assetCount,
    scene,
    buildFiles,
  });
  if (applyState.action === "skip") {
    return false;
  }

  applyFilesToCanvas(applyState.filesToAdd);
  setLatestScene(applyState.scene);
  return true;
};

export const formatProjectMaintenanceActionError: FormatError =
  formatUnknownErrorMessage;

export const runProjectRepairAction = async <
  TProject extends ProjectRepairActionProject,
>({
  project,
  repairProjectThumbnails,
  getActiveProject,
  loadedPreviewFileIds,
  loadedOriginalFileIds,
  messages,
  formatError = formatProjectMaintenanceActionError,
  refreshThumbnailAssets,
  refreshSceneFromRepair,
  applyState,
}: RunProjectRepairActionInput<TProject>): Promise<ProjectMaintenanceActionResult> => {
  const readiness = buildProjectRepairReadiness({
    project,
    repairProjectThumbnails,
  });

  if (readiness.status === "blocked") {
    applyState({
      uiState: buildProjectRepairBlockedUiState({
        reason: readiness.reason,
        messages,
      }),
    });
    return { status: "blocked" };
  }

  const {
    project: readyProject,
    repairProjectThumbnails: repairCurrentProjectThumbnails,
    fileIds,
    startState,
  } = readiness;
  applyState(startState);

  try {
    const result = await repairCurrentProjectThumbnails({
      projectPath: readyProject.projectPath,
      fileIds,
      force: true,
      createBackup: true,
    });

    if (
      !isActiveProject({
        getActiveProjectPath: () => getActiveProject()?.projectPath,
        projectPath: readyProject.projectPath,
      })
    ) {
      return { status: "stale" };
    }

    const repairResultState = buildProjectRepairResultState({
      project: readyProject,
      result,
      loadedPreviewFileIds,
      loadedOriginalFileIds,
    });
    const { metadataUpdate, fileIdsToRefresh } = repairResultState;
    const { metadataRepair, project: projectAfterMetadataRepair } =
      metadataUpdate;

    if (fileIdsToRefresh.length) {
      await refreshThumbnailAssets({
        project: readyProject,
        fileIds: fileIdsToRefresh,
      });
    }

    const imageRecordRestoreResult = await refreshSceneFromRepair({
      project: projectAfterMetadataRepair,
      imageRecords: projectAfterMetadataRepair.imageRecords,
      restoredSceneJson: result.restoredSceneJson,
      restoredBoardFileIds: result.restoredBoardFileIds ?? [],
    });

    const activeProject = getActiveProject();
    if (
      !shouldApplyProjectMaintenanceResult({
        activeProjectPath: activeProject?.projectPath,
        projectPath: readyProject.projectPath,
      })
    ) {
      return { status: "stale" };
    }

    const repairCompletion = buildProjectRepairCompletionResultState({
      activeProject,
      projectPath: readyProject.projectPath,
      result,
      metadataRepair,
      restoredCount: imageRecordRestoreResult.restoredCount,
      skippedRestoreCount: imageRecordRestoreResult.skippedCount,
      messages: {
        thumbnailsRepaired: messages.thumbnailsRepaired,
      },
    });

    applyState({
      projectRepairReport: repairCompletion.repairReport,
      activeProjectUpdate: repairCompletion.activeProjectUpdate,
      thumbnailMaintenance: repairCompletion.thumbnailMaintenance,
      uiState: repairCompletion.uiState,
    });
    return { status: "applied" };
  } catch (error) {
    if (
      !isActiveProject({
        getActiveProjectPath: () => getActiveProject()?.projectPath,
        projectPath: readyProject.projectPath,
      })
    ) {
      return { status: "stale" };
    }

    applyState(
      buildProjectRepairFailureResultState(
        fileIds,
        formatError(error, messages.thumbnailsFailed),
      ),
    );
    return { status: "failed" };
  }
};

export const runProjectThumbnailRebuildAction = async <
  TProject extends ProjectMaintenanceActionProject,
>({
  project,
  fileIds,
  rebuildProjectThumbnails,
  getActiveProjectPath,
  loadedPreviewFileIds,
  loadedOriginalFileIds,
  refreshThumbnailAssets,
  applyThumbnailMaintenance,
}: RunProjectThumbnailRebuildActionInput<TProject>): Promise<ProjectMaintenanceActionResult> => {
  const readiness = buildProjectThumbnailRebuildReadiness({
    project,
    fileIds,
    rebuildProjectThumbnails,
  });

  if (readiness.status === "skip") {
    return { status: "skipped" };
  }

  if (readiness.status === "blocked") {
    if (
      isActiveProject({
        getActiveProjectPath,
        projectPath: project.projectPath,
      })
    ) {
      applyThumbnailMaintenance(readiness.failureState.thumbnailMaintenance);
    }
    return { status: "blocked" };
  }

  const {
    rebuildProjectThumbnails: rebuildCurrentProjectThumbnails,
    fileIds: uniqueFileIds,
  } = readiness;

  try {
    const result = await rebuildCurrentProjectThumbnails({
      projectPath: project.projectPath,
      fileIds: uniqueFileIds,
    });
    if (
      !isActiveProject({
        getActiveProjectPath,
        projectPath: project.projectPath,
      })
    ) {
      return { status: "stale" };
    }

    const resultState = buildProjectThumbnailRebuildResultState({
      result,
      loadedPreviewFileIds,
      loadedOriginalFileIds,
    });
    applyThumbnailMaintenance(resultState.thumbnailMaintenance);

    if (resultState.fileIdsToRefresh.length) {
      await refreshThumbnailAssets({
        project,
        fileIds: resultState.fileIdsToRefresh,
      });
    }
    return { status: "applied" };
  } catch {
    if (
      !isActiveProject({
        getActiveProjectPath,
        projectPath: project.projectPath,
      })
    ) {
      return { status: "stale" };
    }

    applyThumbnailMaintenance(
      buildProjectThumbnailMaintenanceFailure(uniqueFileIds),
    );
    return { status: "failed" };
  }
};

export const runProjectThumbnailAssetRefreshRendererAction = async <
  TProject extends ProjectMaintenanceActionProject,
>({
  project,
  fileIds,
  loadedPreviewFileIds,
  loadedOriginalFileIds,
  readThumbnailAssets,
  applyThumbnailAssetsToScene,
}: ProjectThumbnailAssetRefreshRendererInput<TProject> & {
  loadedPreviewFileIds: ReadonlySet<string>;
  loadedOriginalFileIds: ReadonlySet<string>;
  readThumbnailAssets: CreateProjectThumbnailAssetRefreshRendererActionsInput<TProject>["readThumbnailAssets"];
  applyThumbnailAssetsToScene: CreateProjectThumbnailAssetRefreshRendererActionsInput<TProject>["applyThumbnailAssetsToScene"];
}): Promise<ProjectThumbnailAssetRefreshRendererResult> => {
  if (!fileIds.length) {
    return { status: "skipped", appliedAssetCount: 0 };
  }

  const assets = await readThumbnailAssets({ project, fileIds });
  const thumbnailAssets = filterProjectThumbnailRefreshAssets({
    assets,
    loadedPreviewFileIds,
    loadedOriginalFileIds,
  });
  applyThumbnailAssetsToScene(project, thumbnailAssets);

  return {
    status: "applied",
    appliedAssetCount: thumbnailAssets.length,
  };
};

export const createProjectThumbnailAssetRefreshRendererActions = <
  TProject extends ProjectMaintenanceActionProject,
>({
  getLoadedPreviewFileIds,
  getLoadedOriginalFileIds,
  readThumbnailAssets,
  applyThumbnailAssetsToScene,
}: CreateProjectThumbnailAssetRefreshRendererActionsInput<TProject>): ProjectThumbnailAssetRefreshRendererActions<TProject> => {
  const refresh = (
    input: ProjectThumbnailAssetRefreshRendererInput<TProject>,
  ) =>
    runProjectThumbnailAssetRefreshRendererAction({
      ...input,
      loadedPreviewFileIds: getLoadedPreviewFileIds(),
      loadedOriginalFileIds: getLoadedOriginalFileIds(),
      readThumbnailAssets,
      applyThumbnailAssetsToScene,
    });

  return { refresh };
};

export const createProjectThumbnailRebuildRendererActions = <
  TProject extends ProjectMaintenanceActionProject,
>({
  getActiveProject,
  getLoadedPreviewFileIds,
  getLoadedOriginalFileIds,
  rebuildProjectThumbnails,
  readThumbnailAssets,
  applyThumbnailAssetsToScene,
  applyThumbnailMaintenance,
}: CreateProjectThumbnailRebuildRendererActionsInput<TProject>): ProjectThumbnailRebuildRendererActions<TProject> => {
  const rebuildMissing = (project: TProject, fileIds: string[]) =>
    runProjectThumbnailRebuildAction({
      project,
      fileIds,
      rebuildProjectThumbnails,
      getActiveProjectPath: () => getActiveProject()?.projectPath,
      loadedPreviewFileIds: getLoadedPreviewFileIds(),
      loadedOriginalFileIds: getLoadedOriginalFileIds(),
      refreshThumbnailAssets: async ({ project, fileIds }) => {
        await runProjectThumbnailAssetRefreshRendererAction({
          project,
          fileIds,
          loadedPreviewFileIds: getLoadedPreviewFileIds(),
          loadedOriginalFileIds: getLoadedOriginalFileIds(),
          readThumbnailAssets,
          applyThumbnailAssetsToScene,
        });
      },
      applyThumbnailMaintenance,
    });

  return { rebuildMissing };
};

export const runProjectRepairSceneRefreshRendererAction = async <
  TProject extends ProjectRepairSceneRefreshRendererProject,
  TElements extends readonly unknown[],
  TAppState,
  TFiles extends Record<string, unknown>,
>({
  project,
  imageRecords,
  restoredSceneJson,
  restoredBoardFileIds,
  forceRefresh,
  activeProject,
  currentFiles,
  fallbackCreatedAt,
  deserializeScene,
  readThumbnailAssets,
  buildFiles,
  applyCanvasScene,
  setLatestScene,
  updateSceneImageFileIds,
  scheduleVisibleImageRenditionLoad,
  updateWorkspaceOverlay,
  updateCurrentProject,
  updateSelectedInspector,
}: ProjectRepairSceneRefreshInput<TProject> & {
  activeProject: TProject | null | undefined;
  currentFiles: TFiles;
  fallbackCreatedAt: number;
} & Omit<
    CreateProjectRepairSceneRefreshRendererActionsInput<
      TProject,
      TElements,
      TAppState,
      TFiles
    >,
    "getActiveProject" | "getCurrentFiles" | "getFallbackCreatedAt"
  >): Promise<ProjectRepairSceneRefreshRendererResult> => {
  const sceneRefreshPlan = buildProjectRepairSceneRefreshPlan({
    projectPath: project.projectPath,
    activeProject,
    restoredSceneJson,
    restoredBoardFileIds,
    forceRefresh,
  });
  if (sceneRefreshPlan.action === "skip") {
    return {
      restoredCount: sceneRefreshPlan.restoredCount,
      skippedCount: sceneRefreshPlan.skippedCount,
    };
  }

  const restored = await deserializeScene(sceneRefreshPlan.sceneJson);
  const assets = await readThumbnailAssets({
    project,
    fileIds: sceneRefreshPlan.fileIds,
  });
  const files = buildFiles({
    assets,
    imageRecords,
    fallbackCreatedAt,
  });
  const elements = (restored.elements ?? []) as TElements;
  const appState = restored.appState;
  const sceneApplyState = buildProjectRepairSceneApplyState({
    activeProject: sceneRefreshPlan.activeProject,
    imageRecords,
    sceneJson: sceneRefreshPlan.sceneJson,
    elements,
    appState,
    currentFiles,
    files,
  });

  applyCanvasScene({ elements, appState, files });
  setLatestScene(sceneApplyState.scene);
  updateSceneImageFileIds(elements);
  scheduleVisibleImageRenditionLoad(sceneApplyState.scene);
  updateWorkspaceOverlay(elements, appState);
  updateCurrentProject(sceneApplyState.project);
  updateSelectedInspector({ elements, appState, imageRecords });

  return buildProjectRepairSceneRefreshResult({
    restoredBoardFileIds: sceneRefreshPlan.fileIds,
    loadedAssetCount: assets.length,
  });
};

export const createProjectRepairSceneRefreshRendererActions = <
  TProject extends ProjectRepairSceneRefreshRendererProject,
  TElements extends readonly unknown[],
  TAppState,
  TFiles extends Record<string, unknown>,
>({
  getActiveProject,
  getCurrentFiles,
  getFallbackCreatedAt,
  deserializeScene,
  readThumbnailAssets,
  buildFiles,
  applyCanvasScene,
  setLatestScene,
  updateSceneImageFileIds,
  scheduleVisibleImageRenditionLoad,
  updateWorkspaceOverlay,
  updateCurrentProject,
  updateSelectedInspector,
}: CreateProjectRepairSceneRefreshRendererActionsInput<
  TProject,
  TElements,
  TAppState,
  TFiles
>): ProjectRepairSceneRefreshRendererActions<TProject> => {
  const refresh = (input: ProjectRepairSceneRefreshInput<TProject>) =>
    runProjectRepairSceneRefreshRendererAction({
      ...input,
      activeProject: getActiveProject(),
      currentFiles: getCurrentFiles(),
      fallbackCreatedAt: getFallbackCreatedAt(),
      deserializeScene,
      readThumbnailAssets,
      buildFiles,
      applyCanvasScene,
      setLatestScene,
      updateSceneImageFileIds,
      scheduleVisibleImageRenditionLoad,
      updateWorkspaceOverlay,
      updateCurrentProject,
      updateSelectedInspector,
    });

  return { refresh };
};

export const runProjectHealthInspectionAction = async ({
  project,
  inspectProjectHealth,
  getActiveProjectPath,
  messages,
  formatError = formatProjectMaintenanceActionError,
  applyState,
}: RunProjectHealthInspectionActionInput): Promise<ProjectMaintenanceActionResult> => {
  const readiness = buildProjectHealthInspectionReadiness({
    project,
    inspectProjectHealth,
    pendingMessage: messages.healthChecking,
  });

  if (readiness.status === "blocked") {
    applyState({
      uiState: buildProjectHealthInspectionBlockedUiState({
        reason: readiness.reason,
        messages,
      }),
    });
    return { status: "blocked" };
  }

  const {
    project: readyProject,
    inspectProjectHealth: inspectCurrentProjectHealth,
    startState,
  } = readiness;
  applyState(startState);

  try {
    const report = await inspectCurrentProjectHealth({
      projectPath: readyProject.projectPath,
    });
    if (
      !isActiveProject({
        getActiveProjectPath,
        projectPath: readyProject.projectPath,
      })
    ) {
      return { status: "stale" };
    }

    applyState(
      buildProjectHealthInspectionResultState({
        report,
        messages: {
          needsRepair: messages.healthNeedsRepair,
          hasInfo: messages.healthHasInfo,
          healthy: messages.healthHealthy,
        },
      }),
    );
    return { status: "applied" };
  } catch (error) {
    if (
      !isActiveProject({
        getActiveProjectPath,
        projectPath: readyProject.projectPath,
      })
    ) {
      return { status: "stale" };
    }

    applyState(
      buildProjectHealthInspectionFailureResultState(
        formatError(error, messages.healthCheckFailed),
      ),
    );
    return { status: "failed" };
  }
};

export const runProjectCacheCleanAction = async ({
  project,
  cleanProjectCache,
  getActiveProjectPath,
  messages,
  formatError = formatProjectMaintenanceActionError,
  applyState,
}: RunProjectCacheCleanActionInput): Promise<ProjectMaintenanceActionResult> => {
  const readiness = buildProjectCacheCleanReadiness({
    project,
    cleanProjectCache,
  });

  if (readiness.status === "blocked") {
    applyState({
      uiState: buildProjectCacheCleanBlockedUiState({
        reason: readiness.reason,
        messages,
      }),
    });
    return { status: "blocked" };
  }

  const {
    project: readyProject,
    cleanProjectCache: cleanCurrentProjectCache,
    startState,
  } = readiness;
  applyState(startState);

  try {
    const result = await cleanCurrentProjectCache({
      projectPath: readyProject.projectPath,
    });
    if (
      !isActiveProject({
        getActiveProjectPath,
        projectPath: readyProject.projectPath,
      })
    ) {
      return { status: "stale" };
    }

    applyState({
      uiState: buildProjectCacheCleanSuccessUiState({
        result,
        messages,
      }),
    });
    return { status: "applied" };
  } catch (error) {
    if (
      !isActiveProject({
        getActiveProjectPath,
        projectPath: readyProject.projectPath,
      })
    ) {
      return { status: "stale" };
    }

    applyState({
      uiState: buildProjectCacheCleanFailureResultState(
        formatError(error, messages.cacheCleanFailed),
      ).uiState,
    });
    return { status: "failed" };
  }
};

export const createProjectMaintenanceRendererActions = <
  TProject extends ProjectRepairActionProject,
>({
  getProject,
  getActiveProject,
  getLoadedPreviewFileIds,
  getLoadedOriginalFileIds,
  repairProjectThumbnails,
  inspectProjectHealth,
  cleanProjectCache,
  messages,
  refreshThumbnailAssets,
  refreshSceneFromRepair,
  applyState,
}: CreateProjectMaintenanceRendererActionsInput<TProject>): ProjectMaintenanceRendererActions => {
  const getActiveProjectPath = () => getActiveProject()?.projectPath;

  return {
    resetThumbnailMaintenance: () => {
      applyState({
        thumbnailMaintenance: null,
        uiState: {
          projectError: null,
          projectNotice: null,
        },
      });
      return null;
    },
    repair: () =>
      runProjectRepairAction({
        project: getProject() ?? null,
        repairProjectThumbnails,
        getActiveProject,
        loadedPreviewFileIds: getLoadedPreviewFileIds(),
        loadedOriginalFileIds: getLoadedOriginalFileIds(),
        messages,
        refreshThumbnailAssets,
        refreshSceneFromRepair,
        applyState,
      }),
    inspectHealth: () =>
      runProjectHealthInspectionAction({
        project: getProject() ?? null,
        inspectProjectHealth,
        getActiveProjectPath,
        messages,
        applyState,
      }),
    cleanCache: () =>
      runProjectCacheCleanAction({
        project: getProject() ?? null,
        cleanProjectCache,
        getActiveProjectPath,
        messages,
        applyState,
      }),
  };
};
