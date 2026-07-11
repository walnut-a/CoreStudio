import {
  applyProjectImageRecordsSceneAutosaveState,
  type AutosaveSnapshot,
  type SceneSnapshot,
} from "./autosaveProjectState";
import {
  buildPendingGenerationJobCompletionPlan,
  buildPendingGenerationJobSceneCommitPlan,
  buildPendingGenerationMissingResultFailure,
  type PendingGenerationJob,
  type PendingGenerationJobFailureDetails,
} from "./generationJobState";
import { buildCoreStudioGeneratedImageAssetInputs } from "./generationResultAssets";
import {
  rollbackProjectImageWritebackAfterFailure,
  type ProjectImageWritebackHandle,
} from "./projectImageWritebackController";

import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import type {
  DesktopProjectBundle,
  PersistedImageAssetInput,
} from "../shared/desktopBridgeTypes";
import type { ImageRecordMap } from "../shared/projectTypes";
import type {
  GenerationRequest,
  GenerationResponse,
} from "../shared/providerTypes";

export interface BuiltinGenerationCanvasSnapshot<
  Elements extends readonly ExcalidrawElement[] = readonly ExcalidrawElement[],
  AppStateValue extends AppState = AppState,
  Files extends BinaryFiles = BinaryFiles,
> {
  elements: Elements;
  appState: AppStateValue;
  files: Files;
}

export type BuiltinGenerationJobCompletionResult =
  | {
      kind: "completed";
      replacedCount: number;
      failedCount: number;
      sceneCommitted: boolean;
    }
  | {
      kind: "skipped";
    };

export interface PersistBuiltinGenerationAssetsInput {
  projectPath: string;
  projectImageRecords: ImageRecordMap;
  activeProject: DesktopProjectBundle | null;
  files: PersistedImageAssetInput[];
}

export interface ApplyBuiltinGenerationSceneAutosaveInput<
  Elements extends readonly ExcalidrawElement[] = readonly ExcalidrawElement[],
  AppStateValue extends AppState = AppState,
  Files extends BinaryFiles = BinaryFiles,
> {
  project: DesktopProjectBundle;
  imageRecords: ImageRecordMap;
  elements: Elements;
  appState: AppStateValue;
  files: Files;
}

export const runBuiltinGenerationJobCompletionAction = async <
  Elements extends readonly ExcalidrawElement[],
  AppStateValue extends AppState,
  Files extends BinaryFiles,
