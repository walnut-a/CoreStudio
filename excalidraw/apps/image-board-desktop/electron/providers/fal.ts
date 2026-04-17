import type { GenerationRequest, GenerationResponse } from "../../src/shared/providerTypes";

import { writeGenerationLog } from "../generationLogs";
import {
  buildImagePayload,
  buildOutputFileName,
  clampImageCount,
  toFalImageSize,
} from "./providerUtils";
import {
  buildPromptWithReferenceNotes,
  getEnabledReference,
  toDataUri,
} from "./promptUtils";

type FalImageResponse = {
  images?: Array<{
    url: string;
    width?: number;
    height?: number;
    content_type?: string;
  }>;
  seed?: number | null;
};

const FAL_ASPECT_RATIOS = [
  { label: "1:1", ratio: 1 },
  { label: "21:9", ratio: 21 / 9 },
  { label: "16:9", ratio: 16 / 9 },
  { label: "3:2", ratio: 3 / 2 },
  { label: "4:3", ratio: 4 / 3 },
  { label: "5:4", ratio: 5 / 4 },
  { label: "4:5", ratio: 4 / 5 },
  { label: "3:4", ratio: 3 / 4 },
  { label: "2:3", ratio: 2 / 3 },
  { label: "9:16", ratio: 9 / 16 },
  { label: "4:1", ratio: 4 },
  { label: "1:4", ratio: 1 / 4 },
  { label: "8:1", ratio: 8 },
  { label: "1:8", ratio: 1 / 8 },
];

const isFalNanoBananaModel = (model: string) => model === "fal-ai/nano-banana-2";

const toClosestFalAspectRatio = (width: number, height: number) => {
  const targetRatio = width / height;
  return FAL_ASPECT_RATIOS.reduce((best, candidate) =>
    Math.abs(candidate.ratio - targetRatio) <
    Math.abs(best.ratio - targetRatio)
      ? candidate
      : best,
  ).label;
};

const toFalResolution = (width: number, height: number) => {
  const longestEdge = Math.max(width, height);
  if (longestEdge > 1536) {
    return "2K";
  }
  if (longestEdge < 768) {
    return "0.5K";
  }
  return "1K";
};

export const generateFalImages = async ({
  apiKey,
  request,
  projectPath,
}: {
  apiKey: string;
  request: GenerationRequest;
  projectPath?: string | null;
}): Promise<GenerationResponse> => {
  const createdAt = new Date().toISOString();
  const prompt = buildPromptWithReferenceNotes(request);
  const reference = getEnabledReference(request);
  const endpoint =
    isFalNanoBananaModel(request.model) && reference
      ? `${request.model}/edit`
      : request.model;
  const requestBody = isFalNanoBananaModel(request.model)
    ? {
        prompt,
        num_images: clampImageCount(request, 4),
        aspect_ratio: toClosestFalAspectRatio(request.width, request.height),
        resolution: toFalResolution(request.width, request.height),
        output_format: "png",
        ...(reference
          ? {
              image_urls: [
                {
                  kind: "data-uri",
                  mimeType: reference.image!.mimeType,
                  byteLength: Buffer.from(reference.image!.dataBase64, "base64")
                    .byteLength,
                  base64Prefix: reference.image!.dataBase64.slice(0, 96),
                  base64Suffix: reference.image!.dataBase64.slice(-32),
                },
              ],
            }
          : {}),
        ...(request.seed ? { seed: request.seed } : {}),
      }
    : {
        prompt,
        image_size: toFalImageSize(request.width, request.height),
        num_images: clampImageCount(request, 4),
        ...(request.seed ? { seed: request.seed } : {}),
      };
  const requestSummary = [
    `provider=fal`,
    `model=${request.model}`,
    `尺寸=${request.width}x${request.height}`,
    `数量=${request.imageCount}`,
    `endpoint=${endpoint}`,
    `引用=${reference ? "已启用" : "未启用"}`,
  ].join(" ");
  const requestPayload = JSON.stringify(
    {
      endpoint,
      body: requestBody,
    },
    null,
    2,
  );

  let response;
  try {
    response = await fetch(`https://fal.run/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      isFalNanoBananaModel(request.model)
        ? {
            ...requestBody,
            ...(reference
              ? {
                  image_urls: [
                    toDataUri(reference.image!.mimeType, reference.image!.dataBase64),
                  ],
                }
              : {}),
          }
        : requestBody,
    ),
    });

    if (!response.ok) {
      throw new Error(`fal.ai request failed: ${response.status}`);
    }

    const data = (await response.json()) as FalImageResponse;
    const images = await Promise.all(
      (data.images || []).map(async (image, index) => {
        const imageResponse = await fetch(image.url);
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        return buildImagePayload({
          dataBase64: imageBuffer.toString("base64"),
          mimeType: image.content_type || "image/png",
          fileName: buildOutputFileName("fal", index),
        });
      }),
    );

    const generationResponse = {
      provider: "fal" as const,
      model: request.model,
      seed: data.seed ?? request.seed ?? null,
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
    await writeGenerationLog({
      projectPath,
      request,
      requestSummary,
      requestPayload,
      error,
    });
    throw error;
  }
};
