import { describe, expect, it } from "vitest";

import {
  DEFAULT_TRACKPAD_ZOOM_SPEED,
  getTrackpadZoomSensitivity,
  isTrackpadZoomSpeed,
} from "./canvasInteractionSettings";

describe("canvas interaction settings", () => {
  it("keeps the restored CoreStudio curve as the standard default", () => {
    expect(DEFAULT_TRACKPAD_ZOOM_SPEED).toBe("standard");
    expect(getTrackpadZoomSensitivity("standard")).toBe(0.0065);
  });

  it("maps the five user-facing speeds to increasing sensitivities", () => {
    const speeds = ["slowest", "slow", "standard", "fast", "fastest"] as const;
    const sensitivities = speeds.map(getTrackpadZoomSensitivity);

    expect(sensitivities).toEqual([...sensitivities].sort((a, b) => a - b));
    expect(new Set(sensitivities).size).toBe(5);
  });

  it("rejects unknown persisted values", () => {
    expect(isTrackpadZoomSpeed("fast")).toBe(true);
    expect(isTrackpadZoomSpeed("custom")).toBe(false);
  });
});
