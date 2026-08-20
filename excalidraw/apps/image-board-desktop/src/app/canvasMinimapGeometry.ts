import type { AppState, Offsets } from "@excalidraw/excalidraw/types";

import type { SceneBounds } from "./sceneGeometry";
import {
  createCanvasMinimapTransform as createCanvasMinimapTransformCore,
  getCanvasViewportBounds as getCanvasViewportBoundsCore,
  minimapPointToScene as minimapPointToSceneCore,
  sceneBoundsToMinimap as sceneBoundsToMinimapCore,
  scenePointToMinimap as scenePointToMinimapCore,
} from "./canvasMinimapCore.mjs";

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
): SceneBounds => getCanvasViewportBoundsCore(appState, offsets);

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
}): CanvasMinimapTransform =>
  createCanvasMinimapTransformCore({
    contentBounds,
    viewportBounds,
    mapWidth,
    mapHeight,
    padding,
  });

export const scenePointToMinimap = (
  point: { x: number; y: number },
  transform: CanvasMinimapTransform,
) => scenePointToMinimapCore(point, transform);

export const minimapPointToScene = (
  point: { x: number; y: number },
  transform: CanvasMinimapTransform,
) => minimapPointToSceneCore(point, transform);

export const sceneBoundsToMinimap = (
  bounds: SceneBounds,
  transform: CanvasMinimapTransform,
): SceneBounds => sceneBoundsToMinimapCore(bounds, transform);
