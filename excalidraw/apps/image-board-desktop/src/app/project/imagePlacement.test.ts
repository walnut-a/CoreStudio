import { describe, expect, it } from "vitest";

import { placeGeneratedImages } from "./imagePlacement";

describe("placeGeneratedImages", () => {
  it("arranges multiple images into a viewport-centered grid", () => {
    const placements = placeGeneratedImages({
      images: [
        { width: 1024, height: 1024 },
        { width: 1024, height: 1024 },
        { width: 1024, height: 1024 },
        { width: 1024, height: 1024 },
      ],
      viewportCenter: { x: 1200, y: 800 },
      viewportSize: { width: 1440, height: 900 },
      zoomValue: 1,
    });

    expect(placements).toHaveLength(4);
    expect(placements[0].y).toBe(placements[1].y);
    expect(placements[0].x).toBeLessThan(placements[1].x);
    expect(placements[0].y).toBeLessThan(placements[2].y);
  });

  it("starts the next generated batch beside the last batch anchor", () => {
    const placements = placeGeneratedImages({
      images: [
        { width: 1024, height: 768 },
        { width: 1024, height: 768 },
      ],
      viewportCenter: { x: 400, y: 300 },
      viewportSize: { width: 1200, height: 800 },
      zoomValue: 1,
      previousBatchBounds: {
        x: 100,
        y: 160,
        width: 640,
        height: 320,
      },
    });

    expect(placements[0].x).toBeGreaterThan(740);
  });

  it("places a generated batch beside the referenced element bounds", () => {
    const placements = placeGeneratedImages({
      images: [{ width: 1024, height: 768 }],
      viewportCenter: { x: 400, y: 300 },
      viewportSize: { width: 1200, height: 800 },
      zoomValue: 1,
      anchorBounds: {
        x: 180,
        y: 260,
        width: 320,
        height: 180,
      },
    });

    expect(placements[0].x).toBeGreaterThan(500);
    expect(placements[0].y + placements[0].height / 2).toBe(350);
  });

  it("places a generated batch around the latest canvas pointer", () => {
    const placements = placeGeneratedImages({
      images: [{ width: 1024, height: 1024 }],
      viewportCenter: { x: 400, y: 300 },
      viewportSize: { width: 1200, height: 800 },
      zoomValue: 1,
      anchorPoint: {
        x: 860,
        y: 540,
      },
    });

    expect(placements[0].x + placements[0].width / 2).toBe(860);
    expect(placements[0].y + placements[0].height / 2).toBe(540);
  });

  it("keeps generated image display size stable across viewport and zoom changes", () => {
    const compactViewport = placeGeneratedImages({
      images: [{ width: 1024, height: 1024 }],
      viewportCenter: { x: 400, y: 300 },
      viewportSize: { width: 1200, height: 800 },
      zoomValue: 0.4,
    });
    const largeViewport = placeGeneratedImages({
      images: [{ width: 1024, height: 1024 }],
      viewportCenter: { x: 900, y: 700 },
      viewportSize: { width: 2400, height: 1600 },
      zoomValue: 2,
    });

    expect(compactViewport[0].width).toBe(512);
    expect(compactViewport[0].height).toBe(512);
    expect(largeViewport[0].width).toBe(compactViewport[0].width);
    expect(largeViewport[0].height).toBe(compactViewport[0].height);
  });

  it("uses the same canvas size for square images with different source pixels", () => {
    const placements = placeGeneratedImages({
      images: [
        { width: 1024, height: 1024 },
        { width: 1200, height: 1200 },
        { width: 1254, height: 1254 },
      ],
      viewportCenter: { x: 900, y: 700 },
      viewportSize: { width: 1600, height: 1000 },
      zoomValue: 1,
    });

    expect(placements.map((placement) => placement.width)).toEqual([
      512,
      512,
      512,
    ]);
    expect(placements.map((placement) => placement.height)).toEqual([
      512,
      512,
      512,
    ]);
  });
});
