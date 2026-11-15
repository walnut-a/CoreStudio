import builtinModelCatalog from "./builtinModelCatalog.json";
import { parseRemoteModelCatalog } from "./modelCatalogContract";
import type {
  AspectRatioOption,
  CustomModelCapabilityTemplateId,
  CustomProviderModel,
  GenerationField,
  GenerationQuality,
  GenerationRequest,
  ProviderCapabilities,
  ProviderDefinition,
  ProviderId,
  ProviderModelDefinition,
  ProviderRequestAdapter,
} from "./providerTypes";
import type { RemoteModelCatalog } from "./modelCatalogContract";

export const PROVIDER_REQUEST_ADAPTERS: readonly ProviderRequestAdapter[] = [
  "gemini-generate-content",
  "zenmux-vertex-generate-content",
  "zenmux-vertex-gpt-image",
  "zenmux-openai-images",
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
  "zenmux-vertex-gpt-image": "ZenMux Vertex：图片 API",
  "zenmux-openai-images": "ZenMux OpenAI：图片 API",
  "fal-image": "fal.ai 生图接口",
  "jimeng-image": "火山方舟 Seedream 接口",
  "openai-images": "OpenAI Images 接口",
  "openrouter-chat-image": "OpenRouter Chat 图像接口",
};

export const PROVIDER_REQUEST_ADAPTER_OPTIONS: Record<
  ProviderId,
  readonly ProviderRequestAdapter[]
> = {
  gemini: ["gemini-generate-content"],
  zenmux: [
    "zenmux-vertex-generate-content",
    "zenmux-vertex-gpt-image",
    "zenmux-openai-images",
  ],
  fal: ["fal-image"],
  jimeng: ["jimeng-image"],
  openai: ["openai-images"],
  openrouter: ["openrouter-chat-image"],
  "openai-compatible": ["openai-images"],
};

export const ASPECT_RATIO_AUTO_ID = "auto";

const NO_REFERENCE_IMAGE_COUNT = 0;

const OPENAI_REFERENCE_IMAGE_COUNT = 4;

const CUSTOM_IMAGE_REFERENCE_IMAGE_COUNT = 8;

const OPENAI_IMAGE_CAPABILITIES: ProviderCapabilities = {
  supportsNegativePrompt: false,
  supportsSeed: false,
  supportsImageCount: true,
  supportsReferenceImages: true,
  maxImageCount: 4,
  maxReferenceImageCount: OPENAI_REFERENCE_IMAGE_COUNT,
  sizeControlMode: "aspect-ratio",
};

const OPENAI_GPT_IMAGE_2_CAPABILITIES: ProviderCapabilities = {
  ...OPENAI_IMAGE_CAPABILITIES,
  supportsQuality: true,
  supportsTransparentBackground: true,
};

const OPENAI_GPT_IMAGE_25_CAPABILITIES: ProviderCapabilities = {
  ...OPENAI_GPT_IMAGE_2_CAPABILITIES,
  maxImageCount: 10,
  maxReferenceImageCount: 16,
};

const STANDARD_GENERATION_QUALITIES: readonly GenerationQuality[] = [
  "auto",
  "low",
  "medium",
  "high",
];

const EXTENDED_GENERATION_QUALITIES: readonly GenerationQuality[] = [
  ...STANDARD_GENERATION_QUALITIES,
  "xhigh",
  "max",
];

export const isGptImageExtendedQualityModel = (model?: string) =>
  /^(?:openai\/)?gpt-image-2\.(?:5|6)-(?:flare|sunburst)(?:-\d{4}-\d{2}-\d{2})?$/.test(
    model?.trim().toLowerCase() ?? "",
  );

export const isGptImage2OrLaterModel = (model?: string) => {
  const normalizedModel = model?.trim().toLowerCase() ?? "";
  return (
    normalizedModel === "gpt-image-2" ||
    normalizedModel === "openai/gpt-image-2" ||
    isGptImageExtendedQualityModel(normalizedModel)
  );
};

const OPENROUTER_TEXT_TO_IMAGE_CAPABILITIES: ProviderCapabilities = {
  supportsNegativePrompt: false,
  supportsSeed: false,
  supportsImageCount: false,
  supportsReferenceImages: false,
  maxImageCount: 1,
  maxReferenceImageCount: NO_REFERENCE_IMAGE_COUNT,
  sizeControlMode: "aspect-ratio",
};

export const isOpenAICompatibleGptImageModel = (model?: string) =>
  /^openai\/(?:gpt-image-|gpt-[\w.-]*image)/.test(
    model?.trim().toLowerCase() ?? "",
  );

const isQwenImageModel = (model?: string) =>
  /^qwen\/qwen-image/.test(model?.trim().toLowerCase() ?? "");

