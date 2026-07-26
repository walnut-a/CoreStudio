import { describe, expect, it } from "vitest";

import type { PendingGenerationJob } from "./generationJobState";
import type { GenerationTaskRecord } from "./generationTaskState";
import { reconcilePendingGenerationScene } from "./pendingGenerationSceneReconciliation";

const task: GenerationTaskRecord = {
  status: "pending",
  provider: "zenmux",
  model: "image-model",
  prompt: "生成两张产品图",
  width: 1024,
  height: 1024,
  startedAt: "2026-07-26T00:00:00.000Z",
};

const createJob = (): PendingGenerationJob => ({
  jobId: "job-1",
  projectPath: "/tmp/project",
  slots: [
    {
      frameId: "placeholder-1",
      labelId: "label-1",
      fitReturnedImageSize: false,
    },
    {
      frameId: "placeholder-2",
      labelId: "label-2",
      fitReturnedImageSize: false,
    },
  ],
});

const createTasks = (job: PendingGenerationJob) =>
  new Map(
    job.slots.flatMap((slot) => [
      [slot.frameId, task] as const,
      [slot.labelId, task] as const,
    ]),
  );

describe("reconcilePendingGenerationScene", () => {
  it("dismisses only the deleted slot and keeps the rest of the job active", () => {
    const job = createJob();

    const result = reconcilePendingGenerationScene({
      generationJobs: new Map([[job.jobId, job]]),
      generationTasks: createTasks(job),
      elements: [
        { id: "placeholder-1", isDeleted: true },
        { id: "label-1", isDeleted: true },
        { id: "placeholder-2", isDeleted: false },
        { id: "label-2", isDeleted: false },
      ],
    });

    expect(result.cancelledJobIds).toEqual([]);
    expect(result.pendingCount).toBe(1);
    expect(result.pendingJobs.get(job.jobId)).toEqual({
      ...job,
      dismissedSlotIds: ["placeholder-1"],
    });
    expect(result.generationTasks.has("placeholder-1")).toBe(false);
    expect(result.generationTasks.has("label-1")).toBe(false);
    expect(result.generationTasks.get("placeholder-2")).toBe(task);
    expect(result.generationTasks.get("label-2")).toBe(task);
  });

  it("cancels the provider job when its last live slot is deleted", () => {
    const job = createJob();

    const result = reconcilePendingGenerationScene({
      generationJobs: new Map([[job.jobId, job]]),
      generationTasks: createTasks(job),
      elements: job.slots.flatMap((slot) => [
        { id: slot.frameId, isDeleted: true },
        { id: slot.labelId, isDeleted: true },
      ]),
    });

    expect(result.pendingJobs.size).toBe(0);
    expect(result.pendingCount).toBe(0);
    expect(result.cancelledJobIds).toEqual([job.jobId]);
    expect(result.generationTasks.size).toBe(0);
  });

  it("cleans deleted failed-task labels without requesting provider cancellation", () => {
    const failedTask = { ...task, status: "error" as const };

    const result = reconcilePendingGenerationScene({
      generationJobs: new Map(),
      generationTasks: new Map([
        ["failed-placeholder", failedTask],
        ["failed-label", failedTask],
        ["live-placeholder", failedTask],
      ]),
      elements: [
        { id: "failed-placeholder", isDeleted: true },
        { id: "failed-label", isDeleted: true },
        { id: "live-placeholder", isDeleted: false },
      ],
    });

    expect(result.cancelledJobIds).toEqual([]);
    expect(result.generationTasks).toEqual(
      new Map([["live-placeholder", failedTask]]),
    );
  });
});
