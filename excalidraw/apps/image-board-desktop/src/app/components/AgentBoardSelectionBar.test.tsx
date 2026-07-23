import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { GenerationReferencePayload } from "../../shared/providerTypes";

import { setActiveDesktopLocale } from "../copy";
import { AgentBoardSelectionBar } from "./AgentBoardSelectionBar";

const reference: GenerationReferencePayload = {
  enabled: true,
  elementCount: 3,
  textCount: 1,
  items: [
    {
      id: "image-1",
      index: 1,
      kind: "image",
      label: "图片",
      fileId: "file-1",
      thumbnailDataUrl: "data:image/png;base64,b25l",
    },
    { id: "text-1", index: 2, kind: "text", label: "文本：蓝色" },
    { id: "shape-1", index: 3, kind: "shape", label: "矩形" },
  ],
};

describe("AgentBoardSelectionBar", () => {
  afterEach(() => {
    vi.useRealTimers();
    setActiveDesktopLocale("zh-CN");
  });

  it("shows a quiet non-input empty state", () => {
    render(
      <AgentBoardSelectionBar
        projectName="测试项目"
        projectId="project-id-1"
        reference={null}
        onClearSelection={vi.fn()}
      />,
    );

    expect(screen.getByText("未选择画布元素")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "复制引用" }),
    ).not.toBeInTheDocument();
  });

  it("copies the readable reference without clearing the selection", async () => {
    const copyText = vi.fn(async (_text: string) => true);
    const onClearSelection = vi.fn();
    render(
      <AgentBoardSelectionBar
        projectName="测试项目"
        projectId="project-id-1"
        reference={reference}
        copyText={copyText}
        onClearSelection={onClearSelection}
      />,
    );

    expect(
      screen.getByText("3 个元素 · 1 图片 · 1 文字 · 1 图形"),
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "图片 1" })).toHaveAttribute(
      "src",
      "data:image/png;base64,b25l",
    );
    expect(screen.getByRole("img", { name: "1 段文字" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "1 个图形" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "复制引用" }));

    await waitFor(() => {
      expect(copyText).toHaveBeenCalledWith(
        expect.stringContaining('<corestudio-selection-reference version="1">'),
      );
    });
    expect(copyText.mock.calls[0][0]).toContain('"projectName":"测试项目"');
    expect(copyText.mock.calls[0][0]).toContain('"projectId":"project-id-1"');
    expect(copyText.mock.calls[0][0]).toContain(
      '"elementIds":["image-1","text-1","shape-1"]',
    );
    expect(copyText.mock.calls[0][0]).toContain('"fileIds":["file-1"]');
    expect(
      screen.getByText("已复制，粘贴到 Codex 输入框即可使用"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制引用" })).toHaveAttribute(
      "data-copy-state",
      "success",
    );
    expect(
      screen.getByRole("button", { name: "复制引用" }),
    ).not.toHaveTextContent("复制引用");
    expect(onClearSelection).not.toHaveBeenCalled();
  });

  it("keeps the selection and reports clipboard failures", async () => {
    const onClearSelection = vi.fn();
    render(
      <AgentBoardSelectionBar
        projectName="测试项目"
        projectId="project-id-1"
        reference={reference}
        copyText={vi.fn(async () => false)}
        onClearSelection={onClearSelection}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "复制引用" }));

    expect(await screen.findByText("复制失败，请重试")).toBeInTheDocument();
    expect(onClearSelection).not.toHaveBeenCalled();
  });

  it("returns the copy icon to idle after a short success state", async () => {
    vi.useFakeTimers();
    render(
      <AgentBoardSelectionBar
        projectName="测试项目"
        projectId="project-id-1"
        reference={reference}
        copyText={vi.fn(async () => true)}
        onClearSelection={vi.fn()}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "复制引用" }));
    });
    expect(screen.getByRole("button", { name: "复制引用" })).toHaveAttribute(
      "data-copy-state",
      "success",
    );

    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(screen.getByRole("button", { name: "复制引用" })).toHaveAttribute(
      "data-copy-state",
      "idle",
    );
  });

  it("clears stale copy feedback when the selected asset changes", async () => {
    const { rerender } = render(
      <AgentBoardSelectionBar
        projectName="测试项目"
        projectId="project-id-1"
        reference={reference}
        copyText={vi.fn(async () => true)}
        onClearSelection={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "复制引用" }));
    expect(
      await screen.findByText("已复制，粘贴到 Codex 输入框即可使用"),
    ).toBeInTheDocument();

    rerender(
      <AgentBoardSelectionBar
        projectName="测试项目"
        projectId="project-id-1"
        reference={{
          ...reference,
          items: reference.items?.map((item) =>
            item.id === "image-1"
              ? {
                  ...item,
                  fileId: "file-2",
                  thumbnailDataUrl: "data:image/png;base64,dHdv",
                }
              : item,
          ),
          source: {
            elementIds: ["image-1", "text-1", "shape-1"],
            fileIds: ["file-2"],
          },
        }}
        copyText={vi.fn(async () => true)}
        onClearSelection={vi.fn()}
      />,
    );

    expect(
      screen.queryByText("已复制，粘贴到 Codex 输入框即可使用"),
    ).not.toBeInTheDocument();
  });

  it("ignores an old copy result when the selection changes mid-copy", async () => {
    let finishCopy: ((copied: boolean) => void) | null = null;
    const copyText = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          finishCopy = resolve;
        }),
    );
    const { rerender } = render(
      <AgentBoardSelectionBar
        projectName="测试项目"
        projectId="project-id-1"
        reference={reference}
        copyText={copyText}
        onClearSelection={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "复制引用" }));
    rerender(
      <AgentBoardSelectionBar
        projectName="测试项目"
        projectId="project-id-1"
        reference={{
          ...reference,
          source: {
            elementIds: ["image-1", "text-1", "shape-1"],
            fileIds: ["file-2"],
          },
        }}
        copyText={copyText}
        onClearSelection={vi.fn()}
      />,
    );

    await act(async () => {
      finishCopy?.(true);
    });

    expect(
      screen.queryByText("已复制，粘贴到 Codex 输入框即可使用"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制引用" })).toHaveAttribute(
      "data-copy-state",
      "idle",
    );
  });

  it("reports clipboard permission rejections without getting stuck", async () => {
    const onClearSelection = vi.fn();
    render(
      <AgentBoardSelectionBar
        projectName="测试项目"
        projectId="project-id-1"
        reference={reference}
        copyText={vi.fn(async () => {
          throw new Error("clipboard denied");
        })}
        onClearSelection={onClearSelection}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "复制引用" }));

    expect(await screen.findByText("复制失败，请重试")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制引用" })).toBeEnabled();
    expect(onClearSelection).not.toHaveBeenCalled();
  });

  it("clears only when the user chooses clear selection", () => {
    const onClearSelection = vi.fn();
    render(
      <AgentBoardSelectionBar
        projectName="测试项目"
        projectId="project-id-1"
        reference={reference}
        onClearSelection={onClearSelection}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "清除选择" }));
    expect(onClearSelection).toHaveBeenCalledTimes(1);
  });
});
