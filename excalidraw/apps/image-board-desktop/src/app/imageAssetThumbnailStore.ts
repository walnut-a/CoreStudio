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
  merge: (
    projectPath: string,
    assets: readonly ProjectAssetPayload[],
  ) => void;
}

const buildDataUrls = (assets: readonly ProjectAssetPayload[]) =>
  Object.fromEntries(
    assets.map((asset) => [
      asset.fileId,
      `data:${asset.mimeType};base64,${asset.dataBase64}`,
    ]),
  );

export const createImageAssetThumbnailStore = (): ImageAssetThumbnailStore => {
  let snapshot: ImageAssetThumbnailSnapshot = {
    projectPath: null,
    dataUrls: {},
  };
  const listeners = new Set<() => void>();
  const publish = (next: ImageAssetThumbnailSnapshot) => {
    snapshot = next;
    listeners.forEach((listener) => listener());
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
      publish({ projectPath, dataUrls: {} });
    },
    replace: (projectPath, assets) => {
      publish({ projectPath, dataUrls: buildDataUrls(assets) });
    },
    merge: (projectPath, assets) => {
      if (assets.length === 0) {
        return;
      }
      const currentDataUrls =
        snapshot.projectPath === projectPath ? snapshot.dataUrls : {};
      publish({
        projectPath,
        dataUrls: { ...currentDataUrls, ...buildDataUrls(assets) },
      });
    },
  };
};
