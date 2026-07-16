import { CaptureUpdateAction } from "@excalidraw/element";
import type { CaptureUpdateActionType } from "@excalidraw/element";
import type { ExcalidrawElement } from "@excalidraw/element/types";

import type {
  AppState,
  BinaryFileData,
} from "@excalidraw/excalidraw/types";

import { buildExcalidrawBinaryFilesFromImageAssets } from "./canvasImageAssetState";
import { resolveGenerationCanvasReadiness } from "./generationCanvasReadiness";
import {
  buildPendingGenerationJob,
  buildPendingGenerationJobProjectMatchPlan,
  type PendingGenerationJob,
  type PendingGenerationJobProjectContext,
} from "./generationJobState";
import {
  buildPendingGenerationFailureSceneUpdate,
  buildPendingGenerationPlaceholders,
  buildPendingGenerationPlaceholderSceneUpdate,
  buildPendingGenerationSlotReplacementSceneUpdate,
  type PendingGenerationSlot,
} from "./generationPlaceholderState";
import {
  applyGenerationTaskMapWithPendingSlotsState,
  applyGenerationTaskMapWithFailedSlotsState,
  applyGenerationTaskMapWithoutSlotState,
  type GenerationTaskErrorDetails,
  type GenerationTaskRecord,
} from "./generationTaskState";
import {
  type GeneratedImagePlacementViewport,
  type ImagePlacement,
  type SceneBounds,
} from "./project/imagePlacement";
import {
  buildPendingGenerationPlacements,
  type PendingGenerationPlacementApi,
  type PendingGenerationReferenceScene,
} from "./pendingGenerationPlacementController";
import {
  ENABLE_WORKSPACE_BOUNDS,
  getWorkspaceBounds,
  type WorkspaceBounds,
} from "./workspaceBounds";

import type { PersistedImageAssetInput } from "../shared/desktopBridgeTypes";
import type { GenerationRequest } from "../shared/providerTypes";

export interface PendingGenerationFailureCanvasApi {
  getSceneElementsIncludingDeleted: () => readonly ExcalidrawElement[];
  updateScene: (scene: {
    elements: readonly ExcalidrawElement[];
    appState?: Pick<AppState, "selectedElementIds">;
    captureUpdate: CaptureUpdateActionType;
  }) => void;
}

export interface PendingGenerationSlotReplacementCanvasApi
  extends PendingGenerationFailureCanvasApi {
  getAppState: () => Pick<AppState, "selectedElementIds">;
  addFiles: (files: BinaryFileData[]) => void;
}

export interface PendingGenerationPlaceholderInsertCanvasApi
  extends PendingGenerationFailureCanvasApi {
  setViewport: (opts: {
    target: readonly ExcalidrawElement[];
    fit: "scale-down";
    animation: boolean;
  }) => void;
}

export type PendingGenerationCanvasRendererApi =
  PendingGenerationPlaceholderInsertCanvasApi &
    PendingGenerationSlotReplacementCanvasApi &
    PendingGenerationPlacementApi;

export type PendingGenerationPlaceholderInsertRendererApi =
  PendingGenerationCanvasRendererApi;

export interface PendingGenerationPlaceholderInsertRendererOptions {
  expectedProjectPath?: string;
  placementViewport?: GeneratedImagePlacementViewport | null;
  referenceScene?: PendingGenerationReferenceScene | null;
  requireReady?: boolean;
}

export interface PendingGenerationPlaceholderInsertRendererActionsInput<
  TProject extends PendingGenerationJobProjectContext =
    PendingGenerationJobProjectContext,
> {
  getEditorApi: () =>
    | PendingGenerationPlaceholderInsertRendererApi
    | null
    | undefined;
  getActiveProject: () => TProject | null | undefined;
  assertActiveProject: (expectedProjectPath?: string) => void;
  getFallbackReferenceScene: () =>
    | PendingGenerationReferenceScene
    | null
    | undefined;
  getLastCanvasPointer: () => { x: number; y: number } | null;
  getPreviousBatchBounds: () => SceneBounds | null;
  setPreviousBatchBounds: (bounds: SceneBounds | null) => void;
  updateWorkspaceOverlay: (
    elements: readonly ExcalidrawElement[],
    appState: AppState,
  ) => WorkspaceBounds | null;
  getGenerationTasks: () => ReadonlyMap<string, GenerationTaskRecord>;
  setGenerationTasks: (
    generationTasks: Map<string, GenerationTaskRecord>,
  ) => void;
  createGroupId?: (index: number) => string;
  createJobId?: () => string;
}

export type PendingGenerationFailureCanvasActionResult =
  | {
      kind: "updated";
    }
  | {
      kind: "skipped";
    };

