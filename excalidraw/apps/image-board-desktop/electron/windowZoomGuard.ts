import type { BrowserWindow, Event } from "electron";

export const disableRendererPageZoom = (
  targetWindow: Pick<BrowserWindow, "on" | "webContents">,
) => {
  const { webContents } = targetWindow;

  const isAlive = () => !webContents.isDestroyed();

  const resetZoomFactor = () => {
    if (isAlive()) {
      webContents.setZoomFactor(1);
    }
  };

  const lockVisualZoom = () => {
    if (!isAlive()) {
      return;
    }

    const result = webContents.setVisualZoomLevelLimits(1, 1);
    if (result && typeof result.catch === "function") {
      void result.catch(() => undefined);
    }
  };

  resetZoomFactor();
  lockVisualZoom();

  webContents.on("zoom-changed", (event: Event) => {
    event.preventDefault();
    resetZoomFactor();
  });

  webContents.on("did-finish-load", () => {
    resetZoomFactor();
    lockVisualZoom();
  });

  targetWindow.on("focus", () => {
    resetZoomFactor();
    lockVisualZoom();
  });
};
