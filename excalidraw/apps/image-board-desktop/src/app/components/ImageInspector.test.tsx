import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ImageRecord } from "../../shared/projectTypes";
import type { ImagePromptReferenceRecord } from "../../shared/projectTypes";
import { setActiveDesktopLocale } from "../copy";
import type { GenerationTaskRecord } from "../generationTaskState";
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

const generationTask: GenerationTaskRecord = {
  status: "pending",
  provider: "openai",
  model: "openai/gpt-image-2",
  prompt: "保持产品结构，生成一张克制的工业设计渲染图。",
  negativePrompt: "不要文字",
  seed: 42,
  aspectRatio: "3:2",
  width: 1536,
  height: 1024,
  startedAt: "2026-09-08T10:47:22.000Z",
};

const renderInspector = (
  overrides: Partial<{
    record: ImageRecord;
    projectPath: string;
    onLocateImageRecord: (fileId: string) => void;
    onLocatePromptReference: (reference: ImagePromptReferenceRecord) => void;
    onCopyImageId: () => void;
  }> = {},
) =>
  render(
    <ImageInspector
      record={overrides.record ?? generatedRecord}
      projectPath={overrides.projectPath}
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
      onLocateImageRecord={overrides.onLocateImageRecord ?? vi.fn()}
      onLocatePromptReference={overrides.onLocatePromptReference ?? vi.fn()}
      onCopyImageId={overrides.onCopyImageId ?? vi.fn()}
    />,
  );

afterEach(() => {
  setActiveDesktopLocale("zh-CN");
  window.getSelection()?.removeAllRanges();
});

