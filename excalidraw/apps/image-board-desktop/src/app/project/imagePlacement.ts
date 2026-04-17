export interface GeneratedImageGeometry {
  width: number;
  height: number;
}

export interface SceneBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImagePlacement extends SceneBounds {}

interface PlaceGeneratedImagesArgs {
  images: GeneratedImageGeometry[];
  viewportCenter: { x: number; y: number };
  viewportSize: { width: number; height: number };
  zoomValue: number;
  anchorPoint?: { x: number; y: number } | null;
  anchorBounds?: SceneBounds | null;
  previousBatchBounds?: SceneBounds | null;
  gap?: number;
}

const normalizeDimensions = (
  image: GeneratedImageGeometry,
  viewportHeight: number,
  zoomValue: number,
) => {
  const minHeight = Math.max(viewportHeight - 120, 160);
  const maxHeight = Math.min(
    minHeight,
    Math.floor(viewportHeight * 0.5) / Math.max(zoomValue, 0.1),
  );
  const scale = Math.min(1, maxHeight / image.height);
  return {
    width: Math.round(image.width * scale),
    height: Math.round(image.height * scale),
  };
};

export const measureBatchBounds = (
  placements: readonly ImagePlacement[],
): SceneBounds | null => {
  if (!placements.length) {
    return null;
  }

  const left = Math.min(...placements.map((placement) => placement.x));
  const top = Math.min(...placements.map((placement) => placement.y));
  const right = Math.max(
    ...placements.map((placement) => placement.x + placement.width),
  );
  const bottom = Math.max(
    ...placements.map((placement) => placement.y + placement.height),
  );

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
};

export const placeGeneratedImages = ({
  images,
  viewportCenter,
  viewportSize,
  zoomValue,
  anchorPoint,
  anchorBounds,
  previousBatchBounds,
  gap = 32,
}: PlaceGeneratedImagesArgs): ImagePlacement[] => {
  if (!images.length) {
    return [];
  }

  const normalized = images.map((image) =>
    normalizeDimensions(image, viewportSize.height, zoomValue),
  );
  const columnCount = images.length === 1 ? 1 : Math.ceil(Math.sqrt(images.length));
  const rowCount = Math.ceil(images.length / columnCount);
  const columnWidths = Array.from({ length: columnCount }, (_, columnIndex) =>
    Math.max(
      ...normalized
        .filter((_, imageIndex) => imageIndex % columnCount === columnIndex)
        .map((image) => image.width),
    ),
  );
  const rowHeights = Array.from({ length: rowCount }, (_, rowIndex) =>
    Math.max(
      ...normalized
        .slice(rowIndex * columnCount, rowIndex * columnCount + columnCount)
        .map((image) => image.height),
    ),
  );

  const totalWidth =
    columnWidths.reduce((sum, width) => sum + width, 0) +
    gap * (columnCount - 1);
  const totalHeight =
    rowHeights.reduce((sum, height) => sum + height, 0) + gap * (rowCount - 1);

  const anchorX = anchorBounds
    ? anchorBounds.x + anchorBounds.width + gap * 2 + totalWidth / 2
    : anchorPoint
      ? anchorPoint.x
      : previousBatchBounds
        ? previousBatchBounds.x +
          previousBatchBounds.width +
          gap * 2 +
          totalWidth / 2
        : viewportCenter.x;
  const anchorY = anchorBounds
    ? anchorBounds.y + anchorBounds.height / 2
    : anchorPoint
      ? anchorPoint.y
      : previousBatchBounds
        ? previousBatchBounds.y + previousBatchBounds.height / 2
        : viewportCenter.y;

  const startX = anchorX - totalWidth / 2;
  const startY = anchorY - totalHeight / 2;

  return normalized.map((image, imageIndex) => {
    const rowIndex = Math.floor(imageIndex / columnCount);
    const columnIndex = imageIndex % columnCount;

    const cellX =
      startX +
      columnWidths.slice(0, columnIndex).reduce((sum, width) => sum + width, 0) +
      gap * columnIndex;
    const cellY =
      startY +
      rowHeights.slice(0, rowIndex).reduce((sum, height) => sum + height, 0) +
      gap * rowIndex;

    return {
      x: Math.round(cellX + (columnWidths[columnIndex] - image.width) / 2),
      y: Math.round(cellY + (rowHeights[rowIndex] - image.height) / 2),
      width: image.width,
      height: image.height,
    };
  });
};
