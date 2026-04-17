import fs from "fs/promises";
import { createHash } from "node:crypto";
import path from "path";

import type { GenerationRequest, GenerationResponse, ProviderImagePayload } from "../src/shared/providerTypes";
import { PROJECT_FILENAMES } from "../src/shared/projectTypes";

const GENERATION_LOGS_DIR = "generation-logs";
const GENERATION_LOG_VERSION = 1;

const safeFileSegment = (value: string) =>
  value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 80) || "unknown";

const parseRequestPayload = (requestPayload: string | undefined) => {
  if (!requestPayload) {
    return null;
  }

  try {
    return JSON.parse(requestPayload);
  } catch {
    return requestPayload;
  }
};

const summarizeImage = (image: ProviderImagePayload) => {
  const buffer = Buffer.from(image.dataBase64, "base64");
  return {
    fileName: image.fileName,
    mimeType: image.mimeType,
    width: image.width,
    height: image.height,
    byteLength: buffer.byteLength,
    sha256: createHash("sha256").update(image.dataBase64).digest("hex"),
    magic: buffer.subarray(0, 8).toString("hex") || "无",
    base64Prefix: image.dataBase64.slice(0, 96),
    base64Suffix: image.dataBase64.slice(-32),
  };
};

const toSerializableError = (error: unknown) => {
  if (!error) {
    return null;
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack || null,
    };
  }

  return {
    message: String(error),
    stack: null,
  };
};

export const getGenerationLogsDirectory = (projectPath: string) =>
  path.join(projectPath, PROJECT_FILENAMES.exportsDir, GENERATION_LOGS_DIR);

export const writeGenerationLog = async ({
  projectPath,
  request,
  requestSummary,
  requestPayload,
  response,
  error,
}: {
  projectPath?: string | null;
  request: GenerationRequest;
  requestSummary?: string;
  requestPayload?: string;
  response?: GenerationResponse;
  error?: unknown;
}) => {
  if (!projectPath) {
    return null;
  }

  const logsDirectory = getGenerationLogsDirectory(projectPath);
  await fs.mkdir(logsDirectory, { recursive: true });

  const loggedAt = new Date().toISOString();
  const status = error ? "error" : "success";
  const fileName = [
    loggedAt.replace(/[:.]/g, "-"),
    safeFileSegment(request.provider),
    safeFileSegment(request.model),
    status,
  ].join("_") + ".json";
  const filePath = path.join(logsDirectory, fileName);

  const logContent = {
    formatVersion: GENERATION_LOG_VERSION,
    loggedAt,
    status,
    request: {
      provider: request.provider,
      model: request.model,
      width: request.width,
      height: request.height,
      imageCount: request.imageCount,
      prompt: request.prompt,
      negativePrompt: request.negativePrompt ?? null,
      summary: requestSummary || null,
      payload: parseRequestPayload(requestPayload),
    },
    response: response
      ? {
          provider: response.provider,
          model: response.model,
          seed: response.seed,
          createdAt: response.createdAt,
          images: response.images.map(summarizeImage),
        }
      : null,
    error: toSerializableError(error),
  };

  await fs.writeFile(filePath, JSON.stringify(logContent, null, 2), "utf8");
  console.log(`[generation-log] ${filePath}`);
  return filePath;
};