const isZenMuxNonGoogleVertexImageApiModel = (model?: string) => {
  const normalizedModel = model?.trim().toLowerCase() ?? "";
  return (
    /^bytedance\/doubao-seedream/.test(normalizedModel) ||
    /^z-ai\/glm-image/.test(normalizedModel) ||
    /^tencent\/hy-image/.test(normalizedModel) ||
    /^klingai\/kling/.test(normalizedModel)
  );
};

const isZenMuxVertexImageApiModel = (model?: string) =>
  isOpenAICompatibleGptImageModel(model) ||
  isQwenImageModel(model) ||
  isZenMuxNonGoogleVertexImageApiModel(model);

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
    description:
      "会自动引用画板选区，适合 Gemini、Nano Banana、GPT Image、Qwen Image、Seedream、GLM Image 这类模型。",
    capabilities: {
      supportsNegativePrompt: false,
      supportsSeed: false,
      supportsImageCount: false,
      supportsReferenceImages: true,
      maxImageCount: 1,
      maxReferenceImageCount: CUSTOM_IMAGE_REFERENCE_IMAGE_COUNT,
      sizeControlMode: "aspect-ratio",
    },
  },
  "text-to-image-aspect-ratio": {
    label: "只用文字生成",
    description: "只发送提示词，不发送参考图，尺寸用比例控制。",
    capabilities: OPENROUTER_TEXT_TO_IMAGE_CAPABILITIES,
  },
  "text-to-image-exact": {
    label: "按宽高生成",
    description:
      "适合使用 width 和 height 的文生图模型，比如部分即梦/豆包接口。",
    capabilities: {
      supportsNegativePrompt: false,
      supportsSeed: false,
      supportsImageCount: false,
      supportsReferenceImages: false,
      maxImageCount: 1,
      maxReferenceImageCount: NO_REFERENCE_IMAGE_COUNT,
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
      maxReferenceImageCount: NO_REFERENCE_IMAGE_COUNT,
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
  quality: true,
  background: true,
};

export const COMMON_ASPECT_RATIO_OPTIONS: readonly AspectRatioOption[] = [
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
] as const;

const FAL_NANO_ASPECT_RATIO_OPTIONS: readonly AspectRatioOption[] = [
  ...COMMON_ASPECT_RATIO_OPTIONS,
] as const;

const OPENAI_IMAGE_ASPECT_RATIO_OPTIONS: readonly AspectRatioOption[] = [
  { id: "1:1", label: "1:1", width: 1024, height: 1024 },
  { id: "3:2", label: "3:2", width: 1536, height: 1024 },
  { id: "2:3", label: "2:3", width: 1024, height: 1536 },
] as const;

const OPENAI_GPT_IMAGE_2_ASPECT_RATIO_OPTIONS: readonly AspectRatioOption[] = [
  { id: "1:1", label: "1:1", width: 1024, height: 1024 },
  { id: "16:9", label: "16:9", width: 2048, height: 1152 },
  { id: "9:16", label: "9:16", width: 1152, height: 2048 },
  { id: "4:3", label: "4:3", width: 1536, height: 1152 },
  { id: "3:4", label: "3:4", width: 1152, height: 1536 },
  { id: "3:2", label: "3:2", width: 1536, height: 1024 },
  { id: "2:3", label: "2:3", width: 1024, height: 1536 },
  { id: "21:9", label: "21:9", width: 1792, height: 768 },
] as const;

const GPT_IMAGE_2_PLUS_SIZE_OPTIONS: readonly AspectRatioOption[] = [
  ...OPENAI_GPT_IMAGE_2_ASPECT_RATIO_OPTIONS,
  { id: "16:9-1080p", label: "16:9 1080p", width: 1920, height: 1080 },
  { id: "9:16-1080p", label: "9:16 1080p", width: 1080, height: 1920 },
  { id: "1:1-2k", label: "1:1 2K", width: 2048, height: 2048 },
  { id: "16:9-2k", label: "16:9 2K", width: 2560, height: 1440 },
  { id: "9:16-2k", label: "9:16 2K", width: 1440, height: 2560 },
  { id: "16:9-4k", label: "16:9 4K", width: 3840, height: 2160 },
  { id: "9:16-4k", label: "9:16 4K", width: 2160, height: 3840 },
] as const;

const OPENROUTER_ASPECT_RATIO_OPTIONS: readonly AspectRatioOption[] = [
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
] as const;

const OPENROUTER_EXTENDED_ASPECT_RATIO_OPTIONS: readonly AspectRatioOption[] = [
  ...OPENROUTER_ASPECT_RATIO_OPTIONS,
  { id: "1:4", label: "1:4", width: 512, height: 2048 },
  { id: "4:1", label: "4:1", width: 2048, height: 512 },
  { id: "1:8", label: "1:8", width: 384, height: 3072 },
  { id: "8:1", label: "8:1", width: 3072, height: 384 },
] as const;

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
    options.find(
      (candidate) =>
        candidate.width === request.width &&
        candidate.height === request.height,
    ) ||
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
  "openai-compatible",
] as const;

