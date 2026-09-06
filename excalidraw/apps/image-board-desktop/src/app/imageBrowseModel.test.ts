import { describe, expect, it } from "vitest";
import {
  buildImageBrowseItems,
  getBrowseWindow,
  isBrowseMenuActionAllowed,
} from "./imageBrowseModel";

describe("image browse model", () => {
  it("uses only the current canvas collection, retaining missing-record placeholders", () => {
    const items = buildImageBrowseItems(["b", "a", "b"], {});
    expect(items.map((item) => item.fileId)).toEqual(["b", "a"]);
    expect(items[0].title).toBeTruthy();
    expect(buildImageBrowseItems([], {})).toEqual([]);
  });

  it("bounds the rendered range for a large project and clamps after removal", () => {
    const range = getBrowseWindow(10000, 1000, 600, 22400);
    expect(range.start).toBeGreaterThan(0);
    expect(range.end - range.start).toBeLessThan(40);
    expect(range.totalHeight).toBeGreaterThan(100000);
    expect(getBrowseWindow(2, 1000, 600, 22400).start).toBe(0);
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
