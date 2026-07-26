import { describe, expect, it } from "vitest";

import {
  parseRemoteModelCatalog,
  type RemoteModelCatalog,
} from "./modelCatalogContract";

const createCatalog = (): RemoteModelCatalog => ({
  schemaVersion: 1,
  revision: 1,
  publishedAt: "2026-07-26T21:00:00.000Z",
  minClientVersion: "1.1.26",
  modelAliases: {
    zenmux: {
      "google/gemini-3-pro-image-preview": "google/gemini-3-pro-image",
    },
  },
  providers: {
    zenmux: {
      defaultModel: "google/gemini-3-pro-image",
      models: [
        {
          id: "google/gemini-3-pro-image",
          label: "Gemini 3 Pro Image",
          adapter: "zenmux-vertex-generate-content",
          capabilities: {
            supportsNegativePrompt: false,
            supportsSeed: false,
            supportsImageCount: false,
            supportsReferenceImages: true,
            maxImageCount: 1,
            maxReferenceImageCount: 14,
            sizeControlMode: "aspect-ratio",
          },
        },
      ],
    },
  },
});

describe("remote model catalog contract", () => {
  it("accepts a compatible data-only catalog", () => {
    expect(parseRemoteModelCatalog(createCatalog(), "1.1.26")).toEqual(
      createCatalog(),
    );
  });

  it("rejects a catalog that needs a newer client", () => {
    expect(() => parseRemoteModelCatalog(createCatalog(), "1.1.25")).toThrow(
      "需要 CoreStudio 1.1.26",
    );
  });

  it("rejects endpoints and adapters outside the compiled allowlist", () => {
    expect(() =>
      parseRemoteModelCatalog(
        {
          ...createCatalog(),
          baseUrl: "https://attacker.example",
        },
        "1.1.26",
      ),
    ).toThrow("不支持的字段");

    const catalog = createCatalog();
    catalog.providers.zenmux!.models[0]!.adapter = "openai-images";

    expect(() => parseRemoteModelCatalog(catalog, "1.1.26")).toThrow(
      "ZenMux 不支持接口类型 openai-images",
    );
  });

  it("requires aliases to target an active model", () => {
    const catalog = createCatalog();
    catalog.modelAliases.zenmux!["google/gemini-3-pro-image-preview"] =
      "google/missing-model";

    expect(() => parseRemoteModelCatalog(catalog, "1.1.26")).toThrow(
      "替代模型不存在",
    );
  });
});
