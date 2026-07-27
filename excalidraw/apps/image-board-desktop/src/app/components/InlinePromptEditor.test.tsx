import { useEffect, useState } from "react";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  GenerationPromptPart,
  GenerationPromptReferencePayload,
} from "../../shared/providerTypes";
import { InlinePromptEditor } from "./InlinePromptEditor";

afterEach(() => {
  vi.restoreAllMocks();
});

const ControlledPromptEditor = () => {
  const [parts, setParts] = useState<GenerationPromptPart[]>([]);

  return (
    <InlinePromptEditor
      ariaLabel="提示词"
      placeholder="描述你想生成的内容"
      parts={parts}
      references={[]}
      pendingReference={null}
      resetKey={0}
      onChange={setParts}
      onFocusIntent={vi.fn()}
      onKeyDown={vi.fn()}
      onMouseDown={vi.fn()}
      onKeyPressCapture={vi.fn()}
      onKeyUpCapture={vi.fn()}
    />
  );
};

const EchoingControlledPromptEditor = () => {
  const [externalParts, setExternalParts] = useState<GenerationPromptPart[]>(
    [],
  );
  const [parts, setParts] = useState<GenerationPromptPart[]>([]);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    setParts(externalParts);
    setResetKey((current) => current + 1);
  }, [externalParts]);

  return (
    <InlinePromptEditor
      ariaLabel="提示词"
      placeholder="描述你想生成的内容"
      parts={parts}
      references={[]}
      pendingReference={null}
      resetKey={resetKey}
      onChange={setExternalParts}
      onFocusIntent={vi.fn()}
      onKeyDown={vi.fn()}
      onMouseDown={vi.fn()}
      onKeyPressCapture={vi.fn()}
      onKeyUpCapture={vi.fn()}
    />
  );
};

const referencePayloads: GenerationPromptReferencePayload[] = [
  {
    id: "reference-1",
    label: "参考图 1",
    enabled: true,
    elementCount: 1,
    textCount: 0,
  },
  {
    id: "reference-2",
    label: "参考图 2",
    enabled: true,
    elementCount: 1,
    textCount: 0,
  },
];

const ControlledMultiReferenceEditor = () => {
  const [parts, setParts] = useState<GenerationPromptPart[]>([
    { type: "reference", referenceId: "reference-1" },
    { type: "reference", referenceId: "reference-2" },
  ]);
  const [references, setReferences] = useState(referencePayloads);

  useEffect(() => {
    const referenceIds = new Set(
      parts.flatMap((part) =>
        part.type === "reference" ? [part.referenceId] : [],
      ),
    );
    setReferences((current) =>
      current.filter((reference) => referenceIds.has(reference.id)),
    );
  }, [parts]);

  return (
    <InlinePromptEditor
      ariaLabel="提示词"
      placeholder="描述你想生成的内容"
      parts={parts}
      references={references}
      pendingReference={null}
      resetKey={0}
      onChange={setParts}
      onFocusIntent={vi.fn()}
      onKeyDown={vi.fn()}
      onMouseDown={vi.fn()}
      onKeyPressCapture={vi.fn()}
      onKeyUpCapture={vi.fn()}
    />
  );
};

