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
