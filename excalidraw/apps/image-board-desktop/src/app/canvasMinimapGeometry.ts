import type { AppState, Offsets } from "@excalidraw/excalidraw/types";

import type { SceneBounds } from "./sceneGeometry";

type ViewportAppState = Pick<
  AppState,
  "height" | "scrollX" | "scrollY" | "width" | "zoom"
>;

type RectLike = Pick<
  DOMRect,
  "bottom" | "height" | "left" | "right" | "top" | "width"
>;

export interface CanvasMinimapTransform {
  mapHeight: number;
  mapWidth: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  sceneBounds: SceneBounds;
}

const finite = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const positive = (value: unknown, fallback = 0) =>
  Math.max(0, finite(value, fallback));

const normalizeOffsets = (offsets?: Offsets): Required<Offsets> => ({
  top: positive(offsets?.top),
  right: positive(offsets?.right),
  bottom: positive(offsets?.bottom),
  left: positive(offsets?.left),
});

export const mergeCanvasViewportOffsets = (
  ...offsetSets: Array<Offsets | undefined>
): Required<Offsets> =>
  offsetSets.reduce<Required<Offsets>>(
    (merged, offsets) => {
      const next = normalizeOffsets(offsets);
      return {
        top: Math.max(merged.top, next.top),
        right: Math.max(merged.right, next.right),
        bottom: Math.max(merged.bottom, next.bottom),
        left: Math.max(merged.left, next.left),
      };
    },
    { top: 0, right: 0, bottom: 0, left: 0 },
  );

const overlapsVertically = (canvas: RectLike, surface: RectLike) =>
  Math.min(canvas.bottom, surface.bottom) > Math.max(canvas.top, surface.top);

export const measureEdgeOcclusionOffsets = (
  canvas: RectLike,
  surfaces: { left?: RectLike | null; right?: RectLike | null },
): Required<Offsets> => {
  const tolerance = 1;
  const offsets = { top: 0, right: 0, bottom: 0, left: 0 };

  if (
    surfaces.left &&
    overlapsVertically(canvas, surfaces.left) &&
    surfaces.left.left <= canvas.left + tolerance &&
    surfaces.left.right > canvas.left
  ) {
    offsets.left = Math.min(
      canvas.width,
      positive(surfaces.left.right - canvas.left),
    );
  }

  if (
    surfaces.right &&
    overlapsVertically(canvas, surfaces.right) &&
    surfaces.right.right >= canvas.right - tolerance &&
    surfaces.right.left < canvas.right
  ) {
    offsets.right = Math.min(
      canvas.width,
      positive(canvas.right - surfaces.right.left),
    );
  }

  return offsets;
};

export const getCanvasViewportBounds = (
  appState: ViewportAppState,
  offsets?: Offsets,
): SceneBounds => {
  const width = positive(appState.width);
  const height = positive(appState.height);
  const scrollX = finite(appState.scrollX);
  const scrollY = finite(appState.scrollY);
  const zoom = Math.max(0.0001, positive(appState.zoom?.value, 1));
  const normalizedOffsets = normalizeOffsets(offsets);
  const usableWidth = Math.max(
    0,
    width - normalizedOffsets.left - normalizedOffsets.right,
  );
  const usableHeight = Math.max(
    0,
    height - normalizedOffsets.top - normalizedOffsets.bottom,
  );

  return {
    x: -scrollX + normalizedOffsets.left / zoom,
    y: -scrollY + normalizedOffsets.top / zoom,
    width: usableWidth / zoom,
    height: usableHeight / zoom,
  };
};

const unionBounds = (first: SceneBounds, second: SceneBounds): SceneBounds => {
  const left = Math.min(first.x, second.x);
  const top = Math.min(first.y, second.y);
  const right = Math.max(first.x + first.width, second.x + second.width);
  const bottom = Math.max(first.y + first.height, second.y + second.height);

  return { x: left, y: top, width: right - left, height: bottom - top };
};

const normalizeSceneBounds = (bounds: SceneBounds): SceneBounds => ({
  x: finite(bounds.x),
  y: finite(bounds.y),
  width: Math.max(1, positive(bounds.width, 1)),
  height: Math.max(1, positive(bounds.height, 1)),
});

export const createCanvasMinimapTransform = ({
  contentBounds,
  viewportBounds,
  mapWidth,
  mapHeight,
  padding,
}: {
  contentBounds: SceneBounds | null;
  viewportBounds: SceneBounds;
  mapWidth: number;
  mapHeight: number;
  padding: number;
}): CanvasMinimapTransform => {
  const safeMapWidth = Math.max(1, positive(mapWidth, 1));
  const safeMapHeight = Math.max(1, positive(mapHeight, 1));
  const safePadding = Math.min(
    positive(padding),
    Math.max(0, Math.min(safeMapWidth, safeMapHeight) / 2 - 0.5),
  );
  const innerWidth = Math.max(1, safeMapWidth - safePadding * 2);
  const innerHeight = Math.max(1, safeMapHeight - safePadding * 2);
  const normalizedViewport = normalizeSceneBounds(viewportBounds);
  const combined = contentBounds
    ? unionBounds(normalizeSceneBounds(contentBounds), normalizedViewport)
    : normalizedViewport;
  const targetAspect = innerWidth / innerHeight;
  const currentAspect = combined.width / combined.height;
  let sceneBounds = combined;

  if (currentAspect > targetAspect) {
    const height = combined.width / targetAspect;
    sceneBounds = {
      x: combined.x,
      y: combined.y - (height - combined.height) / 2,
      width: combined.width,
      height,
    };
  } else if (currentAspect < targetAspect) {
    const width = combined.height * targetAspect;
    sceneBounds = {
      x: combined.x - (width - combined.width) / 2,
      y: combined.y,
      width,
      height: combined.height,
    };
  }

  const scale = Math.min(
    innerWidth / sceneBounds.width,
    innerHeight / sceneBounds.height,
  );

  return {
    mapWidth: safeMapWidth,
    mapHeight: safeMapHeight,
    offsetX: safePadding - sceneBounds.x * scale,
    offsetY: safePadding - sceneBounds.y * scale,
    scale,
    sceneBounds,
  };
};

export const scenePointToMinimap = (
  point: { x: number; y: number },
  transform: CanvasMinimapTransform,
) => ({
  x: point.x * transform.scale + transform.offsetX,
  y: point.y * transform.scale + transform.offsetY,
});

export const minimapPointToScene = (
  point: { x: number; y: number },
  transform: CanvasMinimapTransform,
) => ({
  x: (point.x - transform.offsetX) / transform.scale,
  y: (point.y - transform.offsetY) / transform.scale,
});

export const sceneBoundsToMinimap = (
  bounds: SceneBounds,
  transform: CanvasMinimapTransform,
): SceneBounds => {
  const origin = scenePointToMinimap(bounds, transform);
  return {
    x: origin.x,
    y: origin.y,
    width: bounds.width * transform.scale,
    height: bounds.height * transform.scale,
  };
};
