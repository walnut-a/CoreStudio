import type { DesktopMenuAction } from "../shared/desktopBridgeTypes";
import type { ImageRecordMap } from "../shared/projectTypes";
import { copy } from "./copy";
import { getImageAssetTitle } from "./imageAssetViewModel";

export interface ImageBrowseItem {
  fileId: string;
  title: string;
  sizeLabel: string;
  aspectRatio: number;
}

export const buildImageBrowseItems = (
  sceneFileIds: readonly string[],
  records: ImageRecordMap,
): ImageBrowseItem[] =>
  [...new Set(sceneFileIds)].map((fileId) => {
    const record = records[fileId];
    return {
      fileId,
      aspectRatio:
        record && record.width > 0 && record.height > 0
          ? record.width / record.height
          : 1,
      title: record ? getImageAssetTitle(record) : copy.browse.untitled,
      sizeLabel: record ? `${record.width} × ${record.height} px` : "",
    };
  });

interface BrowseTile {
  left: number;
  top: number;
  width: number;
  height: number;
}
interface BrowseRow {
  start: number;
  end: number;
  top: number;
  height: number;
}
interface BrowseLayout {
  tiles: BrowseTile[];
  rows: BrowseRow[];
  totalHeight: number;
}

const ROW_TARGET_HEIGHT = 208;
const ROW_GAP = 24;

export const buildBrowseLayout = (
  items: readonly ImageBrowseItem[],
  availableWidth: number,
): BrowseLayout => {
  const width = Math.max(1, availableWidth);
  const ratios = items.map(({ aspectRatio }) =>
    Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1,
  );
  const tiles: BrowseTile[] = [];
  const rows: BrowseRow[] = [];
  let top = 0;
  let start = 0;
  while (start < items.length) {
    let end = start;
    let sum = 0;
    while (end < items.length) {
      const nextSum = sum + ratios[end];
      const count = end - start + 1;
      const nextHeight = (width - ROW_GAP * (count - 1)) / nextSum;
      if (end > start && nextHeight <= 0) break;
      // Pick the row break closest to the target height, preserving source order.
      if (end > start && nextHeight < ROW_TARGET_HEIGHT) {
        const previousHeight = (width - ROW_GAP * (count - 2)) / sum;
        if (
          Math.abs(previousHeight - ROW_TARGET_HEIGHT) <
          Math.abs(nextHeight - ROW_TARGET_HEIGHT)
        )
          break;
      }
      sum = nextSum;
      end++;
      // Bound row density even for a collection of extremely narrow images.
      if (nextHeight <= ROW_TARGET_HEIGHT || count >= 12) break;
    }
    const fittedHeight = (width - ROW_GAP * (end - start - 1)) / sum;
    const height = Math.min(
      fittedHeight,
      end === items.length ? ROW_TARGET_HEIGHT : 260,
    );
    let left = 0;
    for (let index = start; index < end; index++) {
      const tileWidth = ratios[index] * height;
      tiles.push({ left, top, width: tileWidth, height });
      left += tileWidth + ROW_GAP;
    }
    rows.push({ start, end, top, height });
    top += height + ROW_GAP;
    start = end;
  }
  return { tiles, rows, totalHeight: Math.max(0, top - ROW_GAP) };
};

export const getBrowseWindow = (
  layout: BrowseLayout,
  height: number,
  scrollTop: number,
) => {
  const { rows } = layout;
  if (!rows.length) return { start: 0, end: 0 };
  const top = Math.min(
    Math.max(0, scrollTop),
    Math.max(0, layout.totalHeight - height),
  );
  let low = 0;
  let high = rows.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (rows[middle].top + rows[middle].height < top) low = middle + 1;
    else high = middle;
  }
  const first = Math.max(0, low - 1);
  let last = Math.min(low, rows.length - 1);
  while (last < rows.length - 1 && rows[last].top < top + height) last++;
  return { start: rows[first].start, end: rows[last].end };
};

export const isBrowseMenuActionAllowed = (action: DesktopMenuAction) =>
  !action.startsWith("edit-") &&
  action !== "import-images" &&
  action !== "generate-image";
