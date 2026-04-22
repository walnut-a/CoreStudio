import type {
  AspectRatioOption,
  CustomModelCapabilityTemplateId,
  CustomProviderModel,
  GenerationField,
  GenerationRequest,
  ProviderCapabilities,
  ProviderDefinition,
  ProviderId,
  ProviderModelDefinition,
  ProviderRequestAdapter,
} from "./providerTypes";

export const PROVIDER_REQUEST_ADAPTERS: readonly ProviderRequestAdapter[] = [
  "gemini-generate-content",
  "zenmux-vertex-generate-content",
  "zenmux-vertex-gpt-image",
  "fal-image",
  "jimeng-image",
  "openai-images",
  "openrouter-chat-image",
];

export const PROVIDER_REQUEST_ADAPTER_LABELS: Record<
  ProviderRequestAdapter,
  string
> = {
  "gemini-generate-content": "Gemini 官方接口",
  "zenmux-vertex-generate-content": "ZenMux Vertex：Gemini / Nano Banana",
  "zenmux-vertex-gpt-image": "ZenMux Vertex：GPT Image",
  "fal-image": "fal.ai 生图接口",
  "jimeng-image": "即梦 / Seedream 接口",
  "openai-images": "OpenAI Images 接口",
  "openrouter-chat-image": "OpenRouter Chat 图像接口",
};

export const PROVIDER_REQUEST_ADAPTER_OPTIONS: Record<
  ProviderId,
  readonly ProviderRequestAdapter[]
> = {
  gemini: ["gemini-generate-content"],
  zenmux: ["zenmux-vertex-generate-content", "zenmux-vertex-gpt-image"],
  fal: ["fal-image"],
  jimeng: ["jimeng-image"],
  openai: ["openai-images"],
  openrouter: ["openrouter-chat-image"],
};

export const ASPECT_RATIO_AUTO_ID = "auto";

const NATIVE_IMAGE_CAPABILITIES: ProviderCapabilities = {
  supportsNegativePrompt: false,
  supportsSeed: false,
  supportsImageCount: false,
  supportsReferenceImages: true,
  maxImageCount: 1,
  sizeControlMode: "aspect-ratio",
};

const SEEDREAM_IMAGE_CAPABILITIES: ProviderCapabilities = {
  supportsNegativePrompt: false,
  supportsSeed: false,
  supportsImageCount: false,
  supportsReferenceImages: true,
  maxImageCount: 1,
  sizeControlMode: "exact",
};

const SEEDREAM_T2I_CAPABILITIES: ProviderCapabilities = {
  supportsNegativePrompt: false,
  supportsSeed: true,
  supportsImageCount: false,
  supportsReferenceImages: false,
  maxImageCount: 1,
  sizeControlMode: "exact",
};

const OPENAI_IMAGE_CAPABILITIES: ProviderCapabilities = {
  supportsNegativePrompt: false,
  supportsSeed: false,
  supportsImageCount: true,
  supportsReferenceImages: true,
  maxImageCount: 4,
  sizeControlMode: "aspect-ratio",
};

const OPENROUTER_IMAGE_CHAT_CAPABILITIES: ProviderCapabilities = {
  supportsNegativePrompt: false,
  supportsSeed: false,
  supportsImageCount: false,
  supportsReferenceImages: true,
  maxImageCount: 1,
  sizeControlMode: "aspect-ratio",
};

const OPENROUTER_TEXT_TO_IMAGE_CAPABILITIES: ProviderCapabilities = {
  supportsNegativePrompt: false,
  supportsSeed: false,
  supportsImageCount: false,
  supportsReferenceImages: false,
  maxImageCount: 1,
  sizeControlMode: "aspect-ratio",
};

const OPENAI_COMPATIBLE_GPT_IMAGE_CAPABILITIES: ProviderCapabilities = {
  supportsNegativePrompt: false,
  supportsSeed: false,
  supportsImageCount: false,
  supportsReferenceImages: true,
  maxImageCount: 1,
  sizeControlMode: "aspect-ratio",
};

