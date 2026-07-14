import { getProviderCapabilities } from "../../src/shared/providerCatalog";
import { getOrderedPromptReferences } from "../../src/shared/promptReferences";
import {
  getProviderRuntimeSettings,
  updateProviderStatus,
} from "../settingsStore";

import { generateFalImages } from "./fal";
import { generateGeminiImages } from "./gemini";
import { generateJimengImages } from "./jimeng";
import { generateOpenAIImages } from "./openai";
import { generateOpenRouterImages } from "./openrouter";
import { generateZenMuxImages } from "./zenmux";

import type {
  CustomProviderModel,
  GenerationRequest,
  GenerationResponse,
} from "../../src/shared/providerTypes";

const ZENMUX_API_KEY_PATTERN = /^sk-(ai|ss)-v1-/i;

export const generateImages = async (input: {
  projectPath?: string | null;
  request: GenerationRequest;
  signal?: AbortSignal;
}): Promise<GenerationResponse> => {
  const { projectPath, request, signal } = input;
  const runtime = await getProviderRuntimeSettings(request.provider);
  const { apiKey, customModels } = runtime;
  if (!apiKey) {
    throw new Error(`${request.provider} API key is not configured.`);
  }

  if (request.provider === "gemini" && ZENMUX_API_KEY_PATTERN.test(apiKey)) {
    throw new Error(
      "你当前保存的是 ZenMux API Key，请把“当前服务”切到 ZenMux 再生成。",
    );
  }

  const capabilities = getProviderCapabilities({
    provider: request.provider,
    model: request.model,
    customModels,
  });
  const promptReferenceCount = getOrderedPromptReferences(request).length;
  const legacyReferenceCount = request.reference?.enabled ? 1 : 0;
  const referenceInputCount = promptReferenceCount || legacyReferenceCount;

  if (referenceInputCount && !capabilities.supportsReferenceImages) {
    throw new Error("当前模型暂时不支持参考图，请切换到支持参考图的模型。");
  }

  if (
    referenceInputCount &&
    referenceInputCount > capabilities.maxReferenceImageCount
  ) {
    throw new Error(
      `当前模型最多支持 ${capabilities.maxReferenceImageCount} 张参考图，请先删除多余引用。`,
    );
  }

  try {
    if (request.provider === "openai-compatible") {
      const response = await generateOpenAIImages({
        apiKey,
        baseUrl: runtime.baseUrl,
        providerLabel: runtime.displayName || "OpenAI 兼容服务",
        responseProvider: "openai-compatible",
        request,
        projectPath,
        signal,
      });
      await updateProviderStatus(request.provider, "success");
      return response;
    }

    const generator = (
      {
        gemini: generateGeminiImages,
        zenmux: generateZenMuxImages,
        fal: generateFalImages,
        jimeng: generateJimengImages,
        openai: generateOpenAIImages,
        openrouter: generateOpenRouterImages,
      } as const
    )[request.provider] as (input: {
      apiKey: string;
      request: GenerationRequest;
      projectPath?: string | null;
      customModels?: readonly CustomProviderModel[];
      signal?: AbortSignal;
    }) => Promise<GenerationResponse>;

    const response = await generator({
      apiKey,
      request,
      projectPath,
      customModels,
      signal,
    });
    await updateProviderStatus(request.provider, "success");
    return response;
  } catch (error: any) {
    await updateProviderStatus(request.provider, "error", error.message);
    throw error;
  }
};