type ProviderConfigurationState = Partial<
  Record<ProviderId, { isConfigured: boolean }>
>;

export const getConfiguredProviderIds = (
  settings: ProviderConfigurationState | null,
): ProviderId[] =>
  settings
    ? PROVIDER_IDS.filter((provider) => settings[provider]?.isConfigured)
    : [];

export const getCompactModelLabel = (label: string) => {
  const withoutAlias = label.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const geminiMatch = withoutAlias.match(
    /^Gemini\s+((?:\d+(?:\.\d+)?|Omni)(?:\s+Pro)?)/,
  );
  if (geminiMatch) {
    const variant = /\bLite\b/.test(withoutAlias)
      ? " Lite"
      : /\bFree\b/.test(withoutAlias)
      ? " Free"
      : "";
    return `Gemini ${geminiMatch[1]}${variant}`;
  }

  return withoutAlias.replace(/^GPT Image\s+/, "GPT ");
};

export const BUILTIN_MODEL_CATALOG = parseRemoteModelCatalog(
  builtinModelCatalog,
  "1.1.61",
);

const PROVIDER_LABELS: Record<ProviderId, string> = {
  gemini: "Gemini",
  zenmux: "ZenMux",
  fal: "fal.ai",
  jimeng: "火山方舟 / Seedream",
  openai: "OpenAI",
  openrouter: "OpenRouter",
  "openai-compatible": "OpenAI 兼容服务",
};

export const PROVIDER_CATALOG = Object.fromEntries(
  Object.entries(PROVIDER_LABELS).map(([id, label]) => {
    const provider = BUILTIN_MODEL_CATALOG.providers[id as ProviderId];
    return [
      id,
      {
        id,
        label,
        defaultModel: provider?.defaultModel ?? "",
        models: Object.fromEntries(
          (provider?.models ?? []).map((model) => [model.id, model]),
        ),
      },
    ];
  }),
) as Record<ProviderId, ProviderDefinition>;

let remoteProviderCatalog: Partial<Record<ProviderId, ProviderDefinition>> = {};

export const applyRemoteModelCatalog = (catalog: RemoteModelCatalog) => {
  if (catalog.revision < BUILTIN_MODEL_CATALOG.revision) return;
  remoteProviderCatalog = Object.fromEntries(
    Object.entries(catalog.providers).map(([id, provider]) => [
      id,
      {
        id,
        label: PROVIDER_CATALOG[id as ProviderId].label,
        defaultModel: provider.defaultModel,
        models: Object.fromEntries(
          provider.models.map((model) => [model.id, model]),
        ),
      },
    ]),
  );
};

export const resetRemoteModelCatalog = () => {
  remoteProviderCatalog = {};
};
const getActiveProviderDefinition = (provider: ProviderId) =>
  remoteProviderCatalog[provider] ?? PROVIDER_CATALOG[provider];

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
    quality: capabilities.supportsQuality === true,
    background: capabilities.supportsTransparentBackground === true,
  };
};

export const getDefaultModel = (provider: ProviderId) =>
  getActiveProviderDefinition(provider).defaultModel;

export const getProviderDefinition = (provider: ProviderId) =>
  getActiveProviderDefinition(provider);

export const getOptionalProviderDefinition = (provider: string | undefined) =>
  provider && Object.prototype.hasOwnProperty.call(PROVIDER_CATALOG, provider)
    ? getActiveProviderDefinition(provider as ProviderId)
    : null;

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
    if (isGptImage2OrLaterModel(modelId)) {
      return "zenmux-openai-images";
    }
    if (
      PROVIDER_CATALOG.zenmux.models[modelId]?.adapter ===
      "zenmux-openai-images"
    )
      return "zenmux-openai-images";
    return isZenMuxVertexImageApiModel(modelId)
      ? "zenmux-vertex-gpt-image"
      : "zenmux-vertex-generate-content";
  }

  if (provider === "openrouter") {
    return "openrouter-chat-image";
  }

  if (provider === "openai") {
    return "openai-images";
  }

  if (provider === "openai-compatible") {
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
    provider === "zenmux" &&
    isZenMuxNonGoogleVertexImageApiModel(normalizedModelId)
  ) {
    return "image-editing-aspect-ratio";
  }

  if (
    normalizedModelId.includes("gemini") ||
    normalizedModelId.includes("nano-banana") ||
    normalizedModelId.includes("image-preview") ||
    normalizedModelId.includes("gpt-image") ||
    normalizedModelId.includes("qwen-image")
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
  ...getActiveProviderDefinition(provider).models,
  ...getCustomModelMap(provider, customModels),
});

