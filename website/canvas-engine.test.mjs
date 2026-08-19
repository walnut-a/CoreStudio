import assert from "node:assert/strict";
import test from "node:test";

import {
  CAMERA_VIEWS,
  CAMERA_TRANSITION_MS,
  GENERATION_SETTLE_MS,
  applyCanvasWheelGesture,
  clampZoom,
  composeTransform,
  getGenerationSequence,
  getMinimapViewport,
  getZoomControlState,
  stepZoom,
} from "./canvas-engine.mjs";

test("zoom is clamped to the supported canvas range", () => {
  assert.equal(clampZoom(0.2), 0.72);
  assert.equal(clampZoom(1), 1);
  assert.equal(clampZoom(3), 1.3);
  assert.equal(stepZoom(1, 1), 1.1);
  assert.equal(stepZoom(0.75, -1), 0.72);
});

test("desktop and mobile expose the complete three-step camera story", () => {
  for (const mode of ["desktop", "mobile"]) {
    assert.deepEqual(Object.keys(CAMERA_VIEWS[mode]), [
      "overview",
      "generate",
      "agent",
    ]);
  }
});

test("canvas transforms keep translation independent from zoom", () => {
  assert.equal(
    composeTransform({ x: 24, y: -18, zoom: 1.1 }),
    "translate3d(calc(-50% + 24px), calc(-50% + -18px), 0) scale(1.1)",
  );
});

test("minimap viewport stays bounded and gets smaller as the canvas zooms in", () => {
  const wide = getMinimapViewport({ x: 0, y: 0, zoom: 0.8 });
  const close = getMinimapViewport({ x: 4000, y: -4000, zoom: 1.2 });

  assert.ok(wide.width > close.width);
  assert.ok(wide.height > close.height);
  assert.ok(close.x >= 0 && close.x + close.width <= 100);
  assert.ok(close.y >= 0 && close.y + close.height <= 100);
});

test("compact zoom controls follow the production minimap interaction", () => {
  assert.deepEqual(getZoomControlState(false), {
    minimapOpen: false,
    showIncrementControls: false,
  });
  assert.deepEqual(getZoomControlState(true), {
    minimapOpen: true,
    showIncrementControls: true,
  });
});

test("camera navigation uses the product minimap timing", () => {
  assert.equal(CAMERA_TRANSITION_MS, 180);
});

test("generation is one user-triggered flow and never implies agent write-back", () => {
  assert.equal(GENERATION_SETTLE_MS, 1200);
  assert.deepEqual(getGenerationSequence(false), [
    { state: "generating", at: 0 },
    { state: "generated", at: 1200 },
  ]);
  assert.deepEqual(getGenerationSequence(true), [
    { state: "generating", at: 0 },
    { state: "generated", at: 0 },
  ]);
});

test("plain trackpad scrolling pans while modified scrolling zooms", () => {
  const view = { x: 40, y: -10, zoom: 1 };

  assert.deepEqual(
    applyCanvasWheelGesture(view, {
      deltaX: 24,
      deltaY: -16,
      ctrlKey: false,
      metaKey: false,
    }),
    { x: 16, y: 6, zoom: 1 },
  );
  assert.deepEqual(
    applyCanvasWheelGesture(view, {
      deltaX: 0,
      deltaY: -16,
      ctrlKey: true,
      metaKey: false,
    }),
    { x: 40, y: -10, zoom: 1.1 },
  );
  assert.deepEqual(
    applyCanvasWheelGesture(view, {
      deltaX: 0,
      deltaY: 16,
      ctrlKey: false,
      metaKey: true,
    }),
    { x: 40, y: -10, zoom: 0.9 },
  );
});
