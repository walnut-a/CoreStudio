import {
  buildImagePromptReferenceRecords,
  buildPromptTextWithInlineReferences,
} from "../shared/promptReferences";
import type {
  GenerationRequest,
  GenerationResponse,
} from "../shared/providerTypes";
import type { PersistedImageAssetInput } from "../shared/desktopBridgeTypes";

const getPromptHistoryText = (request: GenerationRequest) =>
  buildPromptTextWithInlineReferences(request).trim() || request.prompt;

export const buildCoreStudioGeneratedImageAssetInputs = ({
  request,
  response,
  createFileId = () => crypto.randomUUID(),
}: {
  request: GenerationRequest;
  response: GenerationResponse;
  createFileId?: (index: number) => string;
}): PersistedImageAssetInput[] => {
  const promptHistoryText = getPromptHistoryText(request);
  const promptReferences = buildImagePromptReferenceRecords(request);

  return response.images.map((image, index) => ({
    ...image,
    fileId: createFileId(index),
    sourceType: "generated",
    generationOrigin: "corestudio",
    provider: response.provider,
    model: response.model,
    prompt: promptHistoryText,
    negativePrompt: request.negativePrompt,
    seed: response.seed,
    createdAt: response.createdAt,
    parentFileId: request.reference?.debug?.fileId ?? null,
    ...(promptReferences.length ? { promptReferences } : {}),
  }));
};
