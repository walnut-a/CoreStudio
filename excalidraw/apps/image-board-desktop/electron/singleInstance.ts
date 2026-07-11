export interface SingleInstanceApp {
  requestSingleInstanceLock: () => boolean;
  quit: () => void;
  on: (eventName: "second-instance", handler: () => void) => void;
}

export interface FocusableWindow {
  isDestroyed: () => boolean;
  isMinimized: () => boolean;
  restore: () => void;
  focus: () => void;
}

export const focusExistingWindow = (
  targetWindow: FocusableWindow | null | undefined,
) => {
  if (!targetWindow || targetWindow.isDestroyed()) {
    return;
  }
  if (targetWindow.isMinimized()) {
    targetWindow.restore();
  }
  targetWindow.focus();
};

export const createSingleInstanceController = (app: SingleInstanceApp) => ({
  install: (focusExisting: () => void) => {
    if (!app.requestSingleInstanceLock()) {
      app.quit();
      return false;
    }

    app.on("second-instance", focusExisting);
    return true;
  },
});
