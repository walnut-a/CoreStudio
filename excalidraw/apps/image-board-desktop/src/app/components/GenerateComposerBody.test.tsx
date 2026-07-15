import { createRef } from "react";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { setActiveDesktopLocale } from "../copy";
import {
  GenerateComposerAgentContext,
  GenerateComposerPromptBody,
} from "./GenerateComposerBody";
import type { InlinePromptEditorHandle } from "./InlinePromptEditor";

afterEach(() => setActiveDesktopLocale("zh-CN"));

describe("GenerateComposerAgentContext", () => {
  it("renders an empty selection state", () => {
    render(<GenerateComposerAgentContext items={[]} />);

    expect(
      screen.getByRole("region", { name: "Agent 上下文" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("当前选区")).toHaveTextContent("暂无选中元素");
  });

  it("renders selected image items with thumbnails", () => {
    render(
      <GenerateComposerAgentContext
        items={[
          {
            id: "image-1",
            index: 1,
            kind: "image",
            label: "图片",
            thumbnailDataUrl: "data:image/png;base64,abc",
          },
          {
            id: "text-2",
            index: 2,
            kind: "text",
            label: "文字：产品说明",
          },
        ]}
      />,
    );

    const selection = screen.getByLabelText("当前选区");
    expect(
      within(selection).getByRole("img", {
        name: "图片 1 缩略图",
      }),
    ).toHaveAttribute("src", "data:image/png;base64,abc");
    expect(within(selection).getByText("1")).toBeInTheDocument();
    expect(within(selection).getByText("图片")).toBeInTheDocument();
    expect(within(selection).getByText("2")).toBeInTheDocument();
    expect(within(selection).getByText("文字：产品说明")).toBeInTheDocument();
  });
});

describe("GenerateComposerPromptBody", () => {
  it("renders the prompt editor and reference limit notice", () => {
    const promptEditorRef = createRef<InlinePromptEditorHandle>();
    const onFocusIntent = vi.fn();
    const onMouseDown = vi.fn();

    render(
      <GenerateComposerPromptBody
        promptEditorRef={promptEditorRef}
        ariaLabel="提示词"
        placeholder="描述你想生成的内容"
        parts={[]}
        references={[]}
        pendingReference={null}
        resetKey={0}
        referenceLimitMessage="最多可以引用 3 张图片"
        onChange={vi.fn()}
        onFocusIntent={onFocusIntent}
        onMouseDown={onMouseDown}
        onKeyPressCapture={vi.fn()}
        onKeyUpCapture={vi.fn()}
        onKeyDown={vi.fn()}
      />,
    );

    const editor = screen.getByRole("textbox", { name: "提示词" });
    expect(editor).toHaveAttribute("data-placeholder", "描述你想生成的内容");
    expect(screen.getByRole("status")).toHaveTextContent(
      "最多可以引用 3 张图片",
    );

    fireEvent.focus(editor);
    expect(onFocusIntent).toHaveBeenCalledTimes(1);

    fireEvent.mouseDown(editor);
    expect(onMouseDown).toHaveBeenCalledTimes(1);
  });

  it("does not render a notice when no reference limit message exists", () => {
    render(
      <GenerateComposerPromptBody
        promptEditorRef={createRef<InlinePromptEditorHandle>()}
        ariaLabel="提示词"
        placeholder="描述你想生成的内容"
        parts={[{ type: "text", text: "一台桌面 CNC" }]}
        references={[]}
        pendingReference={null}
        resetKey={0}
        referenceLimitMessage={null}
        onChange={vi.fn()}
        onFocusIntent={vi.fn()}
        onMouseDown={vi.fn()}
        onKeyPressCapture={vi.fn()}
        onKeyUpCapture={vi.fn()}
        onKeyDown={vi.fn()}
      />,
    );

    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByRole("textbox", { name: "提示词" })).toHaveTextContent(
      "一台桌面 CNC",
    );
  });

  it("localizes inline reference accessibility labels", () => {
    setActiveDesktopLocale("en");

    render(
      <GenerateComposerPromptBody
        promptEditorRef={createRef<InlinePromptEditorHandle>()}
        ariaLabel="Prompt"
        placeholder="Describe what you want to generate"
        parts={[{ type: "reference", referenceId: "reference-1" }]}
        references={[
          {
            id: "reference-1",
            label: "参考图",
            enabled: true,
            elementCount: 1,
            textCount: 0,
            thumbnailDataUrl: "data:image/png;base64,abc",
          },
        ]}
        pendingReference={{
          enabled: true,
          elementCount: 1,
          textCount: 0,
          items: [
            {
              id: "pending-image",
              index: 1,
              kind: "image",
              label: "图片",
              thumbnailDataUrl: "data:image/png;base64,def",
            },
          ],
        }}
        resetKey={0}
        referenceLimitMessage={null}
        onChange={vi.fn()}
        onFocusIntent={vi.fn()}
        onMouseDown={vi.fn()}
        onKeyPressCapture={vi.fn()}
        onKeyUpCapture={vi.fn()}
        onKeyDown={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("img", { name: "1 参考图 thumbnail" }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("2 Image, pending confirmation"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "2 Image pending confirmation thumbnail",
      }),
    ).toBeInTheDocument();
  });
});