export type PendingGenerationPlaceholderInsertCanvasActionResult =
  | {
      kind: "inserted";
      job: PendingGenerationJob;
    }
  | {
      kind: "skipped";
    };

export type PendingGenerationSlotReplacementCanvasActionResult =
  | {
      kind: "replaced";
      imageElement: ExcalidrawElement;
    }
  | {
      kind: "skipped";
    };

export const runPendingGenerationPlaceholderInsertRendererAction = <
  TProject extends PendingGenerationJobProjectContext,
>({
  request,
  startedAt,
  options = {},
  getEditorApi,
  getActiveProject,
  assertActiveProject,
  getFallbackReferenceScene,
  getLastCanvasPointer,
  getPreviousBatchBounds,
  setPreviousBatchBounds,
  updateWorkspaceOverlay,
  getGenerationTasks,
  setGenerationTasks,
  createGroupId,
  createJobId,
}: PendingGenerationPlaceholderInsertRendererActionsInput<TProject> & {
  request: GenerationRequest;
  startedAt: string;
  options?: PendingGenerationPlaceholderInsertRendererOptions;
}): PendingGenerationJob | null => {
  assertActiveProject(options.expectedProjectPath);
  const initialReadiness = resolveGenerationCanvasReadiness({
    api: getEditorApi(),
    project: getActiveProject(),
    requireReady: options.requireReady,
  });
  if (initialReadiness.status === "skip") {
    return null;
  }

  const { api } = initialReadiness;
  const placementResult = buildPendingGenerationPlacements({
    api,
    request,
    explicitPlacementViewport: options.placementViewport ?? null,
    referenceScene: options.referenceScene ?? null,
    fallbackReferenceScene: getFallbackReferenceScene() ?? null,
    lastCanvasPointer: getLastCanvasPointer(),
    previousBatchBounds: getPreviousBatchBounds(),
    resolveWorkspaceBounds: ({
      elements,
      appState,
      placementViewport,
      explicitPlacementViewport,
    }) =>
      explicitPlacementViewport
        ? ENABLE_WORKSPACE_BOUNDS
          ? getWorkspaceBounds(elements, {
              viewportCenter: placementViewport.viewportCenter,
            })
          : null
        : updateWorkspaceOverlay(elements, appState),
  });

  assertActiveProject(options.expectedProjectPath);
  const activeReadiness = resolveGenerationCanvasReadiness({
    api: getEditorApi(),
    project: getActiveProject(),
    requireReady: options.requireReady,
  });
  if (activeReadiness.status === "skip") {
    return null;
  }

  const insertResult = runPendingGenerationPlaceholderInsertCanvasAction({
    api: activeReadiness.api,
    project: activeReadiness.project,
    request,
    placements: placementResult.placements,
    startedAt,
    generationTasks: getGenerationTasks(),
    setGenerationTasks,
    createGroupId,
    createJobId,
  });
  if (insertResult.kind === "skipped") {
    return null;
  }

  setPreviousBatchBounds(placementResult.batchBounds);
  return insertResult.job;
};

export const createPendingGenerationCanvasRendererActions = <
  TProject extends PendingGenerationJobProjectContext,
>(
  input: PendingGenerationPlaceholderInsertRendererActionsInput<TProject>,
) => ({
  insertPlaceholders: (
    request: GenerationRequest,
    startedAt: string,
    options?: PendingGenerationPlaceholderInsertRendererOptions,
  ) =>
    runPendingGenerationPlaceholderInsertRendererAction({
      ...input,
      request,
      startedAt,
      options,
    }),
  markFailed: (
    job: PendingGenerationJob,
    errorDetails?: GenerationTaskErrorDetails,
  ) =>
    runPendingGenerationFailureCanvasAction({
      api: input.getEditorApi(),
      job,
      project: input.getActiveProject(),
      generationTasks: input.getGenerationTasks(),
      errorDetails,
      setGenerationTasks: input.setGenerationTasks,
    }),
  replaceSlot: (slot: PendingGenerationSlot, asset: PersistedImageAssetInput) =>
    runPendingGenerationSlotReplacementCanvasAction({
      api: input.getEditorApi(),
      slot,
      asset,
      generationTasks: input.getGenerationTasks(),
      setGenerationTasks: input.setGenerationTasks,
    }),
});

export const createPendingGenerationPlaceholderInsertRendererActions =
  createPendingGenerationCanvasRendererActions;

export const runPendingGenerationPlaceholderInsertCanvasAction = <
  TProject extends PendingGenerationJobProjectContext,
