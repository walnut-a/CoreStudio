import { GoogleGenAI } from "@google/genai";

import {
  getAspectRatioOptions,
  getProviderRequestAdapter,
  getRequestAspectRatioOption,
} from "../../src/shared/providerCatalog";
import type {
  CustomProviderModel,
  GenerationRequest,
  GenerationResponse,
  ProviderRequestAdapter,
} from "../../src/shared/providerTypes";

import { writeGenerationLog } from "../generationLogs";
import {
  appendRequestSummaryToError,
  buildGenerateContentRequestPayload,
  buildGenerateContentRequestSummary,
  buildImagePayload,
  buildOutputFileName,
  ensureGenerateContentImages,
  getExplicitAspectRatio,
  prepareReferenceImageForUpload,
  toClosestGeminiAspectRatio,
} from "./providerUtils";
import {
  buildPromptWithReferenceNotes,
  getEnabledReference,
} from "./promptUtils";

const ZENMUX_VERTEX_BASE_URL = "https://zenmux.ai/api/vertex-ai";

const truncateText = (value: string, maxLength = 260) =>
  value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;

const getZenMuxImageOption = (
  request: GenerationRequest,
  customModels: readonly CustomProviderModel[] = [],
) =>
  getRequestAspectRatioOption(
    request,
    getAspectRatioOptions({
      provider: "zenmux",
      model: request.model,
      customModels,
    }),
  );

