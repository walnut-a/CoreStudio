import { describe, expect, it, vi } from "vitest";

import { createAgentImageGenerationService } from "./agentImageGenerationService";

const configuration = {
  schemaVersion: 2 as const,
  composerVisible: true,
  defaultProvider: "openai" as const,
  providers: {
    openai: {
      isConfigured: true,
      defaultModel: "gpt-image-1.5",
      lastStatus: "unknown" as const,
      lastCheckedAt: null,
      lastError: null,
    },
  },
};

const accessSettings = (
  allowImageGeneration: boolean,
  cursorAllowImageGeneration = allowImageGeneration,
) => ({
  enabled: true,
  integrations: {
    codex: { allowImageGeneration },
    cursor: { allowImageGeneration: cursorAllowImageGeneration },
    "claude-code": { allowImageGeneration: false },
  },
});

describe("createAgentImageGenerationService", () => {
  it("reports the current provider and model without exposing credentials", async () => {
    const service = createAgentImageGenerationService({
      loadAgentAccessSettings: async () => accessSettings(true),
      loadProviderSettings: async () => configuration,
      readProjectAssetPayloads: vi.fn(),
      generateImages: vi.fn(),
      writeImages: vi.fn(),
    });

    await expect(service.getCapability()).resolves.toMatchObject({
      supported: true,
      authorized: true,
      configured: true,
      currentProvider: "openai",
      currentModel: "gpt-image-1.5",
      capabilities: {
        maxImageCount: expect.any(Number),
        supportsImageCount: true,
        supportsReferenceImages: true,
      },
    });
  });

  it("checks authorization before contacting the configured provider", async () => {
    const generateImages = vi.fn();
    const service = createAgentImageGenerationService({
      loadAgentAccessSettings: async () => accessSettings(false),
      loadProviderSettings: async () => configuration,
      readProjectAssetPayloads: vi.fn(),
      generateImages,
      writeImages: vi.fn(),
    });

    await expect(
      service.generate({
        projectPath: "/tmp/project",
        prompt: "工业设计草图",
        count: 1,
        referenceFileIds: [],
        referenceElementIds: [],
      }),
    ).rejects.toMatchObject({ code: "IMAGE_GENERATION_DISABLED" });
    expect(generateImages).not.toHaveBeenCalled();
  });

  it("checks image generation authorization for the active Agent host", async () => {
    const generateImages = vi.fn();
    const service = createAgentImageGenerationService({
      loadAgentAccessSettings: async () => accessSettings(true, false),
      loadProviderSettings: async () => configuration,
      readProjectAssetPayloads: vi.fn(),
      generateImages,
      writeImages: vi.fn(),
    });

    await expect(service.getCapability("cursor")).resolves.toMatchObject({
      authorized: false,
    });
    await expect(
      service.generate({
        host: "cursor",
        projectPath: "/tmp/project",
        prompt: "工业设计草图",
        count: 1,
        referenceFileIds: [],
        referenceElementIds: [],
      }),
    ).rejects.toMatchObject({ code: "IMAGE_GENERATION_DISABLED" });
    expect(generateImages).not.toHaveBeenCalled();
  });

  it("locks the current model, generates, and writes the result exactly once", async () => {
    const generateImages = vi.fn(async ({ request }) => ({
      provider: request.provider,
      model: request.model,
      seed: null,
      createdAt: "2026-08-01T00:00:00.000Z",
      images: [
        {
          fileName: "result.png",
          mimeType: "image/png",
          dataBase64: "cmVzdWx0",
          width: 1024,
          height: 1024,
        },
      ],
    }));
    const writeImages = vi.fn(async ({ files }) => ({
      operationId: "operation-1",
      roomSequence: 3,
      persistedSequence: 3,
      persisted: true,
      elementIds: ["frame-1", "label-1", "element-1"],
      fileIds: files.map((file: { fileId: string }) => file.fileId),
      images: [
        {
          fileId: files[0].fileId,
          elementId: "element-1",
          frameId: "frame-1",
        },
      ],
    }));
    const createPlaceholders = vi.fn(async () => ({
      slots: [
        {
          frameId: "frame-1",
          labelId: "label-1",
          fitReturnedImageSize: false,
        },
      ],
    }));
    const service = createAgentImageGenerationService({
      loadAgentAccessSettings: async () => accessSettings(true),
      loadProviderSettings: async () => configuration,
      readProjectAssetPayloads: vi.fn(async () => []),
      generateImages,
      createPlaceholders,
      writeImages,
      randomId: () => "fixed-id",
    });

    const result = await service.generate({
      projectPath: "/tmp/project",
      prompt: "工业设计草图",
      count: 1,
      referenceFileIds: [],
      referenceElementIds: [],
    });

    expect(generateImages).toHaveBeenCalledWith({
      projectPath: "/tmp/project",
      request: expect.objectContaining({
        generationSource: "agent",
        provider: "openai",
        model: "gpt-image-1.5",
        prompt: "工业设计草图",
        imageCount: 1,
      }),
    });
    expect(createPlaceholders).toHaveBeenCalledBefore(generateImages);
    expect(writeImages).toHaveBeenCalledTimes(1);
    expect(writeImages.mock.calls[0][0].slots).toEqual([
      {
        frameId: "frame-1",
        labelId: "label-1",
        fitReturnedImageSize: false,
      },
    ]);
    expect(writeImages.mock.calls[0][0].files[0]).toMatchObject({
      fileId: "fixed-id",
      generationOrigin: "corestudio",
      generationSource: "agent",
      provider: "openai",
      model: "gpt-image-1.5",
    });
    expect(result).toMatchObject({
      provider: "openai",
      model: "gpt-image-1.5",
      generationSource: "agent",
      persisted: true,
      images: [
        {
          fileId: "fixed-id",
          elementId: "element-1",
          frameId: "frame-1",
        },
      ],
    });
  });
});
