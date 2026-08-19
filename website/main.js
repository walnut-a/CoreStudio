import {
  CAMERA_VIEWS,
  composeTransform,
  getMinimapViewport,
  getZoomControlState,
  stepZoom,
} from "./canvas-engine.mjs";

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
  let demoTimers = [];
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

  const setZoom = (direction) => {
    view.zoom = stepZoom(view.zoom, direction);
    activeCamera = "custom";
    app.querySelectorAll(".story-step").forEach((button) => {
      button.classList.remove("is-active");
      button.setAttribute("aria-current", "false");
    });
    renderView();
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

  const clearDemoTimers = () => {
    demoTimers.forEach(window.clearTimeout);
    demoTimers = [];
  };

  const schedule = (callback, delay) => {
    demoTimers.push(window.setTimeout(callback, delay));
  };

  const runDemo = ({ moveCamera = true } = {}) => {
    if (!generateButton || generateButton.disabled) {
      return;
    }

    clearDemoTimers();
    app.classList.remove("is-result-ready", "is-writeback-complete");
    void app.offsetWidth;
    app.classList.add("is-generating");
    generateButton.disabled = true;
    generateButton.setAttribute("aria-busy", "true");
    if (demoStatus) {
      demoStatus.textContent = generationForm?.dataset.statusGenerating ?? "Generating";
    }
    if (resultStatusLabel && resultStatus) {
      resultStatusLabel.textContent = resultStatus.dataset.generating ?? "Generating";
    }
    if (moveCamera) {
      setCamera("generate");
    }

    const resultDelay = reducedMotion.matches ? 80 : 1450;
    const writebackDelay = reducedMotion.matches ? 140 : 2300;
    const finishDelay = reducedMotion.matches ? 220 : 3100;

    schedule(() => {
      app.classList.remove("is-generating");
      app.classList.add("is-result-ready");
      if (demoStatus) {
        demoStatus.textContent = generationForm?.dataset.statusGenerated ?? "Generated";
      }
      if (resultStatusLabel && resultStatus) {
        resultStatusLabel.textContent = resultStatus.dataset.ready ?? "Updated on canvas";
      }
    }, resultDelay);

    schedule(() => {
      app.classList.add("is-writeback-complete");
      if (moveCamera) {
        setCamera("agent");
      }
      if (demoStatus) {
        demoStatus.textContent = generationForm?.dataset.statusWriteback ?? "Written back";
      }
    }, writebackDelay);

    schedule(() => {
      generateButton.disabled = false;
      generateButton.removeAttribute("aria-busy");
    }, finishDelay);
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

    view.x = dragState.viewX + event.clientX - dragState.startX;
    view.y = dragState.viewY + event.clientY - dragState.startY;
    activeCamera = "custom";
    renderView();
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
      setZoom(event.deltaY < 0 ? 1 : -1);
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

  if (!reducedMotion.matches) {
    schedule(() => runDemo({ moveCamera: false }), 1100);
  } else {
    app.classList.add("is-result-ready", "is-writeback-complete");
  }
}
