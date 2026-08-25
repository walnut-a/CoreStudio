import {
  CAMERA_VIEWS,
  applyCanvasPanGesture,
  applyCanvasPinchGesture,
  applyCanvasWheelGesture,
  composeTransform,
  getCanvasMinimumZoom,
  getGenerationSequence,
  getResponsiveOverviewView,
  getZoomControlState,
  stepZoom,
} from "./canvas-engine.mjs?v=20260825-2";

document.documentElement.classList.add("js");

const app = document.querySelector("[data-canvas-app]");

if (app) {
  const viewport = app.querySelector("[data-canvas-viewport]");
  const plane = app.querySelector("[data-canvas-plane]");
  const zoomLabel = app.querySelector("[data-zoom-label]");
  const zoomControl = app.querySelector("[data-zoom-control]");
  const zoomToggle = app.querySelector("[data-zoom-toggle]");
  const promptInput = app.querySelector("[data-prompt-input]");
  const generationForm = app.querySelector("[data-generation-form]");
  const generateButton = app.querySelector("[data-generate-button]");
  const demoStatus = app.querySelector("[data-demo-status]");
  const mobileLayout = window.matchMedia("(max-width: 720px)");
  const coarsePointer = window.matchMedia("(pointer: coarse)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let activeCamera = "overview";
  let view = { ...CAMERA_VIEWS.desktop.overview };
  let touchGestureState = null;
  let suppressCanvasClick = false;
  const touchPointers = new Map();
  let generationTimer = null;
  let zoomControlsExpanded = mobileLayout.matches
    ? false
    : zoomToggle?.getAttribute("aria-expanded") === "true";

  const mode = () => (mobileLayout.matches ? "mobile" : "desktop");
  const isChinese = document.documentElement.lang.startsWith("zh");

  const getMinimumZoom = () =>
    getCanvasMinimumZoom({
      isMobile: mobileLayout.matches || coarsePointer.matches,
      viewportWidth: viewport?.clientWidth ?? 0,
      viewportHeight: viewport?.clientHeight ?? 0,
      planeWidth: plane?.clientWidth ?? 0,
      planeHeight: plane?.clientHeight ?? 0,
    });

  const renderZoomControls = () => {
    const state = getZoomControlState(zoomControlsExpanded);
    zoomControl?.classList.toggle("is-expanded", state.showIncrementControls);
    if (zoomToggle) {
      zoomToggle.setAttribute("aria-expanded", String(state.expanded));
      const action = state.expanded
        ? isChinese
          ? "收起缩放控件"
          : "Collapse zoom controls"
        : isChinese
        ? "展开缩放控件"
        : "Expand zoom controls";
      zoomToggle.setAttribute(
        "aria-label",
        `${action}，${isChinese ? "当前缩放" : "current zoom"} ${Math.round(
          view.zoom * 100
        )}%`
      );
    }
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
  };

  const setCamera = (name) => {
    let next = CAMERA_VIEWS[mode()][name];
    if (!next) {
      return;
    }

    if (name === "overview" && !mobileLayout.matches) {
      next = getResponsiveOverviewView(next, {
        viewportWidth: viewport?.clientWidth ?? 0,
        viewportHeight: viewport?.clientHeight ?? 0,
        planeWidth: plane?.clientWidth ?? 0,
        planeHeight: plane?.clientHeight ?? 0,
      });
    }

    activeCamera = name;
    app.dataset.camera = name;
    view = { ...next };
    renderView();
  };

  const setCustomView = (nextView) => {
    view = nextView;
    activeCamera = "custom";
    app.dataset.camera = "custom";
    renderView();
  };

  const setZoom = (direction) => {
    setCustomView({
      ...view,
      zoom: stepZoom(view.zoom, direction, getMinimumZoom()),
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
  };

  const runDemo = () => {
    if (!generateButton || generateButton.disabled) {
      return;
    }

    clearGenerationTimer();
    app.classList.add("has-generated-once");
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

  app
    .querySelector("[data-zoom-in]")
    ?.addEventListener("click", () => setZoom(1));
  app
    .querySelector("[data-zoom-out]")
    ?.addEventListener("click", () => setZoom(-1));
  zoomToggle?.addEventListener("click", () => {
    zoomControlsExpanded = !zoomControlsExpanded;
    renderZoomControls();
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
            minimumZoom: getMinimumZoom(),
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
    const selectedObject = event.target.closest("[data-scene-object]");
    if (!selectedObject) {
      return;
    }
    selectSceneObject(selectedObject);
  });

  mobileLayout.addEventListener("change", (event) => {
    zoomControlsExpanded = !event.matches;
    setCamera(activeCamera === "custom" ? "overview" : activeCamera);
  });

  window.addEventListener("resize", () => {
    if (activeCamera === "overview") {
      setCamera("overview");
    }
  });

  setCamera("overview");
  setGenerationState("generated");
}
