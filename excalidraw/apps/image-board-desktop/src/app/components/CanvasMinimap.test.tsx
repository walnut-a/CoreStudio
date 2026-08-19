import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CanvasMinimap } from "./CanvasMinimap";

const createApi = () => {
  let scrollListener:
    | ((scrollX: number, scrollY: number, zoom: { value: number }) => void)
    | undefined;
  return {
    getAppState: vi.fn(() => ({
      width: 1200,
      height: 800,
      scrollX: 0,
      scrollY: 0,
      zoom: { value: 1 },
      selectedElementIds: {},
      theme: "light",
    })),
    getSceneElements: vi.fn(() => []),
    getViewportOffsets: vi.fn(() => ({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    })),
    onChange: vi.fn(() => vi.fn()),
    onScrollChange: vi.fn((listener) => {
      scrollListener = listener;
      return vi.fn();
    }),
    setViewport: vi.fn(),
    emitScrollChange: (zoom: number) => scrollListener?.(0, 0, { value: zoom }),
  };
};

describe("CanvasMinimap", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("uses the current zoom percentage to open and close the minimap", () => {
    const api = createApi();
    const onOpenChange = vi.fn();
    render(
      <CanvasMinimap
        api={api as never}
        preferenceKey="test:minimap"
        onOpenChange={onOpenChange}
      />,
    );

    const toggle = screen.getByRole("button", {
      name: "打开迷你地图，当前缩放 100%",
    });
    expect(toggle).toHaveClass("ToolIcon_type_button");
    expect(toggle).toHaveClass("reset-zoom-button", "zoom-button");
    expect(toggle).not.toHaveClass("ToolIcon_type_toggle");
    expect(toggle).not.toHaveClass("canvas-minimap__toggle");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("application")).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("application")).toBeInTheDocument();
    expect(api.setViewport).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("application")).not.toBeInTheDocument();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("closes with Escape and restores focus to the toggle", () => {
    render(
      <CanvasMinimap api={createApi() as never} preferenceKey="test:minimap" />,
    );

    const toggle = screen.getByRole("button", {
      name: "打开迷你地图，当前缩放 100%",
    });
    fireEvent.click(toggle);
    fireEvent.keyDown(screen.getByRole("application"), { key: "Escape" });

    expect(screen.queryByRole("application")).not.toBeInTheDocument();
    expect(toggle).toHaveFocus();
  });

  it("centers a clicked scene point without changing zoom", async () => {
    const api = createApi();
    render(<CanvasMinimap api={api as never} preferenceKey="test:minimap" />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "打开迷你地图，当前缩放 100%",
      }),
    );
    const minimap = screen.getByRole("application");

    await waitFor(() => {
      expect(minimap).toHaveAttribute("width", "224");
    });
    fireEvent.pointerDown(minimap, {
      clientX: 112,
      clientY: 72,
      pointerId: 1,
    });

    await waitFor(() => {
      expect(api.setViewport).toHaveBeenCalledWith({
        target: expect.objectContaining({ width: 0, height: 0 }),
        fit: "none",
        offsets: { top: 0, right: 0, bottom: 0, left: 0 },
        animation: false,
      });
    });
  });

  it("keeps the percentage in sync while the minimap is closed", () => {
    const api = createApi();
    render(<CanvasMinimap api={api as never} preferenceKey="test:minimap" />);

    act(() => api.emitScrollChange(0.37));

    expect(
      screen.getByRole("button", {
        name: "打开迷你地图，当前缩放 37%",
      }),
    ).toHaveTextContent("37%");
  });
});