const fallbackCustomModel = (
  provider: ProviderId,
  model: string,
): ProviderModelDefinition => ({
  id: model,
  label: model,
  capabilities:
    CUSTOM_MODEL_CAPABILITY_TEMPLATES["text-to-image-aspect-ratio"]
      .capabilities,
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
}) => {
  const capabilities = getModelDefinition(
    args.provider,
    args.model,
    args.customModels,
  ).capabilities;
  if (
    isGptImageExtendedQualityModel(args.model) &&
    ["openai", "zenmux"].includes(args.provider)
  ) {
    return {
      ...capabilities,
      ...OPENAI_GPT_IMAGE_25_CAPABILITIES,
    };
  }
  if (args.provider === "zenmux" && isGptImage2OrLaterModel(args.model)) {
    return {
      ...capabilities,
      supportsQuality: true,
      supportsTransparentBackground: true,
    };
  }
  return capabilities;
};

export const getProviderRequestAdapter = (args: {
  provider: ProviderId;
  model?: string;
  customModels?: readonly CustomProviderModel[];
}) => {
  const modelId = args.model || getDefaultModel(args.provider);
  if (args.provider === "zenmux" && isGptImage2OrLaterModel(modelId)) {
    return "zenmux-openai-images";
  }
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
  const supportsReferenceImages =
    capabilities.supportsReferenceImages &&
    capabilities.maxReferenceImageCount > 0;
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

  const supportedQualities = getSupportedGenerationQualities({
    ...request,
    customModels: options.customModels,
  });
  const requestedQuality = request.quality ?? "auto";

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
    quality: capabilities.supportsQuality
      ? supportedQualities.includes(requestedQuality)
        ? requestedQuality
        : "auto"
      : undefined,
    background: capabilities.supportsTransparentBackground
      ? request.background ?? "auto"
      : undefined,
    reference: request.reference
      ? {
          ...request.reference,
          enabled: supportsReferenceImages && request.reference.enabled,
        }
      : request.reference ?? null,
  };
};

export const getVisibleGenerationFields = (args: {
  provider: ProviderId;
  model?: string;
  customModels?: readonly CustomProviderModel[];
}) => fieldVisibilityFromCapabilities(getProviderCapabilities(args));

export const getSupportedGenerationQualities = (args: {
  provider: ProviderId;
  model?: string;
  customModels?: readonly CustomProviderModel[];
}): readonly GenerationQuality[] => {
  const capabilities = getProviderCapabilities(args);
  if (!capabilities.supportsQuality) return [];
  return isGptImageExtendedQualityModel(args.model)
    ? EXTENDED_GENERATION_QUALITIES
    : STANDARD_GENERATION_QUALITIES;
};

export const getAspectRatioOptions = (args: {
  provider: ProviderId;
  model?: string;
  customModels?: readonly CustomProviderModel[];
}): readonly AspectRatioOption[] => {
  const adapter = getProviderRequestAdapter(args);

  if (
    (args.provider === "zenmux" || args.provider === "openai") &&
    isGptImage2OrLaterModel(args.model)
  ) {
    return GPT_IMAGE_2_PLUS_SIZE_OPTIONS;
  }

  if (adapter === "openai-images" && args.model?.includes("gpt-image-2")) {
    return OPENAI_GPT_IMAGE_2_ASPECT_RATIO_OPTIONS;
  }

  if (
    adapter === "openai-images" ||
    adapter === "zenmux-vertex-gpt-image" ||
    adapter === "zenmux-openai-images"
  ) {
    return OPENAI_IMAGE_ASPECT_RATIO_OPTIONS;
  }

  if (adapter === "openrouter-chat-image") {
    return [
      "google/gemini-3.1-flash-image-preview",
      "google/gemini-3.1-flash-image",
      "google/gemini-nano-banana-2.1",
    ].includes(args.model ?? "")
      ? OPENROUTER_EXTENDED_ASPECT_RATIO_OPTIONS
      : OPENROUTER_ASPECT_RATIO_OPTIONS;
  }

  if (
    args.provider === "fal" &&
    ["fal-ai/nano-banana-2", "google/nano-banana-2.1"].includes(
      args.model ?? "",
    )
  ) {
    return FAL_NANO_ASPECT_RATIO_OPTIONS;
  }

  return COMMON_ASPECT_RATIO_OPTIONS;
};