>({
  job,
  request,
  response,
  getActiveProject,
  beginGeneratedAssets,
  replaceSlot,
  markSlotFailed,
  getCanvasSnapshot,
  restoreCanvasSnapshot,
  applySceneAutosave,
  afterSceneCommit,
  flushPendingAutosave,
}: {
  job: PendingGenerationJob;
  request: GenerationRequest;
  response: GenerationResponse;
  getActiveProject: () => DesktopProjectBundle | null;
  beginGeneratedAssets: (
    input: PersistBuiltinGenerationAssetsInput,
  ) => Promise<ProjectImageWritebackHandle>;
  replaceSlot: (
    slot: PendingGenerationJob["slots"][number],
    asset: PersistedImageAssetInput,
  ) => void;
  markSlotFailed: (
    job: PendingGenerationJob,
    errorDetails: PendingGenerationJobFailureDetails,
  ) => void;
  getCanvasSnapshot: () => BuiltinGenerationCanvasSnapshot<
    Elements,
    AppStateValue,
    Files
  > | null;
  restoreCanvasSnapshot: (
    snapshot: BuiltinGenerationCanvasSnapshot<
      Elements,
      AppStateValue,
      Files
    >,
  ) => void;
  applySceneAutosave: (
    input: ApplyBuiltinGenerationSceneAutosaveInput<
      Elements,
      AppStateValue,
      Files
    >,
  ) => void;
  afterSceneCommit: (input: {
    elements: Elements;
    appState: AppStateValue;
    files: Files;
  }) => void;
  flushPendingAutosave: (options: { strict: true }) => Promise<unknown> | unknown;
}): Promise<BuiltinGenerationJobCompletionResult> => {
  const completionPlan = buildPendingGenerationJobCompletionPlan({
    job,
    project: getActiveProject(),
    completedCount: response.images.length,
  });
  if (completionPlan.kind === "skip") {
    return { kind: "skipped" };
  }

  const beforeCanvasSnapshot = getCanvasSnapshot();
  if (!beforeCanvasSnapshot) {
    throw new Error("生成结果写回缺少可恢复的画板快照。");
  }

  const files = buildCoreStudioGeneratedImageAssetInputs({
    request,
    response,
  });
  if (files.length === 0) {
    try {
      completionPlan.failedSlots.forEach((slot) => {
        const failure = buildPendingGenerationMissingResultFailure({
          job,
          slot,
          message: "模型没有返回这张图。",
        });
        markSlotFailed(failure.job, failure.errorDetails);
      });
      const snapshot = getCanvasSnapshot();
      const sceneCommitPlan = buildPendingGenerationJobSceneCommitPlan({
        job,
        project: getActiveProject(),
        hasCanvasApi: Boolean(snapshot),
      });
      if (!snapshot || sceneCommitPlan.kind !== "commit") {
        throw new Error("生成失败状态写回时画板或当前项目已经发生变化。");
      }
      applySceneAutosave({
        project: sceneCommitPlan.project,
        imageRecords: sceneCommitPlan.project.imageRecords,
        elements: snapshot.elements,
        appState: snapshot.appState,
        files: snapshot.files,
      });
      afterSceneCommit({
        elements: snapshot.elements,
        appState: snapshot.appState,
        files: snapshot.files,
      });
      await flushPendingAutosave({ strict: true });
    } catch (error) {
      try {
        restoreCanvasSnapshot(beforeCanvasSnapshot);
      } catch (restoreError) {
        throw Object.assign(
          new Error(
            `${error instanceof Error ? error.message : String(error)}；placeholder 快照恢复也失败。`,
          ),
          { cause: error, restoreError },
        );
      }
      throw error;
    }
    return {
      kind: "completed",
      replacedCount: 0,
      failedCount: completionPlan.failedSlots.length,
      sceneCommitted: true,
    };
  }
  const writeback = await beginGeneratedAssets({
    projectPath: job.projectPath,
    projectImageRecords: completionPlan.project.imageRecords,
    activeProject: getActiveProject(),
    files,
  });
  try {
    completionPlan.replacements.forEach(({ slot, assetIndex }) => {
      replaceSlot(slot, files[assetIndex]);
    });

    completionPlan.failedSlots.forEach((slot) => {
      const failure = buildPendingGenerationMissingResultFailure({
        job,
        slot,
        message: "模型没有返回这张图。",
      });
      markSlotFailed(failure.job, failure.errorDetails);
    });

    const snapshot = getCanvasSnapshot();
    const sceneCommitPlan = buildPendingGenerationJobSceneCommitPlan({
      job,
      project: getActiveProject(),
      hasCanvasApi: Boolean(snapshot),
    });
    if (!snapshot || sceneCommitPlan.kind !== "commit") {
      throw new Error("生成结果写回时画板或当前项目已经发生变化。");
    }
    applySceneAutosave({
      project: sceneCommitPlan.project,
      imageRecords: writeback.imageRecords,
      elements: snapshot.elements,
      appState: snapshot.appState,
      files: snapshot.files,
    });
    afterSceneCommit({
      elements: snapshot.elements,
      appState: snapshot.appState,
      files: snapshot.files,
    });
    await flushPendingAutosave({ strict: true });
  } catch (error) {
    let failure = error;
    try {
      restoreCanvasSnapshot(beforeCanvasSnapshot);
    } catch (restoreError) {
      failure = Object.assign(
        new Error(
          `${error instanceof Error ? error.message : String(error)}；placeholder 快照恢复也失败。`,
        ),
        { cause: error, restoreError },
      );
    }
    await rollbackProjectImageWritebackAfterFailure(writeback, failure);
  }
  await writeback.commit();

  return {
    kind: "completed",
    replacedCount: completionPlan.replacements.length,
    failedCount: completionPlan.failedSlots.length,
    sceneCommitted: true,
  };
};

