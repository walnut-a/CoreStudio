import { describe, expect, it } from "vitest";

import {
  getGeneratedImagePreviousBatchBounds,
  placeGeneratedImages,
  resolveGeneratedImagePlacementViewport,
} from "./imagePlacement";

const rectanglesOverlap = (
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number },
) =>
  first.x < second.x + second.width &&
  first.x + first.width > second.x &&
  first.y < second.y + second.height &&
  first.y + first.height > second.y;

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

  it("places a referenced generation in the nearest open space when the preferred right side is occupied", () => {
    const anchorBounds = {
      x: 0,
      y: 0,
      width: 200,
      height: 180,
    };
    const blockingElement = {
      x: 250,
      y: -10,
      width: 360,
      height: 220,
    };

    const placements = placeGeneratedImages({
      images: [{ width: 320, height: 180 }],
      viewportCenter: { x: 400, y: 300 },
      viewportSize: { width: 1200, height: 800 },
      zoomValue: 1,
      anchorBounds,
      occupiedBounds: [anchorBounds, blockingElement],
    });

    expect(rectanglesOverlap(placements[0], blockingElement)).toBe(false);
    expect(placements[0].x).toBeLessThan(
      blockingElement.x + blockingElement.width,
    );
  });

  it("searches the full local perimeter before jumping to a farther diagonal", () => {
    const imageSize = 100;
    const gap = 32;
    const step = imageSize + gap * 2;
    const preferredStart = { x: -imageSize / 2, y: -imageSize / 2 };
    const blockedOffsets = [
      [0, 0],
      [0, 1],
      [0, -1],
      [-1, 0],
      [1, 0],
      [-1, 1],
      [1, 1],
      [-1, -1],
      [1, -1],
      [0, 2],
      [0, -2],
      [-2, 0],
      [2, 0],
    ] as const;
    const occupiedBounds = blockedOffsets.map(([dx, dy]) => ({
      x: preferredStart.x + dx * step,
      y: preferredStart.y + dy * step,
      width: imageSize,
      height: imageSize,
    }));

    const [placement] = placeGeneratedImages({
      images: [{ width: imageSize, height: imageSize }],
      viewportCenter: { x: 0, y: 0 },
      viewportSize: { width: 1200, height: 800 },
      zoomValue: 1,
      occupiedBounds,
      gap,
    });

    const distance = Math.hypot(
      placement.x - preferredStart.x,
      placement.y - preferredStart.y,
    );
    expect(distance).toBeLessThan(Math.hypot(step * 2, step * 2));
    expect(
      occupiedBounds.some((bounds) => rectanglesOverlap(placement, bounds)),
    ).toBe(false);
  });

  it("chooses the closest obstacle edge instead of a farther horizontal exit", () => {
    const image = { width: 600, height: 20 };
    const gap = 32;
    const stepX = image.width + gap * 2;
    const stepY = image.height + gap * 2;
    const preferredStart = {
      x: -image.width / 2,
      y: -image.height / 2,
    };
    const occupiedBounds = [
      [0, 0],
      [0, 1],
      [0, -1],
      [-1, 1],
      [1, 1],
      [-1, -1],
      [1, -1],
    ].map(([dx, dy]) => ({
      x: preferredStart.x + dx * stepX,
      y: preferredStart.y + dy * stepY,
      width: image.width,
      height: image.height,
    }));

    const [placement] = placeGeneratedImages({
      images: [image],
      viewportCenter: { x: 0, y: 0 },
      viewportSize: { width: 1200, height: 800 },
      zoomValue: 1,
      occupiedBounds,
      gap,
    });

    expect(placement.x).toBe(preferredStart.x);
    expect(placement.y).toBe(preferredStart.y + stepY * 2 - gap);
  });

  it("falls back outside large occupied content instead of returning a blocked start", () => {
    const occupiedBounds = [
      {
        x: -10_000,
        y: -10_000,
        width: 20_000,
        height: 20_000,
      },
    ];

    const [placement] = placeGeneratedImages({
      images: [{ width: 100, height: 100 }],
      viewportCenter: { x: 0, y: 0 },
      viewportSize: { width: 1200, height: 800 },
      zoomValue: 1,
      occupiedBounds,
    });

    expect(rectanglesOverlap(placement, occupiedBounds[0])).toBe(false);
  });

  it("uses a nearby open position beyond the initial search area instead of jumping past distant scene outliers", () => {
    const imageSize = 100;
    const gap = 32;
    const step = imageSize + gap * 2;
    const preferredStart = { x: -imageSize / 2, y: -imageSize / 2 };
    const occupiedBounds = [];

    for (let dy = -8; dy <= 8; dy += 1) {
      for (let dx = -8; dx <= 8; dx += 1) {
        occupiedBounds.push({
          x: preferredStart.x + dx * step,
          y: preferredStart.y + dy * step,
          width: imageSize,
          height: imageSize,
        });
      }
    }
    occupiedBounds.push(
      {
        x: -1_000_000,
        y: preferredStart.y,
        width: imageSize,
        height: imageSize,
      },
      {
        x: 1_000_000,
        y: preferredStart.y,
        width: imageSize,
        height: imageSize,
      },
      {
        x: preferredStart.x,
        y: -1_000_000,
        width: imageSize,
        height: imageSize,
      },
      {
        x: preferredStart.x,
        y: 1_000_000,
        width: imageSize,
        height: imageSize,
      },
    );

    const [placement] = placeGeneratedImages({
      images: [{ width: imageSize, height: imageSize }],
      viewportCenter: { x: 0, y: 0 },
      viewportSize: { width: 1200, height: 800 },
      zoomValue: 1,
      occupiedBounds,
      gap,
    });

    expect(
      Math.hypot(
        placement.x - preferredStart.x,
        placement.y - preferredStart.y,
      ),
    ).toBeLessThan(step * 10);
    expect(
      occupiedBounds.some((bounds) => rectanglesOverlap(placement, bounds)),
    ).toBe(false);
  });

  it("keeps referenced generation on the preferred side without an artificial workspace edge", () => {
    const placements = placeGeneratedImages({
      images: [{ width: 320, height: 180 }],
      viewportCenter: { x: 600, y: 400 },
      viewportSize: { width: 1200, height: 800 },
      zoomValue: 1,
      anchorBounds: {
        x: 900,
        y: 300,
        width: 200,
        height: 180,
      },
    });

    expect(placements[0]).toMatchObject({
      x: 1164,
      y: 300,
      width: 320,
      height: 180,
    });
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
      512, 512, 512,
    ]);
    expect(placements.map((placement) => placement.height)).toEqual([
      512, 512, 512,
    ]);
  });
});

