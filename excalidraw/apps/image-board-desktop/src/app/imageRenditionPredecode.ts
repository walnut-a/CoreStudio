import type { ProjectAssetPayload } from "../shared/desktopBridgeTypes";

// Host-side backpressure only. The editor may perform its own decode later;
// no private image cache or additional editor API is used here.
export const predecodeImageRenditionAssets = async (
  assets: readonly ProjectAssetPayload[],
  createImage: () => Pick<HTMLImageElement, "src" | "decode"> = () =>
    new Image(),
): Promise<readonly ProjectAssetPayload[]> => {
  const decoded = await Promise.all(
    assets.map(async (asset) => {
      const image = createImage();
      image.src = `data:${asset.mimeType};base64,${asset.dataBase64}`;
      try {
        if (image.decode) await image.decode();
        return asset;
      } catch {
        return null;
      }
    }),
  );
  return decoded.filter(
    (asset): asset is ProjectAssetPayload => asset !== null,
  );
};
