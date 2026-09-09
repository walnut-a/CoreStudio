import { afterEach, describe, expect, it } from "vitest";
import {
  applyRemoteModelCatalog,
  getProviderCapabilities,
  getProviderRequestAdapter,
  getProviderModels,
  normalizeGenerationRequest,
  resetRemoteModelCatalog,
} from "./providerCatalog";
import { ZENMUX_OPENAI_IMAGE_MODELS } from "./zenmuxOpenAIModels";

afterEach(resetRemoteModelCatalog);

describe("ZenMux OpenAI image presets", () => {
  it.each(Object.keys(ZENMUX_OPENAI_IMAGE_MODELS))(
    "routes %s to OpenAI Images and limits generation to the supported baseline",
    (model) => {
      expect(getProviderRequestAdapter({ provider: "zenmux", model })).toBe(
        "zenmux-openai-images",
      );
      expect(
        getProviderCapabilities({ provider: "zenmux", model }),
      ).toMatchObject({
        maxImageCount: 1,
        maxReferenceImageCount: 1,
        supportsReferenceImages: true,
        supportsSeed: false,
        supportsNegativePrompt: false,
      });
      expect(
        normalizeGenerationRequest({
          provider: "zenmux",
          model,
          prompt: "产品",
          width: 1024,
          height: 1024,
          imageCount: 10,
        }),
      ).toMatchObject({ imageCount: 1 });
    },
  );

  it("keeps GPT Image 2 on OpenAI Images when a remote catalog still names the old Vertex route", () => {
    const vertex = getProviderModels("zenmux")["openai/gpt-image-2"];
    applyRemoteModelCatalog({
      schemaVersion: 1,
      revision: 4,
      publishedAt: "2026-09-06T00:00:00Z",
      minClientVersion: "1.1.49",
      modelAliases: {},
      providers: {
        zenmux: {
          defaultModel: vertex.id,
          models: [
            { ...vertex, adapter: "zenmux-vertex-gpt-image" },
            ...Object.values(ZENMUX_OPENAI_IMAGE_MODELS),
          ],
        },
      },
    });
    expect(
      getProviderRequestAdapter({ provider: "zenmux", model: vertex.id }),
    ).toBe("zenmux-openai-images");
    for (const model of Object.keys(ZENMUX_OPENAI_IMAGE_MODELS))
      expect(getProviderModels("zenmux")[model]).toBeDefined();
  });
});
