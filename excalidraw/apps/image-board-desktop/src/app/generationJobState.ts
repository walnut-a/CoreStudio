import type { PendingGenerationSlot } from "./generationPlaceholderState";
import {
  buildEmptyGenerationTaskMap,
  type GenerationTaskRecord,
} from "./generationTaskState";

export interface PendingGenerationJob {
  jobId: string;
  projectPath: string;
  slots: PendingGenerationSlot[];
}

export interface EmptyGenerationTrackingState {
  pendingJobs: Map<string, PendingGenerationJob>;
  generationTasks: Map<string, GenerationTaskRecord>;
  pendingCount: number;
}

export interface PendingGenerationJobRegistryState {
  pendingJobs: Map<string, PendingGenerationJob>;
  pendingCount: number;
}

export interface ApplyPendingGenerationJobRegistryStateInput {
  state: PendingGenerationJobRegistryState;
  setPendingJobs: (pendingJobs: Map<string, PendingGenerationJob>) => void;
  setPendingCount: (pendingCount: number) => void;
}

export interface ApplyEmptyGenerationTrackingStateInput {
  setPendingJobs: (pendingJobs: Map<string, PendingGenerationJob>) => void;
  setGenerationTasks: (
    generationTasks: Map<string, GenerationTaskRecord>,
  ) => void;
  setPendingCount: (pendingCount: number) => void;
}

export type GenerationTrackingRendererActionsInput =
  ApplyEmptyGenerationTrackingStateInput;

export type PendingGenerationJobActivityPlan =
  | {
      kind: "continue";
    }
  | {
      kind: "ignore";
    };

export type PendingGenerationJobFailurePlan =
  | {
      kind: "mark-failed";
    }
  | {
      kind: "ignore";
    };

export type PendingGenerationJobAsyncResult = "success" | "failure";

export type PendingGenerationJobAsyncResultPlan =
  | {
      kind: "finish";
    }
  | {
      kind: "mark-failed";
    }
  | {
      kind: "ignore";
    };

export interface ReadPendingGenerationJobAsyncResultPlanInput {
  getGenerationJobs: () => ReadonlyMap<string, PendingGenerationJob>;
  jobId: string;
  result: PendingGenerationJobAsyncResult;
}

export interface PendingGenerationJobRegistryActionInput {
  getGenerationJobs: () => ReadonlyMap<string, PendingGenerationJob>;
  applyRegistryState: (
    state: PendingGenerationJobRegistryState,
  ) => PendingGenerationJobRegistryState;
}

export type PendingGenerationJobSuccessResultActionState =
  | {
      kind: "finished";
    }
  | {
      kind: "ignored";
    };

export type PendingGenerationJobFailureResultActionState =
  | {
      kind: "marked-failed";
    }
  | {
      kind: "ignored";
    };

export interface PendingGenerationJobAsyncResultActionInput {
  getResultPlan: (
    result: PendingGenerationJobAsyncResult,
  ) => PendingGenerationJobAsyncResultPlan;
}

export interface PendingGenerationJobSlotReplacement {
  slot: PendingGenerationSlot;
  assetIndex: number;
}

export interface PendingGenerationJobSlotCompletionPlan {
  replacements: PendingGenerationJobSlotReplacement[];
  failedSlots: PendingGenerationSlot[];
}

export interface PendingGenerationJobProjectContext {
  projectPath: string;
}

export type PendingGenerationJobProjectMatchPlan<
  TProject extends PendingGenerationJobProjectContext,
> =
  | {
      kind: "matched";
      project: TProject;
    }
  | {
      kind: "skip";
    };

export interface PendingGenerationJobFailureDetails {
  normalizedMessage: string;
  rawMessage: string;
  stack: string | null;
}

export interface PendingGenerationMissingResultFailure {
  job: PendingGenerationJob;
  errorDetails: PendingGenerationJobFailureDetails;
}

export type PendingGenerationJobCompletionPlan<
  TProject extends PendingGenerationJobProjectContext,
> =
  | {
      kind: "complete";
      project: TProject;
      replacements: PendingGenerationJobSlotReplacement[];
      failedSlots: PendingGenerationSlot[];
    }
  | {
      kind: "skip";
    };

export type PendingGenerationJobSceneCommitPlan<
  TProject extends PendingGenerationJobProjectContext,
> =
  | {
      kind: "commit";
      project: TProject;
    }
  | {
      kind: "skip";
    };

export const buildPendingGenerationJob = ({
  jobId,
  projectPath,
  slots,
}: {
  jobId: string;
  projectPath: string;
  slots: PendingGenerationSlot[];
}): PendingGenerationJob => ({
  jobId,
  projectPath,
  slots,
});

