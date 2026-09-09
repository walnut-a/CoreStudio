import type { RemoteModelCatalogModel } from "./modelCatalogContract";

export const ZENMUX_BASELINE_OPENAI_IMAGE_MODELS: Record<
  string,
  RemoteModelCatalogModel
> = Object.fromEntries(
  [
    ["meta/muse-image-1.0", "Muse Image 1.0"],
    ["x-ai/grok-imagine-image-2.0", "Grok Imagine Image 2.0"],
  ].map(([id, label]): [string, RemoteModelCatalogModel] => [
    id,
    {
      id,
      label,
      adapter: "zenmux-openai-images",
      capabilities: {
        supportsNegativePrompt: false,
        supportsSeed: false,
        supportsImageCount: false,
        supportsReferenceImages: true,
        maxImageCount: 1,
        maxReferenceImageCount: 1,
        sizeControlMode: "aspect-ratio",
      },
    },
  ]),
);

export const ZENMUX_GPT_IMAGE_25_MODELS: Record<
  string,
  RemoteModelCatalogModel
> = Object.fromEntries(
  [
    ["openai/gpt-image-2.5-flare", "GPT Image 2.5 Flare"],
    ["openai/gpt-image-2.5-sunburst", "GPT Image 2.5 Sunburst"],
  ].map(([id, label]): [string, RemoteModelCatalogModel] => [
    id,
    {
      id,
      label,
      adapter: "zenmux-openai-images",
      capabilities: {
        supportsNegativePrompt: false,
        supportsSeed: false,
        supportsImageCount: true,
        supportsReferenceImages: true,
        supportsQuality: true,
        supportsTransparentBackground: true,
        maxImageCount: 10,
        maxReferenceImageCount: 16,
        sizeControlMode: "aspect-ratio",
      },
    },
  ]),
);

export const ZENMUX_OPENAI_IMAGE_MODELS: Record<
  string,
  RemoteModelCatalogModel
> = {
  ...ZENMUX_BASELINE_OPENAI_IMAGE_MODELS,
  ...ZENMUX_GPT_IMAGE_25_MODELS,
};
