import {
  applyBuiltinGenerationExecutionPlanState,
  applyBuiltinGenerationSubmittedRequestState,
  buildGenerationExecutionPlan,
} from "./generationRequestState";
import { prepareBuiltinGenerationRequestRendererAction } from "./generationRequestRendererController";
import {
  readPendingGenerationJobAsyncResultPlan,
  runPendingGenerationJobFailureResultAction,
  runPendingGenerationJobRegistryAddAction,
  runPendingGenerationJobRegistryRemoveAction,
  runPendingGenerationJobSuccessResultAction,
  type PendingGenerationJob,
  type PendingGenerationJobRegistryState,
} from "./generationJobState";

import type { GenerationErrorDetails } from "./generationErrorViewModel";
import type {
  GenerateImagesInput,
  DesktopProjectBundle,
} from "../shared/desktopBridgeTypes";
import type {
  GenerationRequest,
  GenerationResponse,
  GenerationSource,
} from "../shared/providerTypes";
import type { PublicProviderSettings } from "../shared/desktopBridgeTypes";

type PrepareBuiltinGenerationInput = Parameters<
  typeof prepareBuiltinGenerationRequestRendererAction
>[0];
type BuiltinGenerationSourceScene = PrepareBuiltinGenerationInput["sourceScene"];

export interface RunBuiltinGenerationRendererActionInput<
  TPlacementViewport = unknown,
> {
  request: GenerationRequest;
  project: DesktopProjectBundle;
  providerSettings: PublicProviderSettings | null;
  sourceScene: BuiltinGenerationSourceScene;
  referenceScene: BuiltinGenerationSourceScene | null;
  expectedProjectPath?: string;
  placementViewport?: TPlacementViewport | null;
  startupGenerateFailedMessage: string;
  loadOriginalScene: PrepareBuiltinGenerationInput["loadOriginalScene"];
  assertProjectActive: () => void;
  setGenerationSource: (source: Extract<GenerationSource, "builtin">) => void;
  showDirectGenerationRecords: () => void;
  setGenerateRequest: (request: GenerationRequest) => void;
  insertPlaceholders: (
    request: GenerationRequest,
    startedAt: string,
    options: {
      expectedProjectPath?: string;
      placementViewport?: TPlacementViewport | null;
      referenceScene?: BuiltinGenerationSourceScene | null;
      requireReady: boolean;
    },
  ) => PendingGenerationJob | null;
  getGenerationJobs: () => ReadonlyMap<string, PendingGenerationJob>;
  applyRegistryState: (
    state: PendingGenerationJobRegistryState,
  ) => PendingGenerationJobRegistryState;
  generateImages: (input: GenerateImagesInput) => Promise<GenerationResponse>;
  cancelGenerateImages?: (generationJobId: string) => Promise<void>;
  finishPendingJob: (
    job: PendingGenerationJob,
    request: GenerationRequest,
    response: GenerationResponse,
  ) => Promise<unknown> | unknown;
  markPendingGenerationFailed: (
    job: PendingGenerationJob,
    errorDetails?: Pick<
      GenerationErrorDetails,
      "normalizedMessage" | "rawMessage" | "stack"
    >,
  ) => void;
  showGenerationError: (
    request: GenerationRequest,
    error: unknown,
    fallbackMessage?: string,
  ) => GenerationErrorDetails;
  loadProviderState: () => Promise<unknown> | unknown;
}

export interface BuiltinGenerationCancelRendererActionInput {
  getGenerationJobs: () => ReadonlyMap<string, PendingGenerationJob>;
  applyRegistryState: (
    state: PendingGenerationJobRegistryState,
  ) => PendingGenerationJobRegistryState;
  cancelGenerateImages?: (generationJobId: string) => Promise<void>;
  markPendingGenerationFailed: (
    job: PendingGenerationJob,
    errorDetails?: Pick<
      GenerationErrorDetails,
      "normalizedMessage" | "rawMessage" | "stack"
    >,
  ) => void;
}

export interface BuiltinGenerationRendererActionStarted {
  kind: "started";
  job: PendingGenerationJob;
  preparedRequest: GenerationRequest;
  completion: Promise<void>;
}

