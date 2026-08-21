import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  CAMERA_VIEWS,
  CAMERA_TRANSITION_MS,
  EXCALIDRAW_MIN_ZOOM,
  GENERATION_SETTLE_MS,
  applyCanvasPanGesture,
  applyCanvasPinchGesture,
  applyCanvasWheelGesture,
  clampZoom,
  composeTransform,
  getCanvasMinimumZoom,
  getGenerationSequence,
  getZoomControlState,
  stepZoom,
} from "./canvas-engine.mjs";
import {
  createCanvasMinimapTransform,
  getCanvasViewportBounds,
  minimapPointToScene,
  sceneBoundsToMinimap,
  scenePointToMinimap,
} from "../excalidraw/apps/image-board-desktop/src/app/canvasMinimapCore.mjs";

test("zoom is clamped to the supported canvas range", () => {
  assert.equal(clampZoom(0.2), 0.72);
  assert.equal(clampZoom(1), 1);
  assert.equal(clampZoom(3), 1.3);
  assert.equal(stepZoom(1, 1), 1.1);
  assert.equal(stepZoom(0.75, -1), 0.72);
});

test("mobile zooms out until the complete canvas fits the viewport", async () => {
  const productionConstants = await readFile(
    new URL("../excalidraw/packages/common/src/constants.ts", import.meta.url),
    "utf8"
  );

  assert.match(productionConstants, /export const MIN_ZOOM = 0\.01;/);
  assert.equal(EXCALIDRAW_MIN_ZOOM, 0.01);
  assert.equal(
    getCanvasMinimumZoom({
      isMobile: false,
      viewportWidth: 390,
      viewportHeight: 844,
      planeWidth: 1400,
      planeHeight: 780,
    }),
    0.72
  );
  assert.equal(
    getCanvasMinimumZoom({
      isMobile: true,
      viewportWidth: 390,
      viewportHeight: 844,
      planeWidth: 1400,
      planeHeight: 780,
    }),
    0.26
  );
  assert.equal(
    getCanvasMinimumZoom({
      isMobile: true,
      viewportWidth: 320,
      viewportHeight: 568,
      planeWidth: 1400,
      planeHeight: 780,
    }),
    0.21
  );
});

test("desktop and mobile retain the complete camera presets", () => {
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
    "translate3d(calc(-50% + 24px), calc(-50% + -18px), 0) scale(1.1)"
  );
});

test("website minimap uses the production scene transform", () => {
  const viewportBounds = getCanvasViewportBounds({
    width: 1200,
    height: 800,
    scrollX: -100,
    scrollY: -50,
    zoom: { value: 0.5 },
  });
  assert.deepEqual(viewportBounds, {
    x: 100,
    y: 50,
    width: 2400,
    height: 1600,
  });

  const transform = createCanvasMinimapTransform({
    contentBounds: { x: 72, y: 90, width: 1208, height: 600 },
    viewportBounds,
    mapWidth: 224,
    mapHeight: 144,
    padding: 8,
  });
  const scenePoint = { x: 720, y: 360 };
  const mapPoint = scenePointToMinimap(scenePoint, transform);

  const roundTrip = minimapPointToScene(mapPoint, transform);
  assert.ok(Math.abs(roundTrip.x - scenePoint.x) < 0.000001);
  assert.ok(Math.abs(roundTrip.y - scenePoint.y) < 0.000001);
  const mappedViewport = sceneBoundsToMinimap(viewportBounds, transform);
  assert.ok(mappedViewport.width > 0 && mappedViewport.height > 0);
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
    { x: 16, y: 6, zoom: 1 }
  );
  assert.deepEqual(
    applyCanvasWheelGesture(view, {
      deltaX: 0,
      deltaY: -16,
      ctrlKey: true,
      metaKey: false,
    }),
    { x: 40, y: -10, zoom: 1.1 }
  );
  assert.deepEqual(
    applyCanvasWheelGesture(view, {
      deltaX: 0,
      deltaY: 16,
      ctrlKey: false,
      metaKey: true,
    }),
    { x: 40, y: -10, zoom: 0.9 }
  );
});

