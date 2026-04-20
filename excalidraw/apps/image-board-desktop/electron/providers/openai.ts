import {
  getAspectRatioOptions,
  getClosestAspectRatioOption,
} from "../../src/shared/providerCatalog";
import type { GenerationRequest, GenerationResponse } from "../../src/shared/providerTypes";

import { writeGenerationLog } from "../generationLogs";
import {
  appendRequestSummaryToError,
  buildImagePayload,
  buildOutputFileName,
  clampImageCount,
  prepareReferenceImageForUpload,
} from "./providerUtils";
import {
  buildPromptWithReferenceNotes,
  getEnabledReference,
} from "./promptUtils";

const OPENAI_IMAGE_GENERATIONS_URL =
  "https://api.openai.com/v1/images/generations";
const OPENAI_IMAGE_EDITS_URL = "https://api.openai.com/v1/images/edits";

type OpenAIImageResponse = {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
  error?: {
    code?: string;
    message?: string;
  };
};

const truncateText = (value: string, maxLength = 260) =>
  value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;

const toOpenAIImageSize = (request: GenerationRequest) => {
  const option = getClosestAspectRatioOption(
    request.width,
    request.height,
    getAspectRatioOptions({
      provider: "openai",
      model: request.model,
    }),
  );

  return `${option.width}x${option.height}`;
};

const inferMimeTypeFromBase64 = (dataBase64: string) => {
  if (dataBase64.startsWith("/9j/")) {
    return "image/jpeg";
  }
  if (dataBase64.startsWith("UklGR")) {
    return "image/webp";
  }
  return "image/png";
};

const imageFromBase64 = (dataBase64: string, index: number) => {
  const mimeType = inferMimeTypeFromBase64(dataBase64);
  return buildImagePayload({
    dataBase64,
    mimeType,
    fileName: buildOutputFileName("openai", index, mimeType),
  });
};

const imageFromUrl = async (url: string, index: number) => {
  const response = await fetch(url);
  if ("ok" in response && !response.ok) {
    throw new Error(`OpenAI 图片下载失败：${response.status}`);
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer());
  const dataBase64 = imageBuffer.toString("base64");
  const mimeType =
    response.headers?.get?.("content-type") || inferMimeTypeFromBase64(dataBase64);

  return buildImagePayload({
    dataBase64,
    mimeType,
    fileName: buildOutputFileName("openai", index, mimeType),
  });
};

const createImageBlob = (mimeType: string, dataBase64: string) => {
  const buffer = Buffer.from(dataBase64, "base64");
  return new Blob([new Uint8Array(buffer)], { type: mimeType });
};

const buildRequestSummary = ({
  endpoint,
  request,
  prompt,
  size,
  hasReferenceImage,
}: {
  endpoint: string;
  request: GenerationRequest;
  prompt: string;
  size: string;
  hasReferenceImage: boolean;
}) =>
  [
    "provider=openai",
    `model=${request.model}`,
    `endpoint=${endpoint}`,
    `尺寸=${size}`,
    `数量=${request.imageCount}`,
    `prompt长度=${prompt.length}`,
    `prompt预览=${truncateText(prompt || "空", 80)}`,
    `引用=${hasReferenceImage ? "已启用" : "未启用"}`,
  ].join(" ");

const buildLoggedMultipartPayload = ({
  endpoint,
  model,
  prompt,
  size,
  image,
}: {
  endpoint: string;
  model: string;
  prompt: string;
  size: string;
  image: {
    mimeType: string;
    dataBase64: string;
  };
}) =>
  JSON.stringify(
    {
      endpoint,
      body: {
        model,
        prompt,
        size,
        output_format: "png",
        image: {
          kind: "multipart-file",
          mimeType: image.mimeType,
          byteLength: Buffer.from(image.dataBase64, "base64").byteLength,
          base64Prefix: image.dataBase64.slice(0, 96),
          base64Suffix: image.dataBase64.slice(-32),
        },
      },
    },
    null,
    2,
  );

const ensureOpenAIImages = async (data: OpenAIImageResponse) => {
  if (data.error) {
    throw new Error(
      `OpenAI 返回错误：${[data.error.code, data.error.message]
        .filter(Boolean)
        .join(" ")}`,
    );
  }

  const images = await Promise.all(
    (data.data || []).map((item, index) => {
      if (item.b64_json) {
        return imageFromBase64(item.b64_json, index);
      }
      if (item.url) {
        return imageFromUrl(item.url, index);
      }
      throw new Error("OpenAI 返回了空图片项。");
    }),
  );

  if (!images.length) {
    throw new Error("OpenAI 没有返回图片。");
  }

  return images;
};

export const generateOpenAIImages = async ({
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
  const size = toOpenAIImageSize(request);
  const imageCount = clampImageCount(request, 4);
  const endpoint = uploadReferenceImage
    ? OPENAI_IMAGE_EDITS_URL
    : OPENAI_IMAGE_GENERATIONS_URL;
  const requestSummary = buildRequestSummary({
    endpoint,
    request,
    prompt,
    size,
    hasReferenceImage: Boolean(uploadReferenceImage),
  });

  const requestPayload = uploadReferenceImage
    ? buildLoggedMultipartPayload({
        endpoint,
        model: request.model,
        prompt,
        size,
        image: uploadReferenceImage,
      })
    : JSON.stringify(
        {
          endpoint,
          body: {
            model: request.model,
            prompt,
            size,
            output_format: "png",
            ...(imageCount > 1 ? { n: imageCount } : {}),
          },
        },
        null,
        2,
      );

  try {
    const response = uploadReferenceImage
      ? await fetch(OPENAI_IMAGE_EDITS_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          body: (() => {
            const formData = new FormData();
            formData.set("model", request.model);
            formData.set("prompt", prompt);
            formData.set("size", size);
            formData.set("output_format", "png");
            if (imageCount > 1) {
              formData.set("n", String(imageCount));
            }
            formData.set(
              "image",
              createImageBlob(
                uploadReferenceImage.mimeType,
                uploadReferenceImage.dataBase64,
              ),
              "reference.png",
            );
            return formData;
          })(),
        })
      : await fetch(OPENAI_IMAGE_GENERATIONS_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: request.model,
            prompt,
            size,
            output_format: "png",
            ...(imageCount > 1 ? { n: imageCount } : {}),
          }),
        });

    if (!response.ok) {
      const errorText =
        typeof response.text === "function" ? await response.text() : "";
      throw new Error(
        `OpenAI 请求失败：${response.status}${
          errorText ? ` ${truncateText(errorText)}` : ""
        }`,
      );
    }

    const images = await ensureOpenAIImages(
      (await response.json()) as OpenAIImageResponse,
    );

    const generationResponse: GenerationResponse = {
      provider: "openai",
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
