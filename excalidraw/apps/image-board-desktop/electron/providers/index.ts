import { getProviderCapabilities } from "../../src/shared/providerCatalog";
import {
  getProviderApiKey,
  getProviderCustomModels,
  updateProviderStatus,
} from "../settingsStore";

import type {
  CustomProviderModel,
  GenerationRequest,
  GenerationResponse,
} from "../../src/shared/providerTypes";

import { generateFalImages } from "./fal";
import { generateGeminiImages } from "./gemini";
import { generateJimengImages } from "./jimeng";
import { generateOpenAIImages } from "./openai";
import { generateOpenRouterImages } from "./openrouter";
import { generateZenMuxImages } from "./zenmux";

const ZENMUX_API_KEY_PATTERN = /^sk-(ai|ss)-v1-/i;

export const generateImages = async (input: {
  projectPath?: string | null;
  request: GenerationRequest;
}): Promise<GenerationResponse> => {
  const { projectPath, request } = input;
  const apiKey = await getProviderApiKey(request.provider);
  const customModels = await getProviderCustomModels(request.provider);
  if (!apiKey) {
    throw new Error(`${request.provider} API key is not configured.`);
  }

  if (request.provider === "gemini" && ZENMUX_API_KEY_PATTERN.test(apiKey)) {
    throw new Error(
      "你当前保存的是 ZenMux API Key，请把“当前服务”切到 ZenMux 再生成。",
    );
  }

  if (
    request.reference?.enabled &&
    !getProviderCapabilities({
      provider: request.provider,
      model: request.model,
      customModels,
    }).supportsReferenceImages
  ) {
    throw new Error("当前模型暂时不支持参考图，请切换到支持参考图的模型。");
  }

  try {
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
    }) => Promise<GenerationResponse>;

    const response = await generator({
      apiKey,
      request,
      projectPath,
      customModels,
    });
    await updateProviderStatus(request.provider, "success");
    return response;
  } catch (error: any) {
    await updateProviderStatus(request.provider, "error", error.message);
    throw error;
  }
};
