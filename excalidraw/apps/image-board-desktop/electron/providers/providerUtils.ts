import { createHash } from "node:crypto";
import { nativeImage } from "electron";
import type { GoogleGenAI } from "@google/genai";

import type {
  GenerationReferencePayload,
  GenerationRequest,
  ProviderImagePayload,
} from "../../src/shared/providerTypes";

const GEMINI_ASPECT_RATIOS = [
  { label: "1:1", ratio: 1 },
  { label: "16:9", ratio: 16 / 9 },
  { label: "9:16", ratio: 9 / 16 },
  { label: "4:3", ratio: 4 / 3 },
  { label: "3:4", ratio: 3 / 4 },
  { label: "3:2", ratio: 3 / 2 },
  { label: "2:3", ratio: 2 / 3 },
  { label: "5:4", ratio: 5 / 4 },
  { label: "4:5", ratio: 4 / 5 },
  { label: "21:9", ratio: 21 / 9 },
  { label: "4:1", ratio: 4 },
  { label: "1:4", ratio: 1 / 4 },
  { label: "8:1", ratio: 8 },
  { label: "1:8", ratio: 1 / 8 },
];

export const getExplicitAspectRatio = (request: GenerationRequest) =>
  request.aspectRatio === null ? null : request.aspectRatio;

export const toClosestGeminiAspectRatio = (width: number, height: number) => {
  const targetRatio = width / height;
  return GEMINI_ASPECT_RATIOS.reduce((best, candidate) =>
    Math.abs(candidate.ratio - targetRatio) <
    Math.abs(best.ratio - targetRatio)
      ? candidate
      : best,
  ).label;
};

export const toFalImageSize = (width: number, height: number) => ({
  width,
  height,
});

export const getImageDimensionsFromBase64 = (dataBase64: string) => {
  const image = nativeImage.createFromBuffer(Buffer.from(dataBase64, "base64"));
  const size = image.getSize();
  return {
    width: size.width || 1024,
    height: size.height || 1024,
  };
};

export const buildImagePayload = ({
  dataBase64,
  mimeType = "image/png",
  fileName,
}: {
  dataBase64: string;
  mimeType?: string;
  fileName: string;
}): ProviderImagePayload => {
  const size = getImageDimensionsFromBase64(dataBase64);
  return {
    fileName,
    mimeType,
    dataBase64,
    width: size.width,
    height: size.height,
  };
};

export const buildOutputFileName = (
  providerPrefix: string,
  index: number,
  mimeType = "image/png",
) => {
  const extension = mimeType === "image/jpeg" ? "jpg" : "png";
  return `${providerPrefix}-${Date.now()}-${index + 1}.${extension}`;
};

export const clampImageCount = (request: GenerationRequest, maxImageCount: number) =>
  Math.max(1, Math.min(request.imageCount, maxImageCount));

export interface PreparedReferenceImagePayload {
  mimeType: string;
  dataBase64: string;
  uploadMode: "original" | "normalized-png";
}

const buildBinaryDebugPayload = ({
  mimeType,
  dataBase64,
  uploadMode,
}: {
  mimeType: string;
  dataBase64: string;
  uploadMode?: PreparedReferenceImagePayload["uploadMode"];
}) => {
  const buffer = Buffer.from(dataBase64, "base64");
  const dimensions = getImageDimensionsFromBase64(dataBase64);

  return {
    mimeType,
    width: dimensions.width,
    height: dimensions.height,
    byteLength: buffer.byteLength,
    sha256: createHash("sha256").update(dataBase64).digest("hex"),
    magic: buffer.subarray(0, 8).toString("hex") || "无",
    ...(uploadMode ? { uploadMode } : {}),
    base64Prefix: dataBase64.slice(0, 96),
    base64Suffix: dataBase64.slice(-32),
  };
};

