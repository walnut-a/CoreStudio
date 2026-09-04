import type { ProjectAssetPayload } from "../shared/desktopBridgeTypes";

export interface ImageAssetThumbnailSnapshot {
  projectPath: string | null;
  dataUrls: Readonly<Record<string, string>>;
}

export interface ImageAssetThumbnailStore {
  getSnapshot: () => ImageAssetThumbnailSnapshot;
  subscribe: (listener: () => void) => () => void;
  reset: (projectPath: string | null) => void;
  replace: (
    projectPath: string,
    assets: readonly ProjectAssetPayload[],
  ) => void;
  merge: (projectPath: string, assets: readonly ProjectAssetPayload[]) => void;
  touch: (projectPath: string, fileIds: readonly string[]) => void;
}

export const IMAGE_ASSET_THUMBNAIL_CACHE_LIMIT = 96;

const buildDataUrls = (assets: readonly ProjectAssetPayload[]) =>
  Object.fromEntries(
    assets.map((asset) => [
      asset.fileId,
      `data:${asset.mimeType};base64,${asset.dataBase64}`,
    ]),
  );

export const createImageAssetThumbnailStore = ({
  maxEntries = IMAGE_ASSET_THUMBNAIL_CACHE_LIMIT,
}: { maxEntries?: number } = {}): ImageAssetThumbnailStore => {
  const normalizedMaxEntries = Math.max(1, Math.floor(maxEntries));
  const recentDataUrls = new Map<string, string>();
  let snapshot: ImageAssetThumbnailSnapshot = {
    projectPath: null,
    dataUrls: {},
  };
  const listeners = new Set<() => void>();
  const publish = (next: ImageAssetThumbnailSnapshot) => {
    snapshot = next;
    listeners.forEach((listener) => listener());
  };
  const publishRecentDataUrls = (projectPath: string) => {
    publish({
      projectPath,
      dataUrls: Object.fromEntries(recentDataUrls),
    });
  };
  const addRecentAssets = (assets: readonly ProjectAssetPayload[]) => {
    for (const [fileId, dataUrl] of Object.entries(buildDataUrls(assets))) {
      recentDataUrls.delete(fileId);
      recentDataUrls.set(fileId, dataUrl);
    }
    while (recentDataUrls.size > normalizedMaxEntries) {
      const oldestFileId = recentDataUrls.keys().next().value;
      if (oldestFileId === undefined) {
        break;
      }
      recentDataUrls.delete(oldestFileId);
    }
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    reset: (projectPath) => {
      if (
        snapshot.projectPath === projectPath &&
        Object.keys(snapshot.dataUrls).length === 0
      ) {
        return;
      }
      recentDataUrls.clear();
      publish({ projectPath, dataUrls: {} });
    },
    replace: (projectPath, assets) => {
      recentDataUrls.clear();
      addRecentAssets(assets);
      publishRecentDataUrls(projectPath);
    },
    merge: (projectPath, assets) => {
      if (assets.length === 0) {
        return;
      }
      if (snapshot.projectPath !== projectPath) {
        recentDataUrls.clear();
      }
      addRecentAssets(assets);
      publishRecentDataUrls(projectPath);
    },
    touch: (projectPath, fileIds) => {
      if (snapshot.projectPath !== projectPath) {
        return;
      }
      for (const fileId of fileIds) {
        const dataUrl = recentDataUrls.get(fileId);
        if (dataUrl === undefined) {
          continue;
        }
        recentDataUrls.delete(fileId);
        recentDataUrls.set(fileId, dataUrl);
      }
    },
  };
};
