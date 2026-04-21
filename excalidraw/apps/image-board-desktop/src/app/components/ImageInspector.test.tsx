import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ImageRecord } from "../../shared/projectTypes";
import { ImageInspector } from "./ImageInspector";

const generatedRecord: ImageRecord = {
  fileId: "file-1",
  assetPath: "assets/file-1.png",
  sourceType: "generated",
  provider: "fal",
  model: "fal-ai/nano-banana-2",
  prompt: "一台桌面级五轴 CNC 机器，精致、小型化，很简约，没有多余的按钮。",
  negativePrompt: "",
  seed: 12,
  width: 1024,
  height: 768,
  createdAt: "2026-04-12T08:00:00.000Z",
  mimeType: "image/png",
  parentFileId: "file-0",
};

const parentRecord: ImageRecord = {
  fileId: "file-0",
  assetPath: "assets/file-0.png",
  sourceType: "imported",
  width: 1024,
  height: 768,
  createdAt: "2026-04-11T08:00:00.000Z",
  mimeType: "image/png",
  prompt: "第一版结构草图",
};

const renderInspector = () =>
  render(
    <ImageInspector
      record={generatedRecord}
      parentRecord={parentRecord}
      ancestorRecords={[parentRecord]}
      descendantRecords={[
        {
          record: {
            ...generatedRecord,
            fileId: "file-2",
            prompt: "第二版结构细化",
            createdAt: "2026-04-13T08:00:00.000Z",
          },
          depth: 1,
        },
      ]}
      task={null}
      onCopyPrompt={vi.fn()}
      onCopyTaskError={vi.fn()}
      onReuseSettings={vi.fn()}
    />,
  );

afterEach(() => {
  window.getSelection()?.removeAllRanges();
});

describe("ImageInspector", () => {
  it("uses a concrete image heading instead of repeating the generic panel label", () => {
    renderInspector();

    expect(
      screen.queryByRole("heading", { name: "图片参数" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "AI 生成图片" }),
    ).toBeInTheDocument();
  });

  it("surfaces the selected image summary before detailed parameters", () => {
    const { container } = renderInspector();
    const hero = container.querySelector(".image-inspector__hero") as HTMLElement;

    expect(hero).not.toBeNull();
    expect(within(hero).queryByText("AI 生成")).not.toBeInTheDocument();
    expect(within(hero).getByText("fal-ai/nano-banana-2")).toBeInTheDocument();
    expect(within(hero).getByText("1024 × 768")).toBeInTheDocument();
  });

  it("gives the prompt its own readable section and keeps secondary details grouped", () => {
    const { container } = renderInspector();
    const promptCard = container.querySelector(
      ".image-inspector__prompt-card",
    ) as HTMLElement;
    const detailGrid = container.querySelector(
      ".image-inspector__detail-grid",
    ) as HTMLElement;

    expect(promptCard).not.toBeNull();
    expect(within(promptCard).getByText("提示词")).toBeInTheDocument();
    expect(
      within(promptCard).getByText(/一台桌面级五轴 CNC 机器/),
    ).toBeInTheDocument();
    expect(detailGrid).not.toBeNull();
    expect(within(detailGrid).getByText("模型服务")).toBeInTheDocument();
    expect(within(detailGrid).getByText("来源图片")).toBeInTheDocument();
    expect(screen.getByText("编辑链")).toBeInTheDocument();
  });

  it("copies only the selected visible text from the sidebar", () => {
    const { container } = renderInspector();
    const promptText = container.querySelector(
      ".image-inspector__prompt-text",
    ) as HTMLElement;
    expect(promptText).not.toBeNull();
    const selectionSpy = vi.spyOn(window, "getSelection").mockReturnValue({
      isCollapsed: false,
      rangeCount: 1,
      getRangeAt: () => ({
        startContainer: promptText.firstChild,
        endContainer: promptText.firstChild,
      }),
      toString: () => generatedRecord.prompt,
      removeAllRanges: vi.fn(),
    } as unknown as Selection);

    const documentCopyListener = vi.fn();
    document.addEventListener("copy", documentCopyListener);

    const clipboardData = {
      setData: vi.fn(),
    };
    const copyEvent = new Event("copy", {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(copyEvent, "clipboardData", {
      value: clipboardData,
    });
    fireEvent(document, copyEvent);

    expect(clipboardData.setData).toHaveBeenCalledWith(
      "text/plain",
      generatedRecord.prompt,
    );
    expect(documentCopyListener).not.toHaveBeenCalled();

    document.removeEventListener("copy", documentCopyListener);
    selectionSpy.mockRestore();
    expect(container.querySelector(".image-inspector")).not.toBeNull();
  });
});
