import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { AppState, Offsets } from "@excalidraw/excalidraw/types";

import {
  createCanvasMinimapTransform,
  getCanvasViewportBounds,
  sceneBoundsToMinimap,
} from "./canvasMinimapGeometry";
import { getElementsSceneBounds, type SceneBounds } from "./sceneGeometry";

type MinimapAppState = Pick<
  AppState,
  | "height"
  | "scrollX"
  | "scrollY"
  | "selectedElementIds"
  | "theme"
  | "width"
  | "zoom"
>;

type CachedElementBounds = {
  bounds: SceneBounds;
  category: "image" | "shape";
  version: number;
};

export type CanvasMinimapBoundsCache = Map<string, CachedElementBounds>;

export interface CanvasMinimapRenderModel {
  offsets: Required<Offsets>;
  transform: ReturnType<typeof createCanvasMinimapTransform>;
  viewportBounds: SceneBounds;
  viewportMapBounds: SceneBounds;
}

const unionSceneBounds = (bounds: readonly SceneBounds[]) => {
  if (!bounds.length) {
    return null;
  }
  const left = Math.min(...bounds.map((item) => item.x));
  const top = Math.min(...bounds.map((item) => item.y));
  const right = Math.max(...bounds.map((item) => item.x + item.width));
  const bottom = Math.max(...bounds.map((item) => item.y + item.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
};

const resolveElementBounds = (
  elements: readonly ExcalidrawElement[],
  cache: CanvasMinimapBoundsCache,
) => {
  const activeIds = new Set<string>();
  const resolved: Array<
    CachedElementBounds & { id: string; selected: boolean }
  > = [];

  for (const element of elements) {
    if (element.isDeleted) {
      continue;
    }
    activeIds.add(element.id);
    const cached = cache.get(element.id);
    const entry =
      cached?.version === element.version
        ? cached
        : (() => {
            const bounds = getElementsSceneBounds([element]);
            if (!bounds) {
              return null;
            }
            const next: CachedElementBounds = {
              bounds,
              category:
                element.type === "image" || element.type === "frame"
                  ? "image"
                  : "shape",
              version: element.version,
            };
            cache.set(element.id, next);
            return next;
          })();

    if (entry) {
      resolved.push({ ...entry, id: element.id, selected: false });
    }
  }

  for (const id of cache.keys()) {
    if (!activeIds.has(id)) {
      cache.delete(id);
    }
  }

  return resolved;
};

const readColor = (
  styles: CSSStyleDeclaration,
  token: string,
  fallback: string,
) => styles.getPropertyValue(token).trim() || fallback;

export const renderCanvasMinimap = ({
  canvas,
  elements,
  appState,
  offsets,
  cache,
}: {
  canvas: HTMLCanvasElement;
  elements: readonly ExcalidrawElement[];
  appState: MinimapAppState;
  offsets: Required<Offsets>;
  cache: CanvasMinimapBoundsCache;
}): CanvasMinimapRenderModel | null => {
  const rect = canvas.getBoundingClientRect();
  const mapWidth = Math.max(1, rect.width || canvas.clientWidth || 224);
  const mapHeight = Math.max(1, rect.height || canvas.clientHeight || 144);
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const pixelWidth = Math.round(mapWidth * dpr);
  const pixelHeight = Math.round(mapHeight * dpr);

  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  const resolvedElements = resolveElementBounds(elements, cache).map(
    (item) => ({
      ...item,
      selected: !!appState.selectedElementIds[item.id],
    }),
  );
  const viewportBounds = getCanvasViewportBounds(appState, offsets);
  const contentBounds = unionSceneBounds(
    resolvedElements.map((item) => item.bounds),
  );
  const transform = createCanvasMinimapTransform({
    contentBounds,
    viewportBounds,
    mapWidth,
    mapHeight,
    padding: 8,
  });
  const viewportMapBounds = sceneBoundsToMinimap(viewportBounds, transform);
  const styles = getComputedStyle(canvas);
  const background = readColor(styles, "--color-surface-mid", "#f6f6f9");
  const shapeColor = readColor(
    styles,
    "--color-border-outline-variant",
    "#c5c5d0",
  );
  const imageColor = readColor(styles, "--color-gray-60", "#7a7a7a");
  const primary = readColor(styles, "--color-primary", "#6965db");
  const viewportFill = readColor(styles, "--island-bg-color", "#ffffff");
  const viewportStroke = readColor(styles, "--text-primary-color", "#1b1b1f");

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, mapWidth, mapHeight);
  context.fillStyle = background;
  context.fillRect(0, 0, mapWidth, mapHeight);

  for (const category of ["shape", "image"] as const) {
    context.beginPath();
    for (const item of resolvedElements) {
      if (item.category !== category || item.selected) {
        continue;
      }
      const bounds = sceneBoundsToMinimap(item.bounds, transform);
      context.rect(
        bounds.x,
        bounds.y,
        Math.max(1, bounds.width),
        Math.max(1, bounds.height),
      );
    }
    context.fillStyle = category === "image" ? imageColor : shapeColor;
    context.globalAlpha = category === "image" ? 0.55 : 0.42;
    context.fill();
  }

  context.beginPath();
  for (const item of resolvedElements) {
    if (!item.selected) {
      continue;
    }
    const bounds = sceneBoundsToMinimap(item.bounds, transform);
    context.rect(
      bounds.x,
      bounds.y,
      Math.max(1.5, bounds.width),
      Math.max(1.5, bounds.height),
    );
  }
  context.fillStyle = primary;
  context.globalAlpha = 0.72;
  context.fill();

  context.globalAlpha = 0.18;
  context.fillStyle = viewportFill;
  context.fillRect(
    viewportMapBounds.x,
    viewportMapBounds.y,
    viewportMapBounds.width,
    viewportMapBounds.height,
  );
  context.globalAlpha = 0.9;
  context.strokeStyle = viewportStroke;
  context.lineWidth = 1.5;
  context.strokeRect(
    viewportMapBounds.x + 0.75,
    viewportMapBounds.y + 0.75,
    Math.max(0, viewportMapBounds.width - 1.5),
    Math.max(0, viewportMapBounds.height - 1.5),
  );
  context.globalAlpha = 1;

  return { offsets, transform, viewportBounds, viewportMapBounds };
};