const createOpenAICompatibleGptImageModels = (
  adapter: ProviderRequestAdapter,
): Record<string, ProviderModelDefinition> => ({
  "openai/gpt-image-1.5": {
    id: "openai/gpt-image-1.5",
    label: "GPT Image 1.5",
    capabilities: OPENAI_COMPATIBLE_GPT_IMAGE_CAPABILITIES,
    adapter,
  },
  "openai/gpt-image-2": {
    id: "openai/gpt-image-2",
    label: "GPT Image 2",
    capabilities: OPENAI_COMPATIBLE_GPT_IMAGE_CAPABILITIES,
    adapter,
  },
});

export const isOpenAICompatibleGptImageModel = (model?: string) =>
  /^openai\/(?:gpt-image-|gpt-[\w.-]*image)/.test(
    model?.trim().toLowerCase() ?? "",
  );

export const CUSTOM_MODEL_CAPABILITY_TEMPLATES: Record<
  CustomModelCapabilityTemplateId,
  {
    label: string;
    description: string;
    capabilities: ProviderCapabilities;
  }
> = {
  "image-editing-aspect-ratio": {
    label: "支持参考图和改图",
    description: "会自动引用画板选区，适合 Gemini、Nano Banana、GPT Image 这类模型。",
    capabilities: NATIVE_IMAGE_CAPABILITIES,
  },
  "text-to-image-aspect-ratio": {
    label: "只用文字生成",
    description: "只发送提示词，不发送参考图，尺寸用比例控制。",
    capabilities: OPENROUTER_TEXT_TO_IMAGE_CAPABILITIES,
  },
  "text-to-image-exact": {
    label: "按宽高生成",
    description: "适合使用 width 和 height 的文生图模型，比如部分即梦/豆包接口。",
    capabilities: {
      supportsNegativePrompt: false,
      supportsSeed: false,
      supportsImageCount: false,
      supportsReferenceImages: false,
      maxImageCount: 1,
      sizeControlMode: "exact",
    },
  },
  "seeded-exact": {
    label: "高级生图模型",
    description: "适合 FLUX 这类支持宽高、种子、多张图的模型。",
    capabilities: {
      supportsNegativePrompt: false,
      supportsSeed: true,
      supportsImageCount: true,
      supportsReferenceImages: false,
      maxImageCount: 4,
      sizeControlMode: "exact",
    },
  },
};

export const CUSTOM_MODEL_USAGE_PRESETS = CUSTOM_MODEL_CAPABILITY_TEMPLATES;

const ALL_IMAGE_FIELDS: Record<GenerationField, true> = {
  prompt: true,
  negativePrompt: true,
  width: true,
  height: true,
  aspectRatio: true,
  seed: true,
  imageCount: true,
};

export const COMMON_ASPECT_RATIO_OPTIONS = [
  { id: "1:1", label: "1:1", width: 1024, height: 1024 },
  { id: "16:9", label: "16:9", width: 1344, height: 768 },
  { id: "9:16", label: "9:16", width: 768, height: 1344 },
  { id: "4:3", label: "4:3", width: 1024, height: 768 },
  { id: "3:4", label: "3:4", width: 768, height: 1024 },
  { id: "3:2", label: "3:2", width: 1536, height: 1024 },
  { id: "2:3", label: "2:3", width: 1024, height: 1536 },
  { id: "5:4", label: "5:4", width: 1280, height: 1024 },
  { id: "4:5", label: "4:5", width: 1024, height: 1280 },
  { id: "21:9", label: "21:9", width: 1792, height: 768 },
  { id: "4:1", label: "4:1", width: 2048, height: 512 },
  { id: "1:4", label: "1:4", width: 512, height: 2048 },
  { id: "8:1", label: "8:1", width: 3072, height: 384 },
  { id: "1:8", label: "1:8", width: 384, height: 3072 },
] as const satisfies readonly AspectRatioOption[];

const FAL_NANO_ASPECT_RATIO_OPTIONS = [
  ...COMMON_ASPECT_RATIO_OPTIONS,
] as const satisfies readonly AspectRatioOption[];

