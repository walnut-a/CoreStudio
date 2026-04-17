import type {
  GenerationField,
  GenerationRequest,
  ProviderCapabilities,
  ProviderDefinition,
  ProviderId,
} from "./providerTypes";

const NATIVE_IMAGE_CAPABILITIES: ProviderCapabilities = {
  supportsNegativePrompt: false,
  supportsSeed: false,
  supportsImageCount: false,
  supportsReferenceImages: true,
  maxImageCount: 1,
  sizeControlMode: "aspect-ratio",
};

const EXACT_IMAGE_FIELDS: Record<GenerationField, true> = {
  prompt: true,
  negativePrompt: true,
  width: true,
  height: true,
  seed: true,
  imageCount: true,
};

export const PROVIDER_IDS = ["gemini", "zenmux", "fal"] as const;

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
      },
      "google/gemini-2.5-flash-image-free": {
        id: "google/gemini-2.5-flash-image-free",
        label: "Gemini 2.5 Flash Image Free",
        capabilities: NATIVE_IMAGE_CAPABILITIES,
      },
      "google/gemini-3-pro-image-preview": {
        id: "google/gemini-3-pro-image-preview",
        label: "Gemini 3 Pro Image Preview",
        capabilities: NATIVE_IMAGE_CAPABILITIES,
      },
      "google/gemini-3-pro-image-preview-free": {
        id: "google/gemini-3-pro-image-preview-free",
        label: "Gemini 3 Pro Image Preview Free",
        capabilities: NATIVE_IMAGE_CAPABILITIES,
      },
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
};

const fieldVisibilityFromCapabilities = (
  capabilities: ProviderCapabilities,
): Record<GenerationField, boolean> => {
  return {
    ...EXACT_IMAGE_FIELDS,
    negativePrompt: capabilities.supportsNegativePrompt,
    seed: capabilities.supportsSeed,
    imageCount: capabilities.supportsImageCount,
  };
};

export const getDefaultModel = (provider: ProviderId) =>
  PROVIDER_CATALOG[provider].defaultModel;

export const getProviderDefinition = (provider: ProviderId) =>
  PROVIDER_CATALOG[provider];

export const getModelDefinition = (provider: ProviderId, model?: string) => {
  const definition = getProviderDefinition(provider);
  return definition.models[model || definition.defaultModel];
};

export const getProviderCapabilities = (args: {
  provider: ProviderId;
  model?: string;
}) => getModelDefinition(args.provider, args.model).capabilities;

export const normalizeGenerationRequest = (
  request: GenerationRequest,
): GenerationRequest => {
  const capabilities = getProviderCapabilities(request);

  return {
    ...request,
    negativePrompt: capabilities.supportsNegativePrompt
      ? request.negativePrompt
      : undefined,
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
}) => fieldVisibilityFromCapabilities(getProviderCapabilities(args));
