import { getCommonBounds } from "@excalidraw/element";
import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { AppState } from "@excalidraw/excalidraw/types";

export interface SceneBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

type ViewportAppState = Pick<
  AppState,
  "height" | "scrollX" | "scrollY" | "width" | "zoom"
>;

const getFiniteNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const isUsableBounds = (bounds: SceneBounds) =>
  [bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite) &&
  bounds.width >= 0 &&
  bounds.height >= 0;

export const getElementsSceneBounds = (
  elements: readonly ExcalidrawElement[],
): SceneBounds | null => {
  if (!elements.length) {
    return null;
  }

  const [left, top, right, bottom] = getCommonBounds(elements);
  const bounds = {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };

  return isUsableBounds(bounds) ? bounds : null;
};

export const getSceneOccupiedBounds = (
  elements: readonly ExcalidrawElement[],
) =>
  elements.flatMap((element) => {
    if (element.isDeleted) {
      return [];
    }

    const bounds = getElementsSceneBounds([element]);
    return bounds ? [bounds] : [];
  });

export const getViewportCenterFromAppState = (appState: ViewportAppState) => {
  const width = getFiniteNumber(appState.width, 0);
  const height = getFiniteNumber(appState.height, 0);
  const scrollX = getFiniteNumber(appState.scrollX, 0);
  const scrollY = getFiniteNumber(appState.scrollY, 0);
  const zoomValue = Math.max(getFiniteNumber(appState.zoom?.value, 1), 0.0001);

  return {
    x: width / (2 * zoomValue) - scrollX,
    y: height / (2 * zoomValue) - scrollY,
  };
};

export const getViewportZoomValue = (appState: Pick<AppState, "zoom">) =>
  getFiniteNumber(appState.zoom?.value, 1);
