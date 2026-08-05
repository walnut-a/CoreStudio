import type { AppState } from "../types";

export const getFrameRenderingForExport = (
  frameRendering: AppState["frameRendering"],
): AppState["frameRendering"] => ({
  ...frameRendering,
  name: false,
  outline: false,
});