const OPENAI_IMAGE_ASPECT_RATIO_OPTIONS = [
  { id: "1:1", label: "1:1", width: 1024, height: 1024 },
  { id: "3:2", label: "3:2", width: 1536, height: 1024 },
  { id: "2:3", label: "2:3", width: 1024, height: 1536 },
] as const satisfies readonly AspectRatioOption[];

const OPENAI_GPT_IMAGE_2_ASPECT_RATIO_OPTIONS = [
  { id: "1:1", label: "1:1", width: 1024, height: 1024 },
  { id: "16:9", label: "16:9", width: 2048, height: 1152 },
  { id: "9:16", label: "9:16", width: 1152, height: 2048 },
  { id: "4:3", label: "4:3", width: 1536, height: 1152 },
  { id: "3:4", label: "3:4", width: 1152, height: 1536 },
  { id: "3:2", label: "3:2", width: 1536, height: 1024 },
  { id: "2:3", label: "2:3", width: 1024, height: 1536 },
  { id: "21:9", label: "21:9", width: 1792, height: 768 },
] as const satisfies readonly AspectRatioOption[];

const OPENROUTER_ASPECT_RATIO_OPTIONS = [
  { id: "1:1", label: "1:1", width: 1024, height: 1024 },
  { id: "2:3", label: "2:3", width: 832, height: 1248 },
  { id: "3:2", label: "3:2", width: 1248, height: 832 },
  { id: "3:4", label: "3:4", width: 864, height: 1184 },
  { id: "4:3", label: "4:3", width: 1184, height: 864 },
  { id: "4:5", label: "4:5", width: 896, height: 1152 },
  { id: "5:4", label: "5:4", width: 1152, height: 896 },
  { id: "9:16", label: "9:16", width: 768, height: 1344 },
  { id: "16:9", label: "16:9", width: 1344, height: 768 },
  { id: "21:9", label: "21:9", width: 1536, height: 672 },
] as const satisfies readonly AspectRatioOption[];

const OPENROUTER_EXTENDED_ASPECT_RATIO_OPTIONS = [
  ...OPENROUTER_ASPECT_RATIO_OPTIONS,
  { id: "1:4", label: "1:4", width: 512, height: 2048 },
  { id: "4:1", label: "4:1", width: 2048, height: 512 },
  { id: "1:8", label: "1:8", width: 384, height: 3072 },
  { id: "8:1", label: "8:1", width: 3072, height: 384 },
] as const satisfies readonly AspectRatioOption[];

export const getClosestAspectRatioOption = (
  width: number,
  height: number,
  options: readonly AspectRatioOption[] = COMMON_ASPECT_RATIO_OPTIONS,
) => {
  const targetRatio = width / height;
  return options.reduce((best, candidate) =>
    Math.abs(candidate.width / candidate.height - targetRatio) <
    Math.abs(best.width / best.height - targetRatio)
      ? candidate
      : best,
  );
};

export const getAspectRatioOptionById = (
  aspectRatio: string | null | undefined,
  options: readonly AspectRatioOption[] = COMMON_ASPECT_RATIO_OPTIONS,
) => options.find((candidate) => candidate.id === aspectRatio) ?? null;

export const getRequestAspectRatioOption = (
  request: Pick<GenerationRequest, "aspectRatio" | "width" | "height">,
  options: readonly AspectRatioOption[] = COMMON_ASPECT_RATIO_OPTIONS,
) => {
  if (request.aspectRatio === null) {
    return null;
  }

  return (
    getAspectRatioOptionById(request.aspectRatio, options) ||
    getClosestAspectRatioOption(request.width, request.height, options)
  );
};

export const isAutoAspectRatioRequest = (
  request: Pick<GenerationRequest, "aspectRatio">,
) => request.aspectRatio === null;

export const PROVIDER_IDS = [
  "gemini",
  "zenmux",
  "fal",
  "jimeng",
  "openai",
  "openrouter",
] as const;