test("touch gestures pan directly and keep the pinch anchor under the fingers", () => {
  const view = { x: 20, y: -10, zoom: 0.8 };

  assert.deepEqual(applyCanvasPanGesture(view, { deltaX: 36, deltaY: -24 }), {
    x: 56,
    y: -34,
    zoom: 0.8,
  });

  assert.deepEqual(
    applyCanvasPinchGesture(view, {
      startCenter: { x: 250, y: 320 },
      currentCenter: { x: 260, y: 330 },
      viewportCenter: { x: 200, y: 300 },
      startDistance: 100,
      currentDistance: 125,
    }),
    { x: 22.5, y: -7.5, zoom: 1 }
  );

  assert.deepEqual(
    applyCanvasPinchGesture(view, {
      startCenter: { x: 200, y: 300 },
      currentCenter: { x: 200, y: 300 },
      viewportCenter: { x: 200, y: 300 },
      startDistance: 0,
      currentDistance: 140,
    }),
    view
  );
});

test("mobile canvas wires touch pointers without the old mobile guard", async () => {
  const main = await readFile(new URL("main.js", import.meta.url), "utf8");
  const styles = await readFile(new URL("styles.css", import.meta.url), "utf8");

  assert.match(main, /event\.pointerType === "touch"/);
  assert.match(main, /applyCanvasPanGesture/);
  assert.match(main, /applyCanvasPinchGesture/);
  assert.doesNotMatch(
    main,
    /mobileLayout\.matches\s*\|\|\s*activeTool !== "hand"/
  );
  assert.match(styles, /\.canvas-viewport\s*{[\s\S]*?touch-action:\s*none;/);
  assert.doesNotMatch(styles, /touch-action:\s*manipulation;/);
});

test("mobile uses direct canvas gestures without a redundant story switcher", async () => {
  const main = await readFile(new URL("main.js", import.meta.url), "utf8");
  const styles = await readFile(new URL("styles.css", import.meta.url), "utf8");

  for (const entrypoint of ["index.html", "zh/index.html"]) {
    const html = await readFile(new URL(entrypoint, import.meta.url), "utf8");
    assert.doesNotMatch(html, /story-nav|story-step|data-camera-target/);
  }

  assert.doesNotMatch(styles, /\.story-nav|\.story-step/);
  assert.doesNotMatch(main, /data-camera-target|\.story-step/);
});

test("the demo toolbar exposes only canvas tools that work on the website", async () => {
  for (const entrypoint of ["index.html", "zh/index.html"]) {
    const html = await readFile(new URL(entrypoint, import.meta.url), "utf8");
    const toolbar = html.match(
      /<div\s+class="canvas-toolbar"[\s\S]*?<\/div>/
    )?.[0];

    assert.ok(toolbar, `${entrypoint} should contain the canvas toolbar`);
    assert.deepEqual(
      [...toolbar.matchAll(/data-tool="([^"]+)"/g)].map((match) => match[1]),
      ["select", "hand"]
    );
    assert.doesNotMatch(toolbar, /Open image generation|打开图片生成/);
  }
});

test("canvas annotations use native Excalidraw text styling without UI dots", async () => {
  const styles = await readFile(new URL("styles.css", import.meta.url), "utf8");

  assert.doesNotMatch(
    styles,
    /\.canvas-annotation\s*{\s*display:\s*none;\s*}/,
    "mobile must keep canvas annotations visible"
  );

  for (const entrypoint of ["index.html", "zh/index.html"]) {
    const html = await readFile(new URL(entrypoint, import.meta.url), "utf8");
    assert.doesNotMatch(html, /class="scene-chip/);
    assert.equal(
      [...html.matchAll(/class="canvas-annotation /g)].length,
      3,
      `${entrypoint} should contain three canvas text annotations`
    );
  }

  assert.doesNotMatch(styles, /\.scene-chip/);
  assert.match(styles, /font-family: "Excalifont"/);
  assert.match(styles, /font-family: "Xiaolai"/);
  assert.match(
    styles,
    /\[data-scene-object\]\.is-selected \.canvas-selection-overlay/
  );
  assert.doesNotMatch(styles, /\.canvas-annotation::before/);
});

test("the reference flow uses one native Excalidraw rough arrow", async () => {
  const styles = await readFile(new URL("styles.css", import.meta.url), "utf8");

  for (const entrypoint of ["index.html", "zh/index.html"]) {
    const html = await readFile(new URL(entrypoint, import.meta.url), "utf8");
    const connectors = html.match(
      /<svg\s+class="canvas-connectors"[\s\S]*?<\/svg>/
    )?.[0];

    assert.ok(connectors, `${entrypoint} should contain the reference arrow`);
    assert.equal(
      [...connectors.matchAll(/data-excalidraw-arrow/g)].length,
      1,
      `${entrypoint} should communicate the flow with one arrow`
    );
    assert.equal(
      [...connectors.matchAll(/class="excalidraw-arrow-stroke"/g)].length,
      3,
      `${entrypoint} should contain the Rough.js shaft and two open arrowhead strokes`
    );
    assert.doesNotMatch(connectors, /<marker|marker-end|connector-[abc]/);
    assert.match(connectors, /data-roughness="1"/);
    assert.match(connectors, /data-stroke-width="2"/);
    assert.match(connectors, /data-arrowhead-size="25"/);
    assert.match(connectors, /data-arrowhead-angle="20"/);
  }

  assert.match(styles, /\.excalidraw-arrow-stroke\s*{/);
  assert.match(styles, /\.canvas-app\.is-generating \.excalidraw-arrow-stroke/);
  assert.doesNotMatch(styles, /\.connector\s*{/);
  assert.doesNotMatch(styles, /\.canvas-connectors marker path/);
});

test("the generated image uses the native canvas placeholder and selection states", async () => {
  const styles = await readFile(new URL("styles.css", import.meta.url), "utf8");
  const main = await readFile(new URL("main.js", import.meta.url), "utf8");
  const placeholderSource = await readFile(
    new URL(
      "../excalidraw/apps/image-board-desktop/src/app/generationPlaceholderState.ts",
      import.meta.url
    ),
    "utf8"
  );
  const transformHandleSource = await readFile(
    new URL(
      "../excalidraw/packages/element/src/transformHandles.ts",
      import.meta.url
    ),
    "utf8"
  );

  for (const entrypoint of ["index.html", "zh/index.html"]) {
    const html = await readFile(new URL(entrypoint, import.meta.url), "utf8");
    const result = html.match(
      /<figure class="generation-result"[\s\S]*?<\/figure>/
    )?.[0];

    assert.ok(result, `${entrypoint} should contain the generated image`);
    assert.match(result, /class="result-placeholder"/);
    assert.match(result, /class="canvas-selection-border"/);
    assert.equal(
      [...result.matchAll(/class="canvas-transform-handle /g)].length,
      5,
      `${entrypoint} should contain four resize handles and one rotation handle`
    );
    assert.doesNotMatch(result, /result-status|result-corner/);
  }

  for (const productionValue of ["#6d5efc", "#f4f2ff"]) {
    assert.match(placeholderSource, new RegExp(productionValue));
    assert.match(styles, new RegExp(productionValue));
  }
  assert.match(transformHandleSource, /mouse:\s*8/);
  assert.match(transformHandleSource, /ROTATION_RESIZE_HANDLE_GAP = 16/);
  assert.match(styles, /\.canvas-transform-handle\s*{[\s\S]*?width: 8px;/);
  assert.match(
    styles,
    /\.canvas-selection-border\s*{[\s\S]*?inset: calc\(-4px \* var\(--inverse-canvas-zoom\)\);/
  );
  assert.match(
    styles,
    /\[data-scene-object\]\.is-selected \.canvas-selection-overlay/
  );
  assert.doesNotMatch(styles, /\.result-status|\.result-corner/);
  assert.doesNotMatch(main, /resultStatus/);
  assert.match(main, /--canvas-zoom/);
  assert.match(
    styles,
    /--inverse-canvas-zoom:\s*calc\(1 \/ var\(--canvas-zoom\)\)/
  );
  assert.match(
    styles,
    /\.canvas-transform-handle\s*{[\s\S]*?transform: scale\(var\(--inverse-canvas-zoom\)\)/
  );
});

test("the demo toolbar uses the exact CoreStudio tool icon geometry", async () => {
  const iconSource = await readFile(
    new URL(
      "../excalidraw/packages/excalidraw/components/icons.tsx",
      import.meta.url
    ),
    "utf8"
  );
  const styles = await readFile(new URL("styles.css", import.meta.url), "utf8");
  const sourcePaths = (start, end) => {
    const block = iconSource.slice(
      iconSource.indexOf(start),
      iconSource.indexOf(end)
    );
    return [...block.matchAll(/\bd="([^"]+)"/g)].map((match) => match[1]);
  };
  const expected = {
    select: sourcePaths("export const SelectionIcon", "export const LassoIcon"),
    hand: sourcePaths("export const handIcon", "export const downloadIcon"),
  };

  for (const entrypoint of ["index.html", "zh/index.html"]) {
    const html = await readFile(new URL(entrypoint, import.meta.url), "utf8");

    for (const [tool, paths] of Object.entries(expected)) {
      const button = html.match(
        new RegExp(`<button[^>]*data-tool="${tool}"[\\s\\S]*?<\\/button>`)
      )?.[0];
      assert.ok(button, `${entrypoint} should contain the ${tool} tool`);
      assert.deepEqual(
        [...button.matchAll(/\bd="([^"]+)"/g)].map((match) => match[1]),
        paths
      );
    }

    assert.match(
      html,
      /class="tool-button fillable is-active"[^>]*data-tool="select"/
    );
  }

  assert.match(
    styles,
    /\.tool-button\.fillable\.is-active svg\s*{\s*fill: currentColor;/
  );
});

test("the website minimap is the production canvas renderer, not hard-coded topology", async () => {
  const main = await readFile(new URL("main.js", import.meta.url), "utf8");
  const renderer = await readFile(
    new URL(
      "../excalidraw/apps/image-board-desktop/src/app/canvasMinimapRenderer.ts",
      import.meta.url
    ),
    "utf8"
  );

  assert.match(main, /renderCanvasMinimapScene/);
  assert.match(renderer, /renderCanvasMinimapScene/);

  for (const entrypoint of ["index.html", "zh/index.html"]) {
    const html = await readFile(new URL(entrypoint, import.meta.url), "utf8");
    const minimap = html.match(
      /<div class="minimap is-open"[\s\S]*?<\/div>/
    )?.[0];
    assert.ok(minimap, `${entrypoint} should contain the minimap`);
    assert.match(minimap, /<canvas[^>]*data-minimap-canvas/);
    assert.doesNotMatch(
      minimap,
      /minimap-marker|minimap-flow|minimap-result|minimap-viewport|data-camera-target/
    );
  }
});

test("every selectable canvas object uses one native transform overlay", async () => {
  const styles = await readFile(new URL("styles.css", import.meta.url), "utf8");

  for (const entrypoint of ["index.html", "zh/index.html"]) {
    const html = await readFile(new URL(entrypoint, import.meta.url), "utf8");
    const selectableCount = [...html.matchAll(/data-scene-object/g)].length;

    assert.equal(selectableCount, 6);
    assert.equal(
      [...html.matchAll(/class="canvas-selection-overlay"/g)].length,
      selectableCount,
      `${entrypoint} should give every selectable object the same overlay`
    );
    assert.equal(
      [...html.matchAll(/class="canvas-transform-handle /g)].length,
      selectableCount * 5,
      `${entrypoint} should give every object four resize handles and one rotation handle`
    );
    assert.doesNotMatch(
      html,
      /selection-box|image-selection|image-transform-handle/
    );
  }

  assert.match(
    styles,
    /\[data-scene-object\]\.is-selected \.canvas-selection-overlay/
  );
  assert.match(styles, /\.canvas-transform-handle\s*{[\s\S]*?width: 8px;/);
  assert.match(
    styles,
    /\.canvas-transform-handle\s*{[\s\S]*?transform: scale\(var\(--inverse-canvas-zoom\)\)/
  );
  assert.doesNotMatch(styles, /\.selection-box|\.image-selection-overlay/);
});

test("reference material is composed from flat canvas images, not a web card grid", async () => {
  const styles = await readFile(new URL("styles.css", import.meta.url), "utf8");

  for (const entrypoint of ["index.html", "zh/index.html"]) {
    const html = await readFile(new URL(entrypoint, import.meta.url), "utf8");
    const reference = html.match(
      /<figure class="reference-board"[\s\S]*?<\/figure>/
    )?.[0];

    assert.ok(reference);
    assert.equal([...reference.matchAll(/class="reference-image /g)].length, 4);
    assert.match(reference, /class="reference-selection-target"/);
    assert.doesNotMatch(reference, /reference-grid|reference-tile|<a\b/);
  }

  assert.doesNotMatch(styles, /\.reference-grid|\.reference-tile/);
  const imageRule = styles.match(/\.reference-image\s*{([^}]*)}/)?.[1] ?? "";
  assert.doesNotMatch(imageRule, /border-radius/);
});

test("the collaborator cursor follows Excalidraw geometry and labeling", async () => {
  const styles = await readFile(new URL("styles.css", import.meta.url), "utf8");
  const source = await readFile(
    new URL("../excalidraw/packages/excalidraw/clients.ts", import.meta.url),
    "utf8"
  );

  assert.match(source, /const width = 11/);
  assert.match(source, /const height = 14/);
  assert.match(source, /context\.font = "600 12px sans-serif"/);

  for (const entrypoint of ["index.html", "zh/index.html"]) {
    const html = await readFile(new URL(entrypoint, import.meta.url), "utf8");
    const cursor = html.match(/<div class="agent-cursor"[\s\S]*?<\/div>/)?.[0];

    assert.ok(cursor);
    assert.match(cursor, /viewBox="0 0 11 14"/);
    assert.match(cursor, /d="M0 0v14l4-5 7-1Z"/);
    assert.doesNotMatch(html, /writeback-tag/);
  }

  assert.match(styles, /\.agent-cursor\s*{[\s\S]*?width: 11px;/);
  assert.match(styles, /\.agent-cursor\s*{[\s\S]*?height: 14px;/);
  assert.match(
    styles,
    /\.agent-cursor span\s*{[\s\S]*?font: 600 12px sans-serif;/
  );
  assert.doesNotMatch(styles, /\.writeback-tag/);
});

test("the demo exposes no settings control without settings content", async () => {
  const main = await readFile(new URL("main.js", import.meta.url), "utf8");

  for (const entrypoint of ["index.html", "zh/index.html"]) {
    const html = await readFile(new URL(entrypoint, import.meta.url), "utf8");
    assert.doesNotMatch(html, /data-composer-settings|class="composer-icon"/);
  }

  assert.doesNotMatch(main, /composerSettings/);
});

test("the opening composition reserves clear space for fixed canvas chrome", async () => {
  const styles = await readFile(new URL("styles.css", import.meta.url), "utf8");
  const declaration = (selector, property) => {
    const block = styles.match(
      new RegExp(
        `${selector.replace(
          /[.*+?^${}()|[\\]\\]/g,
          "\\$&"
        )}\\s*\\{([\\s\\S]*?)\\}`
      )
    )?.[1];
    const value = block?.match(new RegExp(`${property}:\\s*(\\d+)px`))?.[1];
    return Number(value);
  };

  assert.ok(declaration(".project-tab", "left") >= 170);
  assert.ok(declaration(".project-tab", "top") >= 70);
  assert.ok(declaration(".scene-title", "top") >= 135);
  assert.ok(declaration(".reference-board", "left") >= 250);
});
