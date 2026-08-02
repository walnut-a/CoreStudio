import type { ProjectAssetPayload } from "../src/shared/desktopBridgeTypes";
import type { ProjectRoomSceneElement } from "../src/shared/projectRoomProtocol";

const EXCALIDRAW_CLIPBOARD_TYPE = "excalidraw/clipboard";

const collectClipboardImageFileIds = (
  elements: readonly ProjectRoomSceneElement[],
) => {
  const fileIds = new Set<string>();
  for (const element of elements) {
    if (
      !element.isDeleted &&
      element.type === "image" &&
      typeof element.fileId === "string" &&
      element.fileId
    ) {
      fileIds.add(element.fileId);
    }
  }
  return Array.from(fileIds);
};

export const buildProjectClipboardPayload = ({
  elements,
  assets,
}: {
  elements: readonly ProjectRoomSceneElement[];
  assets: readonly ProjectAssetPayload[];
}) => {
  const assetsByFileId = new Map(assets.map((asset) => [asset.fileId, asset]));
  const files = Object.fromEntries(
    collectClipboardImageFileIds(elements).map((fileId) => {
      const asset = assetsByFileId.get(fileId);
      if (!asset) {
        throw new Error(`无法复制图片 ${fileId}：源项目中的原图不可读。`);
      }
      const created = Date.parse(asset.createdAt);
      return [
        fileId,
        {
          id: fileId,
          mimeType: asset.mimeType,
          dataURL: `data:${asset.mimeType};base64,${asset.dataBase64}`,
          created: Number.isFinite(created) ? created : Date.now(),
        },
      ];
    }),
  );

  return {
    type: EXCALIDRAW_CLIPBOARD_TYPE,
    elements,
    files,
  };
};

export const writeProjectElementsToClipboard = async ({
  projectPath,
  elements,
  readProjectAssetPayloads,
  writeClipboard,
}: {
  projectPath: string;
  elements: readonly ProjectRoomSceneElement[];
  readProjectAssetPayloads: (input: {
    projectPath: string;
    fileIds: string[];
    rendition: "original" | "thumbnail";
  }) => Promise<ProjectAssetPayload[]>;
  writeClipboard: (input: {
    text: string;
    previewImageDataUrl?: string;
  }) => void;
}) => {
  const fileIds = collectClipboardImageFileIds(elements);
  const assets = fileIds.length
    ? await readProjectAssetPayloads({
        projectPath,
        fileIds,
        rendition: "original",
      })
    : [];
  const previewAsset =
    fileIds.length === 1
      ? (
          await readProjectAssetPayloads({
            projectPath,
            fileIds,
            rendition: "thumbnail",
          })
        )[0]
      : undefined;
  const payload = buildProjectClipboardPayload({ elements, assets });
  writeClipboard({
    text: JSON.stringify(payload),
    previewImageDataUrl: previewAsset
      ? `data:${previewAsset.mimeType};base64,${previewAsset.dataBase64}`
      : undefined,
  });
};
