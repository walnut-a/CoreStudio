import type { AppState } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/element/types";
import { createCanvasSceneRevisionTracker } from "./canvasSceneRevision";

export interface CanvasNavigationSnapshot {
  appState: AppState;
  elements: readonly ExcalidrawElement[];
  dependencies: readonly unknown[];
}

// Only these fields may bypass content reconciliation. Unknown/new fields take
// the full path, so changes to selection, shared config or editing stay safe.
const navigationKeys = new Set<keyof AppState>([
  "scrollX",
  "scrollY",
  "zoom",
  "width",
  "height",
  "offsetTop",
  "offsetLeft",
  "shouldCacheIgnoreZoom",
  "scrolledOutside",
]);

export const createCanvasNavigationChangeTracker = () => {
  let previous: CanvasNavigationSnapshot | undefined;
  let previousRevision = -1;
  const getRevision = createCanvasSceneRevisionTracker();
  return {
    isNavigationOnly: (next: CanvasNavigationSnapshot) => {
      if (
        !previous ||
        previousRevision !== getRevision(next.elements) ||
        previous.dependencies.length !== next.dependencies.length ||
        next.dependencies.some(
          (value, index) => !Object.is(value, previous!.dependencies[index]),
        )
      ) {
        return false;
      }
      const keys = Object.keys(next.appState) as (keyof AppState)[];
      return (
        keys.length === Object.keys(previous.appState).length &&
        keys.every(
          (key) =>
            navigationKeys.has(key) ||
            Object.is(next.appState[key], previous!.appState[key]),
        )
      );
    },
    remember: (next: CanvasNavigationSnapshot) => {
      previousRevision = getRevision(next.elements);
      previous = { ...next, appState: { ...next.appState } };
    },
  };
};
