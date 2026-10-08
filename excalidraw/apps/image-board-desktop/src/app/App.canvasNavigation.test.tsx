import { describe, expect, it, vi } from "vitest";
import { newElement } from "@excalidraw/element";
import * as reconciliation from "./pendingGenerationSceneReconciliation";
import {
  App,
  act,
  createDesktopBridgeMock,
  fireEvent,
  mockExcalidrawAPI,
  render,
  screen,
  triggerExcalidrawChange,
  triggerExcalidrawInitialize,
  waitFor,
} from "./App.testSupport";

describe("App canvas navigation", () => {
  it("bypasses content reconciliation during navigation and resumes it for edits and selection", async () => {
    window.imageBoardDesktop = createDesktopBridgeMock() as any;
    const reconcile = vi.spyOn(
      reconciliation,
      "reconcilePendingGenerationScene",
    );
    const { container } = render(<App />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    await act(async () => triggerExcalidrawInitialize?.());
    await waitFor(() =>
      expect(
        container.querySelector(".image-board-canvas--editor-initializing"),
      ).toBeNull(),
    );
    const element = newElement({
      type: "rectangle",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });
    const elements = [element];
    expect("getSceneNonce" in mockExcalidrawAPI!).toBe(false);
    const change = (patch: Record<string, unknown>) =>
      act(() => {
        triggerExcalidrawChange?.({
          elements,
          appState: { ...mockExcalidrawAPI!.getAppState(), ...patch },
          files: mockExcalidrawAPI!.getFiles(),
        });
      });
    change({ scrollX: 10, shouldCacheIgnoreZoom: false });
    expect(reconcile).toHaveBeenCalled();
    reconcile.mockClear();
    change({ scrollX: 20, zoom: { value: 0.05 } });
    change({ scrollY: 40, shouldCacheIgnoreZoom: true });
    change({ shouldCacheIgnoreZoom: false });
    expect(reconcile).not.toHaveBeenCalled();
    Object.assign(element, { version: element.version + 1 });
    change({ scrollX: 30 });
    expect(reconcile).toHaveBeenCalledTimes(1);
    change({ selectedElementIds: { image: true } });
    expect(reconcile).toHaveBeenCalledTimes(2);
    reconcile.mockRestore();
  });
});
