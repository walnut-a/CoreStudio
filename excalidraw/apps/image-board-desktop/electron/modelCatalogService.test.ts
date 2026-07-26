import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { resetRemoteModelCatalog } from "../src/shared/providerCatalog";
import { createModelCatalogService } from "./modelCatalogService";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  resetRemoteModelCatalog();
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

const createCacheDirectory = async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "corestudio-model-catalog-"),
  );
  temporaryDirectories.push(directory);
  return directory;
};

const catalogJson = JSON.stringify({
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

describe("model catalog service", () => {
  it("downloads, validates and atomically caches a remote catalog", async () => {
    const cacheDirectory = await createCacheDirectory();
    const fetchCatalog = vi.fn(
      async () =>
        new Response(catalogJson, {
          status: 200,
          headers: { etag: '"catalog-v1"' },
        }),
    );
    const service = createModelCatalogService({
      appVersion: "1.1.26",
      cacheDirectory,
      fetchCatalog,
      now: () => new Date("2026-07-26T22:00:00.000Z"),
    });

    const result = await service.refresh();

    expect(result).toMatchObject({
      source: "remote",
      revision: 1,
      checkedAt: "2026-07-26T22:00:00.000Z",
    });
    await expect(
      fs.readFile(path.join(cacheDirectory, "model-catalog.v1.json"), "utf8"),
    ).resolves.toBe(catalogJson);
  });

  it("keeps the last-known-good catalog when an update is invalid", async () => {
    const cacheDirectory = await createCacheDirectory();
    const fetchCatalog = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(catalogJson, {
          status: 200,
          headers: { etag: '"catalog-v1"' },
        }),
      )
      .mockResolvedValueOnce(
        new Response('{"schemaVersion":99}', { status: 200 }),
      );
    const service = createModelCatalogService({
      appVersion: "1.1.26",
      cacheDirectory,
      fetchCatalog,
    });

    await service.refresh();
    await expect(service.refresh()).rejects.toThrow("schemaVersion");
    expect(service.getState()).toMatchObject({
      source: "remote",
      revision: 1,
    });
  });

  it("loads a valid cached catalog without network access", async () => {
    const cacheDirectory = await createCacheDirectory();
    await fs.writeFile(
      path.join(cacheDirectory, "model-catalog.v1.json"),
      catalogJson,
      "utf8",
    );
    const service = createModelCatalogService({
      appVersion: "1.1.26",
      cacheDirectory,
      fetchCatalog: vi.fn(),
    });

    await service.initialize();

    expect(service.getState()).toMatchObject({
      source: "cache",
      revision: 1,
    });
  });
});
