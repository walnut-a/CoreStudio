import type {
  GenerationRequest,
  ProviderId,
} from "../shared/providerTypes";

import { buildPromptTextWithInlineReferences } from "../shared/promptReferences";
import { copy } from "./copy";

export interface GenerationTaskRecord {
  status: "pending" | "error";
  provider: ProviderId;
  model: string;
  prompt: string;
  negativePrompt?: string | null;
  aspectRatio?: string | null;
  seed?: number | null;
  width: number;
  height: number;
  startedAt: string;
  errorMessage?: string | null;
  rawError?: string | null;
  stack?: string | null;
}

export interface GenerationTaskErrorDetails {
  normalizedMessage?: string | null;
  rawMessage?: string | null;
  stack?: string | null;
}

export interface GenerationTaskSlotRef {
  frameId: string;
  labelId: string;
}

const resolveGenerationTaskFallbackMessage = (fallbackMessage?: string) =>
  fallbackMessage?.trim() || copy.startup.generateFailed;

export const buildPendingGenerationTaskRecord = ({
  request,
  startedAt,
}: {
  request: GenerationRequest;
  startedAt: string;
}): GenerationTaskRecord => ({
  status: "pending",
  provider: request.provider,
  model: request.model,
  prompt: buildPromptTextWithInlineReferences(request).trim() || request.prompt,
  negativePrompt: request.negativePrompt,
  aspectRatio: request.aspectRatio,
  seed: request.seed,
  width: request.width,
  height: request.height,
  startedAt,
});

export const buildFailedGenerationTaskRecord = ({
  task,
  fallbackMessage,
  errorDetails,
}: {
  task: GenerationTaskRecord;
  fallbackMessage?: string;
  errorDetails?: GenerationTaskErrorDetails;
}): GenerationTaskRecord => {
  const resolvedFallbackMessage =
    resolveGenerationTaskFallbackMessage(fallbackMessage);

  return {
    ...task,
    status: "error",
    errorMessage: errorDetails?.normalizedMessage || resolvedFallbackMessage,
    rawError:
      errorDetails?.rawMessage ||
      errorDetails?.normalizedMessage ||
      resolvedFallbackMessage,
    stack: errorDetails?.stack || null,
  };
};

export const buildGenerationTaskMapWithPendingSlots = ({
  generationTasks,
  slots,
  request,
  startedAt,
}: {
  generationTasks: ReadonlyMap<string, GenerationTaskRecord>;
  slots: readonly GenerationTaskSlotRef[];
  request: GenerationRequest;
  startedAt: string;
}) => {
  const nextTasks = new Map(generationTasks);

  for (const slot of slots) {
    const task = buildPendingGenerationTaskRecord({
      request,
      startedAt,
    });
    nextTasks.set(slot.frameId, task);
    nextTasks.set(slot.labelId, task);
  }

  return nextTasks;
};

export const applyGenerationTaskMapWithPendingSlotsState = ({
  generationTasks,
  slots,
  request,
  startedAt,
  setGenerationTasks,
}: {
  generationTasks: ReadonlyMap<string, GenerationTaskRecord>;
  slots: readonly GenerationTaskSlotRef[];
  request: GenerationRequest;
  startedAt: string;
  setGenerationTasks: (
    generationTasks: Map<string, GenerationTaskRecord>,
  ) => void;
}) => {
  const nextTasks = buildGenerationTaskMapWithPendingSlots({
    generationTasks,
    slots,
    request,
    startedAt,
  });
  setGenerationTasks(nextTasks);
  return nextTasks;
};

export const buildGenerationTaskMapWithFailedSlots = ({
  generationTasks,
  slots,
  fallbackMessage,
  errorDetails,
}: {
  generationTasks: ReadonlyMap<string, GenerationTaskRecord>;
  slots: readonly GenerationTaskSlotRef[];
  fallbackMessage?: string;
  errorDetails?: GenerationTaskErrorDetails;
}) => {
  const nextTasks = new Map(generationTasks);

  for (const slot of slots) {
    const existingTask = nextTasks.get(slot.frameId) || nextTasks.get(slot.labelId);
    if (!existingTask) {
      continue;
    }

    const nextTask = buildFailedGenerationTaskRecord({
      task: existingTask,
      fallbackMessage,
      errorDetails,
    });
    nextTasks.set(slot.frameId, nextTask);
    nextTasks.set(slot.labelId, nextTask);
  }

  return nextTasks;
};

export const applyGenerationTaskMapWithFailedSlotsState = ({
  generationTasks,
  slots,
  fallbackMessage,
  errorDetails,
  setGenerationTasks,
}: {
  generationTasks: ReadonlyMap<string, GenerationTaskRecord>;
  slots: readonly GenerationTaskSlotRef[];
  fallbackMessage?: string;
  errorDetails?: GenerationTaskErrorDetails;
  setGenerationTasks: (
    generationTasks: Map<string, GenerationTaskRecord>,
  ) => void;
}) => {
  const nextTasks = buildGenerationTaskMapWithFailedSlots({
    generationTasks,
    slots,
    fallbackMessage,
    errorDetails,
  });
  setGenerationTasks(nextTasks);
  return nextTasks;
};

export const buildGenerationTaskMapWithoutSlot = ({
  generationTasks,
  slot,
}: {
  generationTasks: ReadonlyMap<string, GenerationTaskRecord>;
  slot: GenerationTaskSlotRef;
}) => {
  const nextTasks = new Map(generationTasks);
  nextTasks.delete(slot.frameId);
  nextTasks.delete(slot.labelId);
  return nextTasks;
};

export const applyGenerationTaskMapWithoutSlotState = ({
  generationTasks,
  slot,
  setGenerationTasks,
}: {
  generationTasks: ReadonlyMap<string, GenerationTaskRecord>;
  slot: GenerationTaskSlotRef;
  setGenerationTasks: (
    generationTasks: Map<string, GenerationTaskRecord>,
  ) => void;
}) => {
  const nextTasks = buildGenerationTaskMapWithoutSlot({
    generationTasks,
    slot,
  });
  setGenerationTasks(nextTasks);
  return nextTasks;
};

export const buildEmptyGenerationTaskMap = () =>
  new Map<string, GenerationTaskRecord>();
