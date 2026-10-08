import { describe, expect, it, vi } from "vitest";
import { newElement, Scene } from "@excalidraw/element";
import { getDefaultAppState } from "@excalidraw/excalidraw/appState";
import type { ExcalidrawElement } from "@excalidraw/element/types";
import { renderCanvasMinimap } from "./canvasMinimapRenderer";

describe("minimap navigation rendering", () => {
  const fixture = () => ({
    canvas: document.createElement("canvas"),
    elements: [
      newElement({
        type: "rectangle",
        x: 0,
        y: 0,
        width: 10000,
        height: 10000,
      }),
    ],
    appState: {
      ...getDefaultAppState(),
      width: 800,
      height: 600,
      scrollX: -100,
      scrollY: -100,
    },
    offsets: { top: 0, right: 0, bottom: 0, left: 0 },
    cache: new Map(),
  });

  it("reuses the scene bitmap while the viewport rectangle moves", () => {
    const input = fixture();
    const context = input.canvas.getContext("2d")!;
    const drawImage = vi.spyOn(context, "drawImage");
    const first = renderCanvasMinimap(input)!;
    expect(drawImage).toHaveBeenCalledTimes(1);
    const bitmap = drawImage.mock.calls[0][0] as HTMLCanvasElement;
    const rect = vi.spyOn(bitmap.getContext("2d")!, "rect");
    rect.mockClear();
    const next = renderCanvasMinimap({
      ...input,
      appState: { ...input.appState, scrollX: -200 },
    })!;
    expect(drawImage).toHaveBeenLastCalledWith(bitmap, 0, 0, 224, 144);
    expect(rect).not.toHaveBeenCalled();
    expect(next.viewportMapBounds.x).not.toBe(first.viewportMapBounds.x);
  });

  it("refreshes bitmap geometry after in-place edits and when the viewport expands map bounds", () => {
    const input = fixture();
    const drawImage = vi.spyOn(input.canvas.getContext("2d")!, "drawImage");
    const first = renderCanvasMinimap(input)!;
    expect(drawImage).toHaveBeenCalled();
    new Scene(input.elements, { skipValidation: true }).mutateElement(
      input.elements[0],
      { width: 20000 },
    );
    const edited = renderCanvasMinimap(input)!;
    expect(edited.transform.scale).toBeLessThan(first.transform.scale);
    const outside = renderCanvasMinimap({
      ...input,
      appState: { ...input.appState, scrollX: -100000 },
    })!;
    expect(outside.transform.sceneBounds.width).toBeGreaterThan(
      edited.transform.sceneBounds.width,
    );
  });

  it("refreshes selection, theme, deletion and a replaced project", () => {
    const input = fixture();
    const context = input.canvas.getContext("2d")!;
    const drawImage = vi.spyOn(context, "drawImage");
    renderCanvasMinimap(input);
    const bitmap = drawImage.mock.calls[0][0] as HTMLCanvasElement;
    const paint = vi.spyOn(bitmap.getContext("2d")!, "clearRect");
    paint.mockClear();
    const selected = {
      ...input.appState,
      selectedElementIds: { [input.elements[0].id]: true as const },
    };
    renderCanvasMinimap({ ...input, appState: selected });
    expect(paint).toHaveBeenCalledTimes(1);
    renderCanvasMinimap({ ...input, appState: { ...selected, theme: "dark" } });
    expect(paint).toHaveBeenCalledTimes(2);
    new Scene(input.elements, { skipValidation: true }).mutateElement(
      input.elements[0] as ExcalidrawElement,
      { isDeleted: true },
    );
    const deleted = renderCanvasMinimap(input)!;
    expect(deleted.transform.sceneBounds.width).toBeLessThan(10000);
    expect(input.cache.size).toBe(0);
    const otherProject = [
      newElement({
        type: "rectangle",
        x: 50000,
        y: 0,
        width: 100,
        height: 100,
      }),
    ];
    const replaced = renderCanvasMinimap({
      ...input,
      elements: otherProject,
    })!;
    expect(replaced.transform.sceneBounds.width).toBeGreaterThan(
      deleted.transform.sceneBounds.width,
    );
  });
});
