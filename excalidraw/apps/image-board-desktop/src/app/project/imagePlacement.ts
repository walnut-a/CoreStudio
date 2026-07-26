import { BinaryHeap } from "@excalidraw/common";

import type { SceneBounds } from "../sceneGeometry";

export type { SceneBounds } from "../sceneGeometry";

export interface GeneratedImageGeometry {
  width: number;
  height: number;
}

export interface ImagePlacement extends SceneBounds {}

export interface GeneratedImagePlacementViewport {
  viewportCenter: { x: number; y: number };
  viewportSize: { width: number; height: number };
  zoomValue: number;
}

interface PlaceGeneratedImagesArgs {
  images: GeneratedImageGeometry[];
  viewportCenter: { x: number; y: number };
  viewportSize: { width: number; height: number };
  zoomValue: number;
  anchorPoint?: { x: number; y: number } | null;
  anchorBounds?: SceneBounds | null;
  occupiedBounds?: readonly SceneBounds[];
  previousBatchBounds?: SceneBounds | null;
  gap?: number;
}

const DISPLAY_MAX_WIDTH = 640;
const DISPLAY_MAX_HEIGHT = 512;

export const normalizeGeneratedImageDimensions = (
  image: GeneratedImageGeometry,
) => {
  const scale = Math.min(
    1,
    DISPLAY_MAX_WIDTH / image.width,
    DISPLAY_MAX_HEIGHT / image.height,
  );
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

export const resolveGeneratedImagePlacementViewport = ({
  explicitViewport,
  appViewport,
}: {
  explicitViewport?: GeneratedImagePlacementViewport | null;
  appViewport: GeneratedImagePlacementViewport;
}): GeneratedImagePlacementViewport => explicitViewport ?? appViewport;

export const getGeneratedImagePreviousBatchBounds = ({
  anchorBounds,
  anchorPoint,
  previousBatchBounds,
}: {
  anchorBounds?: SceneBounds | null;
  anchorPoint?: { x: number; y: number } | null;
  previousBatchBounds?: SceneBounds | null;
}): SceneBounds | null => {
  if (anchorBounds || anchorPoint) {
    return null;
  }

  return previousBatchBounds ?? null;
};

const rectanglesOverlap = (
  first: SceneBounds,
  second: SceneBounds,
  padding = 0,
) =>
  first.x < second.x + second.width + padding &&
  first.x + first.width > second.x - padding &&
  first.y < second.y + second.height + padding &&
  first.y + first.height > second.y - padding;

const findNearestOpenBatchStart = ({
  startX,
  startY,
  totalWidth,
  totalHeight,
  occupiedBounds,
  gap,
}: {
  startX: number;
  startY: number;
  totalWidth: number;
  totalHeight: number;
  occupiedBounds: readonly SceneBounds[];
  gap: number;
}) => {
  const getBatchBounds = (x: number, y: number) => ({
    x,
    y,
    width: totalWidth,
    height: totalHeight,
  });
  const getBlockingBounds = (x: number, y: number) => {
    const batchBounds = getBatchBounds(x, y);

    return occupiedBounds.filter((bounds) =>
      rectanglesOverlap(batchBounds, bounds, gap),
    );
  };
  type Candidate = { x: number; y: number; distanceSquared: number };
  const candidates = new BinaryHeap<Candidate>(
    (candidate) => candidate.distanceSquared,
  );
  const visited = new Set<string>();
  const enqueueCandidate = (x: number, y: number) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return;
    }
    const key = `${x}:${y}`;
    if (visited.has(key)) {
      return;
    }
    visited.add(key);
    candidates.push({
      x,
      y,
      distanceSquared: (x - startX) ** 2 + (y - startY) ** 2,
    });
  };

  enqueueCandidate(startX, startY);
  while (candidates.size()) {
    const candidate = candidates.pop();
    if (!candidate) {
      break;
    }
    const blockingBounds = getBlockingBounds(candidate.x, candidate.y);
    if (!blockingBounds.length) {
      return { x: candidate.x, y: candidate.y };
    }

    for (const bounds of blockingBounds) {
      enqueueCandidate(candidate.x, bounds.y + bounds.height + gap);
      enqueueCandidate(candidate.x, bounds.y - gap - totalHeight);
      enqueueCandidate(bounds.x - gap - totalWidth, candidate.y);
      enqueueCandidate(bounds.x + bounds.width + gap, candidate.y);
    }
  }

  throw new Error("Unable to find a non-overlapping image placement");
};

export const placeGeneratedImages = ({
  images,
  viewportCenter,
  anchorPoint,
  anchorBounds,
  occupiedBounds = [],
  previousBatchBounds,
  gap = 32,
}: PlaceGeneratedImagesArgs): ImagePlacement[] => {
  if (!images.length) {
    return [];
  }

  const normalized = images.map((image) =>
    normalizeGeneratedImageDimensions(image),
  );
  const columnCount =
    images.length === 1 ? 1 : Math.ceil(Math.sqrt(images.length));
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

  const preferredStartX = anchorX - totalWidth / 2;
  const preferredStartY = anchorY - totalHeight / 2;
  const openStart = findNearestOpenBatchStart({
    startX: preferredStartX,
    startY: preferredStartY,
    totalWidth,
    totalHeight,
    occupiedBounds,
    gap,
  });
  const startX = openStart.x;
  const startY = openStart.y;

  return normalized.map((image, imageIndex) => {
    const rowIndex = Math.floor(imageIndex / columnCount);
    const columnIndex = imageIndex % columnCount;

    const cellX =
      startX +
      columnWidths
        .slice(0, columnIndex)
        .reduce((sum, width) => sum + width, 0) +
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