export const extractGenerateContentImages = ({
  response,
  providerPrefix,
}: {
  response: Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>;
  providerPrefix: string;
}): ProviderImagePayload[] => {
  const parts = (response.candidates || []).flatMap(
    (candidate) => candidate.content?.parts || [],
  );
  const inlineParts = parts.filter((part) => part.inlineData?.data);

  if (inlineParts.length > 0) {
    return inlineParts.map((part, index) =>
      buildImagePayload({
        dataBase64: part.inlineData!.data!,
        mimeType: part.inlineData?.mimeType || "image/png",
        fileName: buildOutputFileName(
          providerPrefix,
          index,
          part.inlineData?.mimeType || "image/png",
        ),
      }),
    );
  }

  if (typeof response.data === "string" && response.data.length > 0) {
    return [
      buildImagePayload({
        dataBase64: response.data,
        fileName: buildOutputFileName(providerPrefix, 0),
      }),
    ];
  }

  return [];
};

const truncateText = (value: string, maxLength = 200) =>
  value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;

const summarizeReferenceImage = (
  reference: GenerationReferencePayload | null | undefined,
) => {
  if (!reference?.image) {
    return "无";
  }

  const byteLength = Buffer.from(reference.image.dataBase64, "base64").byteLength;
  const digest = createHash("sha256")
    .update(reference.image.dataBase64)
    .digest("hex")
    .slice(0, 12);
  const size = getImageDimensionsFromBase64(reference.image.dataBase64);

  return [
    reference.image.mimeType,
    `${size.width}x${size.height}`,
    `${byteLength}B`,
    `sha256=${digest}`,
    `magic=${Buffer.from(reference.image.dataBase64, "base64")
      .subarray(0, 8)
      .toString("hex") || "无"}`,
  ].join("/");
};

const summarizePreparedReferenceImage = (
  image: PreparedReferenceImagePayload | null | undefined,
) => {
  if (!image) {
    return "无";
  }

  const byteLength = Buffer.from(image.dataBase64, "base64").byteLength;
  const digest = createHash("sha256")
    .update(image.dataBase64)
    .digest("hex")
    .slice(0, 12);
  const size = getImageDimensionsFromBase64(image.dataBase64);

  return [
    image.uploadMode,
    image.mimeType,
    `${size.width}x${size.height}`,
    `${byteLength}B`,
    `sha256=${digest}`,
    `magic=${Buffer.from(image.dataBase64, "base64")
      .subarray(0, 8)
      .toString("hex") || "无"}`,
  ].join("/");
};

const summarizeReferenceSource = (
  reference: GenerationReferencePayload | null | undefined,
) => {
  if (!reference?.debug?.sourceType) {
    return "无";
  }

  return [
    reference.debug.sourceType,
    reference.debug.sourceProvider || "无",
    reference.debug.sourceModel || "无",
    `parent=${reference.debug.parentFileId || "无"}`,
  ].join("/");
};

const summarizeContents = (contents: unknown) => {
  if (typeof contents === "string") {
    return "text";
  }

  if (!Array.isArray(contents)) {
    return "unknown";
  }

  return contents
    .map((part) => {
      if (typeof part !== "object" || !part) {
        return "unknown";
      }

      const typedPart = part as {
        text?: string;
        inlineData?: { mimeType?: string; data?: string };
      };

      if (typeof typedPart.text === "string") {
        return "text";
      }

      if (typedPart.inlineData?.data) {
        return "inlineData";
      }

      return Object.keys(typedPart).sort().join("+") || "empty";
    })
    .join("+");
};

const summarizeConfig = (config: {
  responseModalities?: string[];
  imageConfig?: Record<string, unknown>;
}) => {
  const entries = [
    config.responseModalities?.length
      ? `responseModalities=${config.responseModalities.join("+")}`
      : null,
    ...Object.entries(config.imageConfig || {}).map(
      ([key, value]) => `${key}=${String(value)}`,
    ),
  ].filter(Boolean);

  return entries.join(" ");
};

