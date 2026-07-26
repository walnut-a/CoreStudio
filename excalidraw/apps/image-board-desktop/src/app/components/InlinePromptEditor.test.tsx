import { useState } from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { GenerationPromptPart } from "../../shared/providerTypes";
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

describe("InlinePromptEditor", () => {
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
});