const getZenMuxVertexPredictEndpoint = (model: string) => {
  const trimmedModel = model.trim();
  const [publisher, ...modelParts] = trimmedModel.split("/");
  const modelId = modelParts.join("/");

  if (!publisher || !modelId) {
    return `${ZENMUX_VERTEX_BASE_URL}/v1/models/${trimmedModel}:predict`;
  }

  return `${ZENMUX_VERTEX_BASE_URL}/v1/publishers/${publisher}/models/${modelId}:predict`;
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

const imageFromBase64 = (
  dataBase64: string,
  index: number,
  mimeType = inferMimeTypeFromBase64(dataBase64),
) => {
  return buildImagePayload({
    dataBase64,
    mimeType,
    fileName: buildOutputFileName("zenmux", index, mimeType),
  });
};

type ZenMuxVertexImagePrediction = {
  bytesBase64Encoded?: string;
  imageBytes?: string;
  mimeType?: string;
  raiFilteredReason?: string;
  image?: {
    bytesBase64Encoded?: string;
    imageBytes?: string;
    mimeType?: string;
  };
};

type ZenMuxVertexPredictResponse = {
  predictions?: ZenMuxVertexImagePrediction[];
  error?: {
    code?: string;
    type?: string;
    message?: string;
  };
};

const ensureZenMuxGeneratedImages = (data: ZenMuxVertexPredictResponse) => {
  if (data.error) {
    throw new Error(
      `ZenMux 返回错误：${[data.error.code, data.error.type, data.error.message]
        .filter(Boolean)
        .join(" ")}`,
    );
  }

  const images = (data.predictions || []).flatMap((item, index) => {
    const dataBase64 =
      item.bytesBase64Encoded ||
      item.imageBytes ||
      item.image?.bytesBase64Encoded ||
      item.image?.imageBytes;
    if (!dataBase64) {
      return [];
    }

    const mimeType =
      item.mimeType ||
      item.image?.mimeType ||
      inferMimeTypeFromBase64(dataBase64);
    return [imageFromBase64(dataBase64, index, mimeType)];
  });

  if (!images.length) {
    const filteredReasons = (data.predictions || [])
      .map((item) => item.raiFilteredReason)
      .filter(Boolean)
      .join("；");
    throw new Error(
      `ZenMux 没有返回图片${
        filteredReasons ? `，过滤原因：${filteredReasons}` : ""
      }。`,
    );
  }

  return images;
};

const createZenMuxVertexClient = (apiKey: string) =>
  new GoogleGenAI({
    apiKey,
    vertexai: true,
    httpOptions: {
      baseUrl: ZENMUX_VERTEX_BASE_URL,
      apiVersion: "v1",
    },
  });

const summarizeBase64Image = ({
  mimeType,
  dataBase64,
}: {
  mimeType: string;
  dataBase64: string;
}) => ({
  mimeType,
  byteLength: Buffer.from(dataBase64, "base64").byteLength,
  base64Prefix: dataBase64.slice(0, 96),
  base64Suffix: dataBase64.slice(-32),
});

const buildZenMuxVertexImageRequestSummary = ({
  request,
  prompt,
  operation,
  adapter,
  aspectRatio,
  size,
  hasReferenceImage,
}: {
  request: GenerationRequest;
  prompt: string;
  operation: "generateImages" | "editImage";
  adapter: ProviderRequestAdapter;
  aspectRatio: string | null;
  size: string | null;
  hasReferenceImage: boolean;
}) =>
  [
    "provider=zenmux",
    `model=${request.model}`,
    `endpoint=${getZenMuxVertexPredictEndpoint(request.model)}`,
    `operation=${operation}`,
    `adapter=${adapter}`,
    `尺寸=${request.width}x${request.height}`,
    `aspectRatio=${aspectRatio || "自动"}`,
    `size=${size || "自动"}`,
    `prompt长度=${prompt.length}`,
    `prompt预览=${truncateText(prompt || "空", 80)}`,
    `引用=${hasReferenceImage ? "已启用" : "未启用"}`,
  ].join(" ");

const buildZenMuxVertexImageRequestPayload = ({
  request,
  prompt,
  operation,
  aspectRatio,
  size,
  selectedSize,
  image,
}: {
  request: GenerationRequest;
  prompt: string;
  operation: "generateImages" | "editImage";
  aspectRatio: string | null;
  size: string | null;
  selectedSize: {
    width: number;
    height: number;
  } | null;
  image: {
    mimeType: string;
    dataBase64: string;
  } | null;
}) => {
  return JSON.stringify(
    {
      provider: request.provider,
      model: request.model,
      endpoint: getZenMuxVertexPredictEndpoint(request.model),
      operation,
      prompt,
      size: {
        requested: {
          aspectRatio: request.aspectRatio ?? null,
          width: request.width,
          height: request.height,
        },
        selected: selectedSize
          ? {
              ...selectedSize,
              aspectRatio,
            }
          : null,
      },
      config: {
        numberOfImages: 1,
        ...(size ? { imageSize: size } : {}),
      },
      reference: image
        ? {
            kind: "RawReferenceImage",
            referenceId: 1,
            referenceImage: summarizeBase64Image(image),
          }
        : null,
    },
    null,
    2,
  );
};

const buildZenMuxVertexPredictBody = ({
  prompt,
  aspectRatio,
  size,
  image,
}: {
  prompt: string;
  aspectRatio: string | null;
  size: string | null;
  image: {
    mimeType: string;
    dataBase64: string;
  } | null;
}) => ({
  instances: [
    {
      prompt,
      ...(image
        ? {
            referenceImages: [
              {
                referenceImage: {
                  bytesBase64Encoded: image.dataBase64,
                  mimeType: image.mimeType,
                },
                referenceId: 1,
                referenceType: "REFERENCE_TYPE_RAW",
              },
            ],
          }
        : {}),
    },
  ],
  parameters: {
    sampleCount: 1,
    ...(size ? { sampleImageSize: size } : {}),
    outputOptions: {
      mimeType: "image/png",
    },
  },
});

const generateZenMuxOpenAICompatibleImages = async ({
  apiKey,
  request,
  projectPath,
  adapter,
  customModels = [],
}: {
  apiKey: string;
  request: GenerationRequest;
  projectPath?: string | null;
  adapter: ProviderRequestAdapter;
  customModels?: readonly CustomProviderModel[];
}): Promise<GenerationResponse> => {
  const createdAt = new Date().toISOString();
  const prompt = buildPromptWithReferenceNotes(request);
  const reference = getEnabledReference(request);
  const uploadReferenceImage = prepareReferenceImageForUpload(reference);
  const selectedSize = getZenMuxImageOption(request, customModels);
  const aspectRatio = selectedSize?.id ?? null;
  const size = selectedSize
    ? `${selectedSize.width}x${selectedSize.height}`
    : null;
  const operation = uploadReferenceImage ? "editImage" : "generateImages";
  const requestSummary = buildZenMuxVertexImageRequestSummary({
    request,
    prompt,
    operation,
    adapter,
    aspectRatio,
    size,
    hasReferenceImage: Boolean(uploadReferenceImage),
  });
  const requestPayload = buildZenMuxVertexImageRequestPayload({
    request,
    prompt,
    operation,
    aspectRatio,
    size,
    selectedSize,
    image: uploadReferenceImage,
  });
  const endpoint = getZenMuxVertexPredictEndpoint(request.model);
  const body = buildZenMuxVertexPredictBody({
    prompt,
    aspectRatio,
    size,
    image: uploadReferenceImage,
  });

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText =
        typeof response.text === "function" ? await response.text() : "";
      throw new Error(
        `ZenMux 请求失败：${response.status}${
          errorText ? ` ${truncateText(errorText)}` : ""
        }`,
      );
    }

    const images = ensureZenMuxGeneratedImages(
      (await response.json()) as ZenMuxVertexPredictResponse,
    );
    const generationResponse: GenerationResponse = {
      provider: "zenmux",
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

export const generateZenMuxImages = async ({
  apiKey,
  request,
  projectPath,
  customModels = [],
}: {
  apiKey: string;
  request: GenerationRequest;
  projectPath?: string | null;
  customModels?: readonly CustomProviderModel[];
}): Promise<GenerationResponse> => {
  const adapter = getProviderRequestAdapter({
    provider: "zenmux",
    model: request.model,
    customModels,
  });

  if (adapter === "zenmux-vertex-gpt-image") {
    return generateZenMuxOpenAICompatibleImages({
      apiKey,
      request,
      projectPath,
      adapter,
      customModels,
    });
  }

  if (adapter !== "zenmux-vertex-generate-content") {
    throw new Error(`ZenMux 暂不支持这个接口格式：${adapter}`);
  }

  const client = createZenMuxVertexClient(apiKey);

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
  const explicitAspectRatio = getExplicitAspectRatio(request);
  const geminiAspectRatio =
    explicitAspectRatio === undefined
      ? toClosestGeminiAspectRatio(request.width, request.height)
      : explicitAspectRatio;
  const config: {
    responseModalities: string[];
    imageConfig?: {
      aspectRatio?: string;
    };
  } = {
    responseModalities: ["TEXT", "IMAGE"],
    ...(geminiAspectRatio
      ? {
          imageConfig: {
            aspectRatio: geminiAspectRatio,
          },
        }
      : {}),
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
