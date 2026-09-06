import type { DesktopMenuAction } from "../shared/desktopBridgeTypes";
import type { ImageRecordMap } from "../shared/projectTypes";
import { copy } from "./copy";
import { getImageAssetTitle } from "./imageAssetViewModel";

export interface ImageBrowseItem {
  fileId: string;
  title: string;
  sizeLabel: string;
}

export const buildImageBrowseItems = (
  sceneFileIds: readonly string[],
  records: ImageRecordMap,
): ImageBrowseItem[] =>
  [...new Set(sceneFileIds)].map((fileId) => {
    const record = records[fileId];
    return {
      fileId,
      title: record ? getImageAssetTitle(record) : copy.browse.untitled,
      sizeLabel: record ? `${record.width} × ${record.height} px` : "",
    };
  });

export const BROWSE_ROW_HEIGHT = 224;
export const getBrowseWindow = (
  count: number,
  width: number,
  height: number,
  scrollTop: number,
) => {
  const columns = Math.max(1, Math.min(8, Math.floor((width + 16) / 216)));
  const rows = Math.ceil(count / columns);
  const visibleRow = Math.min(
    Math.floor(scrollTop / BROWSE_ROW_HEIGHT),
    Math.max(0, rows - 1),
  );
  const firstRow = Math.max(0, visibleRow - 1);
  return {
    columns,
    start: firstRow * columns,
    end: Math.min(
      count,
      (visibleRow + Math.ceil(height / BROWSE_ROW_HEIGHT) + 2) * columns,
    ),
    offset: firstRow * BROWSE_ROW_HEIGHT,
    totalHeight: rows * BROWSE_ROW_HEIGHT,
  };
};

export const isBrowseMenuActionAllowed = (action: DesktopMenuAction) =>
  !action.startsWith("edit-") &&
  action !== "import-images" &&
  action !== "generate-image";