>({
  api,
  project,
  request,
  placements,
  startedAt,
  generationTasks,
  setGenerationTasks,
  createGroupId,
  createJobId = () => crypto.randomUUID(),
}: {
  api: PendingGenerationPlaceholderInsertCanvasApi | null | undefined;
  project: TProject | null | undefined;
  request: GenerationRequest;
  placements: readonly ImagePlacement[];
  startedAt: string;
  generationTasks: ReadonlyMap<string, GenerationTaskRecord>;
  setGenerationTasks: (
    generationTasks: Map<string, GenerationTaskRecord>,
  ) => void;
  createGroupId?: (index: number) => string;
  createJobId?: () => string;
}): PendingGenerationPlaceholderInsertCanvasActionResult => {
  if (!api || !project) {
    return { kind: "skipped" };
  }

  const { slots, placeholderFrames, placeholderElements } =
    buildPendingGenerationPlaceholders({
      request,
      placements,
      createGroupId,
    });

  applyGenerationTaskMapWithPendingSlotsState({
    generationTasks,
    slots,
    request,
    startedAt,
    setGenerationTasks,
  });

  const placeholderSceneUpdate =
    buildPendingGenerationPlaceholderSceneUpdate({
      existingElements: api.getSceneElementsIncludingDeleted(),
      placeholderElements,
      placeholderFrames,
    });

  api.updateScene({
    elements: placeholderSceneUpdate.elements,
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });

  if (placeholderSceneUpdate.focusElements.length > 0) {
    api.setViewport({
      target: placeholderSceneUpdate.focusElements,
      fit: "scale-down",
      animation: true,
    });
  }

  return {
    kind: "inserted",
    job: buildPendingGenerationJob({
      jobId: createJobId(),
      projectPath: project.projectPath,
      slots,
    }),
  };
};

export const runPendingGenerationFailureCanvasAction = <
  TProject extends PendingGenerationJobProjectContext,
>({
  api,
  job,
  project,
  generationTasks,
  errorDetails,
  setGenerationTasks,
}: {
  api: PendingGenerationFailureCanvasApi | null | undefined;
  job: PendingGenerationJob;
  project: TProject | null | undefined;
  generationTasks: ReadonlyMap<string, GenerationTaskRecord>;
  errorDetails?: GenerationTaskErrorDetails;
  setGenerationTasks: (
    generationTasks: Map<string, GenerationTaskRecord>,
  ) => void;
}): PendingGenerationFailureCanvasActionResult => {
  const projectMatchPlan = buildPendingGenerationJobProjectMatchPlan({
    job,
    project,
  });
  if (!api || projectMatchPlan.kind === "skip") {
    return { kind: "skipped" };
  }

  applyGenerationTaskMapWithFailedSlotsState({
    generationTasks,
    slots: job.slots,
    errorDetails,
    setGenerationTasks,
  });

  const failureSceneUpdate = buildPendingGenerationFailureSceneUpdate({
    elements: api.getSceneElementsIncludingDeleted(),
    slots: job.slots,
  });

  api.updateScene({
    elements: failureSceneUpdate.elements,
    appState: failureSceneUpdate.selectedElementIds
      ? {
          selectedElementIds: failureSceneUpdate.selectedElementIds,
        }
      : undefined,
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });

  return { kind: "updated" };
};

export const runPendingGenerationSlotReplacementCanvasAction = ({
  api,
  slot,
  asset,
  generationTasks,
  setGenerationTasks,
  fallbackCreatedAt = Date.now(),
}: {
  api: PendingGenerationSlotReplacementCanvasApi | null | undefined;
  slot: PendingGenerationSlot;
  asset: PersistedImageAssetInput;
  generationTasks: ReadonlyMap<string, GenerationTaskRecord>;
  setGenerationTasks: (
    generationTasks: Map<string, GenerationTaskRecord>,
  ) => void;
  fallbackCreatedAt?: number;
}): PendingGenerationSlotReplacementCanvasActionResult => {
  if (!api) {
    return { kind: "skipped" };
  }

  const replacementSceneUpdate =
    buildPendingGenerationSlotReplacementSceneUpdate({
      elements: api.getSceneElementsIncludingDeleted(),
      selectedElementIds: api.getAppState().selectedElementIds,
      slot,
      asset,
    });
  if (!replacementSceneUpdate) {
    return { kind: "skipped" };
  }

  const filesToAdd = buildExcalidrawBinaryFilesFromImageAssets({
    assets: [asset],
    fallbackCreatedAt,
  });
  api.addFiles(filesToAdd);

  api.updateScene({
    elements: replacementSceneUpdate.elements,
    appState: {
      selectedElementIds: replacementSceneUpdate.selectedElementIds,
    },
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });

  applyGenerationTaskMapWithoutSlotState({
    generationTasks,
    slot,
    setGenerationTasks,
  });

  return {
    kind: "replaced",
    imageElement: replacementSceneUpdate.imageElement,
  };
};
