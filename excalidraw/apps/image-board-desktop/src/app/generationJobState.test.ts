import { describe, expect, it, vi } from "vitest";

import {
  applyEmptyGenerationTrackingState,
  applyPendingGenerationJobRegistryState,
  buildPendingGenerationJob,
  buildPendingGenerationJobActivityPlan,
  buildPendingGenerationJobAddState,
  buildPendingGenerationJobAsyncResultPlan,
  buildPendingGenerationJobCompletionPlan,
  buildPendingGenerationJobFailurePlan,
  buildPendingGenerationMissingResultFailure,
  buildPendingGenerationJobProjectMatchPlan,
  buildPendingGenerationJobRemoveState,
  buildPendingGenerationJobSceneCommitPlan,
  buildPendingGenerationJobSlotCompletionPlan,
  buildEmptyGenerationTrackingState,
  buildEmptyPendingGenerationJobMap,
  buildPendingGenerationJobMapWithJob,
  buildPendingGenerationJobMapWithoutJob,
  createGenerationTrackingRendererActions,
  getPendingGenerationJobCount,
  hasPendingGenerationJob,
  readPendingGenerationJobAsyncResultPlan,
  runPendingGenerationJobFailureResultAction,
  runPendingGenerationJobRegistryAddAction,
  runPendingGenerationJobRegistryRemoveAction,
  runPendingGenerationJobSuccessResultAction,
  type PendingGenerationJob,
  type PendingGenerationJobRegistryState,
} from "./generationJobState";

const slot = {
  frameId: "frame-1",
  labelId: "label-1",
  fitReturnedImageSize: false,
};
const secondSlot = {
  frameId: "frame-2",
  labelId: "label-2",
  fitReturnedImageSize: true,
};
const thirdSlot = {
  frameId: "frame-3",
  labelId: "label-3",
  fitReturnedImageSize: false,
};

describe("buildPendingGenerationJob", () => {
  it("builds a pending generation job from the current project and slots", () => {
    expect(
      buildPendingGenerationJob({
        jobId: "job-1",
        projectPath: "/projects/industrial",
        slots: [slot],
      }),
    ).toEqual({
      jobId: "job-1",
      projectPath: "/projects/industrial",
      slots: [slot],
    });
  });
});

describe("applyEmptyGenerationTrackingState", () => {
  it("applies empty pending jobs, generation tasks, and pending count", () => {
    const setPendingJobs = vi.fn();
    const setGenerationTasks = vi.fn();
    const setPendingCount = vi.fn();

    const state = applyEmptyGenerationTrackingState({
      setPendingJobs,
      setGenerationTasks,
      setPendingCount,
    });

    expect(state.pendingJobs.size).toBe(0);
    expect(state.generationTasks.size).toBe(0);
    expect(state.pendingCount).toBe(0);
    expect(setPendingJobs).toHaveBeenCalledWith(state.pendingJobs);
    expect(setGenerationTasks).toHaveBeenCalledWith(state.generationTasks);
    expect(setPendingCount).toHaveBeenCalledWith(0);
  });
});

describe("createGenerationTrackingRendererActions", () => {
  it("resets pending generation jobs, generation tasks, and pending count", () => {
    const setPendingJobs = vi.fn();
    const setGenerationTasks = vi.fn();
    const setPendingCount = vi.fn();

    const actions = createGenerationTrackingRendererActions({
      setPendingJobs,
      setGenerationTasks,
      setPendingCount,
    });

    const state = actions.reset();

    expect(state.pendingJobs.size).toBe(0);
    expect(state.generationTasks.size).toBe(0);
    expect(state.pendingCount).toBe(0);
    expect(setPendingJobs).toHaveBeenCalledWith(state.pendingJobs);
    expect(setGenerationTasks).toHaveBeenCalledWith(state.generationTasks);
    expect(setPendingCount).toHaveBeenCalledWith(0);
  });
});

describe("pending generation job activity plan", () => {
  it("continues async generation handling only while the pending job is still registered", () => {
    const job = buildPendingGenerationJob({
      jobId: "job-1",
      projectPath: "/projects/industrial",
      slots: [slot],
    });

    expect(
      buildPendingGenerationJobActivityPlan({
        generationJobs: new Map([[job.jobId, job]]),
        jobId: job.jobId,
      }),
    ).toEqual({
      kind: "continue",
    });

    expect(
      buildPendingGenerationJobActivityPlan({
        generationJobs: buildEmptyPendingGenerationJobMap(),
        jobId: job.jobId,
      }),
    ).toEqual({
      kind: "ignore",
    });
  });
});