export interface BuiltinGenerationJobCompletionRendererActionsInput<
  Elements extends readonly ExcalidrawElement[],
  AppStateValue extends AppState,
  Files extends BinaryFiles,
> {
  getActiveProject: () => DesktopProjectBundle | null;
  beginProjectImageWriteback: (input: {
    projectPath: string;
    projectImageRecords: ImageRecordMap;
    activeProject: DesktopProjectBundle | null;
    files: PersistedImageAssetInput[];
  }) => Promise<ProjectImageWritebackHandle>;
  replaceSlot: (
    slot: PendingGenerationJob["slots"][number],
    asset: PersistedImageAssetInput,
  ) => void;
  markSlotFailed: (
    job: PendingGenerationJob,
    errorDetails: PendingGenerationJobFailureDetails,
  ) => void;
  getCanvasSnapshot: () => {
    elements: Elements;
    appState: AppStateValue;
    files: Files;
  } | null;
  restoreCanvasSnapshot: (snapshot: {
    elements: Elements;
    appState: AppStateValue;
    files: Files;
  }) => void;
  getSavedSceneHash: () => string | null;
  setScene: (scene: SceneSnapshot<Elements, AppStateValue, Files>) => void;
  setPendingSnapshot: (
    snapshot: AutosaveSnapshot<Elements, AppStateValue, Files>,
  ) => void;
  updateSceneImageFileIds: (elements: Elements) => void;
  scheduleVisibleImageRenditionLoad: (
    scene: SceneSnapshot<Elements, AppStateValue, Files>,
  ) => void;
  updateWorkspaceOverlay: (
    elements: Elements,
    appState: AppStateValue,
  ) => void;
  flushPendingAutosave: (options: { strict: true }) => Promise<unknown> | unknown;
}

export const createBuiltinGenerationJobCompletionRendererActions = <
  Elements extends readonly ExcalidrawElement[],
  AppStateValue extends AppState,
  Files extends BinaryFiles,
>({
  getActiveProject,
  beginProjectImageWriteback,
  replaceSlot,
  markSlotFailed,
  getCanvasSnapshot,
  restoreCanvasSnapshot,
  getSavedSceneHash,
  setScene,
  setPendingSnapshot,
  updateSceneImageFileIds,
  scheduleVisibleImageRenditionLoad,
  updateWorkspaceOverlay,
  flushPendingAutosave,
}: BuiltinGenerationJobCompletionRendererActionsInput<
  Elements,
  AppStateValue,
  Files
>) => ({
  finishPendingJob: (
    job: PendingGenerationJob,
    request: GenerationRequest,
    response: GenerationResponse,
  ) =>
    runBuiltinGenerationJobCompletionAction({
      job,
      request,
      response,
      getActiveProject,
      beginGeneratedAssets: beginProjectImageWriteback,
      replaceSlot,
      markSlotFailed,
      getCanvasSnapshot,
      restoreCanvasSnapshot,
      applySceneAutosave: ({
        project,
        imageRecords,
        elements,
        appState,
        files,
      }) =>
        applyProjectImageRecordsSceneAutosaveState({
          project,
          imageRecords,
          elements,
          appState,
          files,
          expectedSceneHash: getSavedSceneHash(),
          setScene,
          setPendingSnapshot,
        }),
      afterSceneCommit: ({ elements, appState, files }) => {
        updateSceneImageFileIds(elements);
        const latestScene = {
          elements,
          appState,
          files,
        };
        scheduleVisibleImageRenditionLoad(latestScene);
        updateWorkspaceOverlay(elements, appState);
      },
      flushPendingAutosave,
    }),
});
