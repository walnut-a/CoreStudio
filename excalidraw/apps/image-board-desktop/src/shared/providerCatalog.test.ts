import { describe, expect, it } from "vitest";

import {
  getDefaultModel,
  getProviderCapabilities,
  getProviderDefinition,
  getVisibleGenerationFields,
  normalizeGenerationRequest,
} from "./providerCatalog";

describe("providerCatalog", () => {
  it("returns the documented default models", () => {
    expect(getDefaultModel("gemini")).toBe("gemini-2.5-flash-image");
    expect(getDefaultModel("zenmux")).toBe("google/gemini-2.5-flash-image");
    expect(getDefaultModel("fal")).toBe("fal-ai/nano-banana-2");
  });

  it("includes the supported image models for each provider", () => {
    const geminiDefinition = getProviderDefinition("gemini");
    const zenmuxDefinition = getProviderDefinition("zenmux");
    const falDefinition = getProviderDefinition("fal");

    expect(Object.keys(geminiDefinition.models)).toContain("gemini-2.5-flash-image");
    expect(Object.keys(geminiDefinition.models)).toContain(
      "gemini-3.1-flash-image-preview",
    );
    expect(Object.keys(geminiDefinition.models)).toContain("gemini-3-pro-image-preview");
    expect(Object.keys(zenmuxDefinition.models)).toContain(
      "google/gemini-2.5-flash-image",
    );
    expect(Object.keys(zenmuxDefinition.models)).toContain(
      "google/gemini-3-pro-image-preview",
    );
    expect(Object.keys(falDefinition.models)).toContain("fal-ai/nano-banana-2");
  });

  it("hides unsupported fields for Gemini native image models", () => {
    expect(
      getVisibleGenerationFields({
        provider: "gemini",
        model: "gemini-2.5-flash-image",
      }),
    ).toEqual({
      prompt: true,
      negativePrompt: false,
      width: true,
      height: true,
      seed: false,
      imageCount: false,
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
  });
});
