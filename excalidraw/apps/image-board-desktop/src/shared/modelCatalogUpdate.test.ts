import { afterEach, describe, expect, it } from "vitest";
import {
  applyRemoteModelCatalog,
  getModelDefinition,
  getProviderCapabilities,
  getProviderDefinition,
  resetRemoteModelCatalog,
} from "./providerCatalog";

afterEach(resetRemoteModelCatalog);

describe("2026 年 11 月模型目录", () => {
  it("内置新模型并使用已支持的接口与参考图约束", () => {
    expect(
      getModelDefinition("gemini", "gemini-nano-banana-2.1"),
    ).toMatchObject({
      adapter: "gemini-generate-content",
      capabilities: { maxReferenceImageCount: 14 },
    });
    expect(getModelDefinition("fal", "google/nano-banana-2.1").adapter).toBe(
      "fal-image",
    );
    expect(
      getModelDefinition("jimeng", "doubao-seedream-5-5-261028").capabilities,
    ).toMatchObject({ maxImageCount: 1, maxReferenceImageCount: 10 });
    expect(
      getModelDefinition("zenmux", "minimax/minimax-h3-image").adapter,
    ).toBe("zenmux-openai-images");
    expect(
      getProviderCapabilities({
        provider: "openai",
        model: "gpt-image-2.6-flare",
      }),
    ).toMatchObject({
      supportsQuality: true,
      maxImageCount: 10,
      maxReferenceImageCount: 16,
    });
  });

  it("旧远程目录不能覆盖更新的内置目录，新目录仍可删除预置", () => {
    const oldModel = getModelDefinition("gemini", "gemini-2.5-flash-image");
    const catalog = {
      schemaVersion: 1 as const,
      revision: 5,
      publishedAt: "2026-09-09T00:00:00Z",
      minClientVersion: "1.1.49",
      modelAliases: {},
      providers: {
        gemini: {
          defaultModel: oldModel.id,
          models: [
            { ...oldModel, adapter: "gemini-generate-content" as const },
          ],
        },
      },
    };
    applyRemoteModelCatalog(catalog);
    expect(getProviderDefinition("gemini").models).toHaveProperty(
      "gemini-nano-banana-2.1",
    );
    applyRemoteModelCatalog({ ...catalog, revision: 7 });
    expect(getProviderDefinition("gemini").models).not.toHaveProperty(
      "gemini-nano-banana-2.1",
    );
  });
});

it("下载旧目录不会回退当前目录，下载失败保留有效缓存", async () => {
  const fs = await import("node:fs/promises");
  const os = await import("node:os");
  const path = await import("node:path");
  const { createModelCatalogService } = await import(
    "../../electron/modelCatalogService"
  );
  const { BUILTIN_MODEL_CATALOG } = await import("./providerCatalog");
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "catalog-update-"));
  let catalog: unknown = { ...BUILTIN_MODEL_CATALOG, revision: 7 };
  const service = createModelCatalogService({
    appVersion: "1.1.61",
    cacheDirectory: directory,
    fetchCatalog: async () => new Response(JSON.stringify(catalog)),
  });
  try {
    expect((await service.initialize()).source).toBe("builtin");
    expect((await service.refresh()).revision).toBe(7);
    catalog = { ...BUILTIN_MODEL_CATALOG, revision: 5 };
    expect((await service.refresh()).revision).toBe(7);
    catalog = { schemaVersion: 2 };
    await expect(service.refresh()).rejects.toThrow("schemaVersion");
    const cached = JSON.parse(
      await fs.readFile(path.join(directory, "model-catalog.v1.json"), "utf8"),
    );
    expect(cached.revision).toBe(7);
    expect(service.getState().revision).toBe(7);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
