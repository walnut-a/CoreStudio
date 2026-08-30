import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  CAMERA_VIEWS,
  CAMERA_TRANSITION_MS,
  EXCALIDRAW_MIN_ZOOM,
  GENERATION_SETTLE_MS,
  REFERENCE_SELECTION_SETTLE_MS,
  applyCanvasPanGesture,
  applyCanvasPinchGesture,
  applyCanvasWheelGesture,
  clampZoom,
  composeTransform,
  getCanvasMinimumZoom,
  getGenerationSequence,
  getResponsiveOverviewView,
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

test("canvas zooms out until the complete composition fits the viewport", async () => {
  const productionConstants = await readFile(
    new URL("../excalidraw/packages/common/src/constants.ts", import.meta.url),
    "utf8"
  );

  assert.match(productionConstants, /export const MIN_ZOOM = 0\.01;/);
  assert.equal(EXCALIDRAW_MIN_ZOOM, 0.01);
  assert.equal(
    getCanvasMinimumZoom({
      isMobile: false,
      viewportWidth: 1280,
      viewportHeight: 720,
      planeWidth: 1680,
      planeHeight: 960,
    }),
    0.58
  );
  assert.equal(
    getCanvasMinimumZoom({
      isMobile: true,
      viewportWidth: 390,
      viewportHeight: 844,
      planeWidth: 1400,
      planeHeight: 780,
    }),
    0.24
  );
  assert.equal(
    getCanvasMinimumZoom({
      isMobile: true,
      viewportWidth: 320,
      viewportHeight: 568,
      planeWidth: 1400,
      planeHeight: 780,
    }),
    0.19
  );
});

test("desktop and mobile retain the complete camera presets", () => {
  for (const mode of ["desktop", "mobile"]) {
    assert.deepEqual(Object.keys(CAMERA_VIEWS[mode]), ["overview", "agent"]);
  }

  assert.ok(
    CAMERA_VIEWS.mobile.overview.y < 0 &&
      CAMERA_VIEWS.mobile.overview.y >= -60,
    "the mobile opening camera should lift the editorial canvas into the first viewport"
  );
});

test("generation preserves the responsive overview camera", async () => {
  const main = await readFile(new URL("main.js", import.meta.url), "utf8");

  assert.doesNotMatch(main, /setCamera\("generate"\)/);
  assert.match(main, /state === "generating"/);
  assert.match(main, /setGenerationState\(state\)/);
});

test("the overview camera fits the full composition before using extra space", () => {
  const baseView = CAMERA_VIEWS.desktop.overview;

  assert.deepEqual(
    getResponsiveOverviewView(baseView, {
      viewportWidth: 1280,
      viewportHeight: 720,
      planeWidth: 1680,
      planeHeight: 960,
    }),
    { x: 53.36, y: -1.6, zoom: 0.58 }
  );
  assert.deepEqual(
    getResponsiveOverviewView(baseView, {
      viewportWidth: 1800,
      viewportHeight: 1000,
      planeWidth: 1680,
      planeHeight: 960,
    }),
    { x: 80.96, y: 0, zoom: 0.88 }
  );
  assert.deepEqual(
    getResponsiveOverviewView(baseView, {
      viewportWidth: 2940,
      viewportHeight: 1850,
      planeWidth: 1680,
      planeHeight: 960,
    }),
    { x: 119.6, y: -221, zoom: 1.3 }
  );

  assert.deepEqual(
    getResponsiveOverviewView(baseView, {
      viewportWidth: 731,
      viewportHeight: 837,
      planeWidth: 1680,
      planeHeight: 960,
    }),
    { x: 37.72, y: -141.7, zoom: 0.41 }
  );

  const narrowView = getResponsiveOverviewView(CAMERA_VIEWS.mobile.overview, {
      viewportWidth: 390,
      viewportHeight: 844,
      planeWidth: 1680,
      planeHeight: 960,
    });
  assert.deepEqual(narrowView, { x: 24.84, y: -212.4, zoom: 0.27 });

  const contentLeft = 96;
  const contentRight = 1400;
  const assertContentIsCentered = (viewportWidth, view) => {
    const leftGap =
      viewportWidth / 2 +
      view.x +
      (contentLeft - 1680 / 2) * view.zoom;
    const rightGap =
      viewportWidth -
      (viewportWidth / 2 +
        view.x +
        (contentRight - 1680 / 2) * view.zoom);
    assert.ok(Math.abs(leftGap - rightGap) < 0.01);
  };

  assertContentIsCentered(390, narrowView);
  assertContentIsCentered(
    1414,
    getResponsiveOverviewView(baseView, {
      viewportWidth: 1414,
      viewportHeight: 878,
      planeWidth: 1680,
      planeHeight: 960,
    })
  );
});

