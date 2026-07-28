import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import {
  countComposerLabRenderedLines,
  ComposerLabApp,
  getComposerLabActiveReferences,
} from "./ComposerLabApp";

describe("ComposerLabApp", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("counts elements with different baselines as one rendered line", () => {
    expect(
      countComposerLabRenderedLines(
        [
          { top: 100, height: 24 },
          { top: 103, height: 18 },
          { top: 100, height: 24 },
        ],
        24,
      ),
    ).toBe(1);

    expect(
      countComposerLabRenderedLines(
        [
          { top: 100, height: 24 },
          { top: 103, height: 18 },
          { top: 124, height: 24 },
        ],
        24,
      ),
    ).toBe(2);
  });

  it("switches deterministic production-composer scenarios", async () => {
    render(<ComposerLabApp />);

    expect(screen.getByRole("textbox", { name: "提示词" })).toBeInTheDocument();
    expect(document.querySelector(".generate-composer")).not.toBeNull();

    fireEvent.change(screen.getByLabelText("测试场景"), {
      target: { value: "mixed-three" },
    });

    await waitFor(() => {
      expect(screen.getAllByLabelText(/^[123] 图片$/)).toHaveLength(3);
    });
    expect(screen.getByRole("textbox", { name: "提示词" })).toHaveTextContent(
      "工业设计渲染",
    );
  });

  it("supports dark mode, fixed widths and reference-limit state", async () => {
    render(<ComposerLabApp />);

    fireEvent.click(screen.getByRole("button", { name: "深色" }));
    expect(screen.getByTestId("composer-lab-root")).toHaveAttribute(
      "data-theme",
      "dark",
    );

    fireEvent.click(screen.getByRole("button", { name: "480px" }));
    expect(screen.getByTestId("composer-lab-stage")).toHaveStyle({
      width: "480px",
    });

    fireEvent.change(screen.getByLabelText("测试场景"), {
      target: { value: "reference-limit" },
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "当前模型最多可插入 3 张参考图。",
    );
    expect(document.querySelector(".generate-composer")).toHaveClass(
      "generate-composer--with-notice",
    );
  });

  it("shows live geometry and the content actually rendered by the editor", async () => {
    render(<ComposerLabApp />);

    expect(
      screen.getByRole("heading", { name: "实时测量" }),
    ).toBeInTheDocument();
    [
      "外框高度",
      "编辑区高度",
      "图片元素高度",
      "文字行高",
      "图片左右间距",
      "编辑区上下内边距",
      "图片上下留白",
      "文字上下留白",
      "按钮上下留白",
      "实际行数",
      "DOM 引用",
    ].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
    expect(screen.getByText("实机内容")).toBeInTheDocument();
    expect(
      screen.getByTestId("composer-lab-content-summary"),
    ).toHaveTextContent("空");

    fireEvent.change(screen.getByLabelText("测试场景"), {
      target: { value: "mixed-three" },
    });

    await waitFor(() => {
      expect(
        screen.getByTestId("composer-lab-content-summary"),
      ).toHaveTextContent("图 1 · 工业设计渲染 · 图 2 · 保留结构关系 · 图 3");
    });
  });

  it("uses the thin browser mock for selection and submission", async () => {
    render(<ComposerLabApp />);

    fireEvent.click(screen.getByRole("button", { name: "模拟选择图片" }));
    expect(await screen.findByLabelText("1 图片，待确认")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("textbox", { name: "提示词" }));
    await waitFor(() => {
      expect(screen.getByLabelText("1 图片")).toBeInTheDocument();
    });

    fireEvent.input(screen.getByRole("textbox", { name: "提示词" }), {
      target: { textContent: "测试提交" },
      inputType: "insertText",
      data: "测试提交",
    });
    fireEvent.click(screen.getByRole("button", { name: "开始生成" }));

    expect(await screen.findByText("已模拟发送")).toBeInTheDocument();
  });

  it("commits one pending image only once when clicking its pending chip", async () => {
    render(<ComposerLabApp />);

    fireEvent.click(screen.getByRole("button", { name: "模拟选择图片" }));
    const pendingChip = await screen.findByLabelText("1 图片，待确认");
    const editor = screen.getByRole("textbox", { name: "提示词" });

    act(() => {
      editor.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      pendingChip.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() => {
      expect(document.querySelectorAll("[data-reference-id]")).toHaveLength(1);
    });
    expect(screen.getByText("引用").nextElementSibling).toHaveTextContent("1");
  });

  it("keeps a second pending image inside the same editable flow", async () => {
    render(<ComposerLabApp />);

    fireEvent.click(screen.getByRole("button", { name: "模拟选择图片" }));
    expect(await screen.findByLabelText("1 图片，待确认")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("textbox", { name: "提示词" }));
    await waitFor(() => {
      expect(screen.getByLabelText("1 图片")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "模拟选择图片" }));
    expect(await screen.findByLabelText("2 图片，待确认")).toBeInTheDocument();
    expect(
      screen
        .getByRole("textbox", { name: "提示词" })
        .contains(screen.getByLabelText("2 图片，待确认")),
    ).toBe(true);
  });

  it("submits confirmed content while discarding a pending image", async () => {
    render(<ComposerLabApp />);

    const editor = screen.getByRole("textbox", { name: "提示词" });
    fireEvent.input(editor, {
      target: { textContent: "只提交这些文字" },
      inputType: "insertText",
      data: "只提交这些文字",
    });
    fireEvent.click(screen.getByRole("button", { name: "模拟选择图片" }));
    expect(await screen.findByLabelText("1 图片，待确认")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "开始生成" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "开始生成" }));

    expect(await screen.findByText("已模拟发送")).toBeInTheDocument();
    expect(screen.queryByLabelText("1 图片，待确认")).not.toBeInTheDocument();
  });

  it("prunes deleted reference payloads before numbering the next image", () => {
    const cachedReferences = [
      {
        id: "one",
        label: "图片",
        enabled: true,
        elementCount: 1,
        textCount: 0,
      },
      {
        id: "two",
        label: "图片",
        enabled: true,
        elementCount: 1,
        textCount: 0,
      },
    ];

    expect(getComposerLabActiveReferences(cachedReferences, [])).toEqual([]);
    expect(
      getComposerLabActiveReferences(cachedReferences, [
        { type: "reference", referenceId: "two" },
      ]),
    ).toEqual([cachedReferences[1]]);
  });
});