describe("InlinePromptEditor", () => {
  it("does not render an empty thumbnail shell for a pending image without thumbnail data", () => {
    render(
      <InlinePromptEditor
        ariaLabel="提示词"
        placeholder="描述你想生成的内容"
        parts={[]}
        references={[]}
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
            },
          ],
        }}
        resetKey={0}
        onChange={vi.fn()}
        onFocusIntent={vi.fn()}
        onKeyDown={vi.fn()}
        onMouseDown={vi.fn()}
        onKeyPressCapture={vi.fn()}
        onKeyUpCapture={vi.fn()}
      />,
    );

    const pendingReference = document.querySelector("[data-pending-reference]");
    expect(pendingReference).not.toHaveClass(
      "generate-composer__reference-chip--with-thumbnail",
    );
    expect(
      pendingReference?.querySelector(
        ".generate-composer__reference-chip-thumbnail",
      ),
    ).toBeNull();
  });

  it("falls back to a text-only reference chip when its thumbnail fails to load", () => {
    render(
      <InlinePromptEditor
        ariaLabel="提示词"
        placeholder="描述你想生成的内容"
        parts={[{ type: "reference", referenceId: "broken-reference" }]}
        references={[
          {
            id: "broken-reference",
            label: "参考图片",
            enabled: true,
            elementCount: 1,
            textCount: 0,
            thumbnailDataUrl: "data:image/png;base64,broken",
          },
        ]}
        pendingReference={null}
        resetKey={0}
        onChange={vi.fn()}
        onFocusIntent={vi.fn()}
        onKeyDown={vi.fn()}
        onMouseDown={vi.fn()}
        onKeyPressCapture={vi.fn()}
        onKeyUpCapture={vi.fn()}
      />,
    );

    const reference = document.querySelector("[data-reference-id]");
    const thumbnail = reference?.querySelector("img");
    expect(thumbnail).not.toBeNull();

    fireEvent.error(thumbnail!);

    expect(reference).not.toHaveClass(
      "generate-composer__reference-chip--with-thumbnail",
    );
    expect(
      reference?.querySelector(".generate-composer__reference-chip-thumbnail"),
    ).toBeNull();
  });

  it("preserves the browser edit history when controlled state echoes a DOM input", () => {
    const replaceChildren = vi.spyOn(Element.prototype, "replaceChildren");

    render(<ControlledPromptEditor />);

    const editor = screen.getByRole("textbox", { name: "提示词" });
    const initialRenderCount = replaceChildren.mock.calls.length;

    editor.textContent = "一大段粘贴进来的提示词";
    fireEvent.input(editor);

    expect(editor).toHaveTextContent("一大段粘贴进来的提示词");
    expect(replaceChildren).toHaveBeenCalledTimes(initialRenderCount);

    editor.textContent = "";
    fireEvent.input(editor);

    expect(editor).toBeEmptyDOMElement();
    expect(replaceChildren).toHaveBeenCalledTimes(initialRenderCount);
  });

  it("keeps the caret in place when the request controller echoes typed content with a new reset key", async () => {
    render(<EchoingControlledPromptEditor />);

    const editor = screen.getByRole("textbox", { name: "提示词" });
    editor.textContent = "a";
    const selection = window.getSelection()!;
    const browserRange = document.createRange();
    browserRange.setStart(editor.firstChild!, 1);
    browserRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(browserRange);

    fireEvent.input(editor, { inputType: "insertText", data: "a" });

    await waitFor(() => {
      expect(selection.rangeCount).toBe(1);
      expect(selection.getRangeAt(0).startContainer).toBe(editor.firstChild);
      expect(selection.getRangeAt(0).startOffset).toBe(1);
    });
  });

  it("keeps the committed IME caret after the request controller echoes the composition", async () => {
    render(<EchoingControlledPromptEditor />);

    const editor = screen.getByRole("textbox", { name: "提示词" });
    fireEvent.compositionStart(editor);
    editor.textContent = "中文";
    const selection = window.getSelection()!;
    const compositionRange = document.createRange();
    compositionRange.setStart(editor.firstChild!, 2);
    compositionRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(compositionRange);
    fireEvent.input(editor, { inputType: "insertCompositionText" });
    fireEvent.compositionEnd(editor);

    await waitFor(() => {
      expect(editor).toHaveTextContent("中文");
      expect(selection.getRangeAt(0).startContainer).toBe(editor.firstChild);
      expect(selection.getRangeAt(0).startOffset).toBe(2);
    });
  });

  it("applies an explicit external reset after an active IME composition ends", async () => {
    const onChange = vi.fn();
    const props = {
      ariaLabel: "提示词",
      placeholder: "描述你想生成的内容",
      references: [],
      pendingReference: null,
      onChange,
      onFocusIntent: vi.fn(),
      onKeyDown: vi.fn(),
      onMouseDown: vi.fn(),
      onKeyPressCapture: vi.fn(),
      onKeyUpCapture: vi.fn(),
    };
    const { rerender } = render(
      <InlinePromptEditor
        {...props}
        parts={[{ type: "text", text: "旧内容" }]}
        resetKey={0}
      />,
    );
    const editor = screen.getByRole("textbox", { name: "提示词" });

    fireEvent.compositionStart(editor);
    editor.textContent = "正在输入";
    rerender(<InlinePromptEditor {...props} parts={[]} resetKey={1} />);
    expect(editor).toHaveTextContent("正在输入");

    fireEvent.compositionEnd(editor);

    await waitFor(() => {
      expect(editor).toBeEmptyDOMElement();
    });
    expect(onChange).not.toHaveBeenCalledWith([
      { type: "text", text: "正在输入" },
    ]);
  });

  it("still applies an explicit external reset when the content changes", () => {
    const props = {
      ariaLabel: "提示词",
      placeholder: "描述你想生成的内容",
      references: [],
      pendingReference: null,
      onChange: vi.fn(),
      onFocusIntent: vi.fn(),
      onKeyDown: vi.fn(),
      onMouseDown: vi.fn(),
      onKeyPressCapture: vi.fn(),
      onKeyUpCapture: vi.fn(),
    };
    const { rerender } = render(
      <InlinePromptEditor
        {...props}
        parts={[{ type: "text", text: "原始内容" }]}
        resetKey={0}
      />,
    );

    rerender(
      <InlinePromptEditor
        {...props}
        parts={[{ type: "text", text: "外部重置内容" }]}
        resetKey={1}
      />,
    );

    expect(screen.getByRole("textbox", { name: "提示词" })).toHaveTextContent(
      "外部重置内容",
    );
  });

  it("inserts pasted rich content as plain text while preserving line breaks", () => {
    const onChange = vi.fn();
    render(
      <InlinePromptEditor
        ariaLabel="提示词"
        placeholder="描述你想生成的内容"
        parts={[]}
        references={[]}
        pendingReference={null}
        resetKey={0}
        onChange={onChange}
        onFocusIntent={vi.fn()}
        onKeyDown={vi.fn()}
        onMouseDown={vi.fn()}
        onKeyPressCapture={vi.fn()}
        onKeyUpCapture={vi.fn()}
      />,
    );
    const editor = screen.getByRole("textbox", { name: "提示词" });

    fireEvent.paste(editor, {
      clipboardData: {
        getData: (type: string) =>
          type === "text/plain"
            ? "第一行\n第二行"
            : '<span style="font-size: 40px; color: red">第一行</span>',
      },
    });

    expect(editor.textContent).toBe("第一行\n第二行");
    expect(editor.querySelector("[style], b, span")).toBeNull();
    expect(onChange).toHaveBeenLastCalledWith([
      { type: "text", text: "第一行\n第二行" },
    ]);
  });

  it("preserves block boundaries when reading browser-created editable DOM", () => {
    const onChange = vi.fn();
    render(
      <InlinePromptEditor
        ariaLabel="提示词"
        placeholder="描述你想生成的内容"
        parts={[]}
        references={[]}
        pendingReference={null}
        resetKey={0}
        onChange={onChange}
        onFocusIntent={vi.fn()}
        onKeyDown={vi.fn()}
        onMouseDown={vi.fn()}
        onKeyPressCapture={vi.fn()}
        onKeyUpCapture={vi.fn()}
      />,
    );
    const editor = screen.getByRole("textbox", { name: "提示词" });
    editor.innerHTML = "<div>第一行</div><div>第二行</div>";

    fireEvent.input(editor, { inputType: "insertFromPaste" });

    expect(onChange).toHaveBeenLastCalledWith([
      { type: "text", text: "第一行\n第二行" },
    ]);
  });

  it("preserves the caret when a pending reference decoration appears", () => {
    const props = {
      ariaLabel: "提示词",
      placeholder: "描述你想生成的内容",
      references: [],
      onChange: vi.fn(),
      onFocusIntent: vi.fn(),
      onKeyDown: vi.fn(),
      onMouseDown: vi.fn(),
      onKeyPressCapture: vi.fn(),
      onKeyUpCapture: vi.fn(),
    };
    const { rerender } = render(
      <InlinePromptEditor
        {...props}
        parts={[{ type: "text", text: "abcd" }]}
        pendingReference={null}
        resetKey={0}
      />,
    );
    const editor = screen.getByRole("textbox", { name: "提示词" });
    const selection = window.getSelection()!;
    const range = document.createRange();
    range.setStart(editor.firstChild!, 2);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    rerender(
      <InlinePromptEditor
        {...props}
        parts={[{ type: "text", text: "abcd" }]}
        pendingReference={{
          enabled: true,
          elementCount: 1,
          textCount: 0,
          items: [
            {
              id: "pending",
              index: 1,
              kind: "image",
              label: "图片",
            },
          ],
        }}
        resetKey={0}
      />,
    );

    expect(selection.getRangeAt(0).startContainer).toBe(editor.firstChild);
    expect(selection.getRangeAt(0).startOffset).toBe(2);
  });

  it("does not rebuild the DOM after deleting a reference", async () => {
    const replaceChildren = vi.spyOn(Element.prototype, "replaceChildren");
    render(<ControlledMultiReferenceEditor />);

    const editor = screen.getByRole("textbox", { name: "提示词" });
    const initialRenderCount = replaceChildren.mock.calls.length;
    editor.lastChild?.remove();
    fireEvent.input(editor, { inputType: "deleteContentBackward" });

    await waitFor(() => {
      expect(editor.childNodes).toHaveLength(1);
      expect(replaceChildren).toHaveBeenCalledTimes(initialRenderCount);
    });
  });

  it("cancels a stale reference-deletion caret restore when typing continues", () => {
    let scheduledRestore: FrameRequestCallback | null = null;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      scheduledRestore = callback;
      return 42;
    });
    const cancelAnimationFrame = vi.spyOn(window, "cancelAnimationFrame");

    render(<ControlledMultiReferenceEditor />);

    const editor = screen.getByRole("textbox", { name: "提示词" });
    editor.lastChild?.remove();
    const selection = window.getSelection()!;
    const deletionRange = document.createRange();
    deletionRange.setStart(editor, 1);
    deletionRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(deletionRange);
    fireEvent.input(editor, { inputType: "deleteContentBackward" });

    expect(scheduledRestore).not.toBeNull();

    const textNode = document.createTextNode("a");
    editor.append(textNode);
    const typingRange = document.createRange();
    typingRange.setStart(textNode, 1);
    typingRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(typingRange);
    fireEvent.input(editor, { inputType: "insertText", data: "a" });

    expect(cancelAnimationFrame).toHaveBeenCalledWith(42);
  });

  it("keeps the caret after the remaining content when backspace removes the last reference", async () => {
    render(<ControlledMultiReferenceEditor />);

    const editor = screen.getByRole("textbox", { name: "提示词" });
    expect(editor.childNodes).toHaveLength(2);

    editor.lastChild?.remove();
    const selection = window.getSelection()!;
    const browserRange = document.createRange();
    browserRange.setStart(editor, 1);
    browserRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(browserRange);

    fireEvent.input(editor, { inputType: "deleteContentBackward" });

    const browserPostInputRange = document.createRange();
    browserPostInputRange.setStart(editor, 0);
    browserPostInputRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(browserPostInputRange);

    expect(editor.childNodes).toHaveLength(1);
    await waitFor(() => {
      expect(selection.rangeCount).toBe(1);
      expect(selection.getRangeAt(0).startContainer).toBe(editor);
      expect(selection.getRangeAt(0).startOffset).toBe(1);
    });
  });
});
