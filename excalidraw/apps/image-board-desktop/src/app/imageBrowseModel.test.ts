import { describe, expect, it } from "vitest";
import {
  buildImageBrowseItems,
  getBrowseWindow,
  buildBrowseLayout,
  isBrowseMenuActionAllowed,
} from "./imageBrowseModel";

describe("image browse model", () => {
  it("uses only the current canvas collection, retaining missing-record placeholders", () => {
    const items = buildImageBrowseItems(["b", "a", "b"], {});
    expect(items.map((item) => item.fileId)).toEqual(["b", "a"]);
    expect(items[0].title).toBeTruthy();
    expect(buildImageBrowseItems([], {})).toEqual([]);
  });

  const pictures = (ratios: number[]) =>
    ratios.map((aspectRatio, index) => ({
      fileId: String(index),
      title: String(index),
      sizeLabel: "",
      aspectRatio,
    }));

  it("aligns mixed proportions into equal-height rows without cropping or changing order", () => {
    const layout = buildBrowseLayout(pictures([0.5, 1, 2, 1.5, 1, 1]), 1000);
    const row = layout.rows[0];
    const tiles = layout.tiles.slice(row.start, row.end);
    expect(tiles.length).toBeGreaterThan(1);
    tiles.forEach((tile, i) => {
      expect(tile.height).toBe(row.height);
      expect(tile.width / tile.height).toBeCloseTo([0.5, 1, 2, 1.5][i]);
      if (i > 0)
        expect(tile.left - tiles[i - 1].left - tiles[i - 1].width).toBeCloseTo(
          24,
        );
    });
    expect(tiles.at(-1)!.left + tiles.at(-1)!.width).toBeCloseTo(1000);
    expect(layout.tiles).toHaveLength(6);
  });

  it("keeps an incomplete final row at reading size and handles missing dimensions and extreme images", () => {
    expect(buildBrowseLayout([], 1000).totalHeight).toBe(0);
    const single = buildBrowseLayout(pictures([1]), 1000).tiles[0];
    expect(single.left).toBe(0);
    expect(single.height).toBe(208);
    for (const width of [320, 1180, 1470]) {
      const layout = buildBrowseLayout(
        pictures([100, 0.01, NaN, 0, 2, 0.5]),
        width,
      );
      layout.tiles.forEach((tile) => {
        expect(tile.width).toBeGreaterThan(0);
        expect(tile.height).toBeGreaterThan(0);
        expect(tile.left + tile.width).toBeLessThanOrEqual(width + 0.001);
      });
      expect(layout.tiles[0].width / layout.tiles[0].height).toBeCloseTo(100);
      expect(layout.tiles[1].width / layout.tiles[1].height).toBeCloseTo(0.01);
    }
  });

  it("bounds rendered rows for a large project and clamps after removal", () => {
    const layout = buildBrowseLayout(pictures(Array(10000).fill(1.5)), 1000);
    const range = getBrowseWindow(layout, 600, 22400);
    expect(range.start).toBeGreaterThan(0);
    expect(range.end - range.start).toBeLessThan(40);
    expect(layout.totalHeight).toBeGreaterThan(100000);
    const reduced = buildBrowseLayout(pictures([1, 2]), 1000);
    expect(getBrowseWindow(reduced, 600, 22400).start).toBe(0);
  });

  it("blocks native editing and import actions while keeping navigation and settings", () => {
    for (const action of [
      "edit-undo",
      "edit-redo",
      "edit-cut",
      "edit-copy",
      "edit-paste",
      "edit-select-all",
      "import-images",
      "generate-image",
    ] as const) {
      expect(isBrowseMenuActionAllowed(action)).toBe(false);
    }
    expect(isBrowseMenuActionAllowed("open-project")).toBe(true);
    expect(isBrowseMenuActionAllowed("app-settings")).toBe(true);
  });
});
