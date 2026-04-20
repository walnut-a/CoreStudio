import { getDefaultAppState } from "@excalidraw/excalidraw/appState";

import { arrangeElementsIntoColumnGrid } from "../arrange";
import { newElement } from "../newElement";
import { Scene } from "../Scene";

import type { ExcalidrawElement } from "../types";

const createRectangle = ({
  id,
  x,
  y,
  width = 10,
  height = 10,
  groupIds = [],
}: {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  groupIds?: ExcalidrawElement["groupIds"];
}) => {
  const element = newElement({
    type: "rectangle",
    x,
    y,
    width,
    height,
    groupIds,
  });
  return { ...element, id };
};

const createScene = (elements: ExcalidrawElement[]) =>
  new Scene(elements, { skipValidation: true });

const appStateWithSelectedGroups = (
  selectedGroupIds: Record<string, boolean>,
) => ({
  ...getDefaultAppState(),
  width: 1000,
  height: 1000,
  offsetTop: 0,
  offsetLeft: 0,
  selectedGroupIds,
});

const getPosition = (scene: Scene, id: string) => {
  const element = scene.getElement(id);
  if (!element) {
    throw new Error(`Missing element ${id}`);
  }
  return { x: element.x, y: element.y };
};

describe("arrangeElementsIntoColumnGrid", () => {
  it("arranges ungrouped elements from top to bottom, then left to right", () => {
    const elements = [
      createRectangle({ id: "a", x: 100, y: 100 }),
      createRectangle({ id: "b", x: 40, y: 20 }),
      createRectangle({ id: "c", x: 20, y: 70 }),
      createRectangle({ id: "d", x: 120, y: 10 }),
    ];
    const scene = createScene(elements);

    arrangeElementsIntoColumnGrid(
      elements,
      scene.getNonDeletedElementsMap(),
      appStateWithSelectedGroups({}),
      scene,
      { gap: 10 },
    );

    expect(getPosition(scene, "d")).toEqual({ x: 20, y: 10 });
    expect(getPosition(scene, "b")).toEqual({ x: 20, y: 30 });
    expect(getPosition(scene, "c")).toEqual({ x: 40, y: 10 });
    expect(getPosition(scene, "a")).toEqual({ x: 40, y: 30 });
  });

  it("moves a selected group as one unit when arranging mixed selections", () => {
    const groupHead = createRectangle({
      id: "group-head",
      x: 100,
      y: 100,
      width: 20,
      height: 20,
      groupIds: ["group-a"],
    });
    const groupTail = createRectangle({
      id: "group-tail",
      x: 130,
      y: 120,
      groupIds: ["group-a"],
    });
    const looseTop = createRectangle({ id: "loose-top", x: 0, y: 0 });
    const looseBottom = createRectangle({ id: "loose-bottom", x: 10, y: 50 });
    const elements = [groupHead, groupTail, looseTop, looseBottom];
    const scene = createScene(elements);

    arrangeElementsIntoColumnGrid(
      elements,
      scene.getNonDeletedElementsMap(),
      appStateWithSelectedGroups({ "group-a": true }),
      scene,
      { gap: 10 },
    );

    expect(getPosition(scene, "loose-top")).toEqual({ x: 0, y: 0 });
    expect(getPosition(scene, "loose-bottom")).toEqual({ x: 0, y: 40 });
    expect(getPosition(scene, "group-head")).toEqual({ x: 50, y: 0 });
    expect(getPosition(scene, "group-tail")).toEqual({ x: 80, y: 20 });
  });

  it("keeps a single selected group intact instead of arranging its children", () => {
    const groupHead = createRectangle({
      id: "group-head",
      x: 100,
      y: 100,
      groupIds: ["group-a"],
    });
    const groupTail = createRectangle({
      id: "group-tail",
      x: 140,
      y: 120,
      groupIds: ["group-a"],
    });
    const elements = [groupHead, groupTail];
    const scene = createScene(elements);

    arrangeElementsIntoColumnGrid(
      elements,
      scene.getNonDeletedElementsMap(),
      appStateWithSelectedGroups({ "group-a": true }),
      scene,
      { gap: 10 },
    );

    expect(getPosition(scene, "group-head")).toEqual({ x: 100, y: 100 });
    expect(getPosition(scene, "group-tail")).toEqual({ x: 140, y: 120 });
  });
});