describe("pending generation job failure plan", () => {
  it("marks a failed generation only while the pending job is still registered", () => {
    const job = buildPendingGenerationJob({
      jobId: "job-1",
      projectPath: "/projects/industrial",
      slots: [slot],
    });

    expect(
      buildPendingGenerationJobFailurePlan({
        generationJobs: new Map([[job.jobId, job]]),
        jobId: job.jobId,
      }),
    ).toEqual({
      kind: "mark-failed",
    });

    expect(
      buildPendingGenerationJobFailurePlan({
        generationJobs: buildEmptyPendingGenerationJobMap(),
        jobId: job.jobId,
      }),
    ).toEqual({
      kind: "ignore",
    });
  });
});

describe("pending generation job async result plan", () => {
  it("finishes successful results, marks failed results, and ignores stale jobs", () => {
    const job = buildPendingGenerationJob({
      jobId: "job-1",
      projectPath: "/projects/industrial",
      slots: [slot],
    });
    const generationJobs = new Map([[job.jobId, job]]);

    expect(
      buildPendingGenerationJobAsyncResultPlan({
        generationJobs,
        jobId: job.jobId,
        result: "success",
      }),
    ).toEqual({
      kind: "finish",
    });

    expect(
      buildPendingGenerationJobAsyncResultPlan({
        generationJobs,
        jobId: job.jobId,
        result: "failure",
      }),
    ).toEqual({
      kind: "mark-failed",
    });

    expect(
      buildPendingGenerationJobAsyncResultPlan({
        generationJobs: buildEmptyPendingGenerationJobMap(),
        jobId: job.jobId,
        result: "success",
      }),
    ).toEqual({
      kind: "ignore",
    });

    expect(
      buildPendingGenerationJobAsyncResultPlan({
        generationJobs: buildEmptyPendingGenerationJobMap(),
        jobId: job.jobId,
        result: "failure",
      }),
    ).toEqual({
      kind: "ignore",
    });
  });

  it("reads the latest registry when checking async generation results", () => {
    const job = buildPendingGenerationJob({
      jobId: "job-1",
      projectPath: "/projects/industrial",
      slots: [slot],
    });
    const getGenerationJobs = vi
      .fn<() => ReadonlyMap<string, PendingGenerationJob>>()
      .mockReturnValueOnce(new Map([[job.jobId, job]]))
      .mockReturnValueOnce(buildEmptyPendingGenerationJobMap());

    expect(
      readPendingGenerationJobAsyncResultPlan({
        getGenerationJobs,
        jobId: job.jobId,
        result: "success",
      }),
    ).toEqual({
      kind: "finish",
    });

    expect(
      readPendingGenerationJobAsyncResultPlan({
        getGenerationJobs,
        jobId: job.jobId,
        result: "success",
      }),
    ).toEqual({
      kind: "ignore",
    });
    expect(getGenerationJobs).toHaveBeenCalledTimes(2);
  });

  it("runs the successful result callback only when the job is still active", async () => {
    const getResultPlan = vi
      .fn()
      .mockReturnValueOnce({ kind: "finish" })
      .mockReturnValueOnce({ kind: "ignore" });
    const finish = vi.fn(async () => "finished");

    await expect(
      runPendingGenerationJobSuccessResultAction({
        getResultPlan,
        finish,
      }),
    ).resolves.toEqual({
      kind: "finished",
    });
    await expect(
      runPendingGenerationJobSuccessResultAction({
        getResultPlan,
        finish,
      }),
    ).resolves.toEqual({
      kind: "ignored",
    });

    expect(getResultPlan).toHaveBeenNthCalledWith(1, "success");
    expect(getResultPlan).toHaveBeenNthCalledWith(2, "success");
    expect(finish).toHaveBeenCalledTimes(1);
  });

  it("runs the failure callback only when the job is still active", () => {
    const getResultPlan = vi
      .fn()
      .mockReturnValueOnce({ kind: "mark-failed" })
      .mockReturnValueOnce({ kind: "ignore" });
    const markFailed = vi.fn();

    expect(
      runPendingGenerationJobFailureResultAction({
        getResultPlan,
        markFailed,
      }),
    ).toEqual({
      kind: "marked-failed",
    });
    expect(
      runPendingGenerationJobFailureResultAction({
        getResultPlan,
        markFailed,
      }),
    ).toEqual({
      kind: "ignored",
    });

    expect(getResultPlan).toHaveBeenNthCalledWith(1, "failure");
    expect(getResultPlan).toHaveBeenNthCalledWith(2, "failure");
    expect(markFailed).toHaveBeenCalledTimes(1);
  });
});