export const buildPendingGenerationJobMapWithJob = ({
  generationJobs,
  job,
}: {
  generationJobs: ReadonlyMap<string, PendingGenerationJob>;
  job: PendingGenerationJob;
}) => {
  const nextJobs = new Map(generationJobs);
  nextJobs.set(job.jobId, job);
  return nextJobs;
};

export const buildPendingGenerationJobMapWithoutJob = ({
  generationJobs,
  jobId,
}: {
  generationJobs: ReadonlyMap<string, PendingGenerationJob>;
  jobId: string;
}) => {
  const nextJobs = new Map(generationJobs);
  nextJobs.delete(jobId);
  return nextJobs;
};

export const buildEmptyPendingGenerationJobMap = () =>
  new Map<string, PendingGenerationJob>();

export const hasPendingGenerationJob = (
  generationJobs: ReadonlyMap<string, PendingGenerationJob>,
  jobId: string,
) => generationJobs.has(jobId);

export const buildPendingGenerationJobActivityPlan = ({
  generationJobs,
  jobId,
}: {
  generationJobs: ReadonlyMap<string, PendingGenerationJob>;
  jobId: string;
}): PendingGenerationJobActivityPlan =>
  hasPendingGenerationJob(generationJobs, jobId)
    ? { kind: "continue" }
    : { kind: "ignore" };

export const buildPendingGenerationJobFailurePlan = ({
  generationJobs,
  jobId,
}: {
  generationJobs: ReadonlyMap<string, PendingGenerationJob>;
  jobId: string;
}): PendingGenerationJobFailurePlan =>
  buildPendingGenerationJobActivityPlan({ generationJobs, jobId }).kind ===
  "continue"
    ? { kind: "mark-failed" }
    : { kind: "ignore" };

export const buildPendingGenerationJobAsyncResultPlan = ({
  generationJobs,
  jobId,
  result,
}: {
  generationJobs: ReadonlyMap<string, PendingGenerationJob>;
  jobId: string;
  result: PendingGenerationJobAsyncResult;
}): PendingGenerationJobAsyncResultPlan => {
  if (!hasPendingGenerationJob(generationJobs, jobId)) {
    return { kind: "ignore" };
  }

  return result === "success" ? { kind: "finish" } : { kind: "mark-failed" };
};

export const readPendingGenerationJobAsyncResultPlan = ({
  getGenerationJobs,
  jobId,
  result,
}: ReadPendingGenerationJobAsyncResultPlanInput): PendingGenerationJobAsyncResultPlan =>
  buildPendingGenerationJobAsyncResultPlan({
    generationJobs: getGenerationJobs(),
    jobId,
    result,
  });

export const runPendingGenerationJobSuccessResultAction = async ({
  getResultPlan,
  finish,
}: PendingGenerationJobAsyncResultActionInput & {
  finish: () => Promise<unknown> | unknown;
}): Promise<PendingGenerationJobSuccessResultActionState> => {
  if (getResultPlan("success").kind !== "finish") {
    return { kind: "ignored" };
  }

  await finish();
  return { kind: "finished" };
};

export const runPendingGenerationJobFailureResultAction = ({
  getResultPlan,
  markFailed,
}: PendingGenerationJobAsyncResultActionInput & {
  markFailed: () => void;
}): PendingGenerationJobFailureResultActionState => {
  if (getResultPlan("failure").kind !== "mark-failed") {
    return { kind: "ignored" };
  }

  markFailed();
  return { kind: "marked-failed" };
};

export const buildPendingGenerationJobSlotCompletionPlan = ({
  job,
  completedCount,
}: {
  job: PendingGenerationJob;
  completedCount: number;
}): PendingGenerationJobSlotCompletionPlan => {
  const normalizedCompletedCount = Math.max(0, completedCount);

  return {
    replacements: job.slots
      .slice(0, normalizedCompletedCount)
      .map((slot, assetIndex) => ({
        slot,
        assetIndex,
      })),
    failedSlots: job.slots.slice(normalizedCompletedCount),
  };
};

export const buildPendingGenerationJobProjectMatchPlan = <
  TProject extends PendingGenerationJobProjectContext,
>({
  job,
  project,
}: {
  job: PendingGenerationJob;
  project: TProject | null | undefined;
}): PendingGenerationJobProjectMatchPlan<TProject> =>
  project?.projectPath === job.projectPath
    ? {
        kind: "matched",
        project,
      }
    : { kind: "skip" };

export const buildPendingGenerationJobCompletionPlan = <
  TProject extends PendingGenerationJobProjectContext,
>({
  job,
  project,
  completedCount,
}: {
  job: PendingGenerationJob;
  project: TProject | null | undefined;
  completedCount: number;
}): PendingGenerationJobCompletionPlan<TProject> => {
  const projectMatchPlan = buildPendingGenerationJobProjectMatchPlan({
    job,
    project,
  });
  if (projectMatchPlan.kind === "skip") {
    return { kind: "skip" };
  }

  return {
    kind: "complete",
    project: projectMatchPlan.project,
    ...buildPendingGenerationJobSlotCompletionPlan({
      job,
      completedCount,
    }),
  };
};