test("canvas transforms keep translation independent from zoom", () => {
  assert.equal(
    composeTransform({ x: 24, y: -18, zoom: 1.1 }),
    "translate3d(calc(-50% + 24px), calc(-50% + -18px), 0) scale(1.1)"
  );
});

test("compact zoom controls disclose increment actions without a minimap", () => {
  assert.deepEqual(getZoomControlState(false), {
    expanded: false,
    showIncrementControls: false,
  });
  assert.deepEqual(getZoomControlState(true), {
    expanded: true,
    showIncrementControls: true,
  });
});

test("camera navigation uses the product canvas timing", () => {
  assert.equal(CAMERA_TRANSITION_MS, 180);
});

test("generation is one user-triggered flow and never implies autonomous agent activity", () => {
  assert.equal(GENERATION_SETTLE_MS, 1200);
  assert.equal(REFERENCE_SELECTION_SETTLE_MS, 260);
  assert.deepEqual(getGenerationSequence(false), [
    { state: "references-selected", at: 0 },
    { state: "generating", at: 260 },
    { state: "generated", at: 1460 },
  ]);
  assert.deepEqual(getGenerationSequence(true), [
    { state: "references-selected", at: 0 },
    { state: "generating", at: 0 },
    { state: "generated", at: 0 },
  ]);
});

test("responsive layout and camera share the 820px compact breakpoint", async () => {
  const main = await readFile(new URL("main.js", import.meta.url), "utf8");
  const styles = await readFile(new URL("styles.css", import.meta.url), "utf8");

  assert.match(main, /matchMedia\("\(max-width: 820px\)"\)/);
  assert.doesNotMatch(main, /matchMedia\("\(max-width: 720px\)"\)/);
  assert.doesNotMatch(
    main,
    /name === "overview" && !mobileLayout\.matches/
  );
  assert.match(styles, /@media \(max-width: 820px\)/);
});

test("both localized entrypoints load the current website assets", async () => {
  for (const entrypoint of ["index.html", "zh/index.html"]) {
    const html = await readFile(new URL(entrypoint, import.meta.url), "utf8");
    assert.match(html, /styles\.css\?v=20260831-3/);
    assert.match(html, /main\.js\?v=20260831-3/);
  }
  const main = await readFile(new URL("main.js", import.meta.url), "utf8");
  assert.match(main, /canvas-engine\.mjs\?v=20260831-3/);
});