export const PROVIDER_CATALOG: Record<ProviderId, ProviderDefinition> = {
  gemini: {
    id: "gemini",
    label: "Gemini",
    defaultModel: "gemini-2.5-flash-image",
    models: {
      "gemini-2.5-flash-image": {
        id: "gemini-2.5-flash-image",
        label: "Gemini 2.5 Flash Image (Nano Banana)",
        capabilities: NATIVE_IMAGE_CAPABILITIES,
      },
      "gemini-3.1-flash-image-preview": {
        id: "gemini-3.1-flash-image-preview",
        label: "Gemini 3.1 Flash Image Preview (Nano Banana 2)",
        capabilities: NATIVE_IMAGE_CAPABILITIES,
      },
      "gemini-3-pro-image-preview": {
        id: "gemini-3-pro-image-preview",
        label: "Gemini 3 Pro Image Preview (Nano Banana Pro)",
        capabilities: NATIVE_IMAGE_CAPABILITIES,
      },
      "imagen-4.0-fast-generate-001": {
        id: "imagen-4.0-fast-generate-001",
        label: "Imagen 4 Fast",
        capabilities: {
          supportsNegativePrompt: false,
          supportsSeed: false,
          supportsImageCount: true,
          supportsReferenceImages: false,
          maxImageCount: 4,
          sizeControlMode: "aspect-ratio",
        },
      },
      "imagen-4.0-generate-001": {
        id: "imagen-4.0-generate-001",
        label: "Imagen 4",
        capabilities: {
          supportsNegativePrompt: false,
          supportsSeed: false,
          supportsImageCount: true,
          supportsReferenceImages: false,
          maxImageCount: 4,
          sizeControlMode: "aspect-ratio",
        },
      },
    },
  },
  zenmux: {
    id: "zenmux",
    label: "ZenMux",
    defaultModel: "google/gemini-2.5-flash-image",
    models: {
      "google/gemini-2.5-flash-image": {
        id: "google/gemini-2.5-flash-image",
        label: "Gemini 2.5 Flash Image",
        capabilities: NATIVE_IMAGE_CAPABILITIES,
        adapter: "zenmux-vertex-generate-content",
      },
      "google/gemini-2.5-flash-image-free": {
        id: "google/gemini-2.5-flash-image-free",
        label: "Gemini 2.5 Flash Image Free",
        capabilities: NATIVE_IMAGE_CAPABILITIES,
        adapter: "zenmux-vertex-generate-content",
      },
      "google/gemini-3-pro-image-preview": {
        id: "google/gemini-3-pro-image-preview",
        label: "Gemini 3 Pro Image Preview",
        capabilities: NATIVE_IMAGE_CAPABILITIES,
        adapter: "zenmux-vertex-generate-content",
      },
      "google/gemini-3-pro-image-preview-free": {
        id: "google/gemini-3-pro-image-preview-free",
        label: "Gemini 3 Pro Image Preview Free",
        capabilities: NATIVE_IMAGE_CAPABILITIES,
        adapter: "zenmux-vertex-generate-content",
      },
      ...createOpenAICompatibleGptImageModels("zenmux-vertex-gpt-image"),
    },
  },
  fal: {
    id: "fal",
    label: "fal.ai",
    defaultModel: "fal-ai/nano-banana-2",
    models: {
      "fal-ai/nano-banana-2": {
        id: "fal-ai/nano-banana-2",
        label: "Nano Banana 2",
        capabilities: {
          supportsNegativePrompt: false,
          supportsSeed: true,
          supportsImageCount: true,
          supportsReferenceImages: true,
          maxImageCount: 4,
          sizeControlMode: "aspect-ratio",
        },
      },
      "fal-ai/flux/schnell": {
        id: "fal-ai/flux/schnell",
        label: "FLUX Schnell",
        capabilities: {
          supportsNegativePrompt: false,
          supportsSeed: true,
          supportsImageCount: true,
          supportsReferenceImages: false,
          maxImageCount: 4,
          sizeControlMode: "exact",
        },
      },
      "fal-ai/flux/dev": {
        id: "fal-ai/flux/dev",
        label: "FLUX Dev",
        capabilities: {
          supportsNegativePrompt: false,
          supportsSeed: true,
          supportsImageCount: true,
          supportsReferenceImages: false,
          maxImageCount: 4,
          sizeControlMode: "exact",
        },
      },
    },
  },
  jimeng: {
    id: "jimeng",
    label: "即梦 / Seedream",
    defaultModel: "doubao-seedream-5-0-lite-260128",
    models: {
      "doubao-seedream-5-0-lite-260128": {
        id: "doubao-seedream-5-0-lite-260128",
        label: "Seedream 5.0 Lite",
        capabilities: SEEDREAM_IMAGE_CAPABILITIES,
      },
      "doubao-seedream-5-0-260128": {
        id: "doubao-seedream-5-0-260128",
        label: "Seedream 5.0",
        capabilities: SEEDREAM_IMAGE_CAPABILITIES,
      },
      "doubao-seedream-4-5-251128": {
        id: "doubao-seedream-4-5-251128",
        label: "Seedream 4.5",
        capabilities: SEEDREAM_IMAGE_CAPABILITIES,
      },
      "doubao-seedream-4-0-250828": {
        id: "doubao-seedream-4-0-250828",
        label: "Seedream 4.0",
        capabilities: SEEDREAM_IMAGE_CAPABILITIES,
      },
      "doubao-seedream-3-0-t2i-250415": {
        id: "doubao-seedream-3-0-t2i-250415",
        label: "Seedream 3.0 T2I",
        capabilities: SEEDREAM_T2I_CAPABILITIES,
      },
    },
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    defaultModel: "gpt-image-1.5",
    models: {
      "gpt-image-2": {
        id: "gpt-image-2",
        label: "GPT Image 2",
        capabilities: OPENAI_IMAGE_CAPABILITIES,
        adapter: "openai-images",
      },
      "gpt-image-1.5": {
        id: "gpt-image-1.5",
        label: "GPT Image 1.5",
        capabilities: OPENAI_IMAGE_CAPABILITIES,
        adapter: "openai-images",
      },
      "gpt-image-1": {
        id: "gpt-image-1",
        label: "GPT Image 1",
        capabilities: OPENAI_IMAGE_CAPABILITIES,
        adapter: "openai-images",
      },
      "gpt-image-1-mini": {
        id: "gpt-image-1-mini",
        label: "GPT Image 1 Mini",
        capabilities: OPENAI_IMAGE_CAPABILITIES,
        adapter: "openai-images",
      },
    },
  },
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    defaultModel: "google/gemini-3.1-flash-image-preview",
    models: {
      "google/gemini-3.1-flash-image-preview": {
        id: "google/gemini-3.1-flash-image-preview",
        label: "Nano Banana 2 (Gemini 3.1 Flash Image)",
        capabilities: OPENROUTER_IMAGE_CHAT_CAPABILITIES,
        adapter: "openrouter-chat-image",
      },
      "google/gemini-3-pro-image-preview": {
        id: "google/gemini-3-pro-image-preview",
        label: "Nano Banana Pro (Gemini 3 Pro Image)",
        capabilities: OPENROUTER_IMAGE_CHAT_CAPABILITIES,
        adapter: "openrouter-chat-image",
      },
      "google/gemini-2.5-flash-image": {
        id: "google/gemini-2.5-flash-image",
        label: "Nano Banana (Gemini 2.5 Flash Image)",
        capabilities: OPENROUTER_IMAGE_CHAT_CAPABILITIES,
        adapter: "openrouter-chat-image",
      },
      ...createOpenAICompatibleGptImageModels("openrouter-chat-image"),
      "black-forest-labs/flux.2-pro": {
        id: "black-forest-labs/flux.2-pro",
        label: "FLUX 2 Pro",
        capabilities: OPENROUTER_TEXT_TO_IMAGE_CAPABILITIES,
        adapter: "openrouter-chat-image",
      },
      "black-forest-labs/flux.2-flex": {
        id: "black-forest-labs/flux.2-flex",
        label: "FLUX 2 Flex",
        capabilities: OPENROUTER_TEXT_TO_IMAGE_CAPABILITIES,
        adapter: "openrouter-chat-image",
      },
    },
  },
};

