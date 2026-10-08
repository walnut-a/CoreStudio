import { describe, expect, it } from "vitest";
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

describe("adaptive image renditions", () => {
  it("downgrades decoded originals after returning to an overview", () => {
    expect(
      plan([image("a")], {
        appState: state(0.05),
        loadedOriginalFileIds: new Set(["a"]),
      }).requests,
    ).toEqual([{ fileId: "a", rendition: "thumbnail" }]);
  });
  it("keeps a hysteresis band instead of swapping around the original threshold", () => {
    expect(
      plan([image("a", 650)], { loadedOriginalFileIds: new Set(["a"]) })
        .requests,
    ).toEqual([]);
    expect(
      plan([image("a", 550)], { loadedOriginalFileIds: new Set(["a"]) })
        .requests,
    ).toEqual([{ fileId: "a", rendition: "preview" }]);
  });
  it("deduplicates by the highest visible requirement and caps near-view prefetch at preview", () => {
    const duplicate = { ...image("a", 900), id: "a-copy" };
    expect(
      plan([
        image("a", 50),
        duplicate,
        image("b", 900, 1100),
        image("c", 900, 1400),
      ]).requests,
    ).toEqual([
      { fileId: "a", rendition: "original" },
      { fileId: "b", rendition: "preview" },
    ]);
  });
  it("reclaims offscreen originals before upgrading visible images", () => {
    expect(
      plan([image("a"), image("b", 800, 5000)], {
        loadedOriginalFileIds: new Set(["b"]),
      }).requests,
    ).toEqual([
      { fileId: "b", rendition: "thumbnail" },
      { fileId: "a", rendition: "original" },
    ]);
  });
  it("budgets decoded pixels by bytes, while retaining the active crop at its current resolution", () => {
    const elements = [image("a"), image("b")];
    const result = plan(elements, { memoryBudgetBytes: 8 * 1024 * 1024 });
    expect(result.estimatedBytes).toBeLessThanOrEqual(8 * 1024 * 1024);
    expect(result.requests.every((r) => r.rendition !== "original")).toBe(true);
    const pinned = plan(elements, {
      memoryBudgetBytes: 8 * 1024 * 1024,
      appState: { ...state(), croppingElementId: "b" },
      loadedOriginalFileIds: new Set(["b"]),
    });
    expect(pinned.desired.get("b")).toBe("original");
    expect(pinned.overBudgetBytes).toBeGreaterThan(0);
  });
  it("uses the uncropped source density for a cropped image", () => {
    const cropped = {
      ...image("a", 200),
      crop: {
        x: 0,
        y: 0,
        width: 500,
        height: 500,
        naturalWidth: 4000,
        naturalHeight: 3000,
      },
    } as ExcalidrawElement;
    expect(plan([cropped]).desired.get("a")).toBe("original");
  });
  it("accounts for rotated image bounds at the viewport edge", () => {
    expect(
      plan([
        {
          ...image("a", 800, 1200),
          angle: (Math.PI / 4) as ExcalidrawElement["angle"],
        },
      ]).requests,
    ).toHaveLength(1);
  });
});

it("does not reread small originals whose pixels already fit the thumbnail size", () => {
  const imageRecords = records(["small"]);
  imageRecords.small.width = 320;
  imageRecords.small.height = 240;
  expect(plan([image("small", 800)], { imageRecords }).requests).toEqual([]);
  expect(
    plan([image("small", 800)], {
      imageRecords,
      appState: state(0.05),
      loadedOriginalFileIds: new Set(["small"]),
    }).requests,
  ).toEqual([]);
});

it("freezes a new crop at its current pixels and protects deleted images for undo", () => {
  expect(
    plan([image("a")], { appState: { ...state(), croppingElementId: "a" } })
      .requests,
  ).toEqual([]);
  expect(
    plan([{ ...image("a"), isDeleted: true }], {
      loadedOriginalFileIds: new Set(["a"]),
      appState: state(0.05),
    }).requests,
  ).toEqual([]);
});
it("keeps saved thumbnail crop coordinates stable even when an uncropped duplicate is enlarged", () => {
  const cropped = {
    ...image("a"),
    crop: {
      x: 40,
      y: 20,
      width: 200,
      height: 180,
      naturalWidth: 320,
      naturalHeight: 240,
    },
  } as ExcalidrawElement;
  const duplicate = { ...image("a", 3000), id: "duplicate" };
  for (const elements of [
    [cropped, duplicate],
    [duplicate, cropped],
  ]) {
    expect(plan(elements).desired.get("a")).toBe("thumbnail");
    expect(plan(elements, { appState: state(0.05) }).requests).toEqual([]);
  }
});
it("restores a saved preview crop at matching resolution even outside the viewport and over budget", () => {
  const cropped = {
    ...image("a", 800, 5000),
    crop: {
      x: 100,
      y: 20,
      width: 900,
      height: 800,
      naturalWidth: 1280,
      naturalHeight: 960,
    },
  } as ExcalidrawElement;
  expect(plan([cropped], { memoryBudgetBytes: 1 }).requests).toEqual([
    { fileId: "a", rendition: "preview" },
  ]);
});
