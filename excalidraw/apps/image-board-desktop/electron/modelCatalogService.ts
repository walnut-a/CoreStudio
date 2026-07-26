import fs from "node:fs/promises";
import path from "node:path";

import {
  parseRemoteModelCatalog,
  type ModelCatalogSnapshot,
  type RemoteModelCatalog,
} from "../src/shared/modelCatalogContract";
import { applyRemoteModelCatalog } from "../src/shared/providerCatalog";

const CATALOG_FILE_NAME = "model-catalog.v1.json";
const CATALOG_URL =
  "https://api.github.com/repos/walnut-a/CoreStudio-Model-Catalog/contents/model-catalog.v1.json?ref=main";
const MAX_CATALOG_BYTES = 256 * 1024;

interface ModelCatalogServiceOptions {
  appVersion: string;
  cacheDirectory: string;
  fetchCatalog?: typeof fetch;
  now?: () => Date;
}

export const createModelCatalogService = ({
  appVersion,
  cacheDirectory,
  fetchCatalog = fetch,
  now = () => new Date(),
}: ModelCatalogServiceOptions) => {
  let state: ModelCatalogSnapshot = {
    source: "builtin",
    revision: null,
    checkedAt: null,
    catalog: null,
  };
  const cachePath = path.join(cacheDirectory, CATALOG_FILE_NAME);

  const activate = (
    catalog: RemoteModelCatalog,
    source: ModelCatalogSnapshot["source"],
    checkedAt: string | null,
  ) => {
    applyRemoteModelCatalog(catalog);
    state = {
      source,
      revision: catalog.revision,
      checkedAt,
      catalog,
    };
    return state;
  };

  const initialize = async () => {
    try {
      const cachedText = await fs.readFile(cachePath, "utf8");
      const catalog = parseRemoteModelCatalog(
        JSON.parse(cachedText) as unknown,
        appVersion,
      );
      return activate(catalog, "cache", null);
    } catch (error) {
      if (
        (error as NodeJS.ErrnoException).code !== "ENOENT" &&
        process.env.NODE_ENV !== "test"
      ) {
        console.warn("忽略无效的模型目录缓存", error);
      }
      return state;
    }
  };

  const refresh = async () => {
    const response = await fetchCatalog(CATALOG_URL, {
      headers: {
        Accept: "application/vnd.github.raw+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": `CoreStudio/${appVersion}`,
      },
    });
    if (!response.ok) {
      throw new Error(`模型目录下载失败（HTTP ${response.status}）`);
    }
    const catalogText = await response.text();
    if (Buffer.byteLength(catalogText, "utf8") > MAX_CATALOG_BYTES) {
      throw new Error("模型目录超过 256 KB 安全上限");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(catalogText) as unknown;
    } catch {
      throw new Error("模型目录不是有效的 JSON");
    }
    const catalog = parseRemoteModelCatalog(parsed, appVersion);

    await fs.mkdir(cacheDirectory, { recursive: true });
    const temporaryPath = `${cachePath}.${process.pid}.tmp`;
    await fs.writeFile(temporaryPath, catalogText, "utf8");
    await fs.rename(temporaryPath, cachePath);

    return activate(catalog, "remote", now().toISOString());
  };

  return {
    initialize,
    refresh,
    getState: () => state,
  };
};
