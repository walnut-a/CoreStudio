import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImageBrowseView } from "./ImageBrowseView";
import { createImageAssetThumbnailStore } from "../imageAssetThumbnailStore";
import type { ProjectAssetPayload } from "../../shared/desktopBridgeTypes";

const asset = (fileId: string): ProjectAssetPayload => ({
  fileId,
  dataBase64: fileId,
  mimeType: "image/png",
  width: 800,
  height: 600,
  createdAt: "2026-09-06",
});
const items = Array.from({ length: 300 }, (_, i) => ({
  fileId: `image-${i}`,
  title: `图片 ${i}`,
  sizeLabel: "800 × 600 px",
}));
const props = () => ({
  items,
  projectPath: "/project-a",
  thumbnailStore: createImageAssetThumbnailStore(),
  onVisibleFileIdsChange: vi.fn(),
  readOriginal: vi.fn(async (fileId: string) => asset(fileId)),
  onBackToCanvas: vi.fn(),
});

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});

describe("ImageBrowseView", () => {
  it("keeps navigation outside the scrollable image grid", () => {
    const input = props();
    render(<ImageBrowseView {...input} />);
    const back = screen.getByRole("button", { name: "返回画布" });
    expect(
      screen.getByRole("region", { name: "图片网格" }),
    ).not.toContainElement(back);
    fireEvent.click(back);
    expect(input.onBackToCanvas).toHaveBeenCalledOnce();
  });

  it("keeps a thumbnail visible until the original loads, and retains it when retrying a failed original", async () => {
    const input = props();
    input.thumbnailStore.replace(input.projectPath, [
      { ...asset("image-0"), dataBase64: "thumbnail" },
    ]);
    let resolve!: (value: ProjectAssetPayload) => void;
    input.readOriginal.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    render(<ImageBrowseView {...input} />);
    fireEvent.click(screen.getByRole("button", { name: "图片 0" }));
    const preview = screen
      .getByRole("dialog")
      .querySelector('img[src="data:image/png;base64,thumbnail"]');
    expect(preview).toBeVisible();
    await act(async () => resolve(asset("image-0")));
    const original = screen.getByRole("img", { name: "图片 0" });
    expect(preview).toBeVisible();
    fireEvent.error(original);
    expect(preview).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "重试" }));
    const retried = await screen.findByRole("img", { name: "图片 0" });
    fireEvent.load(retried);
    expect(preview).toHaveClass("image-browse-original__preview--loaded");
    expect(retried).toHaveClass("image-browse-original__full--ready");
    fireEvent.click(screen.getByRole("button", { name: "原始尺寸" }));
    expect(preview).not.toBeInTheDocument();
    expect(screen.queryByText("正在读取图片…")).toBeNull();
  });
  it("renders a bounded grid and requests only its visible thumbnails", () => {
    const input = props();
    render(<ImageBrowseView {...input} />);
    expect(screen.getAllByRole("button").length).toBeLessThan(35);
    expect(input.onVisibleFileIdsChange.mock.calls[0][0].length).toBeLessThan(
      35,
    );
  });

  it("opens the original, navigates, and closes without losing grid position", async () => {
    render(<ImageBrowseView {...props()} />);
    const grid = screen.getByRole("region", { name: "图片网格" });
    fireEvent.scroll(grid, { target: { scrollTop: 2240 } });
    const trigger = grid.querySelector("button")!;
    fireEvent.click(trigger);
    await waitFor(() =>
      expect(screen.getByRole("dialog").querySelector("img")).toHaveAttribute(
        "src",
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "下一张" }));
    fireEvent.click(screen.getByRole("button", { name: "关闭详情" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(grid.scrollTop).toBe(2240);
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("ignores a late original response after navigation and closes on removal", async () => {
    let resolveFirst!: (value: ProjectAssetPayload) => void;
    const input = props();
    input.readOriginal.mockImplementation((id) =>
      id === "image-0"
        ? new Promise((resolve) => {
            resolveFirst = resolve;
          })
        : Promise.resolve(asset(id)),
    );
    const { rerender } = render(<ImageBrowseView {...input} />);
    fireEvent.click(screen.getByRole("button", { name: "图片 0" }));
    fireEvent.click(screen.getByRole("button", { name: "下一张" }));
    await waitFor(() =>
      expect(screen.getByRole("dialog").querySelector("img")).toHaveAttribute(
        "src",
        "data:image/png;base64,image-1",
      ),
    );
    await act(async () => resolveFirst(asset("image-0")));
    expect(screen.getByRole("dialog").querySelector("img")).toHaveAttribute(
      "src",
      "data:image/png;base64,image-1",
    );
    rerender(
      <ImageBrowseView
        {...input}
        items={items.filter((item) => item.fileId !== "image-1")}
      />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps an open image stable when background intake adds an image", async () => {
    const input = props();
    const { rerender } = render(<ImageBrowseView {...input} />);
    fireEvent.click(screen.getByRole("button", { name: "图片 0" }));
    await screen.findByRole("img", { name: "图片 0" });
    rerender(
      <ImageBrowseView
        {...input}
        items={[...items, { fileId: "new", title: "新增", sizeLabel: "" }]}
      />,
    );
    expect(screen.getByRole("dialog")).toHaveAccessibleName("图片 0");
    expect(input.readOriginal).toHaveBeenCalledTimes(1);
  });

  it("shows a retry action on read failure", async () => {
    const input = props();
    input.readOriginal.mockRejectedValueOnce(new Error("missing"));
    render(<ImageBrowseView {...input} />);
    fireEvent.click(screen.getByRole("button", { name: "图片 0" }));
    fireEvent.click(await screen.findByRole("button", { name: "重试" }));
    await screen.findByRole("img", { name: "图片 0" });
  });
});
