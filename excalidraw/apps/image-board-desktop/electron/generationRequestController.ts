import type {
  GenerateImagesInput,
} from "../src/shared/desktopBridgeTypes";
import type {
  GenerationRequest,
  GenerationResponse,
} from "../src/shared/providerTypes";

type GenerateImagesWithSignal = (input: {
  projectPath: string;
  request: GenerationRequest;
  signal?: AbortSignal;
}) => Promise<GenerationResponse>;

export interface GenerationRequestController {
  generate(input: GenerateImagesInput): Promise<GenerationResponse>;
  cancel(generationJobId: string): { cancelled: boolean };
  cancelAll(): { cancelledCount: number };
}

const createGenerationCancelledError = () =>
  new Error("用户已取消生成任务。");

const normalizeGenerationJobId = (value: string | undefined) => {
  const trimmedValue = value?.trim();
  return trimmedValue || null;
};

export const createGenerationRequestController = ({
  generateImages,
}: {
  generateImages: GenerateImagesWithSignal;
}): GenerationRequestController => {
  const activeControllers = new Map<string, AbortController>();

  const cancel = (generationJobId: string) => {
    const normalizedJobId = normalizeGenerationJobId(generationJobId);
    if (!normalizedJobId) {
      return { cancelled: false };
    }

    const controller = activeControllers.get(normalizedJobId);
    if (!controller) {
      return { cancelled: false };
    }

    activeControllers.delete(normalizedJobId);
    controller.abort(createGenerationCancelledError());
    return { cancelled: true };
  };

  const generate = async ({
    generationJobId,
    projectPath,
    request,
  }: GenerateImagesInput) => {
    const normalizedJobId = normalizeGenerationJobId(generationJobId);
    const controller = new AbortController();

    if (normalizedJobId) {
      cancel(normalizedJobId);
      activeControllers.set(normalizedJobId, controller);
    }

    try {
      return await generateImages({
        projectPath,
        request,
        signal: controller.signal,
      });
    } finally {
      if (
        normalizedJobId &&
        activeControllers.get(normalizedJobId) === controller
      ) {
        activeControllers.delete(normalizedJobId);
      }
    }
  };

  const cancelAll = () => {
    let cancelledCount = 0;
    for (const jobId of [...activeControllers.keys()]) {
      if (cancel(jobId).cancelled) {
        cancelledCount += 1;
      }
    }
    return { cancelledCount };
  };

  return {
    generate,
    cancel,
    cancelAll,
  };
};
