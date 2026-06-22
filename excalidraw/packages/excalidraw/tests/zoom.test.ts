import { describe, expect, it } from "vitest";

import { getWheelZoomValue } from "../scene/zoom";

describe("getWheelZoomValue", () => {
  it("keeps small trackpad deltas gentle at low zoom", () => {
    expect(getWheelZoomValue(0.1, 10)).toBeGreaterThan(0.09);
  });

  it("keeps medium trackpad deltas responsive at normal zoom", () => {
    expect(getWheelZoomValue(1, 10)).toBeLessThan(0.94);
    expect(getWheelZoomValue(1, -10)).toBeGreaterThan(1.06);
  });

  it("caps large wheel deltas to avoid a single jump across the canvas", () => {
    expect(getWheelZoomValue(1, -100)).toBeLessThan(1.12);
    expect(getWheelZoomValue(1, 100)).toBeGreaterThan(0.89);
  });
});