describe("getGeneratedImagePreviousBatchBounds", () => {
  const previousBatchBounds = {
    x: 100,
    y: 120,
    width: 320,
    height: 240,
  };

  it("reuses the previous batch bounds when no explicit anchor is available", () => {
    expect(
      getGeneratedImagePreviousBatchBounds({
        previousBatchBounds,
        anchorPoint: null,
        anchorBounds: null,
      }),
    ).toBe(previousBatchBounds);
  });

  it("ignores the previous batch bounds when a canvas pointer anchor is available", () => {
    expect(
      getGeneratedImagePreviousBatchBounds({
        previousBatchBounds,
        anchorPoint: { x: 800, y: 600 },
        anchorBounds: null,
      }),
    ).toBeNull();
  });

  it("ignores the previous batch bounds when reference element bounds are available", () => {
    expect(
      getGeneratedImagePreviousBatchBounds({
        previousBatchBounds,
        anchorPoint: null,
        anchorBounds: {
          x: 0,
          y: 0,
          width: 200,
          height: 160,
        },
      }),
    ).toBeNull();
  });
});

describe("resolveGeneratedImagePlacementViewport", () => {
  const appViewport = {
    viewportCenter: { x: 400, y: 300 },
    viewportSize: { width: 1200, height: 800 },
    zoomValue: 1.25,
  };

  it("uses an explicit placement viewport when provided", () => {
    const explicitViewport = {
      viewportCenter: { x: 900, y: 720 },
      viewportSize: { width: 1600, height: 900 },
      zoomValue: 0.75,
    };

    expect(
      resolveGeneratedImagePlacementViewport({
        explicitViewport,
        appViewport,
      }),
    ).toEqual(explicitViewport);
  });

  it("falls back to the current app viewport when no explicit placement viewport is provided", () => {
    expect(
      resolveGeneratedImagePlacementViewport({
        explicitViewport: null,
        appViewport,
      }),
    ).toEqual(appViewport);
  });
});
