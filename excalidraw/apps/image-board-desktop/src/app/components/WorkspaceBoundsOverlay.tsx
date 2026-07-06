import type { WorkspaceOverlayState } from "../workspaceBounds";
import "./WorkspaceBoundsOverlay.css";

export interface WorkspaceBoundsOverlayProps {
  state: WorkspaceOverlayState | null;
  pulsing: boolean;
}

export const WorkspaceBoundsOverlay = ({
  state,
  pulsing,
}: WorkspaceBoundsOverlayProps) => {
  if (!state) {
    return null;
  }

  const { bounds, scrollX, scrollY, zoomValue } = state;
  const left = (bounds.x + scrollX) * zoomValue;
  const top = (bounds.y + scrollY) * zoomValue;
  const width = bounds.width * zoomValue;
  const height = bounds.height * zoomValue;

  if (
    !Number.isFinite(left) ||
    !Number.isFinite(top) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className={[
        "image-board-workspace-bounds",
        pulsing ? "image-board-workspace-bounds--fit-pulse" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        left,
        top,
        width,
        height,
      }}
    />
  );
};
