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
  buildImagePayload,
  buildOutputFileName,
  prepareReferenceImageForUpload,
} from "./providerUtils";
import {
  buildPromptWithReferenceNotes,
  getEnabledReference,
  toDataUri,
} from "./promptUtils";

const OPENROUTER_CHAT_COMPLETIONS_URL =
  "https://openrouter.ai/api/v1/chat/completions";

type OpenRouterImageResponse = {
  choices?: Array<{
    message?: {
      content?: string;
      images?: Array<{
        image_url?: {
          url?: string;
        };
        imageUrl?: {
          url?: string;
        };
      }>;
    };
  }>;
  error?: {
    code?: string;
    message?: string;
  };
};

const IMAGE_ONLY_MODEL_PREFIXES = ["black-forest-labs/", "sourceful/"];

const DATA_URL_PATTERN = /^data:([^;]+);base64,(.+)$/;

const truncateText = (value: string, maxLength = 260) =>
  value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;

const isImageOnlyModel = (model: string) =>
  IMAGE_ONLY_MODEL_PREFIXES.some((prefix) => model.startsWith(prefix));

const toOpenRouterAspectRatio = (
  request: GenerationRequest,
  customModels: readonly CustomProviderModel[] = [],
) =>
  getRequestAspectRatioOption(
    request,
    getAspectRatioOptions({
      provider: "openrouter",
      model: request.model,
      customModels,
    }),
  )?.id ?? null;

const toOpenRouterImageSize = (request: GenerationRequest) => {
  const longestEdge = Math.max(request.width, request.height);

  if (
    request.model === "google/gemini-3.1-flash-image-preview" &&
    longestEdge < 768
  ) {
    return "0.5K";
  }
  if (longestEdge > 3072) {
    return "4K";
  }
  if (longestEdge > 1536) {
    return "2K";
  }
  return "1K";
};

const imageFromDataUrl = (dataUrl: string, index: number) => {
  const match = dataUrl.match(DATA_URL_PATTERN);
  if (!match) {
    throw new Error("OpenRouter 返回的图片不是 base64 data URL。");
  }

  const [, mimeType, dataBase64] = match;
  return buildImagePayload({
    dataBase64,
    mimeType,
    fileName: buildOutputFileName("openrouter", index, mimeType),
  });
};

const imageFromUrl = async (url: string, index: number) => {
  const response = await fetch(url);
  if ("ok" in response && !response.ok) {
    throw new Error(`OpenRouter 图片下载失败：${response.status}`);
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer());
  const mimeType = response.headers?.get?.("content-type") || "image/png";

  return buildImagePayload({
    dataBase64: imageBuffer.toString("base64"),
    mimeType,
    fileName: buildOutputFileName("openrouter", index, mimeType),
  });
};

const buildMessageContent = ({
  prompt,
  image,
}: {
  prompt: string;
  image: {
    mimeType: string;
    dataBase64: string;
  } | null;
}) => {
  if (!image) {
    return prompt;
  }

  return [
    {
      type: "text",
      text: prompt,
    },
    {
      type: "image_url",
      image_url: {
        url: toDataUri(image.mimeType, image.dataBase64),
      },
    },
  ];
};

const buildRequestSummary = ({
  request,
  prompt,
  adapter,
  aspectRatio,
  imageSize,
  hasReferenceImage,
}: {
  request: GenerationRequest;
  prompt: string;
  adapter: ProviderRequestAdapter;
  aspectRatio: string | null;
  imageSize: string | null;
  hasReferenceImage: boolean;
}) =>
  [
    "provider=openrouter",
    `model=${request.model}`,
    `adapter=${adapter}`,
    `比例=${aspectRatio || "自动"}`,
    `分辨率=${imageSize || "自动"}`,
    `prompt长度=${prompt.length}`,
    `prompt预览=${truncateText(prompt || "空", 80)}`,
    `引用=${hasReferenceImage ? "已启用" : "未启用"}`,
  ].join(" ");

