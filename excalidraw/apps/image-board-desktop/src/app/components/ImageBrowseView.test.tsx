import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  onCopyColor: vi.fn(),
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

afterEach(() => vi.restoreAllMocks());

describe("ImageBrowseView", () => {
  it("先写入缩略图几何，再于下一帧启动打开动画", () => {
    const animationFrames: FrameRequestCallback[] = [];
    const requestFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        animationFrames.push(callback);
        return animationFrames.length;
      });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 100,
      y: 100,
      left: 100,
      top: 100,
      right: 900,
      bottom: 700,
      width: 800,
      height: 600,
      toJSON: () => ({}),
    });
    const input = props();
    input.readOriginal.mockImplementation(() => new Promise(() => {}));
    render(<ImageBrowseView {...input} />);
    const trigger = screen.getByRole("button", { name: "图片 0" });
    vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue({
      x: 160,
      y: 120,
      left: 160,
      top: 120,
      right: 360,
      bottom: 270,
      width: 200,
      height: 150,
      toJSON: () => ({}),
    });
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("data-motion", "preparing");
    expect(dialog.style.getPropertyValue("--image-browse-origin-x")).toBe(
      "-240px",
    );
    act(() => animationFrames.shift()?.(0));
    expect(dialog).toHaveAttribute("data-motion", "opening");
    requestFrame.mockRestore();
  });

  it("裁切共享元素动画的溢出，避免横向滚动条改变详情舞台尺寸", () => {
    const input = props();
    input.readOriginal.mockImplementation(() => new Promise(() => {}));
    render(<ImageBrowseView {...input} />);
    fireEvent.click(screen.getByRole("button", { name: "图片 0" }));

    const dialog = screen.getByRole("dialog");
    expect(getComputedStyle(dialog).overflow).toBe("hidden");
  });

  it("仅展开属性后提取主色，色块单击复制且不显示色值；切图不沿用旧颜色", async () => {
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
    const swatch = await screen.findByRole("button", {
      name: "复制色值 #FF0000",
    });
    expect(screen.queryByText("#FF0000")).toBeNull();
    fireEvent.pointerEnter(swatch);
    expect(screen.getByText("#FF0000")).toHaveClass(
      "excalidraw-tooltip--visible",
    );
    expect(screen.getByText("#FF0000").closest("dialog")).not.toBeNull();
    fireEvent.click(swatch);
    expect(input.onCopyColor).toHaveBeenLastCalledWith("#FF0000");
    expect(screen.queryByRole("button", { name: "复制配色" })).toBeNull();
    expect(screen.queryByText("#0000FF")).toBeNull();
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
    expect(screen.queryByRole("button", { name: "复制配色" })).toBeNull();
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
    expect(panel.firstElementChild).toHaveClass("inspector-sidebar");
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

  it("只在网格 hover 和语义中保留图片名，详情不常驻展示名称与尺寸", async () => {
    render(<ImageBrowseView {...props()} />);
    const image = screen.getByRole("button", { name: "图片 0" });
    expect(image).toHaveAttribute("title", "图片 0");
    expect(screen.queryByText("图片 0")).toBeNull();
    fireEvent.click(image);
    expect(screen.getByRole("dialog")).toHaveAccessibleName("图片 0");
    expect(screen.queryByText("图片 0")).toBeNull();
    expect(screen.queryByText("800 × 600 px")).toBeNull();
    await screen.findByRole("img", { name: "图片 0" });
  });

  it("从点击的缩略图位置展开，并等退场动画结束后再关闭", () => {
    render(<ImageBrowseView {...props()} />);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 100,
      y: 100,
      left: 100,
      top: 100,
      right: 900,
      bottom: 700,
      width: 800,
      height: 600,
      toJSON: () => ({}),
    });
    const trigger = screen.getByRole("button", { name: "图片 0" });
    vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue({
      x: 160,
      y: 120,
      left: 160,
      top: 120,
      right: 360,
      bottom: 270,
      width: 200,
      height: 150,
      toJSON: () => ({}),
    });
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog");
    expect(dialog.style.getPropertyValue("--image-browse-origin-x")).toBe(
      "-240px",
    );
    expect(dialog.style.getPropertyValue("--image-browse-origin-y")).toBe(
      "-205px",
    );
    expect(dialog.style.getPropertyValue("--image-browse-origin-scale-x")).toBe(
      "0.25",
    );
    expect(dialog.style.getPropertyValue("--image-browse-origin-scale-y")).toBe(
      "0.25",
    );

    fireEvent.click(screen.getByRole("button", { name: "关闭详情" }));
    expect(dialog).toHaveAttribute("data-motion", "closing");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.animationEnd(dialog);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("右侧固定工具列同时承担操作与切图，且不覆盖图片区域", async () => {
    render(<ImageBrowseView {...props()} />);
    fireEvent.click(screen.getByRole("button", { name: "图片 0" }));
    await screen.findByRole("img", { name: "图片 0" });
    const actions = screen.getByRole("toolbar", { name: "图片操作" });
    const imageStage = document.querySelector(".image-browse-detail__image");
    expect(imageStage).not.toContainElement(actions);
    expect(
      within(actions).getByRole("button", { name: "在画布中定位" }),
    ).toBeVisible();
    expect(
      within(actions).queryByRole("button", { name: "原始尺寸" }),
    ).toBeNull();
    expect(
      within(actions).getByRole("button", { name: "缩小" }),
    ).toBeDisabled();
    expect(
      within(actions).getByRole("button", { name: "放大" }),
    ).toBeVisible();
    const previous = within(actions).getByRole("button", { name: "上一张" });
    const next = within(actions).getByRole("button", { name: "下一张" });
    expect(previous).toBeDisabled();
    expect(previous.querySelector("path")).toHaveAttribute(
      "d",
      "m6.5 14.5 5.5-5.5 5.5 5.5",
    );
    expect(next).toBeVisible();
    expect(next.querySelector("path")).toHaveAttribute(
      "d",
      "m6.5 9.5 5.5 5.5 5.5-5.5",
    );
    expect(within(actions).getByText("1 / 300")).toBeVisible();
    expect(document.querySelector(".image-browse-detail__footer")).toBeNull();
    const properties = within(actions).getByRole("button", { name: "属性" });
    fireEvent.click(properties);
    expect(
      screen.getByRole("complementary", { name: "图片属性" }),
    ).toHaveAttribute("data-open", "true");
  });

  it("支持连续缩放，并在放大后拖动图片", async () => {
    render(<ImageBrowseView {...props()} />);
    fireEvent.click(screen.getByRole("button", { name: "图片 0" }));
    await screen.findByRole("img", { name: "图片 0" });
    const dialog = screen.getByRole("dialog");
    const stage = dialog.querySelector(
      ".image-browse-detail__image",
    ) as HTMLDivElement;
    const image = dialog.querySelector(
      ".image-browse-original__viewport",
    ) as HTMLDivElement;
    vi.spyOn(stage, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
      width: 800,
      height: 600,
      toJSON: () => ({}),
    });

    fireEvent.click(screen.getByRole("button", { name: "放大" }));
    fireEvent.click(screen.getByRole("button", { name: "放大" }));
    expect(Number(image.dataset.zoom)).toBeGreaterThan(1.25);
    expect(screen.getByRole("button", { name: "缩小" })).toBeEnabled();

    const pointerEvent = (
      type: string,
      clientX: number,
      clientY: number,
    ) => {
      const event = new MouseEvent(type, {
        bubbles: true,
        button: 0,
        clientX,
        clientY,
      });
      Object.defineProperty(event, "pointerId", { value: 1 });
      return event;
    };
    fireEvent(stage, pointerEvent("pointerdown", 400, 300));
    fireEvent(stage, pointerEvent("pointermove", 450, 330));
    expect(image.style.transform).toContain("translate3d(50px, 30px, 0)");
    fireEvent(stage, pointerEvent("pointerup", 450, 330));

    const zoomBeforeWheel = Number(image.dataset.zoom);
    fireEvent.wheel(stage, { clientX: 400, clientY: 300, deltaY: -120 });
    expect(Number(image.dataset.zoom)).toBeGreaterThan(zoomBeforeWheel);

    fireEvent.click(screen.getByRole("button", { name: "下一张" }));
    await screen.findByRole("img", { name: "图片 1" });
    expect(image).toHaveAttribute("data-zoom", "1");
    expect(image.style.transform).toContain("scale(1)");
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

  it("仅在滚动画廊时显示滚动条，并在离开顶部后提供回到顶部", () => {
    vi.useFakeTimers();
    try {
      render(<ImageBrowseView {...props()} />);
      const grid = screen.getByRole("region", { name: "图片网格" });
      expect(grid).toHaveAttribute("data-scrolling", "false");
      expect(screen.queryByRole("button", { name: "回到顶部" })).toBeNull();

      fireEvent.scroll(grid, { target: { scrollTop: 960 } });
      expect(grid).toHaveAttribute("data-scrolling", "true");
      const scrollTo = vi.fn();
      Object.defineProperty(grid, "scrollTo", {
        configurable: true,
        value: scrollTo,
      });
      fireEvent.click(screen.getByRole("button", { name: "回到顶部" }));
      expect(scrollTo).toHaveBeenCalledWith({ behavior: "smooth", top: 0 });
      expect(grid.scrollTop).toBe(960);
      fireEvent.scroll(grid, { target: { scrollTop: 0 } });
      expect(screen.queryByRole("button", { name: "回到顶部" })).toBeNull();

      act(() => vi.advanceTimersByTime(700));
      expect(grid).toHaveAttribute("data-scrolling", "false");
    } finally {
      vi.useRealTimers();
    }
  });

  it("减少动态效果时直接回到画廊顶部", () => {
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({ matches: true })),
    });
    try {
      render(<ImageBrowseView {...props()} />);
      const grid = screen.getByRole("region", { name: "图片网格" });
      fireEvent.scroll(grid, { target: { scrollTop: 960 } });
      const scrollTo = vi.fn();
      Object.defineProperty(grid, "scrollTo", {
        configurable: true,
        value: scrollTo,
      });

      fireEvent.click(screen.getByRole("button", { name: "回到顶部" }));
      expect(scrollTo).toHaveBeenCalledWith({ behavior: "auto", top: 0 });
    } finally {
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        value: originalMatchMedia,
      });
    }
  });

  it("重新进入同一项目的画廊时恢复上次滚动位置", () => {
    let savedScrollTop = 0;
    const input = props();
    const first = render(
      <ImageBrowseView
        {...input}
        initialScrollTop={savedScrollTop}
        onScrollTopChange={(scrollTop) => {
          savedScrollTop = scrollTop;
        }}
      />,
    );
    fireEvent.scroll(screen.getByRole("region", { name: "图片网格" }), {
      target: { scrollTop: 1480 },
    });
    first.unmount();

    render(
      <ImageBrowseView
        {...input}
        initialScrollTop={savedScrollTop}
        onScrollTopChange={(scrollTop) => {
          savedScrollTop = scrollTop;
        }}
      />,
    );
    expect(screen.getByRole("region", { name: "图片网格" }).scrollTop).toBe(
      1480,
    );
  });

  it("在当前屏内切换时保留网格位置，并把焦点交还当前图片", async () => {
    render(<ImageBrowseView {...props()} />);
    const grid = screen.getByRole("region", { name: "图片网格" });
    fireEvent.scroll(grid, { target: { scrollTop: 2240 } });
    const trigger = grid.querySelectorAll("button")[8];
    const currentIndex = Number(trigger.getAttribute("aria-label")?.slice(3));
    fireEvent.click(trigger);
    await waitFor(() =>
      expect(screen.getByRole("dialog").querySelector("img")).toHaveAttribute(
        "src",
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "下一张" }));
    const current = screen.getByRole("button", {
      name: `图片 ${currentIndex + 1}`,
    });
    fireEvent.click(screen.getByRole("button", { name: "关闭详情" }));
    fireEvent.animationEnd(screen.getByRole("dialog"));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(grid.scrollTop).toBe(2240);
    await waitFor(() => expect(current).toHaveFocus());
  });

  it("切换超出当前屏幕后让画廊跟随，并关闭回到当前图片", async () => {
    render(<ImageBrowseView {...props()} />);
    const grid = screen.getByRole("region", { name: "图片网格" });
    const first = screen.getByRole("button", { name: "图片 0" });
    fireEvent.click(first);

    for (let index = 0; index < 12; index++) {
      fireEvent.click(screen.getByRole("button", { name: "下一张" }));
    }

    await waitFor(() =>
      expect(screen.getByRole("dialog")).toHaveAccessibleName("图片 12"),
    );
    await waitFor(() => expect(grid.scrollTop).toBeGreaterThan(0));
    const current = await screen.findByRole("button", { name: "图片 12" });

    fireEvent.click(screen.getByRole("button", { name: "关闭详情" }));
    fireEvent.animationEnd(screen.getByRole("dialog"));
    await waitFor(() => expect(current).toHaveFocus());
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