describe("pending generation job slot completion plan", () => {
  it("maps returned assets to slots and marks missing returned images as failed", () => {
    const job = buildPendingGenerationJob({
      jobId: "job-1",
      projectPath: "/projects/industrial",
      slots: [slot, secondSlot, thirdSlot],
    });

    expect(
      buildPendingGenerationJobSlotCompletionPlan({
        job,
        completedCount: 2,
      }),
    ).toEqual({
      replacements: [
        {
          slot,
          assetIndex: 0,
        },
        {
          slot: secondSlot,
          assetIndex: 1,
        },
      ],
      failedSlots: [thirdSlot],
    });
  });

  it("does not create replacement entries beyond the pending slots", () => {
    const job = buildPendingGenerationJob({
      jobId: "job-1",
      projectPath: "/projects/industrial",
      slots: [slot],
    });

    expect(
      buildPendingGenerationJobSlotCompletionPlan({
        job,
        completedCount: 3,
      }),
    ).toEqual({
      replacements: [
        {
          slot,
          assetIndex: 0,
        },
      ],
      failedSlots: [],
    });
  });
});

describe("pending generation job project match plan", () => {
  it("continues only when the current project still belongs to the pending job", () => {
    const job = buildPendingGenerationJob({
      jobId: "job-1",
      projectPath: "/projects/industrial",
      slots: [slot],
    });
    const matchingProject = {
      projectPath: "/projects/industrial",
      name: "工业设计助手",
    };

    expect(
      buildPendingGenerationJobProjectMatchPlan({
        job,
        project: matchingProject,
      }),
    ).toEqual({
      kind: "matched",
      project: matchingProject,
    });

    expect(
      buildPendingGenerationJobProjectMatchPlan({
        job,
        project: {
          projectPath: "/projects/other",
          name: "其他项目",
        },
      }),
    ).toEqual({
      kind: "skip",
    });

    expect(
      buildPendingGenerationJobProjectMatchPlan({
        job,
        project: null,
      }),
    ).toEqual({
      kind: "skip",
    });
  });
});

describe("pending generation job completion plan", () => {
  it("combines project matching with slot completion", () => {
    const job = buildPendingGenerationJob({
      jobId: "job-1",
      projectPath: "/projects/industrial",
      slots: [slot, secondSlot, thirdSlot],
    });
    const matchingProject = {
      projectPath: "/projects/industrial",
      name: "工业设计助手",
    };

    expect(
      buildPendingGenerationJobCompletionPlan({
        job,
        project: matchingProject,
        completedCount: 2,
      }),
    ).toEqual({
      kind: "complete",
      project: matchingProject,
      replacements: [
        {
          slot,
          assetIndex: 0,
        },
        {
          slot: secondSlot,
          assetIndex: 1,
        },
      ],
      failedSlots: [thirdSlot],
    });
  });

  it("skips completion when the active project no longer matches the job", () => {
    const job = buildPendingGenerationJob({
      jobId: "job-1",
      projectPath: "/projects/industrial",
      slots: [slot],
    });

    expect(
      buildPendingGenerationJobCompletionPlan({
        job,
        project: {
          projectPath: "/projects/other",
          name: "其他项目",
        },
        completedCount: 1,
      }),
    ).toEqual({
      kind: "skip",
    });

    expect(
      buildPendingGenerationJobCompletionPlan({
        job,
        project: null,
        completedCount: 1,
      }),
    ).toEqual({
      kind: "skip",
    });
  });
});