export const buildPendingGenerationJobSceneCommitPlan = <
  TProject extends PendingGenerationJobProjectContext,
>({
  job,
  project,
  hasCanvasApi,
}: {
  job: PendingGenerationJob;
  project: TProject | null | undefined;
  hasCanvasApi: boolean;
}): PendingGenerationJobSceneCommitPlan<TProject> => {
  if (!hasCanvasApi) {
    return { kind: "skip" };
  }

  const projectMatchPlan = buildPendingGenerationJobProjectMatchPlan({
    job,
    project,
  });

  return projectMatchPlan.kind === "matched"
    ? {
        kind: "commit",
        project: projectMatchPlan.project,
      }
    : { kind: "skip" };
};

export const buildPendingGenerationMissingResultFailure = ({
  job,
  slot,
  message,
}: {
  job: PendingGenerationJob;
  slot: PendingGenerationSlot;
  message: string;
}): PendingGenerationMissingResultFailure => ({
  job: {
    ...job,
    slots: [slot],
  },
  errorDetails: {
    normalizedMessage: message,
    rawMessage: message,
    stack: null,
  },
});

export const getPendingGenerationJobCount = (
  generationJobs: ReadonlyMap<string, PendingGenerationJob>,
) => generationJobs.size;

const buildPendingGenerationJobRegistryState = (
  pendingJobs: Map<string, PendingGenerationJob>,
): PendingGenerationJobRegistryState => ({
  pendingJobs,
  pendingCount: getPendingGenerationJobCount(pendingJobs),
});

export const buildPendingGenerationJobAddState = ({
  generationJobs,
  job,
}: {
  generationJobs: ReadonlyMap<string, PendingGenerationJob>;
  job: PendingGenerationJob;
}): PendingGenerationJobRegistryState =>
  buildPendingGenerationJobRegistryState(
    buildPendingGenerationJobMapWithJob({
      generationJobs,
      job,
    }),
  );

export const buildPendingGenerationJobRemoveState = ({
  generationJobs,
  jobId,
}: {
  generationJobs: ReadonlyMap<string, PendingGenerationJob>;
  jobId: string;
}): PendingGenerationJobRegistryState =>
  buildPendingGenerationJobRegistryState(
    buildPendingGenerationJobMapWithoutJob({
      generationJobs,
      jobId,
    }),
  );

export const runPendingGenerationJobRegistryAddAction = ({
  getGenerationJobs,
  applyRegistryState,
  job,
}: PendingGenerationJobRegistryActionInput & {
  job: PendingGenerationJob;
}): PendingGenerationJobRegistryState =>
  applyRegistryState(
    buildPendingGenerationJobAddState({
      generationJobs: getGenerationJobs(),
      job,
    }),
  );

export const runPendingGenerationJobRegistryRemoveAction = ({
  getGenerationJobs,
  applyRegistryState,
  jobId,
}: PendingGenerationJobRegistryActionInput & {
  jobId: string;
}): PendingGenerationJobRegistryState =>
  applyRegistryState(
    buildPendingGenerationJobRemoveState({
      generationJobs: getGenerationJobs(),
      jobId,
    }),
  );

export const buildEmptyGenerationTrackingState =
  (): EmptyGenerationTrackingState => {
    const pendingJobs = buildEmptyPendingGenerationJobMap();

    return {
      pendingJobs,
      generationTasks: buildEmptyGenerationTaskMap(),
      pendingCount: getPendingGenerationJobCount(pendingJobs),
    };
  };

export const applyEmptyGenerationTrackingState = ({
  setPendingJobs,
  setGenerationTasks,
  setPendingCount,
}: ApplyEmptyGenerationTrackingStateInput): EmptyGenerationTrackingState => {
  const state = buildEmptyGenerationTrackingState();
  setPendingJobs(state.pendingJobs);
  setGenerationTasks(state.generationTasks);
  setPendingCount(state.pendingCount);
  return state;
};

export const createGenerationTrackingRendererActions = ({
  setPendingJobs,
  setGenerationTasks,
  setPendingCount,
}: GenerationTrackingRendererActionsInput) => ({
  reset: () =>
    applyEmptyGenerationTrackingState({
      setPendingJobs,
      setGenerationTasks,
      setPendingCount,
    }),
});

export const applyPendingGenerationJobRegistryState = ({
  state,
  setPendingJobs,
  setPendingCount,
}: ApplyPendingGenerationJobRegistryStateInput): PendingGenerationJobRegistryState => {
  setPendingJobs(state.pendingJobs);
  setPendingCount(state.pendingCount);
  return state;
};
