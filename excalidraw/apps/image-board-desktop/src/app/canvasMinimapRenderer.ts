import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { AppState, Offsets } from "@excalidraw/excalidraw/types";

import { createCanvasMinimapTransform } from "./canvasMinimapGeometry";
import { renderCanvasMinimapScene } from "./canvasMinimapCore.mjs";
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
  const resolvedElements = resolveElementBounds(elements, cache).map(
    (item) => ({
      ...item,
      selected: !!appState.selectedElementIds[item.id],
    }),
  );
  return renderCanvasMinimapScene({
    canvas,
    elements: resolvedElements,
    appState,
    offsets,
  }) as CanvasMinimapRenderModel | null;
};
