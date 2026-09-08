import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as imageColors from "../imageColors";
import { ImageBrowseView } from "./ImageBrowseView";
import { createImageAssetThumbnailStore } from "../imageAssetThumbnailStore";
import type { ImageRecordMap } from "../../shared/projectTypes";
import type { ProjectAssetPayload } from "../../shared/desktopBridgeTypes";

vi.mock("../imageColors", async (original) => ({
  ...(await original<typeof import("../imageColors")>()),
  readImagePalette: vi.fn(() => ["#FF0000", "#0000FF"]),
}));

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
  aspectRatio: 4 / 3,
}));
const props = () => ({
  items,
  imageRecords: {
    "image-0": {
      fileId: "image-0",
      assetPath: "assets/0.png",
      sourceType: "generated",
      model: "test-model",
      prompt: "圆润的桌面音箱",
      parentFileId: "parent",
      width: 800,
      height: 600,
      createdAt: "2026-09-06",
      mimeType: "image/png",
    },
    parent: {
      fileId: "parent",
      assetPath: "assets/parent.png",
      sourceType: "imported",
      prompt: "最初的结构草图",
      width: 800,
      height: 600,
      createdAt: "2026-09-05",
      mimeType: "image/png",
    },
    "image-1": {
      fileId: "image-1",
      assetPath: "assets/1.png",
      sourceType: "generated",
      prompt: "细化音量旋钮",
      parentFileId: "image-0",
      width: 800,
      height: 600,
      createdAt: "2026-09-07",
      mimeType: "image/png",
    },
  } as ImageRecordMap,
  onCopyText: vi.fn(),
  projectPath: "/project-a",
  thumbnailStore: createImageAssetThumbnailStore(),
  onVisibleFileIdsChange: vi.fn(),
  readOriginal: vi.fn(async (fileId: string) => asset(fileId)),
  onBackToCanvas: vi.fn(),
  onLocateImage: vi.fn(),
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
  it("仅展开属性后提取主色，支持单色和整组复制；切图不沿用旧颜色", async () => {
    vi.mocked(imageColors.readImagePalette).mockClear();
    const input = props();
    render(<ImageBrowseView {...input} />);
    fireEvent.click(screen.getByRole("button", { name: "图片 0" }));
    const first = await screen.findByRole("img", { name: "图片 0" });
    fireEvent.load(first);
    await waitFor(() =>
      expect(first).toHaveClass("image-browse-original__full--ready"),
    );
    expect(imageColors.readImagePalette).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "属性" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "复制色值 #FF0000" }),
    );
    expect(input.onCopyText).toHaveBeenLastCalledWith("#FF0000");
    fireEvent.click(screen.getByRole("button", { name: "复制配色" }));
    expect(input.onCopyText).toHaveBeenLastCalledWith("#FF0000, #0000FF");
    fireEvent.click(screen.getByRole("button", { name: "下一张" }));
    expect(
      screen.queryByRole("button", { name: "复制色值 #FF0000" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "图片取色" })).toBeNull();
    await screen.findByRole("img", { name: "图片 1" });
  });

  it("配色读取失败不影响原图和导航", async () => {
    vi.mocked(imageColors.readImagePalette).mockImplementationOnce(() => {
      throw new Error("tainted");
    });
    const input = props();
    render(<ImageBrowseView {...input} />);
    fireEvent.click(screen.getByRole("button", { name: "图片 0" }));
    const first = await screen.findByRole("img", { name: "图片 0" });
    fireEvent.load(first);
    await waitFor(() =>
      expect(first).toHaveClass("image-browse-original__full--ready"),
    );
    fireEvent.click(screen.getByRole("button", { name: "属性" }));
    expect(await screen.findByText("无法读取图片颜色")).toBeVisible();
    expect(first).toBeVisible();
    expect(screen.getByRole("button", { name: "复制配色" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "下一张" }));
    await screen.findByRole("img", { name: "图片 1" });
  });

  it("shows a collapsible read-only inspector for the displayed image and follows navigation", async () => {
    const input = props();
    render(<ImageBrowseView {...input} />);
    fireEvent.click(screen.getByRole("button", { name: "图片 0" }));
    const toggle = screen.getByRole("button", { name: "属性" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("complementary", { name: "图片属性" }),
    ).toBeNull();
    fireEvent.click(toggle);
    const panel = screen.getByRole("complementary", { name: "图片属性" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(within(panel).getByText("test-model")).toBeVisible();
    expect(within(panel).getByText("最初的结构草图")).toBeVisible();
    expect(
      within(panel).getByRole("heading", { name: "编辑链" }),
    ).toBeVisible();
    expect(within(panel).queryByRole("textbox")).toBeNull();
    expect(
      within(panel).queryByRole("button", { name: /重命名|定位/ }),
    ).toBeNull();
    fireEvent.click(within(panel).getByRole("button", { name: "复制提示词" }));
    expect(input.onCopyText).toHaveBeenLastCalledWith("圆润的桌面音箱");
    fireEvent.click(screen.getByRole("button", { name: "下一张" }));
    fireEvent.click(within(panel).getByRole("button", { name: "复制提示词" }));
    expect(input.onCopyText).toHaveBeenLastCalledWith("细化音量旋钮");
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole("button", { name: "下一张" }));
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(screen.getByText("暂无图片属性")).toBeVisible();
    expect(screen.queryByText("最初的结构草图")).toBeNull();
    await screen.findByRole("img", { name: "图片 2" });
  });

  it("locates the image currently shown in details without treating it as a normal close", async () => {
    const input = props();
    render(<ImageBrowseView {...input} />);
    fireEvent.click(screen.getByRole("button", { name: "图片 0" }));
    fireEvent.click(screen.getByRole("button", { name: "下一张" }));
    await screen.findByRole("img", { name: "图片 1" });
    fireEvent.click(screen.getByRole("button", { name: "在画布中定位" }));
    expect(input.onLocateImage).toHaveBeenCalledWith("image-1");
    expect(input.onBackToCanvas).not.toHaveBeenCalled();
  });

  it("keeps names in hover hints and image details without grid captions", async () => {
    render(<ImageBrowseView {...props()} />);
    const image = screen.getByRole("button", { name: "图片 0" });
    expect(image).toHaveAttribute("title", "图片 0");
    expect(screen.queryByText("图片 0")).toBeNull();
    fireEvent.click(image);
    expect(screen.getByRole("dialog")).toHaveAccessibleName("图片 0");
    expect(screen.getByText("图片 0")).toBeVisible();
    await screen.findByRole("img", { name: "图片 0" });
  });

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
    await waitFor(() => expect(preview).not.toBeInTheDocument());
    expect(retried).toHaveClass("image-browse-original__full--ready");
    fireEvent.click(screen.getByRole("button", { name: "原始尺寸" }));
    expect(preview).not.toBeInTheDocument();
    expect(screen.queryByText("正在读取图片…")).toBeNull();
  });
  it("保留上一张直到新图完成解码，并忽略已跳过图片的迟到解码", async () => {
    const input = props();
    render(<ImageBrowseView {...input} />);
    fireEvent.click(screen.getByRole("button", { name: "图片 0" }));
    const first = await screen.findByRole("img", { name: "图片 0" });
    fireEvent.load(first);
    await waitFor(() =>
      expect(first).toHaveClass("image-browse-original__full--ready"),
    );
    fireEvent.click(screen.getByRole("button", { name: "下一张" }));
    expect(first).toBeInTheDocument();
    const second = await screen.findByRole("img", { name: "图片 1" });
    let finish!: () => void;
    Object.defineProperty(second, "decode", {
      value: () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    });
    fireEvent.load(second);
    expect(first).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "下一张" }));
    const third = await screen.findByRole("img", { name: "图片 2" });
    fireEvent.load(third);
    await waitFor(() =>
      expect(third).toHaveClass("image-browse-original__full--ready"),
    );
    expect(first).not.toBeInTheDocument();
    await act(async () => finish());
    expect(third).toBeInTheDocument();
    expect(second).not.toBeInTheDocument();
  });

  it("新图解码失败时保留旧图，并允许重试完成替换", async () => {
    const input = props();
    render(<ImageBrowseView {...input} />);
    fireEvent.click(screen.getByRole("button", { name: "图片 0" }));
    const first = await screen.findByRole("img", { name: "图片 0" });
    fireEvent.load(first);
    await waitFor(() =>
      expect(first).toHaveClass("image-browse-original__full--ready"),
    );
    fireEvent.click(screen.getByRole("button", { name: "下一张" }));
    const next = await screen.findByRole("img", { name: "图片 1" });
    Object.defineProperty(next, "decode", {
      value: () => Promise.reject(new Error("decode failed")),
    });
    fireEvent.load(next);
    const retry = await screen.findByRole("button", { name: "重试" });
    expect(first).toBeInTheDocument();
    fireEvent.click(retry);
    const retried = await screen.findByRole("img", { name: "图片 1" });
    fireEvent.load(retried);
    await waitFor(() => expect(first).not.toBeInTheDocument());
    expect(retried).toHaveClass("image-browse-original__full--ready");
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
        items={[
          ...items,
          { fileId: "new", title: "新增", sizeLabel: "", aspectRatio: 1 },
        ]}
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