describe("pending generation job scene commit plan", () => {
  it("commits scene updates only when the canvas api is available and the project still matches", () => {
    const job = buildPendingGenerationJob({
      jobId: "job-1",
      projectPath: "/projects/industrial",
      slots: [slot],
    });
    const matchingProject = {
      projectPath: "/projects/industrial",
      name: "工业设计助手",
    };

    expect(
      buildPendingGenerationJobSceneCommitPlan({
        job,
        project: matchingProject,
        hasCanvasApi: true,
      }),
    ).toEqual({
      kind: "commit",
      project: matchingProject,
    });
  });

  it("skips scene updates when the canvas api is missing or the project changed", () => {
    const job = buildPendingGenerationJob({
      jobId: "job-1",
      projectPath: "/projects/industrial",
      slots: [slot],
    });

    expect(
      buildPendingGenerationJobSceneCommitPlan({
        job,
        project: {
          projectPath: "/projects/industrial",
          name: "工业设计助手",
        },
        hasCanvasApi: false,
      }),
    ).toEqual({
      kind: "skip",
    });

    expect(
      buildPendingGenerationJobSceneCommitPlan({
        job,
        project: {
          projectPath: "/projects/other",
          name: "其他项目",
        },
        hasCanvasApi: true,
      }),
    ).toEqual({
      kind: "skip",
    });

    expect(
      buildPendingGenerationJobSceneCommitPlan({
        job,
        project: null,
        hasCanvasApi: true,
      }),
    ).toEqual({
      kind: "skip",
    });
  });
});

describe("pending generation missing result failure", () => {
  it("builds a single-slot failed job with consistent error details", () => {
    const job = buildPendingGenerationJob({
      jobId: "job-1",
      projectPath: "/projects/industrial",
      slots: [slot, secondSlot],
    });

    expect(
      buildPendingGenerationMissingResultFailure({
        job,
        slot: secondSlot,
        message: "模型没有返回这张图。",
      }),
    ).toEqual({
      job: {
        ...job,
        slots: [secondSlot],
      },
      errorDetails: {
        normalizedMessage: "模型没有返回这张图。",
        rawMessage: "模型没有返回这张图。",
        stack: null,
      },
    });
  });
});

describe("generation tracking reset state", () => {
  it("builds the empty job and task registries with a derived pending count", () => {
    const state = buildEmptyGenerationTrackingState();

    expect(state.pendingJobs.size).toBe(0);
    expect(state.generationTasks.size).toBe(0);
    expect(state.pendingCount).toBe(0);
    expect(state.pendingCount).toBe(
      getPendingGenerationJobCount(state.pendingJobs),
    );
  });
});

