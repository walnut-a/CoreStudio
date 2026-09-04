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
  imageIndexes,
  createFileId = () => crypto.randomUUID(),
}: {
  request: GenerationRequest;
  response: GenerationResponse;
  imageIndexes?: readonly number[];
  createFileId?: (index: number) => string;
}): PersistedImageAssetInput[] => {
  const promptHistoryText = getPromptHistoryText(request);
  const promptReferences = buildImagePromptReferenceRecords(request);
  const selectedImageIndexes =
    imageIndexes ?? response.images.map((_image, index) => index);

  return selectedImageIndexes.flatMap((index) => {
    const image = response.images[index];
    return image
      ? [
          {
            ...image,
            fileId: createFileId(index),
            sourceFileName: image.fileName,
            sourceType: "generated" as const,
            generationOrigin: "corestudio" as const,
            generationSource: request.generationSource ?? "builtin",
            provider: response.provider,
            model: response.model,
            prompt: promptHistoryText,
            negativePrompt: request.negativePrompt,
            seed: response.seed,
            createdAt: response.createdAt,
            parentFileId: request.reference?.debug?.fileId ?? null,
            ...(promptReferences.length ? { promptReferences } : {}),
          },
        ]
      : [];
  });
};
