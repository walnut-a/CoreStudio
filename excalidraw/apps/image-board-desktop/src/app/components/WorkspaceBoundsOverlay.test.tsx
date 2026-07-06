import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { WorkspaceOverlayState } from "../workspaceBounds";
import { WorkspaceBoundsOverlay } from "./WorkspaceBoundsOverlay";

const createState = (
  patch: Partial<WorkspaceOverlayState> = {},
): WorkspaceOverlayState => ({
  bounds: {
    x: 10,
    y: 20,
    width: 100,
    height: 50,
  },
  scrollX: 5,
  scrollY: -10,
  zoomValue: 2,
  ...patch,
});

describe("WorkspaceBoundsOverlay", () => {
  it("does not render without overlay state", () => {
    const { container } = render(
      <WorkspaceBoundsOverlay state={null} pulsing={false} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders screen-space bounds from workspace state", () => {
    const { container } = render(
      <WorkspaceBoundsOverlay state={createState()} pulsing={false} />,
    );

    const overlay = container.querySelector(".image-board-workspace-bounds");

    expect(overlay).toHaveClass("image-board-workspace-bounds");
    expect(overlay).not.toHaveClass("image-board-workspace-bounds--fit-pulse");
    expect(overlay).toHaveStyle({
      left: "30px",
      top: "20px",
      width: "200px",
      height: "100px",
    });
  });

  it("adds the pulse class when the fit pulse is active", () => {
    const { container } = render(
      <WorkspaceBoundsOverlay state={createState()} pulsing={true} />,
    );

    expect(container.querySelector(".image-board-workspace-bounds")).toHaveClass(
      "image-board-workspace-bounds--fit-pulse",
    );
  });

  it("filters invalid screen-space bounds", () => {
    const invalidStates: WorkspaceOverlayState[] = [
      createState({ zoomValue: Number.NaN }),
      createState({ bounds: { x: 10, y: 20, width: 0, height: 50 } }),
      createState({ bounds: { x: 10, y: 20, width: 100, height: -1 } }),
    ];

    invalidStates.forEach((state) => {
      const { container, unmount } = render(
        <WorkspaceBoundsOverlay state={state} pulsing={true} />,
      );

      expect(container).toBeEmptyDOMElement();
      unmount();
    });
  });
});
