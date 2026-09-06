import { describe, expect, it, vi } from "vitest";
import {
  App,
  act,
  createDesktopBridgeMock,
  createMockProjectBundle,
  fireEvent,
  mockExcalidrawAPI,
  newImageElement,
  render,
  screen,
  triggerExcalidrawChange,
  triggerExcalidrawInitialize,
  waitFor,
} from "./App.testSupport";
import type { FileId } from "./App.testSupport";

describe("App view mode", () => {
  it("keeps the editor mounted and scene unchanged while disabling editing; live scene changes still reach the grid", async () => {
    window.imageBoardDesktop = createDesktopBridgeMock({
      openRecentProject: vi.fn().mockResolvedValue(createMockProjectBundle()),
    }) as any;
    const { container } = render(
      <App desktopProjectPath="/tmp/mock-project" />,
    );
    const canvas = await screen.findByTestId("excalidraw-canvas");
    act(() => triggerExcalidrawInitialize?.());
    expect(screen.queryByRole("button", { name: "网格查看" })).toBeNull();
    expect(screen.queryByRole("group", { name: "显示模式" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "图片资产" }));
    const viewButton = await screen.findByRole("button", { name: "网格查看" });
    expect(viewButton.closest(".side-dock__header")).not.toBeNull();
    const image = newImageElement({
      type: "image",
      x: 210,
      y: 340,
      width: 300,
      height: 200,
      fileId: "file-a" as FileId,
    });
    act(() =>
      triggerExcalidrawChange?.({
        elements: [image],
        appState: {
          scrollX: 123,
          scrollY: 456,
          zoom: { value: 1.5 },
          selectedElementIds: { [image.id]: true },
        },
        files: {},
      }),
    );
    const before = mockExcalidrawAPI?.getSceneElementsIncludingDeleted();
    const viewport = mockExcalidrawAPI?.getAppState();
    const composer = screen.getByTestId("generate-image-dialog");
    fireEvent.click(viewButton);
    expect(screen.getByTestId("excalidraw-canvas")).toBe(canvas);
    expect(canvas).toHaveAttribute("data-interaction", "false");
    expect(screen.getByTestId("side-dock-left")).toHaveAttribute(
      "data-open",
      "false",
    );
    expect(container.querySelector(".image-board-canvas")).toHaveAttribute(
      "inert",
    );
    expect(screen.getByTestId("generate-image-dialog")).toBe(composer);
    expect(composer).toHaveAttribute("inert");
    for (const type of ["dragover", "drop"]) {
      const event = new Event(type, { bubbles: true, cancelable: true });
      fireEvent(screen.getByRole("button", { name: "返回画布" }), event);
      expect(event.defaultPrevented).toBe(true);
    }
    expect(
      screen
        .getByRole("region", { name: "图片网格" })
        .querySelectorAll("button"),
    ).toHaveLength(1);
    expect(mockExcalidrawAPI?.getSceneElementsIncludingDeleted()).toEqual(
      before,
    );
    expect(mockExcalidrawAPI?.getAppState()).toEqual(viewport);
    act(() =>
      triggerExcalidrawChange?.({
        elements: [
          image,
          newImageElement({
            type: "image",
            x: 600,
            y: 300,
            width: 300,
            height: 200,
            fileId: "file-b" as FileId,
          }),
        ],
        appState: viewport ?? {},
        files: {},
      }),
    );
    await waitFor(() =>
      expect(
        screen
          .getByRole("region", { name: "图片网格" })
          .querySelectorAll("button"),
      ).toHaveLength(2),
    );
    fireEvent.click(screen.getByRole("button", { name: "返回画布" }));
    expect(canvas).toHaveAttribute("data-interaction", "true");
    expect(screen.queryByRole("button", { name: "网格查看" })).toBeNull();
    expect(screen.getByRole("button", { name: "图片资产" })).toHaveFocus();
    expect(screen.queryByRole("region", { name: "图片网格" })).toBeNull();
    expect(screen.getByTestId("excalidraw-canvas")).toBe(canvas);
  });
});
