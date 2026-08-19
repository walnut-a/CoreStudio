import {
  CAMERA_VIEWS,
  applyCanvasWheelGesture,
  composeTransform,
  getGenerationSequence,
  getMinimapViewport,
  getZoomControlState,
  stepZoom,
} from "./canvas-engine.mjs?v=20260820-5";

document.documentElement.classList.add("js");

const app = document.querySelector("[data-canvas-app]");

if (app) {
  const viewport = app.querySelector("[data-canvas-viewport]");
  const plane = app.querySelector("[data-canvas-plane]");
  const zoomLabel = app.querySelector("[data-zoom-label]");
  const zoomControl = app.querySelector("[data-zoom-control]");
  const minimap = app.querySelector("[data-minimap]");
  const minimapViewport = app.querySelector("[data-minimap-viewport]");
  const minimapToggle = app.querySelector("[data-minimap-toggle]");
  const promptInput = app.querySelector("[data-prompt-input]");
  const generationForm = app.querySelector("[data-generation-form]");
  const generateButton = app.querySelector("[data-generate-button]");
  const composerSettings = app.querySelector("[data-composer-settings]");
  const demoStatus = app.querySelector("[data-demo-status]");
  const resultStatus = app.querySelector("[data-result-status]");
  const resultStatusLabel = app.querySelector("[data-result-status-label]");
  const mobileLayout = window.matchMedia("(max-width: 720px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let activeCamera = "overview";
  let activeTool = "select";
  let view = { ...CAMERA_VIEWS.desktop.overview };
  let dragState = null;
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
        `${action}，${isChinese ? "当前缩放" : "current zoom"} ${Math.round(view.zoom * 100)}%`,
      );
    }
  };

  const updateMinimap = () => {
    if (!minimapViewport) {
      return;
    }

    const rect = getMinimapViewport(view);
    Object.assign(minimapViewport.style, {
      left: `${rect.x}%`,
      top: `${rect.y}%`,
      width: `${rect.width}%`,
      height: `${rect.height}%`,
    });
  };

  const renderView = () => {
    if (!plane) {
      return;
    }

    plane.style.transform = composeTransform(view);
    if (zoomLabel) {
      zoomLabel.textContent = `${Math.round(view.zoom * 100)}%`;
    }
    renderZoomControls();
    updateMinimap();
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

    if (name === "shape") {
      setCamera("overview");
      app.querySelector("[data-shape-cluster]")?.classList.add("is-selected");
    }

    if (name === "image") {
      setCamera("generate");
      promptInput?.focus({ preventScroll: true });
    }
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
        demoStatus.textContent = generationForm?.dataset.statusGenerating ?? "Generating";
      }
      if (resultStatusLabel && resultStatus) {
        resultStatusLabel.textContent = resultStatus.dataset.generating ?? "Generating";
      }
      return;
    }

    generateButton.removeAttribute("aria-busy");
    if (demoStatus) {
      demoStatus.textContent = generationForm?.dataset.statusGenerated ?? "Generated";
    }
    if (resultStatusLabel && resultStatus) {
      resultStatusLabel.textContent = resultStatus.dataset.ready ?? "Updated on canvas";
    }
  };

  const runDemo = () => {
    if (!generateButton || generateButton.disabled) {
      return;
    }

    clearGenerationTimer();
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
    button.addEventListener("click", () => setCamera(button.dataset.cameraTarget));
  });

  app.querySelectorAll("[data-tool]").forEach((button) => {
    button.addEventListener("click", () => setTool(button.dataset.tool));
  });

  app.querySelector("[data-zoom-in]")?.addEventListener("click", () => setZoom(1));
  app.querySelector("[data-zoom-out]")?.addEventListener("click", () => setZoom(-1));
  minimapToggle?.addEventListener("click", () => {
    minimapOpen = !minimapOpen;
    renderZoomControls();
  });

  composerSettings?.addEventListener("click", () => {
    const active = composerSettings.getAttribute("aria-pressed") !== "true";
    composerSettings.setAttribute("aria-pressed", String(active));
    composerSettings.classList.toggle("is-active", active);
  });

  generationForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    runDemo();
  });

  viewport?.addEventListener("pointerdown", (event) => {
    if (mobileLayout.matches || activeTool !== "hand" || event.button !== 0) {
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
        }),
      );
    },
    { passive: false },
  );

  viewport?.addEventListener("click", (event) => {
    if (activeTool !== "select") {
      return;
    }
    const selectedObject = event.target.closest("[data-scene-object]");
    if (!selectedObject) {
      return;
    }
    app.querySelectorAll("[data-scene-object]").forEach((item) => {
      item.classList.toggle("is-selected", item === selectedObject);
    });
  });

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
