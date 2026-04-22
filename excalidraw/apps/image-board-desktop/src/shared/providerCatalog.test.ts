import { describe, expect, it } from "vitest";

import {
  inferCustomModelCapabilityTemplate,
  inferProviderRequestAdapter,
  getAspectRatioOptions,
  getDefaultModel,
  getProviderModels,
  getProviderCapabilities,
  getProviderDefinition,
  getProviderRequestAdapter,
  getVisibleGenerationFields,
  normalizeGenerationRequest,
} from "./providerCatalog";

describe("providerCatalog", () => {
  it("returns the documented default models", () => {
    expect(getDefaultModel("gemini")).toBe("gemini-2.5-flash-image");
    expect(getDefaultModel("zenmux")).toBe("google/gemini-2.5-flash-image");
    expect(getDefaultModel("fal")).toBe("fal-ai/nano-banana-2");
    expect(getDefaultModel("jimeng")).toBe("doubao-seedream-5-0-lite-260128");
    expect(getDefaultModel("openai")).toBe("gpt-image-1.5");
    expect(getDefaultModel("openrouter")).toBe(
      "google/gemini-3.1-flash-image-preview",
    );
  });

  it("includes the supported image models for each provider", () => {
    const geminiDefinition = getProviderDefinition("gemini");
    const zenmuxDefinition = getProviderDefinition("zenmux");
    const falDefinition = getProviderDefinition("fal");
    const jimengDefinition = getProviderDefinition("jimeng");
    const openaiDefinition = getProviderDefinition("openai");
    const openrouterDefinition = getProviderDefinition("openrouter");

    expect(Object.keys(geminiDefinition.models)).toContain(
      "gemini-2.5-flash-image",
    );
    expect(Object.keys(geminiDefinition.models)).toContain(
      "gemini-3.1-flash-image-preview",
    );
    expect(Object.keys(geminiDefinition.models)).toContain(
      "gemini-3-pro-image-preview",
    );
    expect(Object.keys(zenmuxDefinition.models)).toContain(
      "google/gemini-2.5-flash-image",
    );
    expect(Object.keys(zenmuxDefinition.models)).toContain(
      "google/gemini-3-pro-image-preview",
    );
    expect(Object.keys(zenmuxDefinition.models)).toContain(
      "openai/gpt-image-1.5",
    );
    expect(Object.keys(zenmuxDefinition.models)).toContain(
      "openai/gpt-image-2",
    );
    expect(Object.keys(falDefinition.models)).toContain("fal-ai/nano-banana-2");
    expect(Object.keys(jimengDefinition.models)).toContain(
      "doubao-seedream-5-0-lite-260128",
    );
    expect(Object.keys(jimengDefinition.models)).toContain(
      "doubao-seedream-4-0-250828",
    );
    expect(Object.keys(openaiDefinition.models)).toContain("gpt-image-1.5");
    expect(Object.keys(openaiDefinition.models)).toContain("gpt-image-2");
    expect(Object.keys(openrouterDefinition.models)).toContain(
      "google/gemini-3.1-flash-image-preview",
    );
    expect(Object.keys(openrouterDefinition.models)).toContain(
      "openai/gpt-image-1.5",
    );
    expect(Object.keys(openrouterDefinition.models)).toContain(
      "openai/gpt-image-2",
    );
  });

  it("adds user-defined models with capability templates to provider model lists", () => {
    const customModels = [
      {
        id: "google/gemini-next-image-preview",
        label: "google/gemini-next-image-preview",
        capabilityTemplate: "image-editing-aspect-ratio" as const,
      },
    ];

    expect(Object.keys(getProviderModels("zenmux", customModels))).toContain(
      "google/gemini-next-image-preview",
    );
    expect(
      getProviderCapabilities({
        provider: "zenmux",
        model: "google/gemini-next-image-preview",
        customModels,
      }).supportsReferenceImages,
    ).toBe(true);
    expect(
      getVisibleGenerationFields({
        provider: "zenmux",
        model: "google/gemini-next-image-preview",
        customModels,
      }),
    ).toMatchObject({
      aspectRatio: true,
      width: false,
      height: false,
    });
  });

  it("recommends a custom model usage from provider and model id", () => {
    expect(
      inferCustomModelCapabilityTemplate({
        provider: "zenmux",
        modelId: "google/gemini-next-image-preview",
      }),
    ).toBe("image-editing-aspect-ratio");
    expect(
      inferCustomModelCapabilityTemplate({
        provider: "zenmux",
        modelId: "fal-ai/flux-pro/v1.1",
      }),
    ).toBe("seeded-exact");
    expect(
      inferCustomModelCapabilityTemplate({
        provider: "jimeng",
        modelId: "doubao-seedream-next",
      }),
    ).toBe("text-to-image-exact");
    expect(
      inferCustomModelCapabilityTemplate({
        provider: "openrouter",
        modelId: "unknown/new-image-model",
      }),
    ).toBe("text-to-image-aspect-ratio");
  });

  it("keeps request adapters separate from model capability templates", () => {
    expect(
      getProviderRequestAdapter({
        provider: "zenmux",
        model: "openai/gpt-image-2",
      }),
    ).toBe("zenmux-vertex-gpt-image");

    expect(
      getProviderRequestAdapter({
        provider: "openrouter",
        model: "openai/gpt-image-2",
      }),
    ).toBe("openrouter-chat-image");

    expect(
      inferProviderRequestAdapter({
        provider: "zenmux",
        modelId: "openai/gpt-5.4-image-2",
      }),
    ).toBe("zenmux-vertex-gpt-image");

    expect(
      getProviderRequestAdapter({
        provider: "zenmux",
        model: "vendor/custom-image-model",
        customModels: [
          {
            id: "vendor/custom-image-model",
            label: "vendor/custom-image-model",
            capabilityTemplate: "image-editing-aspect-ratio",
            adapter: "zenmux-vertex-gpt-image",
          },
        ],
      }),
    ).toBe("zenmux-vertex-gpt-image");
  });

  it("uses adapter-specific ratio presets for GPT image models", () => {
    expect(
      getAspectRatioOptions({
        provider: "zenmux",
        model: "openai/gpt-image-2",
      }),
    ).toContainEqual({
      id: "3:2",
      label: "3:2",
      width: 1536,
      height: 1024,
    });

    expect(
      getAspectRatioOptions({
        provider: "zenmux",
        model: "openai/gpt-image-2",
      }),
    ).toContainEqual({
      id: "16:9",
      label: "16:9",
      width: 2048,
      height: 1152,
    });

    expect(
      getAspectRatioOptions({
        provider: "gemini",
        model: "gemini-3-pro-image-preview",
      }),
    ).toContainEqual({
      id: "21:9",
      label: "21:9",
      width: 1792,
      height: 768,
    });

    expect(
      getAspectRatioOptions({
        provider: "openrouter",
        model: "openai/gpt-image-2",
      }),
    ).toContainEqual({
      id: "3:2",
      label: "3:2",
      width: 1248,
      height: 832,
    });
  });

  it("shows ratio instead of exact pixels for aspect-ratio based models", () => {
    expect(
      getVisibleGenerationFields({
        provider: "gemini",
        model: "gemini-2.5-flash-image",
      }),
    ).toEqual({
      prompt: true,
      negativePrompt: false,
      width: false,
      height: false,
      aspectRatio: true,
      seed: false,
      imageCount: false,
    });
  });

  it("keeps exact width and height visible for exact-size models", () => {
    expect(
      getVisibleGenerationFields({
        provider: "fal",
        model: "fal-ai/flux/schnell",
      }),
    ).toMatchObject({
      width: true,
      height: true,
      aspectRatio: false,
    });

    expect(
      getVisibleGenerationFields({
        provider: "jimeng",
        model: "doubao-seedream-5-0-lite-260128",
      }),
    ).toMatchObject({
      width: true,
      height: true,
      aspectRatio: false,
    });

    expect(
      getVisibleGenerationFields({
        provider: "openai",
        model: "gpt-image-1.5",
      }),
    ).toMatchObject({
      width: false,
      height: false,
      aspectRatio: true,
    });

    expect(
      getVisibleGenerationFields({
        provider: "openrouter",
        model: "google/gemini-3.1-flash-image-preview",
      }),
    ).toMatchObject({
      width: false,
      height: false,
      aspectRatio: true,
    });

    expect(
      getVisibleGenerationFields({
        provider: "zenmux",
        model: "openai/gpt-image-2",
      }),
    ).toMatchObject({
      width: false,
      height: false,
      aspectRatio: true,
    });
  });

  it("keeps seed enabled for fal image models", () => {
    const capabilities = getProviderCapabilities({
      provider: "fal",
      model: "fal-ai/flux/schnell",
    });

    expect(capabilities.supportsSeed).toBe(true);
    expect(capabilities.supportsImageCount).toBe(true);
  });

  it("only enables reference images on models that support image editing inputs", () => {
    expect(
      getProviderCapabilities({
        provider: "gemini",
        model: "gemini-2.5-flash-image",
      }).supportsReferenceImages,
    ).toBe(true);

    expect(
      getProviderCapabilities({
        provider: "gemini",
        model: "imagen-4.0-fast-generate-001",
      }).supportsReferenceImages,
    ).toBe(false);

    expect(
      getProviderCapabilities({
        provider: "fal",
        model: "fal-ai/nano-banana-2",
      }).supportsReferenceImages,
    ).toBe(true);

    expect(
      getProviderCapabilities({
        provider: "fal",
        model: "fal-ai/flux/schnell",
      }).supportsReferenceImages,
    ).toBe(false);

    expect(
      getProviderCapabilities({
        provider: "jimeng",
        model: "doubao-seedream-5-0-lite-260128",
      }).supportsReferenceImages,
    ).toBe(true);

    expect(
      getProviderCapabilities({
        provider: "jimeng",
        model: "doubao-seedream-3-0-t2i-250415",
      }).supportsReferenceImages,
    ).toBe(false);

    expect(
      getProviderCapabilities({
        provider: "openai",
        model: "gpt-image-1.5",
      }).supportsReferenceImages,
    ).toBe(true);

    expect(
      getProviderCapabilities({
        provider: "openrouter",
        model: "google/gemini-3.1-flash-image-preview",
      }).supportsReferenceImages,
    ).toBe(true);

    expect(
      getProviderCapabilities({
        provider: "zenmux",
        model: "openai/gpt-image-2",
      }).supportsReferenceImages,
    ).toBe(true);

    expect(
      getProviderCapabilities({
        provider: "openrouter",
        model: "openai/gpt-image-1.5",
      }).supportsReferenceImages,
    ).toBe(true);
  });

  it("normalizes unsupported generation controls before submit", () => {
    expect(
      normalizeGenerationRequest({
        provider: "zenmux",
        model: "google/gemini-3-pro-image-preview",
        prompt: "工业设计方案",
        negativePrompt: "不要塑料感",
        width: 1024,
        height: 1024,
        seed: 42,
        imageCount: 4,
        reference: {
          enabled: true,
          elementCount: 2,
          textCount: 1,
          textNotes: ["保留整体轮廓"],
        },
      }),
    ).toMatchObject({
      negativePrompt: undefined,
      seed: null,
      imageCount: 1,
      reference: {
        enabled: true,
      },
    });

    expect(
      normalizeGenerationRequest({
        provider: "fal",
        model: "fal-ai/flux/schnell",
        prompt: "工业设计方案",
        negativePrompt: "不要塑料感",
        width: 1024,
        height: 1024,
        seed: 42,
        imageCount: 9,
        reference: {
          enabled: true,
          elementCount: 1,
          textCount: 0,
        },
      }),
    ).toMatchObject({
      negativePrompt: undefined,
      seed: 42,
      imageCount: 4,
      reference: {
        enabled: false,
      },
    });

    expect(
      normalizeGenerationRequest({
        provider: "jimeng",
        model: "doubao-seedream-3-0-t2i-250415",
        prompt: "工业设计方案",
        negativePrompt: "不要塑料感",
        width: 1024,
        height: 1024,
        seed: 21,
        imageCount: 4,
        reference: {
          enabled: true,
          elementCount: 1,
          textCount: 0,
        },
      }),
    ).toMatchObject({
      negativePrompt: undefined,
      seed: 21,
      imageCount: 1,
      reference: {
        enabled: false,
      },
    });

    expect(
      normalizeGenerationRequest({
        provider: "zenmux",
        model: "google/gemini-3-pro-image-preview",
        prompt: "横版海报",
        aspectRatio: null,
        width: 1024,
        height: 1024,
        imageCount: 1,
      }),
    ).toMatchObject({
      aspectRatio: null,
    });
  });
});
