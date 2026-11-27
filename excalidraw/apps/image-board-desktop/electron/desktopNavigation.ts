import type { WebContents } from "electron";

export const guardDesktopNavigation = (contents: WebContents) => {
  // Main-process loadURL/loadFile do not emit will-navigate. Allow a renderer
  // to reload its current document while keeping its privileged route fixed.
  contents.on("will-navigate", (event) => {
    if (event.url !== contents.getURL()) event.preventDefault();
  });
  contents.setWindowOpenHandler(() => ({ action: "deny" }));
};
