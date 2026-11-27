import { expect, it } from "vitest";
import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { AppState } from "@excalidraw/excalidraw/types";
import type { ImageRecordMap } from "../shared/projectTypes";
import { planImageRenditions } from "./imageRenditionPolicy";

const image = (id: string, width = 800, x = 0) =>
  ({
    id,
    type: "image",
    fileId: id,
    x,
    y: 0,
    width,
    height: width,
    angle: 0,
    isDeleted: false,
  } as ExcalidrawElement);
const records = (ids: string[]) =>
  Object.fromEntries(
    ids.map((fileId) => [
      fileId,
      {
        fileId,
        width: 4000,
        height: 3000,
        assetPath: `${fileId}.jpg`,
        mimeType: "image/jpeg",
      },
    ]),
  ) as ImageRecordMap;
const state = (zoom = 1) =>
  ({
    width: 1000,
    height: 800,
    scrollX: 0,
    scrollY: 0,
    zoom: { value: zoom },
    selectedElementIds: {},
  } as AppState);
const plan = (elements: ExcalidrawElement[], overrides = {}) =>
  planImageRenditions({
    elements,
    appState: state(),
    imageRecords: records(elements.map((e: any) => e.fileId)),
    loadedPreviewFileIds: new Set<string>(),
    loadedOriginalFileIds: new Set<string>(),
    devicePixelRatio: 1,
    ...overrides,
  });

it("reserves an affordable original for the zoomed focus despite retained undo pixels", () => {
  const result = plan(
    [image("focus"), { ...image("history"), isDeleted: true }],
    {
      appState: state(2.35),
      loadedOriginalFileIds: new Set(["history"]),
      memoryBudgetBytes: 80 * 1024 * 1024,
    },
  );
  expect(result.desired.get("focus")).toBe("original");
  expect(result.estimatedBytes).toBeGreaterThan(80 * 1024 * 1024);
});