describe("ImageInspector", () => {
  it("organizes a pending task into status and generation groups without presenting request settings as image facts", () => {
    render(
      <ImageInspector
        record={null}
        ancestorRecords={[]}
        descendantRecords={[]}
        task={generationTask}
        onCopyPrompt={vi.fn()}
        onCopyTaskError={vi.fn()}
      />,
    );

    const status = screen.getByRole("region", { name: "生成状态" });
    expect(within(status).getByText("生成中")).toBeVisible();
    expect(within(status).getByText(/开始于/)).toBeVisible();

    const generation = screen.getByRole("region", { name: "生成信息" });
    expect(within(generation).getByText(generationTask.prompt)).toBeVisible();
    expect(within(generation).getByText("GPT Image 2")).toBeVisible();
    expect(screen.queryByText("1536 × 1024")).toBeNull();
    expect(screen.queryByText("OpenAI")).toBeNull();
    expect(screen.queryByText("反向提示词")).toBeNull();
    expect(screen.queryByText("种子")).toBeNull();
  });

  it("keeps error details inside the failed status group and uses the shared disclosure with an icon copy action", () => {
    const onCopyTaskError = vi.fn();
    render(
      <ImageInspector
        record={null}
        ancestorRecords={[]}
        descendantRecords={[]}
        task={{
          ...generationTask,
          status: "error",
          errorMessage: "图片输入无法读取",
          rawError: "HTTP 400 INVALID_IMAGE",
          stack: "at requestImage",
        }}
        onCopyPrompt={vi.fn()}
        onCopyTaskError={onCopyTaskError}
      />,
    );

    const status = screen.getByRole("region", { name: "生成状态" });
    expect(within(status).getByText("生成失败")).toBeVisible();
    expect(within(status).getByText("图片输入无法读取")).toBeVisible();
    const disclosure = within(status).getByText("错误详情").closest("details");
    expect(disclosure).toHaveClass("image-inspector__disclosure");
    expect(disclosure).not.toHaveAttribute("open");
    fireEvent.click(within(status).getByText("错误详情"));
    const copyButton = within(status).getByRole("button", {
      name: "复制详细报错",
    });
    expect(copyButton).toHaveTextContent("");
    fireEvent.click(copyButton);
    expect(onCopyTaskError).toHaveBeenCalledOnce();
  });

  it("groups file metadata once and leaves imported images free of empty generation sections", () => {
    render(
      <ImageInspector
        record={{ ...parentRecord, prompt: undefined }}
        ancestorRecords={[]}
        descendantRecords={[]}
        task={null}
        onCopyPrompt={vi.fn()}
      />,
    );
    expect(screen.queryByText("技术信息")).toBeNull();
    expect(screen.queryByRole("heading", { name: "生成信息" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "提示词" })).toBeNull();
    expect(screen.queryByText("无")).toBeNull();
    expect(screen.getAllByText("1024 × 768")).toHaveLength(1);
    expect(screen.getAllByText("PNG")).toHaveLength(1);
    fireEvent.click(screen.getByText("更多信息"));
    expect(screen.getByText("assets/file-0.png")).toBeVisible();
  });
  it("keeps model, prompt and seed in the generation group instead of file metadata", () => {
    renderInspector();
    const group = screen.getByRole("region", { name: "生成信息" });
    expect(within(group).getByText(generatedRecord.prompt!)).toBeVisible();
    expect(within(group).getByText("Nano Banana 2")).toBeVisible();
    expect(within(group).getByText("12")).toBeVisible();
    expect(within(group).queryByText("图片 ID")).toBeNull();
    expect(screen.getAllByText("1024 × 768")).toHaveLength(1);
  });

  it("renders prompt references and lineage as text when navigation capabilities are absent", () => {
    const { container } = render(
      <ImageInspector
        record={{
          ...generatedRecord,
          prompt: "参考图 1细化外壳",
          promptReferences: [
            {
              id: "ref-1",
              index: 1,
              label: "参考图片1",
              kind: "image",
              fileIds: ["file-0"],
            },
            {
              id: "ref-2",
              index: 2,
              label: "轮廓参考",
              kind: "image",
              fileIds: ["file-2"],
            },
          ],
        }}
        ancestorRecords={[parentRecord]}
        descendantRecords={[]}
        task={null}
        onCopyPrompt={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /定位|重命名/ })).toBeNull();
    expect(screen.getByText("轮廓参考").tagName).toBe("SPAN");
    expect(
      container.querySelector(".image-inspector__prompt-reference")?.tagName,
    ).toBe("SPAN");
    expect(
      container.querySelector(".image-inspector__chain-content")?.tagName,
    ).toBe("SPAN");
  });

  it("groups saved generation parameters with the prompt", () => {
    renderInspector({
      record: { ...generatedRecord, seed: 0, negativePrompt: "不要文字和水印" },
    });
    expect(screen.queryByText("技术信息")).toBeNull();
    expect(screen.getByText("不要文字和水印")).toBeVisible();
    expect(screen.getByText("0")).toBeVisible();
  });

  it("uses a functional image-information heading instead of the filename", () => {
    renderInspector();

    expect(
      screen.getByRole("heading", { name: "图片信息", level: 3 }),
    ).toBeVisible();
    expect(screen.queryByRole("heading", { name: "AI 生成图片" })).toBeNull();
  });

  it("shows name, size and format as the primary image facts", () => {
    renderInspector();
    const group = screen.getByRole("region", { name: "图片信息" });
    expect(within(group).getByText("AI 生成图片")).toBeVisible();
    expect(within(group).getByText("1024 × 768")).toBeVisible();
    expect(within(group).getByText("PNG")).toBeVisible();
    expect(within(group).queryByText("fal-ai/nano-banana-2")).toBeNull();
  });

  it("shows file properties directly and copies the complete id on demand", () => {
    const onCopyImageId = vi.fn();
    renderInspector({ onCopyImageId });

    expect(screen.queryByRole("button", { name: "技术信息" })).toBeNull();
    expect(screen.queryByText("技术信息")).toBeNull();
    expect(screen.getByText("file-1")).not.toBeVisible();
    fireEvent.click(screen.getByText("更多信息"));
    expect(screen.getByText("file-1")).toBeInTheDocument();
    expect(screen.getByText("assets/file-1.png")).toBeInTheDocument();
    expect(screen.getByText("PNG")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "复制图片 ID" }));
    expect(onCopyImageId).toHaveBeenCalledOnce();
  });

  it("does not offer filename editing in the inspector", () => {
    renderInspector();
    expect(screen.queryByRole("button", { name: "重命名" })).toBeNull();
    expect(screen.queryByRole("textbox", { name: "图片名称" })).toBeNull();
  });

  it("identifies CoreStudio generations initiated by Codex", () => {
    renderInspector({
      record: {
        ...generatedRecord,
        generationOrigin: "corestudio",
        generationSource: "agent",
      },
    });

    fireEvent.click(screen.getByText("更多信息"));
    expect(
      screen.getByText("CoreStudio 图片生成 · 由 Codex 发起"),
    ).toBeInTheDocument();
  });

  it("keeps one technical group and omits empty generation parameters", () => {
    renderInspector();

    expect(screen.queryByText("生成参数")).not.toBeInTheDocument();
    expect(screen.getAllByText("图片 ID")).toHaveLength(1);
    expect(screen.queryByText("反向提示词")).not.toBeInTheDocument();
    expect(screen.getAllByText("种子")).toHaveLength(1);
  });

  it("keeps the prompt and its copy action together in one bounded section", () => {
    const { container } = renderInspector();
    const promptSection = container.querySelector(
      ".image-inspector__prompt-section",
    ) as HTMLElement;
    const promptBody = container.querySelector(
      ".image-inspector__prompt-body",
    ) as HTMLElement;
    const detailGrid = container.querySelector(
      ".image-inspector__detail-grid",
    ) as HTMLElement;

    expect(promptSection).not.toBeNull();
    expect(promptBody).not.toBeNull();
    expect(
      container.querySelector(".image-inspector__prompt-card"),
    ).not.toBeInTheDocument();
    expect(within(promptSection).getByText("提示词")).toBeInTheDocument();
    const copyButton = within(promptSection).getByRole("button", {
      name: "复制提示词",
    });
    expect(copyButton).toHaveClass("image-inspector__copy-button");
    expect(copyButton).toHaveTextContent("");
    expect(copyButton.querySelector("svg")).not.toBeNull();
    expect(
      within(promptBody).getByText(/一台桌面级五轴 CNC 机器/),
    ).toBeInTheDocument();
    expect(detailGrid).not.toContainElement(copyButton);
    expect(promptSection).not.toContainElement(detailGrid);
    expect(screen.queryByText("生成参数")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "提示词", level: 4 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "编辑链", level: 3 }),
    ).toBeInTheDocument();
  });

  it("does not show the old parameter reuse action", () => {
    renderInspector();

    expect(
      screen.queryByRole("button", { name: "复用参数" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the prompt copy action icon-only and removes redundant asset navigation", () => {
    renderInspector();

    expect(
      screen.queryByRole("button", { name: "在图片资产中显示" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制提示词" })).toHaveClass(
      "image-inspector__copy-button",
    );
  });

  it("lets lineage entries request locating their canvas image", () => {
    const onLocateImageRecord = vi.fn();
    renderInspector({ onLocateImageRecord });

    fireEvent.click(
      screen.getByRole("button", { name: /定位到图片：.*第二版结构细化/ }),
    );

    expect(onLocateImageRecord).toHaveBeenCalledWith("file-2");
    expect(
      screen.queryByRole("button", { name: /当前图片/ }),
    ).not.toBeInTheDocument();

    const chain = screen
      .getByRole("heading", { name: "编辑链" })
      .closest(".image-inspector__chain") as HTMLElement;
    const chainItems = chain.querySelectorAll(".image-inspector__chain-item");
    expect(chainItems.length).toBeGreaterThan(1);
    expect(
      chain.querySelector(".image-inspector__chain-marker"),
    ).not.toBeNull();
    expect(
      chain.querySelector(".image-inspector__chain-heading"),
    ).not.toBeNull();
    expect(chain.querySelector("time")).not.toBeNull();
  });

  it("turns structured prompt references into locate actions", () => {
    const promptReference: ImagePromptReferenceRecord = {
      id: "reference-style",
      index: 1,
      label: "参考图 1",
      kind: "image",
      fileIds: ["file-style"],
      elementIds: ["element-style"],
    };
    const onLocatePromptReference = vi.fn();

    renderInspector({
      record: {
        ...generatedRecord,
        prompt: "风格参考这个：参考图 1，整体保持克制。",
        promptReferences: [promptReference],
      },
      onLocatePromptReference,
    });

    fireEvent.click(screen.getByRole("button", { name: "定位参考图 1" }));

    expect(onLocatePromptReference).toHaveBeenCalledWith(promptReference);
  });

  it("localizes locate actions without rewriting reference labels", () => {
    setActiveDesktopLocale("en");
    const promptReference: ImagePromptReferenceRecord = {
      id: "reference-style",
      index: 1,
      label: "参考图 1",
      kind: "image",
      fileIds: ["file-style"],
      elementIds: ["element-style"],
    };

    renderInspector({
      record: {
        ...generatedRecord,
        prompt: "风格参考这个：参考图 1。",
        promptReferences: [promptReference],
      },
    });

    expect(
      screen.getByRole("button", { name: "Locate 参考图 1" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/风格参考这个/)).toHaveLength(2);
    const currentItem = screen
      .getByText("Current image")
      .closest(".image-inspector__chain-item") as HTMLElement;
    expect(within(currentItem).getByText(/4\/12\/2026/)).toBeInTheDocument();
    expect(within(currentItem).getByText(/风格参考这个/)).toBeInTheDocument();
  });

  it("keeps prompt references actionable for externally generated images", () => {
    const promptReference: ImagePromptReferenceRecord = {
      id: "reference-agent-board",
      index: 1,
      label: "参考图 1",
      kind: "image",
      fileIds: ["file-source"],
      elementIds: ["element-source"],
    };
    const onLocatePromptReference = vi.fn();

    renderInspector({
      record: {
        ...generatedRecord,
        provider: undefined,
        generationOrigin: "agent-board",
        prompt: "改成更简约优雅的桌面 CNC。",
        promptReferences: [promptReference],
      },
      onLocatePromptReference,
    });

    expect(screen.queryByText("生成参数")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "定位参考图 1" }));

    expect(onLocatePromptReference).toHaveBeenCalledWith(promptReference);
  });

  it("keeps the model summary for externally generated images", () => {
    renderInspector({
      record: {
        ...generatedRecord,
        generationOrigin: "agent-board",
        provider: "external-image-service",
      },
    });

    expect(screen.getByText("fal-ai/nano-banana-2")).toBeInTheDocument();
    expect(screen.queryByText("生成参数")).not.toBeInTheDocument();
  });

  it("shows an unknown-time label for invalid legacy timestamps", () => {
    renderInspector({
      record: {
        ...generatedRecord,
        createdAt: "not-a-date",
      },
    });

    expect(screen.getAllByText("时间未知")).toHaveLength(2);
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

it("shows the full location of images in the project root and nested folders", () => {
  const view = renderInspector({
    projectPath: "/Users/test/Documents/项目/",
    record: { ...generatedRecord, assetPath: "apple-esslinger-05.jpg" },
  });
  expect(
    screen.getByText("/Users/test/Documents/项目/apple-esslinger-05.jpg"),
  ).toBeInTheDocument();
  view.unmount();
  renderInspector({
    projectPath: "/Users/test/Documents/项目",
    record: generatedRecord,
  });
  expect(
    screen.getByText("/Users/test/Documents/项目/assets/file-1.png"),
  ).toBeInTheDocument();
});
