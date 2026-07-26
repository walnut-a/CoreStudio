import type {
  PendingGenerationJob,
  PendingGenerationJobRegistryState,
} from "./generationJobState";
import type { GenerationTaskRecord } from "./generationTaskState";

interface SceneElementDeletionState {
  id: string;
  isDeleted: boolean;
}

export interface PendingGenerationSceneReconciliationResult
  extends PendingGenerationJobRegistryState {
  generationTasks: Map<string, GenerationTaskRecord>;
  cancelledJobIds: string[];
}

export const reconcilePendingGenerationScene = ({
  generationJobs,
  generationTasks,
  elements,
}: {
  generationJobs: ReadonlyMap<string, PendingGenerationJob>;
  generationTasks: ReadonlyMap<string, GenerationTaskRecord>;
  elements: readonly SceneElementDeletionState[];
}): PendingGenerationSceneReconciliationResult => {
  const liveElementIds = new Set(
    elements
      .filter((element) => !element.isDeleted)
      .map((element) => element.id),
  );
  const pendingJobs = new Map<string, PendingGenerationJob>();
  const nextTasks = new Map(
    [...generationTasks].filter(([elementId]) => liveElementIds.has(elementId)),
  );
  const cancelledJobIds: string[] = [];

  for (const job of generationJobs.values()) {
    const previouslyDismissed = new Set(job.dismissedSlotIds ?? []);
    const dismissedSlotIds = job.slots
      .filter(
        (slot) =>
          previouslyDismissed.has(slot.frameId) ||
          !liveElementIds.has(slot.frameId) ||
          !liveElementIds.has(slot.labelId),
      )
      .map((slot) => slot.frameId);
    const dismissedSet = new Set(dismissedSlotIds);

    for (const slot of job.slots) {
      if (!dismissedSet.has(slot.frameId)) {
        continue;
      }
      nextTasks.delete(slot.frameId);
      nextTasks.delete(slot.labelId);
    }

    if (dismissedSlotIds.length === job.slots.length) {
      cancelledJobIds.push(job.jobId);
      continue;
    }

    pendingJobs.set(
      job.jobId,
      dismissedSlotIds.length
        ? {
            ...job,
            dismissedSlotIds,
          }
        : job,
    );
  }

  return {
    pendingJobs,
    pendingCount: pendingJobs.size,
    generationTasks: nextTasks,
    cancelledJobIds,
  };
};