export const runBuiltinGenerationRendererAction = async <
  TPlacementViewport = unknown,
>({
  request,
  project,
  providerSettings,
  sourceScene,
  referenceScene,
  expectedProjectPath,
  placementViewport,
  startupGenerateFailedMessage,
  loadOriginalScene,
  assertProjectActive,
  setGenerationSource,
  showDirectGenerationRecords,
  setGenerateRequest,
  insertPlaceholders,
  getGenerationJobs,
  applyRegistryState,
  generateImages,
  finishPendingJob,
  markPendingGenerationFailed,
  showGenerationError,
  loadProviderState,
}: RunBuiltinGenerationRendererActionInput<TPlacementViewport>): Promise<BuiltinGenerationRendererActionStarted> => {
  const executionPlan = buildGenerationExecutionPlan(request);
  if (executionPlan.kind !== "start-builtin-generation") {
    throw new Error("当前请求不是 CoreStudio 生成。");
  }

  applyBuiltinGenerationExecutionPlanState({
    plan: executionPlan,
    setGenerationSource,
    showDirectGenerationRecords,
  });

  const preparedRequest = await prepareBuiltinGenerationRequestRendererAction({
    request,
    providerSettings,
    sourceScene,
    imageRecords: project.imageRecords,
    loadOriginalScene,
    assertProjectActive,
  });

  const startedAt = new Date().toISOString();
  const pendingJob = insertPlaceholders(preparedRequest, startedAt, {
    expectedProjectPath,
    placementViewport,
    referenceScene,
    requireReady: Boolean(expectedProjectPath),
  });
  if (!pendingJob) {
    throw new Error(startupGenerateFailedMessage);
  }

  const getPendingJobAsyncResultPlan = (result: "success" | "failure") =>
    readPendingGenerationJobAsyncResultPlan({
      getGenerationJobs,
      jobId: pendingJob.jobId,
      result,
    });

  runPendingGenerationJobRegistryAddAction({
    getGenerationJobs,
    applyRegistryState,
    job: pendingJob,
  });
  applyBuiltinGenerationSubmittedRequestState({
    request: preparedRequest,
    setGenerateRequest,
  });

  const completion = (async () => {
    try {
      const response = await generateImages({
        projectPath: project.projectPath,
        generationJobId: pendingJob.jobId,
        request: preparedRequest,
      });
      await runPendingGenerationJobSuccessResultAction({
        getResultPlan: getPendingJobAsyncResultPlan,
        finish: () => finishPendingJob(pendingJob, preparedRequest, response),
      });
    } catch (error: unknown) {
      if (getPendingJobAsyncResultPlan("failure").kind !== "mark-failed") {
        return;
      }
      const errorDetails = showGenerationError(preparedRequest, error);
      runPendingGenerationJobFailureResultAction({
        getResultPlan: getPendingJobAsyncResultPlan,
        markFailed: () =>
          markPendingGenerationFailed(pendingJob, errorDetails),
      });
    } finally {
      runPendingGenerationJobRegistryRemoveAction({
        getGenerationJobs,
        applyRegistryState,
        jobId: pendingJob.jobId,
      });
      await loadProviderState();
    }
  })();

  return {
    kind: "started",
    job: pendingJob,
    preparedRequest,
    completion,
  };
};

export const runBuiltinGenerationCancelRendererAction = async ({
  getGenerationJobs,
  applyRegistryState,
  cancelGenerateImages,
  markPendingGenerationFailed,
}: BuiltinGenerationCancelRendererActionInput) => {
  const jobs = [...getGenerationJobs().values()];
  const cancelledDetails = {
    normalizedMessage: "已取消",
    rawMessage: "用户已取消生成任务。",
    stack: null,
  };

  for (const job of jobs) {
    markPendingGenerationFailed(job, cancelledDetails);
  }

  applyRegistryState({
    pendingJobs: new Map(),
    pendingCount: 0,
  });

  await Promise.all(
    jobs.map(async (job) => {
      await cancelGenerateImages?.(job.jobId);
    }),
  );

  return { cancelledCount: jobs.length };
};