const buildLoggedRequestPayload = ({
  adapter,
  requestBody,
  image,
}: {
  adapter: ProviderRequestAdapter;
  requestBody: Record<string, unknown>;
  image: {
    mimeType: string;
    dataBase64: string;
  } | null;
}) => {
  if (!image) {
    return JSON.stringify(
      {
        url: OPENROUTER_CHAT_COMPLETIONS_URL,
        adapter,
        body: requestBody,
      },
      null,
      2,
    );
  }

  return JSON.stringify(
    {
      url: OPENROUTER_CHAT_COMPLETIONS_URL,
      adapter,
      body: {
        ...requestBody,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "见 prompt 字段",
              },
              {
                type: "image_url",
                image_url: {
                  kind: "data-uri",
                  mimeType: image.mimeType,
                  byteLength: Buffer.from(image.dataBase64, "base64")
                    .byteLength,
                  base64Prefix: image.dataBase64.slice(0, 96),
                  base64Suffix: image.dataBase64.slice(-32),
                },
              },
            ],
          },
        ],
      },
    },
    null,
    2,
  );
};

const ensureOpenRouterImages = async (data: OpenRouterImageResponse) => {
  if (data.error) {
    throw new Error(
      `OpenRouter 返回错误：${[data.error.code, data.error.message]
        .filter(Boolean)
        .join(" ")}`,
    );
  }

  const imageUrls =
    data.choices
      ?.flatMap((choice) => choice.message?.images || [])
      .map((image) => image.image_url?.url || image.imageUrl?.url)
      .filter((url): url is string => Boolean(url)) || [];

  const images = await Promise.all(
    imageUrls.map((url, index) =>
      url.startsWith("data:")
        ? imageFromDataUrl(url, index)
        : imageFromUrl(url, index),
    ),
  );

  if (!images.length) {
    const textSummary =
      data.choices
        ?.map((choice) => choice.message?.content || "")
        .filter(Boolean)
        .join(" ")
        .trim() || "无";
    throw new Error(
      `OpenRouter 没有返回图片。文本摘要：${truncateText(textSummary)}`,
    );
  }

  return images;
};

export const generateOpenRouterImages = async ({
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
    provider: "openrouter",
    model: request.model,
    customModels,
  });

  if (adapter !== "openrouter-chat-image") {
    throw new Error(`OpenRouter 暂不支持这个接口格式：${adapter}`);
  }

  const createdAt = new Date().toISOString();
  const prompt = buildPromptWithReferenceNotes(request);
  const reference = getEnabledReference(request);
  const uploadReferenceImage = prepareReferenceImageForUpload(reference);
  const aspectRatio = toOpenRouterAspectRatio(request, customModels);
  const imageSize = aspectRatio ? toOpenRouterImageSize(request) : null;
  const requestBody = {
    model: request.model,
    messages: [
      {
        role: "user",
        content: buildMessageContent({
          prompt,
          image: uploadReferenceImage,
        }),
      },
    ],
    modalities: isImageOnlyModel(request.model) ? ["image"] : ["image", "text"],
    stream: false,
    ...(aspectRatio
      ? {
          image_config: {
            aspect_ratio: aspectRatio,
            image_size: imageSize,
          },
        }
      : {}),
  };
  const requestSummary = buildRequestSummary({
    request,
    prompt,
    adapter,
    aspectRatio,
    imageSize,
    hasReferenceImage: Boolean(uploadReferenceImage),
  });
  const requestPayload = buildLoggedRequestPayload({
    adapter,
    requestBody,
    image: uploadReferenceImage,
  });

  try {
    const response = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://excalidraw-image-board.local",
        "X-Title": "CoreStudio Image Board",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText =
        typeof response.text === "function" ? await response.text() : "";
      throw new Error(
        `OpenRouter 请求失败：${response.status}${
          errorText ? ` ${truncateText(errorText)}` : ""
        }`,
      );
    }

    const images = await ensureOpenRouterImages(
      (await response.json()) as OpenRouterImageResponse,
    );

    const generationResponse: GenerationResponse = {
      provider: "openrouter",
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
