import { describe, expect, it } from "vitest";

import { areStringArraysEqual } from "./arrayState";

describe("areStringArraysEqual", () => {
  it("treats arrays with the same strings in the same order as equal", () => {
    expect(areStringArraysEqual(["file-1", "file-2"], ["file-1", "file-2"]))
      .toBe(true);
  });

  it("treats arrays with the same values in a different order as different", () => {
    expect(areStringArraysEqual(["file-1", "file-2"], ["file-2", "file-1"]))
      .toBe(false);
  });

  it("treats arrays with different lengths as different", () => {
    expect(areStringArraysEqual(["file-1"], ["file-1", "file-2"])).toBe(
      false,
    );
  });
});