const fieldVisibilityFromCapabilities = (
  capabilities: ProviderCapabilities,
): Record<GenerationField, boolean> => {
  return {
    ...ALL_IMAGE_FIELDS,
    negativePrompt: capabilities.supportsNegativePrompt,
    width: capabilities.sizeControlMode === "exact",
    height: capabilities.sizeControlMode === "exact",
    aspectRatio: capabilities.sizeControlMode === "aspect-ratio",
    seed: capabilities.supportsSeed,
    imageCount: capabilities.supportsImageCount,
  };
};

export const getDefaultModel = (provider: ProviderId) =>
  PROVIDER_CATALOG[provider].defaultModel;

export const getProviderDefinition = (provider: ProviderId) =>
  PROVIDER_CATALOG[provider];

export const isProviderRequestAdapter = (
  value: unknown,
): value is ProviderRequestAdapter =>
  typeof value === "string" &&
  PROVIDER_REQUEST_ADAPTERS.includes(value as ProviderRequestAdapter);

export const inferProviderRequestAdapter = ({
  provider,
  modelId,
}: {
  provider: ProviderId;
  modelId: string;
}): ProviderRequestAdapter => {
  if (provider === "zenmux") {
    return isOpenAICompatibleGptImageModel(modelId)
      ? "zenmux-vertex-gpt-image"
      : "zenmux-vertex-generate-content";
  }

  if (provider === "openrouter") {
    return "openrouter-chat-image";
  }

  if (provider === "openai") {
    return "openai-images";
  }

  if (provider === "fal") {
    return "fal-image";
  }

  if (provider === "jimeng") {
    return "jimeng-image";
  }

  return "gemini-generate-content";
};

