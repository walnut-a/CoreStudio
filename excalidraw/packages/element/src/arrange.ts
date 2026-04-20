import type { AppState } from "@excalidraw/excalidraw/types";

import { updateBoundElements } from "./binding";
import { getCommonBoundingBox } from "./bounds";
import { getSelectedGroupIds } from "./groups";
import { getBoundTextElement } from "./textElement";
import { isBoundToContainer } from "./typeChecks";

import type { Scene } from "./Scene";

import type { BoundingBox } from "./bounds";
import type { ElementsMap, ExcalidrawElement } from "./types";

const DEFAULT_ARRANGE_GAP = 24;

type ArrangementUnit = {
  elements: ExcalidrawElement[];
  bounds: BoundingBox;
  originalIndex: number;
};

export const getSelectedElementsByArrangementUnit = (
  selectedElements: ExcalidrawElement[],
  elementsMap: ElementsMap,
  appState: Readonly<AppState>,
): ExcalidrawElement[][] => {
  const selectedGroupIds = new Set(getSelectedGroupIds(appState));
  const groupedUnits = new Map<string, ExcalidrawElement[]>();
  const singleElementUnits = new Map<string, ExcalidrawElement[]>();

  const addElementWithBoundText = (
    units: Map<string, ExcalidrawElement[]>,
    unitId: string,
    element: ExcalidrawElement,
  ) => {
    const currentMembers = units.get(unitId) || [];
    const boundTextElement = getBoundTextElement(element, elementsMap);

    if (boundTextElement) {
      currentMembers.push(boundTextElement);
    }
    units.set(unitId, [...currentMembers, element]);
  };

  for (const element of selectedElements) {
    if (isBoundToContainer(element)) {
      continue;
    }

    const selectedGroupId = element.groupIds.find((groupId) =>
      selectedGroupIds.has(groupId),
    );

    if (selectedGroupId) {
      addElementWithBoundText(groupedUnits, selectedGroupId, element);
    } else {
      addElementWithBoundText(singleElementUnits, element.id, element);
    }
  }

  return Array.from(groupedUnits.values()).concat(
    Array.from(singleElementUnits.values()),
  );
};

export const arrangeElementsIntoColumnGrid = (
  selectedElements: ExcalidrawElement[],
  elementsMap: ElementsMap,
  appState: Readonly<AppState>,
  scene: Scene,
  options?: {
    gap?: number;
  },
): ExcalidrawElement[] => {
  const units = getSelectedElementsByArrangementUnit(
    selectedElements,
    elementsMap,
    appState,
  );

  if (units.length < 2) {
    return selectedElements;
  }

  const gap = options?.gap ?? DEFAULT_ARRANGE_GAP;
  const selectionBounds = getCommonBoundingBox(selectedElements);
  const unitBounds: ArrangementUnit[] = units.map((elements, index) => ({
    elements,
    bounds: getCommonBoundingBox(elements),
    originalIndex: index,
  }));
  const rowCount = Math.ceil(Math.sqrt(unitBounds.length));
  const cellWidth = Math.max(...unitBounds.map((unit) => unit.bounds.width));
  const cellHeight = Math.max(...unitBounds.map((unit) => unit.bounds.height));

  return unitBounds
    .sort((a, b) => {
      const topDelta = a.bounds.minY - b.bounds.minY;
      if (topDelta) {
        return topDelta;
      }

      const leftDelta = a.bounds.minX - b.bounds.minX;
      if (leftDelta) {
        return leftDelta;
      }

      return a.originalIndex - b.originalIndex;
    })
    .flatMap((unit, index) => {
      const row = index % rowCount;
      const column = Math.floor(index / rowCount);
      const targetMinX = selectionBounds.minX + column * (cellWidth + gap);
      const targetMinY = selectionBounds.minY + row * (cellHeight + gap);
      const translation = {
        x: targetMinX - unit.bounds.minX,
        y: targetMinY - unit.bounds.minY,
      };

      return unit.elements.map((element) => {
        const updatedElement = scene.mutateElement(element, {
          x: element.x + translation.x,
          y: element.y + translation.y,
        });

        updateBoundElements(element, scene, {
          simultaneouslyUpdated: unit.elements,
        });

        return updatedElement;
      });
    });
};
