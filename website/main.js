import {
  CAMERA_VIEWS,
  applyCanvasPanGesture,
  applyCanvasPinchGesture,
  applyCanvasWheelGesture,
  composeTransform,
  getGenerationSequence,
  getZoomControlState,
  stepZoom,
} from "./canvas-engine.mjs?v=20260820-9";
import {
  canvasMinimapHasPoint,
  minimapPointToScene,
  renderCanvasMinimapScene,
} from "/excalidraw/apps/image-board-desktop/src/app/canvasMinimapCore.mjs";

document.documentElement.classList.add("js");

const app = document.querySelector("[data-canvas-app]");

if (app) {
  const viewport = app.querySelector("[data-canvas-viewport]");
  const plane = app.querySelector("[data-canvas-plane]");
  const zoomLabel = app.querySelector("[data-zoom-label]");
  const zoomControl = app.querySelector("[data-zoom-control]");
  const minimap = app.querySelector("[data-minimap]");
  const minimapCanvas = app.querySelector("[data-minimap-canvas]");
  const minimapToggle = app.querySelector("[data-minimap-toggle]");
  const promptInput = app.querySelector("[data-prompt-input]");
  const generationForm = app.querySelector("[data-generation-form]");
  const generateButton = app.querySelector("[data-generate-button]");
  const demoStatus = app.querySelector("[data-demo-status]");
  const mobileLayout = window.matchMedia("(max-width: 720px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let activeCamera = "overview";
  let activeTool = "select";
  let view = { ...CAMERA_VIEWS.desktop.overview };
  let dragState = null;
  let touchGestureState = null;
  let suppressCanvasClick = false;
  const touchPointers = new Map();
  let minimapDragState = null;
  let minimapModel = null;
  let minimapRenderFrame = null;
  let generationTimer = null;
  let minimapOpen = mobileLayout.matches
    ? false
    : minimapToggle?.getAttribute("aria-pressed") === "true";

  const mode = () => (mobileLayout.matches ? "mobile" : "desktop");
  const isChinese = document.documentElement.lang.startsWith("zh");

  const renderZoomControls = () => {
    const state = getZoomControlState(minimapOpen);
    zoomControl?.classList.toggle("is-expanded", state.showIncrementControls);
    minimap?.classList.toggle("is-open", state.minimapOpen);
    if (minimapToggle) {
      minimapToggle.setAttribute("aria-pressed", String(state.minimapOpen));
      const action = state.minimapOpen
        ? isChinese
          ? "关闭迷你地图"
          : "Close minimap"
        : isChinese
        ? "打开迷你地图"
        : "Open minimap";
      minimapToggle.setAttribute(
        "aria-label",
        `${action}，${isChinese ? "当前缩放" : "current zoom"} ${Math.round(
          view.zoom * 100
        )}%`
      );
    }
  };

  const getSceneElements = () =>
    [...app.querySelectorAll("[data-scene-object]")].map((element) => ({
      bounds: {
        x: element.offsetLeft,
        y: element.offsetTop,
        width: element.offsetWidth,
        height: element.offsetHeight,
      },
      category: element.matches("figure") ? "image" : "shape",
      selected: element.classList.contains("is-selected"),
    }));

  const getMinimapAppState = () => {
    const width = viewport?.clientWidth ?? 0;
    const height = viewport?.clientHeight ?? 0;
    const planeWidth = plane?.clientWidth ?? 0;
    const planeHeight = plane?.clientHeight ?? 0;
    return {
      width,
      height,
      scrollX: -planeWidth / 2 + (width / 2 + view.x) / view.zoom,
      scrollY: -planeHeight / 2 + (height / 2 + view.y) / view.zoom,
      zoom: { value: view.zoom },
    };
  };

  const drawMinimap = () => {
    minimapRenderFrame = null;
    if (!minimapCanvas || !minimapOpen) {
      return;
    }
    minimapModel = renderCanvasMinimapScene({
      canvas: minimapCanvas,
      elements: getSceneElements(),
      appState: getMinimapAppState(),
      offsets: { top: 0, right: 0, bottom: 0, left: 0 },
    });
  };

  const scheduleMinimapDraw = () => {
    if (minimapRenderFrame !== null) {
      return;
    }
    minimapRenderFrame = window.requestAnimationFrame(drawMinimap);
  };

  const renderView = () => {
    if (!plane) {
      return;
    }

    plane.style.setProperty("--canvas-zoom", String(view.zoom));
    plane.style.transform = composeTransform(view);
    if (zoomLabel) {
      zoomLabel.textContent = `${Math.round(view.zoom * 100)}%`;
    }
    renderZoomControls();
    scheduleMinimapDraw();
  };

  const setCamera = (name) => {
    const next = CAMERA_VIEWS[mode()][name];
    if (!next) {
      return;
    }

    activeCamera = name;
    app.dataset.camera = name;
    view = { ...next };
    app.querySelectorAll("[data-camera-target]").forEach((button) => {
      const selected = button.dataset.cameraTarget === name;
      button.classList.toggle("is-active", selected);
      if (button.matches(".story-step")) {
        button.setAttribute("aria-current", selected ? "step" : "false");
      }
    });
    renderView();
  };

  const setCustomView = (nextView) => {
    view = nextView;
    activeCamera = "custom";
    app.dataset.camera = "custom";
    app.querySelectorAll(".story-step").forEach((button) => {
      button.classList.remove("is-active");
      button.setAttribute("aria-current", "false");
    });
    renderView();
  };

  const setZoom = (direction) => {
    setCustomView({
      ...view,
      zoom: stepZoom(view.zoom, direction),
    });
  };

  const setTool = (name) => {
    activeTool = name;
    app.dataset.activeTool = name;
    app.querySelectorAll("[data-tool]").forEach((button) => {
      const selected = button.dataset.tool === name;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  };

  const clearGenerationTimer = () => {
    if (generationTimer !== null) {
      window.clearTimeout(generationTimer);
      generationTimer = null;
    }
  };

  const setGenerationState = (state) => {
    const generating = state === "generating";
    app.classList.toggle("is-generating", generating);
    app.classList.toggle("is-result-ready", state === "generated");
    generateButton.disabled = generating;
    if (generating) {
      generateButton.setAttribute("aria-busy", "true");
      if (demoStatus) {
        demoStatus.textContent =
          generationForm?.dataset.statusGenerating ?? "Generating";
      }
      return;
    }

    generateButton.removeAttribute("aria-busy");
    if (demoStatus) {
      demoStatus.textContent =
        generationForm?.dataset.statusGenerated ?? "Generated";
    }
  };

  const selectSceneObject = (selectedObject) => {
    if (!selectedObject) {
      return;
    }
    app.querySelectorAll("[data-scene-object]").forEach((item) => {
      item.classList.toggle("is-selected", item === selectedObject);
    });
    scheduleMinimapDraw();
  };

  const runDemo = () => {
    if (!generateButton || generateButton.disabled) {
      return;
    }

    clearGenerationTimer();
    selectSceneObject(app.querySelector(".generation-result"));
    setCamera("generate");
    const sequence = getGenerationSequence(reducedMotion.matches);
    sequence.forEach(({ state, at }) => {
      if (at === 0) {
        setGenerationState(state);
        return;
      }
      generationTimer = window.setTimeout(() => {
        generationTimer = null;
        setGenerationState(state);
      }, at);
    });
  };

  app.querySelectorAll("[data-camera-target]").forEach((button) => {
    button.addEventListener("click", () =>
      setCamera(button.dataset.cameraTarget)
    );
  });

  app.querySelectorAll("[data-tool]").forEach((button) => {
    button.addEventListener("click", () => setTool(button.dataset.tool));
  });

  app
    .querySelector("[data-zoom-in]")
    ?.addEventListener("click", () => setZoom(1));
  app
    .querySelector("[data-zoom-out]")
    ?.addEventListener("click", () => setZoom(-1));
  minimapToggle?.addEventListener("click", () => {
    minimapOpen = !minimapOpen;
    renderZoomControls();
    scheduleMinimapDraw();
  });

  const getMinimapPoint = (event) => {
    const rect = minimapCanvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const centerViewAtScenePoint = (point) => ({
    ...view,
    x: ((plane?.clientWidth ?? 0) / 2 - point.x) * view.zoom,
    y: ((plane?.clientHeight ?? 0) / 2 - point.y) * view.zoom,
  });

  minimapCanvas?.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || !minimapModel) {
      return;
    }

    event.preventDefault();
    const mapPoint = getMinimapPoint(event);
    const scenePoint = minimapPointToScene(mapPoint, minimapModel.transform);
    const viewportCenter = {
      x: minimapModel.viewportBounds.x + minimapModel.viewportBounds.width / 2,
      y: minimapModel.viewportBounds.y + minimapModel.viewportBounds.height / 2,
    };
    const insideViewport = canvasMinimapHasPoint(
      minimapModel.viewportMapBounds,
      mapPoint,
      8
    );
    minimapDragState = {
      pointerId: event.pointerId,
      grabOffsetX: insideViewport ? scenePoint.x - viewportCenter.x : 0,
      grabOffsetY: insideViewport ? scenePoint.y - viewportCenter.y : 0,
    };
    minimapCanvas.setPointerCapture?.(event.pointerId);
    minimap.classList.add("is-dragging");
    app.classList.add("is-minimap-dragging");
    setCustomView(
      centerViewAtScenePoint({
        x: scenePoint.x - minimapDragState.grabOffsetX,
        y: scenePoint.y - minimapDragState.grabOffsetY,
      })
    );
  });

  minimapCanvas?.addEventListener("pointermove", (event) => {
    if (
      !minimapDragState ||
      event.pointerId !== minimapDragState.pointerId ||
      !minimapModel
    ) {
      return;
    }

    const scenePoint = minimapPointToScene(
      getMinimapPoint(event),
      minimapModel.transform
    );
    setCustomView(
      centerViewAtScenePoint({
        x: scenePoint.x - minimapDragState.grabOffsetX,
        y: scenePoint.y - minimapDragState.grabOffsetY,
      })
    );
  });

  const endMinimapDrag = (event) => {
    if (!minimapDragState || event.pointerId !== minimapDragState.pointerId) {
      return;
    }
    if (minimapCanvas.hasPointerCapture?.(event.pointerId)) {
      minimapCanvas.releasePointerCapture(event.pointerId);
    }
    minimapDragState = null;
    minimap.classList.remove("is-dragging");
    app.classList.remove("is-minimap-dragging");
  };

  minimapCanvas?.addEventListener("pointerup", endMinimapDrag);
  minimapCanvas?.addEventListener("pointercancel", endMinimapDrag);

  minimapCanvas?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      minimapOpen = false;
      renderZoomControls();
      minimapToggle?.focus();
      return;
    }
    if (!minimapModel || !event.key.startsWith("Arrow")) {
      return;
    }
    event.preventDefault();
    const factor = event.shiftKey ? 0.5 : 0.1;
    const center = {
      x: minimapModel.viewportBounds.x + minimapModel.viewportBounds.width / 2,
      y: minimapModel.viewportBounds.y + minimapModel.viewportBounds.height / 2,
    };
    if (event.key === "ArrowLeft") {
      center.x -= minimapModel.viewportBounds.width * factor;
    } else if (event.key === "ArrowRight") {
      center.x += minimapModel.viewportBounds.width * factor;
    } else if (event.key === "ArrowUp") {
      center.y -= minimapModel.viewportBounds.height * factor;
    } else if (event.key === "ArrowDown") {
      center.y += minimapModel.viewportBounds.height * factor;
    }
    setCustomView(centerViewAtScenePoint(center));
  });

  generationForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    runDemo();
  });

  const getTouchCenter = ([first, second]) => ({
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  });

  const getTouchDistance = ([first, second]) =>
    Math.hypot(second.x - first.x, second.y - first.y);

  const beginTouchGesture = () => {
    const points = [...touchPointers.values()];
    if (points.length >= 2) {
      const pair = points.slice(0, 2);
      const rect = viewport.getBoundingClientRect();
      touchGestureState = {
        mode: "pinch",
        startView: { ...view },
        startCenter: getTouchCenter(pair),
        startDistance: getTouchDistance(pair),
        viewportCenter: {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        },
      };
      suppressCanvasClick = true;
      app.classList.add("is-panning");
      return;
    }

    if (points.length === 1) {
      touchGestureState = {
        mode: "pan",
        startView: { ...view },
        startPoint: { ...points[0] },
      };
      return;
    }

    touchGestureState = null;
  };

  viewport?.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch") {
      event.preventDefault();
      touchPointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
      viewport.setPointerCapture?.(event.pointerId);
      beginTouchGesture();
      return;
    }

    if (activeTool !== "hand" || event.button !== 0) {
      return;
    }

    dragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      viewX: view.x,
      viewY: view.y,
    };
    viewport.setPointerCapture(event.pointerId);
    app.classList.add("is-panning");
  });

  viewport?.addEventListener("pointermove", (event) => {
    if (touchPointers.has(event.pointerId)) {
      event.preventDefault();
      touchPointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      const points = [...touchPointers.values()];
      if (points.length >= 2) {
        if (touchGestureState?.mode !== "pinch") {
          beginTouchGesture();
        }
        const pair = points.slice(0, 2);
        suppressCanvasClick = true;
        app.classList.add("is-panning");
        setCustomView(
          applyCanvasPinchGesture(touchGestureState.startView, {
            startCenter: touchGestureState.startCenter,
            currentCenter: getTouchCenter(pair),
            viewportCenter: touchGestureState.viewportCenter,
            startDistance: touchGestureState.startDistance,
            currentDistance: getTouchDistance(pair),
          })
        );
        return;
      }

      if (points.length === 1) {
        if (touchGestureState?.mode !== "pan") {
          beginTouchGesture();
        }
        const deltaX = points[0].x - touchGestureState.startPoint.x;
        const deltaY = points[0].y - touchGestureState.startPoint.y;
        if (Math.hypot(deltaX, deltaY) < 4) {
          return;
        }
        suppressCanvasClick = true;
        app.classList.add("is-panning");
        setCustomView(
          applyCanvasPanGesture(touchGestureState.startView, {
            deltaX,
            deltaY,
          })
        );
      }
      return;
    }

    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    setCustomView({
      ...view,
      x: dragState.viewX + event.clientX - dragState.startX,
      y: dragState.viewY + event.clientY - dragState.startY,
    });
  });

  const endDrag = (event) => {
    if (touchPointers.has(event.pointerId)) {
      event.preventDefault();
      touchPointers.delete(event.pointerId);
      if (viewport.hasPointerCapture?.(event.pointerId)) {
        viewport.releasePointerCapture(event.pointerId);
      }
      if (touchPointers.size > 0) {
        beginTouchGesture();
      } else {
        touchGestureState = null;
        app.classList.remove("is-panning");
        window.setTimeout(() => {
          suppressCanvasClick = false;
        }, 0);
      }
      return;
    }

    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }
    dragState = null;
    app.classList.remove("is-panning");
  };

  viewport?.addEventListener("pointerup", endDrag);
  viewport?.addEventListener("pointercancel", endDrag);

  viewport?.addEventListener(
    "wheel",
    (event) => {
      if (mobileLayout.matches) {
        return;
      }
      event.preventDefault();
      setCustomView(
        applyCanvasWheelGesture(view, {
          deltaX: event.deltaX,
          deltaY: event.deltaY,
          deltaMode: event.deltaMode,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
        })
      );
    },
    { passive: false }
  );

  viewport?.addEventListener("click", (event) => {
    if (suppressCanvasClick) {
      event.preventDefault();
      return;
    }
    if (activeTool !== "select") {
      return;
    }
    const selectedObject = event.target.closest("[data-scene-object]");
    if (!selectedObject) {
      return;
    }
    selectSceneObject(selectedObject);
  });

  if (typeof ResizeObserver !== "undefined") {
    const minimapResizeObserver = new ResizeObserver(scheduleMinimapDraw);
    for (const element of [viewport, plane, minimapCanvas]) {
      if (element) {
        minimapResizeObserver.observe(element);
      }
    }
  }

  mobileLayout.addEventListener("change", (event) => {
    if (event.matches) {
      minimapOpen = false;
    }
    setCamera(activeCamera === "custom" ? "overview" : activeCamera);
  });

  setTool("select");
  setCamera("overview");
  setGenerationState("generated");
}