test("the Chinese display title keeps editorial tension without colliding lines", async () => {
  const styles = await readFile(new URL("styles.css", import.meta.url), "utf8");

  assert.match(
    styles,
    /\.scene-title h1\s*{[\s\S]*?line-height:\s*1\.06;/
  );
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

test("the website omits the canvas tool switcher and mode state", async () => {
  const main = await readFile(new URL("main.js", import.meta.url), "utf8");
  const styles = await readFile(new URL("styles.css", import.meta.url), "utf8");

  assert.doesNotMatch(main, /activeTool|setTool|\[data-tool\]/);
  assert.doesNotMatch(styles, /\.canvas-toolbar|\.tool-button|data-active-tool/);

  for (const entrypoint of ["index.html", "zh/index.html"]) {
    const html = await readFile(new URL(entrypoint, import.meta.url), "utf8");
    assert.doesNotMatch(html, /canvas-toolbar|data-tool=|data-active-tool=/);
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

test("the reference flow embeds one arrow exported by Excalidraw", async () => {
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
    assert.match(connectors, /<!-- svg-source:excalidraw -->/);
    assert.match(connectors, /data-export-source="excalidraw"/);
    assert.match(connectors, /data-id="website-reference-flow-arrow"/);
    assert.doesNotMatch(connectors, /data-arrow-shaft-extension/);
    assert.match(connectors, /stroke-linecap="round"/);
    assert.doesNotMatch(connectors, /<marker|marker-end|connector-[abc]/);
    assert.doesNotMatch(
      connectors,
      /data-roughness|data-stroke-width|data-arrowhead-size|data-arrowhead-angle/
    );

    const arrowX = Number(
      connectors.match(/data-excalidraw-arrow[\s\S]*?\sx="([^"]+)"/)?.[1]
    );
    const arrowWidth = Number(
      connectors.match(/data-excalidraw-arrow[\s\S]*?\swidth="([^"]+)"/)?.[1]
    );
    const arrowY = Number(
      connectors.match(/data-excalidraw-arrow[\s\S]*?\sy="([^"]+)"/)?.[1]
    );
    const arrowHeight = Number(
      connectors.match(/data-excalidraw-arrow[\s\S]*?\sheight="([^"]+)"/)?.[1]
    );
    assert.equal(arrowX, 664);
    assert.equal(arrowY, 342);
    assert.ok(
      arrowWidth >= 168,
      `${entrypoint} should stretch across the full input-output channel`
    );
    assert.ok(
      arrowHeight <= 30,
      `${entrypoint} should rise gradually instead of turning sharply`
    );
    assert.ok(
      arrowX + arrowWidth <= 840,
      `${entrypoint} should meet the generated stage at x=840 without crossing it`
    );
  }

  assert.match(styles, /\.excalidraw-arrow-native path\s*{/);
  assert.match(styles, /\.canvas-app\.is-generating \.excalidraw-arrow-native path/);
  assert.doesNotMatch(styles, /\.excalidraw-arrow-stroke/);
  assert.doesNotMatch(styles, /\.connector\s*{/);
  assert.doesNotMatch(styles, /\.canvas-connectors marker path/);
});

test("the reference strip visibly communicates a four-image multi-selection", async () => {
  const styles = await readFile(new URL("styles.css", import.meta.url), "utf8");
  const main = await readFile(new URL("main.js", import.meta.url), "utf8");

  for (const entrypoint of ["index.html", "zh/index.html"]) {
    const html = await readFile(new URL(entrypoint, import.meta.url), "utf8");
    const referenceBoard = html.match(
      /<figure\s+class="reference-board is-multi-selected"[\s\S]*?<\/figure>/
    )?.[0];

    assert.ok(
      referenceBoard,
      `${entrypoint} should open with the reference strip multi-selected`
    );
    assert.equal(
      [...referenceBoard.matchAll(/class="reference-image /g)].length,
      4,
      `${entrypoint} should show four selected reference images`
    );
    assert.match(html, /data-status-references-selected=/);
  }

  assert.match(
    styles,
    /\.reference-board\.is-multi-selected \.reference-image\s*{[\s\S]*?outline:/
  );
  assert.match(
    styles,
    /\.reference-board\.is-multi-selected \.canvas-selection-overlay/
  );
  assert.match(main, /selectReferenceGroup/);
  assert.match(main, /references-selected/);
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
    assert.match(
      result,
      /<div class="result-frame">\s*<div class="result-media">[\s\S]*?<\/div>\s*<div class="canvas-selection-overlay"/,
      `${entrypoint} should keep the selection overlay outside the clipped image layer`
    );
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
  const resultFrameRule =
    [...styles.matchAll(/\.result-frame\s*\{([^}]*)}/g)].at(-1)?.[1] ?? "";
  const resultMediaRule =
    styles.match(/\.result-media\s*\{([^}]*)}/)?.[1] ?? "";
  assert.match(resultFrameRule, /overflow:\s*visible;/);
  assert.match(resultMediaRule, /overflow:\s*hidden;/);
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

test("the website removes the minimap but keeps zoom disclosure", async () => {
  const main = await readFile(new URL("main.js", import.meta.url), "utf8");
  const styles = await readFile(new URL("styles.css", import.meta.url), "utf8");

  assert.doesNotMatch(main, /canvasMinimap|minimap/i);
  assert.doesNotMatch(styles, /\.minimap/);

  for (const entrypoint of ["index.html", "zh/index.html"]) {
    const html = await readFile(new URL(entrypoint, import.meta.url), "utf8");
    assert.doesNotMatch(html, /minimap|迷你地图/i);
    assert.match(html, /data-zoom-toggle/);
    assert.match(html, /aria-expanded="true"/);
  }
});

test("the canvas omits redundant lower-corner project links", async () => {
  const styles = await readFile(new URL("styles.css", import.meta.url), "utf8");

  assert.doesNotMatch(styles, /\.canvas-links/);
  for (const entrypoint of ["index.html", "zh/index.html"]) {
    const html = await readFile(new URL(entrypoint, import.meta.url), "utf8");
    assert.doesNotMatch(html, /class="canvas-links"/);
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
      /<figure\s+class="reference-board(?: is-multi-selected)?"[\s\S]*?<\/figure>/
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

test("the opening composition balances a two-row reference set with an uncropped generation stage", async () => {
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

  assert.equal(declaration(".canvas-plane", "width"), 1680);
  assert.equal(declaration(".canvas-plane", "height"), 960);
  assert.deepEqual(
    {
      top: declaration(".generation-result", "top"),
      left: declaration(".generation-result", "left"),
      width: declaration(".generation-result", "width"),
    },
    { top: 184, left: 840, width: 560 }
  );
  assert.deepEqual(
    {
      top: declaration(".reference-board", "top"),
      left: declaration(".reference-board", "left"),
      width: declaration(".reference-board", "width"),
    },
    { top: 200, left: 96, width: 560 }
  );
  assert.deepEqual(
    {
      top: declaration(".scene-title", "top"),
      left: declaration(".scene-title", "left"),
      width: declaration(".scene-title", "width"),
    },
    { top: 600, left: 96, width: 560 }
  );
  assert.equal(
    declaration(".generation-result", "width"),
    declaration(".reference-board", "width"),
    "the input and output columns should carry equal visual weight"
  );
  assert.ok(
    declaration(".reference-board", "top") <
      declaration(".scene-title", "top"),
    "the slogan should sit below the input references as secondary information"
  );
  assert.match(
    styles,
    /\.page-en \.scene-title h1\s*\{[\s\S]*?font-size:\s*3rem;/,
    "the English slogan should stay subordinate to the generation stage"
  );
  assert.ok(
    declaration(".canvas-annotation-local", "top") >=
      declaration(".scene-title", "top"),
    "the benefit points should share the lower editorial band with the slogan"
  );
  assert.equal(
    declaration(".canvas-annotation-local", "top"),
    declaration(".scene-title", "top"),
    "the benefit points and slogan should start on the same baseline"
  );
  assert.doesNotMatch(styles, /\.canvas-annotation-outcome/);
  assert.match(
    styles,
    /\.reference-selection-target,\s*\.reference-images\s*\{[\s\S]*?width:\s*560px;[\s\S]*?height:\s*336px;/
  );
  assert.deepEqual(
    {
      top: declaration(".reference-image-a", "top"),
      left: declaration(".reference-image-a", "left"),
      width: declaration(".reference-image-a", "width"),
      height: declaration(".reference-image-a", "height"),
    },
    { top: 0, left: 0, width: 180, height: 184 }
  );
  assert.deepEqual(
    {
      top: declaration(".reference-image-c", "top"),
      left: declaration(".reference-image-c", "left"),
      width: declaration(".reference-image-c", "width"),
      height: declaration(".reference-image-c", "height"),
    },
    { top: 196, left: 0, width: 368, height: 140 }
  );
  assert.match(styles, /\.scene-title h1\s*\{[\s\S]*?font-size:\s*4rem;/);
  assert.match(
    styles,
    /\.scene-heading\s*\{[\s\S]*?color:\s*var\(--surface\);[\s\S]*?background:\s*var\(--ink\);/
  );
  assert.match(
    styles,
    /\.scene-heading p\s*\{[\s\S]*?margin:\s*0;[\s\S]*?color:\s*color-mix\(/
  );
  assert.match(styles, /\.result-frame\s*\{[\s\S]*?aspect-ratio:\s*3 \/ 2;/);
  const resultImageRule =
    styles.match(/\.result-image\s*\{([^}]*)}/)?.[1] ?? "";
  assert.match(resultImageRule, /object-fit:\s*contain;/);
  assert.doesNotMatch(resultImageRule, /transform:/);
  assert.doesNotMatch(styles, /\.result-studies\s*\{/);

  for (const entrypoint of ["index.html", "zh/index.html"]) {
    const html = await readFile(new URL(entrypoint, import.meta.url), "utf8");
    assert.match(
      html,
      /<div class="scene-heading">[\s\S]*?<h1>[\s\S]*?<\/h1>\s*<p>[\s\S]*?<\/p>\s*<\/div>/,
      "the supporting sentence should sit inside the black slogan panel"
    );
    assert.doesNotMatch(html, /class="scene-title is-selected"/);
    assert.equal([...html.matchAll(/class="result-study-image /g)].length, 0);
    assert.equal(
      [...html.matchAll(/corestudio-canvas-result-rams-v2\.webp/g)].length,
      1,
      `${entrypoint} should render the generated result once at its original aspect ratio`
    );
    assert.equal([...html.matchAll(/class="canvas-annotation-detail"/g)].length, 3);
    assert.equal([...html.matchAll(/class="canvas-annotation-outcome"/g)].length, 0);
  }

  const zh = await readFile(new URL("zh/index.html", import.meta.url), "utf8");
  assert.match(zh, /参考图片、生成结果和项目数据都保存在当前设备的项目文件夹中/);
  assert.match(zh, /可按需配置图片生成服务与模型/);
  assert.match(zh, /Codex 等 Agent 可以读取项目内容/);
  assert.match(zh, /支持内置浏览器时/);

  const en = await readFile(new URL("index.html", import.meta.url), "utf8");
  assert.match(en, /Projects, references, and results stay on your device/);
  assert.match(en, /Choose services and models for quality, speed, or budget/);
  assert.match(en, /Agents read the canvas and selection/);
});