const toCustomModelDefinition = (
  provider: ProviderId,
  model: CustomProviderModel,
): ProviderModelDefinition => {
  const template =
    CUSTOM_MODEL_CAPABILITY_TEMPLATES[model.capabilityTemplate] ??
    CUSTOM_MODEL_CAPABILITY_TEMPLATES["text-to-image-aspect-ratio"];

  return {
    id: model.id,
    label: model.label || model.id,
    capabilities: model.capabilities ?? template.capabilities,
    adapter:
      model.adapter ??
      inferProviderRequestAdapter({
        provider,
        modelId: model.id,
      }),
    custom: true,
  };
};

export const inferCustomModelCapabilityTemplate = ({
  provider,
  modelId,
}: {
  provider: ProviderId;
  modelId: string;
}): CustomModelCapabilityTemplateId => {
  const normalizedModelId = modelId.trim().toLowerCase();

  if (
    normalizedModelId.includes("gemini") ||
    normalizedModelId.includes("nano-banana") ||
    normalizedModelId.includes("image-preview") ||
    normalizedModelId.includes("gpt-image")
  ) {
    return "image-editing-aspect-ratio";
  }

  if (normalizedModelId.includes("flux")) {
    return "seeded-exact";
  }

  if (
    normalizedModelId.includes("seedream") ||
    normalizedModelId.includes("doubao")
  ) {
    return "text-to-image-exact";
  }

  if (provider === "fal") {
    return "seeded-exact";
  }

  if (provider === "jimeng") {
    return "text-to-image-exact";
  }

  if (provider === "gemini" || provider === "openai") {
    return "image-editing-aspect-ratio";
  }

  return "text-to-image-aspect-ratio";
};

const getCustomModelMap = (
  provider: ProviderId,
  customModels: readonly CustomProviderModel[] = [],
) => {
  return customModels.reduce((models, customModel) => {
    const id = customModel.id.trim();
    if (!id) {
      return models;
    }

    return {
      ...models,
      [id]: toCustomModelDefinition(provider, {
        ...customModel,
        id,
        label: customModel.label?.trim() || id,
      }),
    };
  }, {} as Record<string, ProviderModelDefinition>);
};

export const getProviderModels = (
  provider: ProviderId,
  customModels: readonly CustomProviderModel[] = [],
) => ({
  ...PROVIDER_CATALOG[provider].models,
  ...getCustomModelMap(provider, customModels),
});

