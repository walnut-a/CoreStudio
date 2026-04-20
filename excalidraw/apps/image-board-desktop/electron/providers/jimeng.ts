import type { GenerationRequest, GenerationResponse } from "../../src/shared/providerTypes";

import { writeGenerationLog } from "../generationLogs";
import {
  appendRequestSummaryToError,
  buildImagePayload,
  buildOutputFileName,
  prepareReferenceImageForUpload,
} from "./providerUtils";
import {
  buildPromptWithReferenceNotes,
  getEnabledReference,
  toDataUri,
} from "./promptUtils";

const ARK_IMAGE_GENERATIONS_URL =
  "https://ark.cn-beijing.volces.com/api/v3/images/generations";

const SEEDREAM_T2I_MODELS = new Set(["doubao-seedream-3-0-t2i-250415"]);

type JimengImageGenerationResponse = {
  data?: Array<{
    url?: string;
    b64_json?: string;
    size?: string;
    error?: {
      code?: string;
      message?: string;
    };
  }>;
  error?: {
    code?: string;
    message?: string;
  };
};

const isSeedreamT2IModel = (model: string) => SEEDREAM_T2I_MODELS.has(model);

const normalizeDimension = (value: number) => {
  if (!Number.isFinite(value)) {
    return 1024;
  }

  return Math.max(256, Math.round(value));
};

const toSeedreamSize = (request: GenerationRequest) =>
  `${normalizeDimension(request.width)}x${normalizeDimension(request.height)}`;

const inferMimeTypeFromBase64 = (dataBase64: string) => {
  if (dataBase64.startsWith("/9j/")) {
    return "image/jpeg";
  }
  if (dataBase64.startsWith("iVBOR")) {
    return "image/png";
  }
  if (dataBase64.startsWith("UklGR")) {
    return "image/webp";
  }

  return "image/png";
};

const truncateText = (value: string, maxLength = 260) =>
  value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;

const buildRequestSummary = ({
  request,
  prompt,
  size,
  hasReferenceImage,
}: {
  request: GenerationRequest;
  prompt: string;
  size: string;
  hasReferenceImage: boolean;
}) =>
  [
    "provider=jimeng",
    `model=${request.model}`,
    `尺寸=${size}`,
    `prompt长度=${prompt.length}`,
    `prompt预览=${truncateText(prompt || "空", 80)}`,
    `引用=${hasReferenceImage ? "已启用" : "未启用"}`,
    `引用元素=${request.reference?.enabled ? request.reference.elementCount : 0}`,
    `引用文字=${request.reference?.enabled ? request.reference.textCount : 0}`,
  ].join(" ");

const buildLoggedRequestBody = (
  requestBody: Record<string, unknown>,
  image:
    | {
        mimeType: string;
        dataBase64: string;
      }
    | null,
) => {
  if (!image) {
    return requestBody;
  }

  const byteLength = Buffer.from(image.dataBase64, "base64").byteLength;

  return {
    ...requestBody,
    image: {
      kind: "data-uri",
      mimeType: image.mimeType,
      byteLength,
      base64Prefix: image.dataBase64.slice(0, 96),
      base64Suffix: image.dataBase64.slice(-32),
    },
  };
};

const imageFromUrl = async (url: string, index: number) => {
  const response = await fetch(url);
  if ("ok" in response && !response.ok) {
    throw new Error(`即梦图片下载失败：${response.status}`);
  }
  const imageBuffer = Buffer.from(await response.arrayBuffer());
  const mimeType =
    response.headers?.get?.("content-type") ||
    inferMimeTypeFromBase64(imageBuffer.toString("base64"));

  return buildImagePayload({
    dataBase64: imageBuffer.toString("base64"),
    mimeType,
    fileName: buildOutputFileName("jimeng", index, mimeType),
  });
};

const imageFromBase64 = (dataBase64: string, index: number) => {
  const mimeType = inferMimeTypeFromBase64(dataBase64);

  return buildImagePayload({
    dataBase64,
    mimeType,
    fileName: buildOutputFileName("jimeng", index, mimeType),
  });
};

export const generateJimengImages = async ({
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
  const uploadReferenceImage = prepareReferenceImageForUpload(reference);
  const size = toSeedreamSize(request);
  const isT2I = isSeedreamT2IModel(request.model);
  const imageDataUri =
    !isT2I && uploadReferenceImage
      ? toDataUri(uploadReferenceImage.mimeType, uploadReferenceImage.dataBase64)
      : undefined;

  const requestBody = {
    model: request.model,
    prompt,
    size,
    response_format: "b64_json",
    watermark: false,
    ...(!isT2I ? { sequential_image_generation: "disabled" } : {}),
    ...(imageDataUri ? { image: imageDataUri } : {}),
    ...(isT2I && request.seed !== null && request.seed !== undefined
      ? { seed: request.seed }
      : {}),
  };
  const requestSummary = buildRequestSummary({
    request,
    prompt,
    size,
    hasReferenceImage: Boolean(imageDataUri),
  });
  const requestPayload = JSON.stringify(
    {
      url: ARK_IMAGE_GENERATIONS_URL,
      body: buildLoggedRequestBody(requestBody, uploadReferenceImage),
    },
    null,
    2,
  );

  try {
    const response = await fetch(ARK_IMAGE_GENERATIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText =
        typeof response.text === "function" ? await response.text() : "";
      throw new Error(
        `即梦/Seedream 请求失败：${response.status}${
          errorText ? ` ${truncateText(errorText)}` : ""
        }`,
      );
    }

    const data = (await response.json()) as JimengImageGenerationResponse;
    if (data.error) {
      throw new Error(
        `即梦/Seedream 返回错误：${[data.error.code, data.error.message]
          .filter(Boolean)
          .join(" ")}`,
      );
    }

    const images = await Promise.all(
      (data.data || []).map(async (item, index) => {
        if (item.error) {
          throw new Error(
            `即梦/Seedream 图片生成失败：${[item.error.code, item.error.message]
              .filter(Boolean)
              .join(" ")}`,
          );
        }
        if (item.b64_json) {
          return imageFromBase64(item.b64_json, index);
        }
        if (item.url) {
          return imageFromUrl(item.url, index);
        }
        throw new Error("即梦/Seedream 返回了空图片项。");
      }),
    );

    if (!images.length) {
      throw new Error("即梦/Seedream 没有返回图片。");
    }

    const generationResponse: GenerationResponse = {
      provider: "jimeng",
      model: request.model,
      seed: isT2I ? request.seed ?? null : null,
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
