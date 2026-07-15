import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateOpenAIImages: vi.fn(),
  getProviderRuntimeSettings: vi.fn(),
  updateProviderStatus: vi.fn(),
}));

vi.mock("../settingsStore", () => ({
  getProviderApiKey: vi.fn(),
  getProviderCustomModels: vi.fn(),
  getProviderRuntimeSettings: mocks.getProviderRuntimeSettings,
  updateProviderStatus: mocks.updateProviderStatus,
}));

vi.mock("./openai", () => ({
  generateOpenAIImages: mocks.generateOpenAIImages,
}));

import { generateImages } from "./index";

describe("图像服务分发", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProviderRuntimeSettings.mockResolvedValue({
      apiKey: "compatible-key",
      displayName: "内部网关",
      baseUrl: "https://images.example.com/v1",
      customModels: [
        {
          id: "vendor/image-model",
          capabilityTemplate: "image-editing-aspect-ratio",
          adapter: "openai-images",
        },
      ],
    });
    mocks.generateOpenAIImages.mockResolvedValue({
      provider: "openai-compatible",
      model: "vendor/image-model",
      seed: null,
      createdAt: "2026-07-15T00:00:00.000Z",
      images: [],
    });
  });

  it("把 OpenAI 兼容服务的运行时配置交给 OpenAI Images 请求内核", async () => {
    const request = {
      provider: "openai-compatible" as const,
      model: "vendor/image-model",
      prompt: "生成产品图",
      width: 1024,
      height: 1024,
      imageCount: 1,
    };

    await generateImages({ request });

    expect(mocks.generateOpenAIImages).toHaveBeenCalledWith({
      apiKey: "compatible-key",
      baseUrl: "https://images.example.com/v1",
      providerLabel: "内部网关",
      responseProvider: "openai-compatible",
      request,
      projectPath: undefined,
      signal: undefined,
    });
    expect(mocks.updateProviderStatus).toHaveBeenCalledWith(
      "openai-compatible",
      "success",
    );
  });
});
