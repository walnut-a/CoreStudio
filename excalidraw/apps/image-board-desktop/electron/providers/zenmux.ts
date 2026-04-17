import { GoogleGenAI } from "@google/genai";

import type { GenerationRequest, GenerationResponse } from "../../src/shared/providerTypes";

import { writeGenerationLog } from "../generationLogs";
import {
  appendRequestSummaryToError,
  buildGenerateContentRequestPayload,
  buildGenerateContentRequestSummary,
  ensureGenerateContentImages,
  prepareReferenceImageForUpload,
  toClosestGeminiAspectRatio,
} from "./providerUtils";
import {
  buildPromptWithReferenceNotes,
  getEnabledReference,
} from "./promptUtils";

export const generateZenMuxImages = async ({
  apiKey,
  request,
  projectPath,
}: {
  apiKey: string;
  request: GenerationRequest;
  projectPath?: string | null;
}): Promise<GenerationResponse> => {
  const client = new GoogleGenAI({
    apiKey,
    vertexai: true,
    httpOptions: {
      baseUrl: "https://zenmux.ai/api/vertex-ai",
      apiVersion: "v1",
    },
  });

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
    };
  } = {
    responseModalities: ["TEXT", "IMAGE"],
    imageConfig: {
      aspectRatio: toClosestGeminiAspectRatio(request.width, request.height),
    },
  };
  const requestSummary = buildGenerateContentRequestSummary({
    provider: "zenmux",
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
    const response = await client.models.generateContent({
      model: request.model,
      contents,
      config,
    });
    const generationResponse = {
      provider: "zenmux" as const,
      model: request.model,
      seed: null,
      createdAt,
      images: ensureGenerateContentImages({
        response,
        providerPrefix: "zenmux",
        requestSummary,
        requestPayload,
      }),
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
