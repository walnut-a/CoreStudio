const finite = (value, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const positive = (value, fallback = 0) => Math.max(0, finite(value, fallback));

const normalizeOffsets = (offsets = {}) => ({
  top: positive(offsets.top),
  right: positive(offsets.right),
  bottom: positive(offsets.bottom),
  left: positive(offsets.left),
});

const normalizeSceneBounds = (bounds) => ({
  x: finite(bounds.x),
  y: finite(bounds.y),
  width: Math.max(1, positive(bounds.width, 1)),
  height: Math.max(1, positive(bounds.height, 1)),
});

const unionBounds = (first, second) => {
  const left = Math.min(first.x, second.x);
  const top = Math.min(first.y, second.y);
  const right = Math.max(first.x + first.width, second.x + second.width);
  const bottom = Math.max(first.y + first.height, second.y + second.height);

  return { x: left, y: top, width: right - left, height: bottom - top };
};

export const unionCanvasMinimapBounds = (bounds) => {
  if (!bounds.length) {
    return null;
  }
  return bounds.slice(1).reduce(unionBounds, normalizeSceneBounds(bounds[0]));
};

export const getCanvasViewportBounds = (appState, offsets) => {
  const width = positive(appState.width);
  const height = positive(appState.height);
  const scrollX = finite(appState.scrollX);
  const scrollY = finite(appState.scrollY);
  const zoom = Math.max(0.0001, positive(appState.zoom?.value, 1));
  const normalizedOffsets = normalizeOffsets(offsets);
  const usableWidth = Math.max(
    0,
    width - normalizedOffsets.left - normalizedOffsets.right,
  );
  const usableHeight = Math.max(
    0,
    height - normalizedOffsets.top - normalizedOffsets.bottom,
  );

  return {
    x: -scrollX + normalizedOffsets.left / zoom,
    y: -scrollY + normalizedOffsets.top / zoom,
    width: usableWidth / zoom,
    height: usableHeight / zoom,
  };
};

export const createCanvasMinimapTransform = ({
  contentBounds,
  viewportBounds,
  mapWidth,
  mapHeight,
  padding,
}) => {
  const safeMapWidth = Math.max(1, positive(mapWidth, 1));
  const safeMapHeight = Math.max(1, positive(mapHeight, 1));
  const safePadding = Math.min(
    positive(padding),
    Math.max(0, Math.min(safeMapWidth, safeMapHeight) / 2 - 0.5),
  );
  const innerWidth = Math.max(1, safeMapWidth - safePadding * 2);
  const innerHeight = Math.max(1, safeMapHeight - safePadding * 2);
  const normalizedViewport = normalizeSceneBounds(viewportBounds);
  const combined = contentBounds
    ? unionBounds(normalizeSceneBounds(contentBounds), normalizedViewport)
    : normalizedViewport;
  const targetAspect = innerWidth / innerHeight;
  const currentAspect = combined.width / combined.height;
  let sceneBounds = combined;

  if (currentAspect > targetAspect) {
    const height = combined.width / targetAspect;
    sceneBounds = {
      x: combined.x,
      y: combined.y - (height - combined.height) / 2,
      width: combined.width,
      height,
    };
  } else if (currentAspect < targetAspect) {
    const width = combined.height * targetAspect;
    sceneBounds = {
      x: combined.x - (width - combined.width) / 2,
      y: combined.y,
      width,
      height: combined.height,
    };
  }

  const scale = Math.min(
    innerWidth / sceneBounds.width,
    innerHeight / sceneBounds.height,
  );

  return {
    mapWidth: safeMapWidth,
    mapHeight: safeMapHeight,
    offsetX: safePadding - sceneBounds.x * scale,
    offsetY: safePadding - sceneBounds.y * scale,
    scale,
    sceneBounds,
  };
};

export const scenePointToMinimap = (point, transform) => ({
  x: point.x * transform.scale + transform.offsetX,
  y: point.y * transform.scale + transform.offsetY,
});

export const minimapPointToScene = (point, transform) => ({
  x: (point.x - transform.offsetX) / transform.scale,
  y: (point.y - transform.offsetY) / transform.scale,
});

export const sceneBoundsToMinimap = (bounds, transform) => {
  const origin = scenePointToMinimap(bounds, transform);
  return {
    x: origin.x,
    y: origin.y,
    width: bounds.width * transform.scale,
    height: bounds.height * transform.scale,
  };
};

export const canvasMinimapHasPoint = (bounds, point, minimumSize = 0) => {
  const width = Math.max(bounds.width, minimumSize);
  const height = Math.max(bounds.height, minimumSize);
  const x = bounds.x - (width - bounds.width) / 2;
  const y = bounds.y - (height - bounds.height) / 2;
  return (
    point.x >= x &&
    point.x <= x + width &&
    point.y >= y &&
    point.y <= y + height
  );
};

const readColor = (styles, token, fallback) =>
  styles.getPropertyValue(token).trim() || fallback;

export const renderCanvasMinimapScene = ({
  canvas,
  elements,
  appState,
  offsets,
}) => {
  const rect = canvas.getBoundingClientRect();
  const mapWidth = Math.max(1, rect.width || canvas.clientWidth || 224);
  const mapHeight = Math.max(1, rect.height || canvas.clientHeight || 144);
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const pixelWidth = Math.round(mapWidth * dpr);
  const pixelHeight = Math.round(mapHeight * dpr);

  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  const normalizedOffsets = normalizeOffsets(offsets);
  const viewportBounds = getCanvasViewportBounds(appState, normalizedOffsets);
  const contentBounds = unionCanvasMinimapBounds(
    elements.map((item) => item.bounds),
  );
  const transform = createCanvasMinimapTransform({
    contentBounds,
    viewportBounds,
    mapWidth,
    mapHeight,
    padding: 8,
  });
  const viewportMapBounds = sceneBoundsToMinimap(viewportBounds, transform);
  const styles = getComputedStyle(canvas);
  const background = readColor(styles, "--color-surface-mid", "#f6f6f9");
  const shapeColor = readColor(
    styles,
    "--color-border-outline-variant",
    "#c5c5d0",
  );
  const imageColor = readColor(styles, "--color-gray-60", "#7a7a7a");
  const primary = readColor(styles, "--color-primary", "#6965db");
  const viewportFill = readColor(styles, "--island-bg-color", "#ffffff");
  const viewportStroke = readColor(styles, "--text-primary-color", "#1b1b1f");

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, mapWidth, mapHeight);
  context.fillStyle = background;
  context.fillRect(0, 0, mapWidth, mapHeight);

  for (const category of ["shape", "image"]) {
    context.beginPath();
    for (const item of elements) {
      if (item.category !== category || item.selected) {
        continue;
      }
      const bounds = sceneBoundsToMinimap(item.bounds, transform);
      context.rect(
        bounds.x,
        bounds.y,
        Math.max(1, bounds.width),
        Math.max(1, bounds.height),
      );
    }
    context.fillStyle = category === "image" ? imageColor : shapeColor;
    context.globalAlpha = category === "image" ? 0.55 : 0.42;
    context.fill();
  }

  context.beginPath();
  for (const item of elements) {
    if (!item.selected) {
      continue;
    }
    const bounds = sceneBoundsToMinimap(item.bounds, transform);
    context.rect(
      bounds.x,
      bounds.y,
      Math.max(1.5, bounds.width),
      Math.max(1.5, bounds.height),
    );
  }
  context.fillStyle = primary;
  context.globalAlpha = 0.72;
  context.fill();

  context.globalAlpha = 0.18;
  context.fillStyle = viewportFill;
  context.fillRect(
    viewportMapBounds.x,
    viewportMapBounds.y,
    viewportMapBounds.width,
    viewportMapBounds.height,
  );
  context.globalAlpha = 0.9;
  context.strokeStyle = viewportStroke;
  context.lineWidth = 1.5;
  context.strokeRect(
    viewportMapBounds.x + 0.75,
    viewportMapBounds.y + 0.75,
    Math.max(0, viewportMapBounds.width - 1.5),
    Math.max(0, viewportMapBounds.height - 1.5),
  );
  context.globalAlpha = 1;

  return {
    offsets: normalizedOffsets,
    transform,
    viewportBounds,
    viewportMapBounds,
  };
};
