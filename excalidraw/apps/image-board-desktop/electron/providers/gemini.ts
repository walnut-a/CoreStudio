import { GoogleGenAI } from "@google/genai";

import type { GenerationRequest, GenerationResponse } from "../../src/shared/providerTypes";

import { writeGenerationLog } from "../generationLogs";
import {
  appendRequestSummaryToError,
  buildGenerateContentRequestPayload,
  buildGenerateContentRequestSummary,
  buildImagePayload,
  buildOutputFileName,
  clampImageCount,
  ensureGenerateContentImages,
  prepareReferenceImageForUpload,
  toClosestGeminiAspectRatio,
} from "./providerUtils";
import {
  buildPromptWithReferenceNotes,
  getEnabledReference,
} from "./promptUtils";

const GEMINI_NATIVE_IMAGE_MODELS = new Set([
  "gemini-2.5-flash-image",
  "gemini-3.1-flash-image-preview",
  "gemini-3-pro-image-preview",
]);

const isGeminiNativeImageModel = (model: string) =>
  GEMINI_NATIVE_IMAGE_MODELS.has(model);

export const generateGeminiImages = async ({
  apiKey,
  request,
  projectPath,
}: {
  apiKey: string;
  request: GenerationRequest;
  projectPath?: string | null;
}): Promise<GenerationResponse> => {
  const client = new GoogleGenAI({ apiKey });
  const createdAt = new Date().toISOString();
  const prompt = buildPromptWithReferenceNotes(request);
  const reference = getEnabledReference(request);
  const uploadReferenceImage = prepareReferenceImageForUpload(reference);
  const contents = uploadReferenceImage
    ? [
        { text: prompt },
        {
          inlineData: {
            mimeType: uploadReferenceImage.mimeType,
            data: uploadReferenceImage.dataBase64,
          },
        },
      ]
    : prompt;
  const config: {
    responseModalities: string[];
    imageConfig: {
      aspectRatio: string;
      imageSize?: string;
    };
  } = {
    responseModalities: ["TEXT", "IMAGE"],
    imageConfig: {
      aspectRatio: toClosestGeminiAspectRatio(request.width, request.height),
      ...(request.model === "gemini-3.1-flash-image-preview" ||
      request.model === "gemini-3-pro-image-preview"
        ? {
            imageSize:
              Math.max(request.width, request.height) > 1024 ? "2K" : "1K",
          }
        : {}),
    },
  };
  const requestSummary = buildGenerateContentRequestSummary({
    provider: "gemini",
    request,
    prompt,
    contents,
    config,
    uploadReferenceImage,
  });
  const requestPayload = buildGenerateContentRequestPayload({
    request,
    prompt,
    contents,
    config,
    uploadReferenceImage,
  });
  try {
    const images = isGeminiNativeImageModel(request.model)
      ? ensureGenerateContentImages({
          response: await client.models
            .generateContent({
              model: request.model,
              contents,
              config,
            })
            .catch((error) => {
              throw appendRequestSummaryToError(error, requestSummary, requestPayload);
            }),
          providerPrefix: "gemini",
          requestSummary,
          requestPayload,
        })
      : (await client.models.generateImages({
          model: request.model,
          prompt,
          config: {
            numberOfImages: clampImageCount(request, 4),
            aspectRatio: toClosestGeminiAspectRatio(request.width, request.height),
            ...(request.model !== "imagen-4.0-fast-generate-001"
              ? {
                  imageSize:
                    Math.max(request.width, request.height) > 1024 ? "2K" : "1K",
                }
              : {}),
          },
        }))
          .generatedImages?.filter((generatedImage) => generatedImage.image?.imageBytes)
          .map((generatedImage, index) =>
            buildImagePayload({
              dataBase64: generatedImage.image!.imageBytes!,
              fileName: buildOutputFileName("gemini", index),
            }),
          ) || [];

    const generationResponse = {
      provider: "gemini" as const,
      model: request.model,
      seed: null,
      createdAt,
      images,
    };

    await writeGenerationLog({
      projectPath,
      request,
      requestSummary,
      requestPayload,
      response: generationResponse,
    });

    return generationResponse;
  } catch (error) {
    const nextError = appendRequestSummaryToError(
      error,
      requestSummary,
      requestPayload,
    );
    await writeGenerationLog({
      projectPath,
      request,
      requestSummary,
      requestPayload,
      error: nextError,
    });
    throw nextError;
  }
};