export const buildGenerateContentRequestSummary = ({
  provider,
  request,
  prompt,
  contents,
  config,
  uploadReferenceImage,
}: {
  provider: GenerationRequest["provider"];
  request: GenerationRequest;
  prompt: string;
  contents: unknown;
  config: {
    responseModalities?: string[];
    imageConfig?: Record<string, unknown>;
  };
  uploadReferenceImage?: PreparedReferenceImagePayload | null;
}) => {
  const reference = request.reference?.enabled ? request.reference : null;

  return [
    `provider=${provider}`,
    `model=${request.model}`,
    `比例=${request.aspectRatio === null ? "自动" : request.aspectRatio || "按尺寸推断"}`,
    `尺寸=${request.width}x${request.height}`,
    `数量=${request.imageCount}`,
    `prompt长度=${prompt.length}`,
    `prompt预览=${truncateText(prompt || "空", 80)}`,
    `内容=${summarizeContents(contents)}`,
    `配置=${summarizeConfig(config) || "无"}`,
    `引用=${reference ? "已启用" : "未启用"}`,
    `引用元素=${reference?.elementCount ?? 0}`,
    `引用文字=${reference?.textCount ?? 0}`,
    `引用图片=${summarizeReferenceImage(reference)}`,
    `引用来源=${summarizeReferenceSource(reference)}`,
    `引用上传=${summarizePreparedReferenceImage(uploadReferenceImage)}`,
  ].join(" ");
};

export const buildGenerateContentRequestPayload = ({
  request,
  prompt,
  contents,
  config,
  uploadReferenceImage,
}: {
  request: GenerationRequest;
  prompt: string;
  contents: unknown;
  config: {
    responseModalities?: string[];
    imageConfig?: Record<string, unknown>;
  };
  uploadReferenceImage?: PreparedReferenceImagePayload | null;
}) => {
  const normalizedContents =
    typeof contents === "string"
      ? [
          {
            kind: "text",
            text: contents,
          },
        ]
      : Array.isArray(contents)
        ? contents.map((part) => {
            if (typeof part !== "object" || !part) {
              return {
                kind: "unknown",
                value: String(part),
              };
            }

            const typedPart = part as {
              text?: string;
              inlineData?: { mimeType?: string; data?: string };
            };

            if (typeof typedPart.text === "string") {
              return {
                kind: "text",
                text: typedPart.text,
              };
            }

            if (typedPart.inlineData?.data) {
              return {
                kind: "inlineData",
                ...buildBinaryDebugPayload({
                  mimeType: typedPart.inlineData.mimeType || "image/png",
                  dataBase64: typedPart.inlineData.data,
                  uploadMode: uploadReferenceImage?.uploadMode,
                }),
              };
            }

            return {
              kind: "unknown",
              keys: Object.keys(typedPart).sort(),
            };
          })
        : [
            {
              kind: "unknown",
              value: String(contents),
            },
          ];

  return JSON.stringify(
    {
      provider: request.provider,
      model: request.model,
      size: {
        aspectRatio: request.aspectRatio ?? null,
        width: request.width,
        height: request.height,
      },
      imageCount: request.imageCount,
      prompt,
      negativePrompt: request.negativePrompt || null,
      contents: normalizedContents,
      config,
      reference: request.reference?.enabled
        ? {
            enabled: true,
            elementCount: request.reference.elementCount,
            textCount: request.reference.textCount,
            textNotes: request.reference.textNotes || [],
            source: request.reference.debug || null,
            originalImage: request.reference.image
              ? buildBinaryDebugPayload({
                  mimeType: request.reference.image.mimeType,
                  dataBase64: request.reference.image.dataBase64,
                })
              : null,
            uploadedImage: uploadReferenceImage
              ? buildBinaryDebugPayload({
                  mimeType: uploadReferenceImage.mimeType,
                  dataBase64: uploadReferenceImage.dataBase64,
                  uploadMode: uploadReferenceImage.uploadMode,
                })
              : null,
          }
        : null,
    },
    null,
    2,
  );
};