const fallbackCustomModel = (
  provider: ProviderId,
  model: string,
): ProviderModelDefinition => ({
  id: model,
  label: model,
  capabilities:
    CUSTOM_MODEL_CAPABILITY_TEMPLATES["text-to-image-aspect-ratio"].capabilities,
  adapter: inferProviderRequestAdapter({
    provider,
    modelId: model,
  }),
  custom: true,
});

export const getModelDefinition = (
  provider: ProviderId,
  model?: string,
  customModels: readonly CustomProviderModel[] = [],
) => {
  const definition = getProviderDefinition(provider);
  const modelId = model || definition.defaultModel;
  return (
    getProviderModels(provider, customModels)[modelId] ||
    fallbackCustomModel(provider, modelId)
  );
};

export const getProviderCapabilities = (args: {
  provider: ProviderId;
  model?: string;
  customModels?: readonly CustomProviderModel[];
}) => getModelDefinition(args.provider, args.model, args.customModels).capabilities;

export const getProviderRequestAdapter = (args: {
  provider: ProviderId;
  model?: string;
  customModels?: readonly CustomProviderModel[];
}) => {
  const modelId = args.model || getDefaultModel(args.provider);
  return (
    getModelDefinition(args.provider, modelId, args.customModels).adapter ??
    inferProviderRequestAdapter({
      provider: args.provider,
      modelId,
    })
  );
};

export const normalizeGenerationRequest = (
  request: GenerationRequest,
  options: {
    customModels?: readonly CustomProviderModel[];
  } = {},
): GenerationRequest => {
  const capabilities = getProviderCapabilities({
    ...request,
    customModels: options.customModels,
  });
  const aspectRatioOptions = getAspectRatioOptions({
    provider: request.provider,
    model: request.model,
    customModels: options.customModels,
  });
  const requestedAspectRatio =
    capabilities.sizeControlMode === "aspect-ratio"
      ? request.aspectRatio === null
        ? null
        : request.aspectRatio &&
            getAspectRatioOptionById(request.aspectRatio, aspectRatioOptions)
          ? request.aspectRatio
          : request.aspectRatio === undefined
            ? undefined
            : getClosestAspectRatioOption(
                request.width,
                request.height,
                aspectRatioOptions,
              ).id
      : undefined;

  return {
    ...request,
    negativePrompt: capabilities.supportsNegativePrompt
      ? request.negativePrompt
      : undefined,
    aspectRatio: requestedAspectRatio,
    seed: capabilities.supportsSeed ? request.seed ?? null : null,
    imageCount: capabilities.supportsImageCount
      ? Math.max(1, Math.min(request.imageCount, capabilities.maxImageCount))
      : 1,
    reference: request.reference
      ? {
          ...request.reference,
          enabled: capabilities.supportsReferenceImages && request.reference.enabled,
        }
      : request.reference ?? null,
  };
};

export const getVisibleGenerationFields = (args: {
  provider: ProviderId;
  model?: string;
  customModels?: readonly CustomProviderModel[];
}) => fieldVisibilityFromCapabilities(getProviderCapabilities(args));

export const getAspectRatioOptions = (args: {
  provider: ProviderId;
  model?: string;
  customModels?: readonly CustomProviderModel[];
}): readonly AspectRatioOption[] => {
  const adapter = getProviderRequestAdapter(args);

  if (
    (adapter === "openai-images" || adapter === "zenmux-vertex-gpt-image") &&
    args.model?.includes("gpt-image-2")
  ) {
    return OPENAI_GPT_IMAGE_2_ASPECT_RATIO_OPTIONS;
  }

  if (adapter === "openai-images" || adapter === "zenmux-vertex-gpt-image") {
    return OPENAI_IMAGE_ASPECT_RATIO_OPTIONS;
  }

  if (adapter === "openrouter-chat-image") {
    return args.model === "google/gemini-3.1-flash-image-preview"
      ? OPENROUTER_EXTENDED_ASPECT_RATIO_OPTIONS
      : OPENROUTER_ASPECT_RATIO_OPTIONS;
  }

  if (args.provider === "fal" && args.model === "fal-ai/nano-banana-2") {
    return FAL_NANO_ASPECT_RATIO_OPTIONS;
  }

  return COMMON_ASPECT_RATIO_OPTIONS;
};
