import type { RemoteModelCatalogModel } from "./modelCatalogContract";

// 只开放已确认的基础生图与单参考图编辑；不沿用 GPT 专属的输出参数。
export const ZENMUX_OPENAI_IMAGE_MODELS: Record<
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