export const prepareReferenceImageForUpload = (
  reference: GenerationReferencePayload | null | undefined,
): PreparedReferenceImagePayload | null => {
  if (!reference?.image) {
    return null;
  }

  if (reference.debug?.sourceType !== "generated") {
    return {
      mimeType: reference.image.mimeType,
      dataBase64: reference.image.dataBase64,
      uploadMode: "original",
    };
  }

  try {
    const normalizedBuffer = nativeImage
      .createFromBuffer(Buffer.from(reference.image.dataBase64, "base64"))
      .toPNG();

    if (normalizedBuffer.byteLength > 0) {
      return {
        mimeType: "image/png",
        dataBase64: normalizedBuffer.toString("base64"),
        uploadMode: "normalized-png",
      };
    }
  } catch {
    // 如果本地重新编码失败，就继续用原始图片，避免直接阻断生成。
  }

  return {
    mimeType: reference.image.mimeType,
    dataBase64: reference.image.dataBase64,
    uploadMode: "original",
  };
};

export const appendRequestSummaryToError = (
  error: unknown,
  requestSummary: string,
  requestPayload?: string,
) => {
  const nextError =
    error instanceof Error ? error : new Error(String(error || "未知错误"));

  if (!nextError.message.includes("请求摘要：")) {
    nextError.message = `${nextError.message} 请求摘要：${requestSummary}`;
  }

  if (requestPayload && !nextError.message.includes("请求载荷：")) {
    nextError.message = `${nextError.message}\n请求载荷：\n${requestPayload}`;
  }

  return nextError;
};

const summarizeSafetyRatings = (
  safetyRatings:
    | Array<{
        category?: string;
        probability?: string;
        blocked?: boolean;
      }>
    | undefined,
) => {
  if (!safetyRatings?.length) {
    return "无";
  }

  const blockedRatings = safetyRatings.filter((rating) => rating.blocked);
  const relevantRatings = blockedRatings.length ? blockedRatings : safetyRatings;

  return relevantRatings
    .map((rating) => {
      const parts = [rating.category, rating.probability].filter(Boolean);
      if (rating.blocked) {
        parts.push("blocked");
      }
      return parts.join("/");
    })
    .filter(Boolean)
    .join(", ");
};

export const ensureGenerateContentImages = ({
  response,
  providerPrefix,
  requestSummary,
  requestPayload,
}: {
  response: Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>;
  providerPrefix: string;
  requestSummary?: string;
  requestPayload?: string;
}) => {
  const images = extractGenerateContentImages({
    response,
    providerPrefix,
  });

  if (images.length > 0) {
    return images;
  }

  const candidateCount = response.candidates?.length ?? 0;
  const firstCandidate = response.candidates?.[0];
  const partKeys =
    response.candidates?.flatMap((candidate) =>
      (candidate.content?.parts || []).map((part) =>
        Object.keys(part).sort().join("+") || "empty",
      ),
    ) || [];
  const fallbackText = (response.candidates || [])
    .flatMap((candidate) => candidate.content?.parts || [])
    .map((part) => (typeof part.text === "string" ? part.text.trim() : ""))
    .filter(Boolean)
    .join(" ")
    .trim();
  const textSummary =
    typeof response.text === "string" && response.text.trim()
      ? truncateText(response.text.trim())
      : fallbackText
      ? truncateText(fallbackText)
      : "无";
  const finishReason = firstCandidate?.finishReason || "无";
  const finishMessage = firstCandidate?.finishMessage
    ? truncateText(firstCandidate.finishMessage)
    : "无";
  const safetySummary = summarizeSafetyRatings(firstCandidate?.safetyRatings);

  const message = [
    "模型没有返回图片。",
    `候选数：${candidateCount}`,
    `Part 类型：${partKeys.length ? partKeys.join(", ") : "无"}`,
    `data getter：${typeof response.data === "string" && response.data.length > 0 ? "有值" : "空"}`,
    `finishReason：${finishReason}`,
    `finishMessage：${finishMessage}`,
    `安全信息：${safetySummary}`,
    `文本摘要：${textSummary}`,
    requestSummary ? `请求摘要：${requestSummary}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  throw new Error(
    requestPayload ? `${message}\n请求载荷：\n${requestPayload}` : message,
  );
};