describe("pending generation job registry", () => {
  it("adds jobs immutably and derives the pending count from the registry size", () => {
    const job = buildPendingGenerationJob({
      jobId: "job-1",
      projectPath: "/projects/industrial",
      slots: [slot],
    });
    const currentJobs = new Map([
      [
        "other-job",
        buildPendingGenerationJob({
          jobId: "other-job",
          projectPath: "/projects/industrial",
          slots: [],
        }),
      ],
    ]);

    const nextJobs = buildPendingGenerationJobMapWithJob({
      generationJobs: currentJobs,
      job,
    });

    expect(nextJobs).not.toBe(currentJobs);
    expect(currentJobs.has(job.jobId)).toBe(false);
    expect(nextJobs.get(job.jobId)).toBe(job);
    expect(hasPendingGenerationJob(nextJobs, job.jobId)).toBe(true);
    expect(getPendingGenerationJobCount(nextJobs)).toBe(2);

    const state = buildPendingGenerationJobAddState({
      generationJobs: currentJobs,
      job,
    });

    expect(state.pendingJobs.get(job.jobId)).toBe(job);
    expect(state.pendingCount).toBe(2);
    expect(state.pendingCount).toBe(
      getPendingGenerationJobCount(state.pendingJobs),
    );
  });

  it("removes jobs immutably without producing negative pending counts", () => {
    const job = buildPendingGenerationJob({
      jobId: "job-1",
      projectPath: "/projects/industrial",
      slots: [slot],
    });
    const currentJobs = new Map([[job.jobId, job]]);

    const afterRemove = buildPendingGenerationJobMapWithoutJob({
      generationJobs: currentJobs,
      jobId: job.jobId,
    });
    const afterMissingRemove = buildPendingGenerationJobMapWithoutJob({
      generationJobs: afterRemove,
      jobId: "missing-job",
    });

    expect(afterRemove).not.toBe(currentJobs);
    expect(currentJobs.has(job.jobId)).toBe(true);
    expect(afterRemove.has(job.jobId)).toBe(false);
    expect(hasPendingGenerationJob(afterRemove, job.jobId)).toBe(false);
    expect(getPendingGenerationJobCount(afterRemove)).toBe(0);
    expect(getPendingGenerationJobCount(afterMissingRemove)).toBe(0);

    const state = buildPendingGenerationJobRemoveState({
      generationJobs: currentJobs,
      jobId: job.jobId,
    });

    expect(state.pendingJobs.has(job.jobId)).toBe(false);
    expect(state.pendingCount).toBe(0);
    expect(state.pendingCount).toBe(
      getPendingGenerationJobCount(state.pendingJobs),
    );
  });

  it("resets jobs immutably so project switches do not mutate the previous registry", () => {
    const job = buildPendingGenerationJob({
      jobId: "job-1",
      projectPath: "/projects/industrial",
      slots: [slot],
    });
    const currentJobs = new Map([[job.jobId, job]]);

    const resetJobs = buildEmptyPendingGenerationJobMap();

    expect(resetJobs).not.toBe(currentJobs);
    expect(currentJobs.has(job.jobId)).toBe(true);
    expect(getPendingGenerationJobCount(resetJobs)).toBe(0);
  });

  it("applies pending job registry state to the ref and pending count", () => {
    const job = buildPendingGenerationJob({
      jobId: "job-1",
      projectPath: "/projects/industrial",
      slots: [slot],
    });
    const state = buildPendingGenerationJobAddState({
      generationJobs: buildEmptyPendingGenerationJobMap(),
      job,
    });
    const setPendingJobs = vi.fn();
    const setPendingCount = vi.fn();

    const appliedState = applyPendingGenerationJobRegistryState({
      state,
      setPendingJobs,
      setPendingCount,
    });

    expect(appliedState).toBe(state);
    expect(setPendingJobs).toHaveBeenCalledWith(state.pendingJobs);
    expect(setPendingCount).toHaveBeenCalledWith(state.pendingCount);
  });

  it("adds a pending job through the owner action", () => {
    const existingJob = buildPendingGenerationJob({
      jobId: "existing-job",
      projectPath: "/projects/industrial",
      slots: [slot],
    });
    const nextJob = buildPendingGenerationJob({
      jobId: "job-2",
      projectPath: "/projects/industrial",
      slots: [secondSlot],
    });
    const currentJobs = new Map([[existingJob.jobId, existingJob]]);
    const getGenerationJobs = vi.fn(() => currentJobs);
    const applyRegistryState = vi.fn(
      (state: PendingGenerationJobRegistryState) => state,
    );

    const state = runPendingGenerationJobRegistryAddAction({
      getGenerationJobs,
      applyRegistryState,
      job: nextJob,
    });

    expect(getGenerationJobs).toHaveBeenCalledTimes(1);
    expect(state.pendingJobs.get(existingJob.jobId)).toBe(existingJob);
    expect(state.pendingJobs.get(nextJob.jobId)).toBe(nextJob);
    expect(state.pendingCount).toBe(2);
    expect(applyRegistryState).toHaveBeenCalledWith(state);
  });

  it("removes a pending job through the owner action", () => {
    const job = buildPendingGenerationJob({
      jobId: "job-1",
      projectPath: "/projects/industrial",
      slots: [slot],
    });
    const currentJobs = new Map([[job.jobId, job]]);
    const getGenerationJobs = vi.fn(() => currentJobs);
    const applyRegistryState = vi.fn(
      (state: PendingGenerationJobRegistryState) => state,
    );

    const state = runPendingGenerationJobRegistryRemoveAction({
      getGenerationJobs,
      applyRegistryState,
      jobId: job.jobId,
    });

    expect(getGenerationJobs).toHaveBeenCalledTimes(1);
    expect(state.pendingJobs.has(job.jobId)).toBe(false);
    expect(state.pendingCount).toBe(0);
    expect(applyRegistryState).toHaveBeenCalledWith(state);
  });
});
