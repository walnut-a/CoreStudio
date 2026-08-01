import { createRef, useState } from "react";

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CONTROLLED_TEXT_INSERTION_COMMAND,
  getNearestEditorFromDOMNode,
} from "lexical";

import {
  InlinePromptEditor,
  type InlinePromptEditorHandle,
} from "./InlinePromptEditor";
import { DESKTOP_EDIT_COMMAND_EVENT } from "../desktopEditCommand";
import { handleGenerateComposerPromptKeyDown } from "../generateComposerEvents";

import type {
  GenerationPromptPart,
  GenerationPromptReferencePayload,
} from "../../shared/providerTypes";

afterEach(() => {
  vi.restoreAllMocks();
});

const referencePayloads: GenerationPromptReferencePayload[] = [
  {
    id: "reference-1",
    label: "图片",
    enabled: true,
    elementCount: 1,
    textCount: 0,
    thumbnailDataUrl: "data:image/png;base64,one",
  },
  {
    id: "reference-2",
    label: "图片",
    enabled: true,
    elementCount: 1,
    textCount: 0,
  },
];

const mixedPromptParts: GenerationPromptPart[] = [
  { type: "reference", referenceId: "reference-1" },
  { type: "text", text: "第一行\n第二行" },
  { type: "reference", referenceId: "reference-2" },
];

const createProps = (
  overrides: Partial<Parameters<typeof InlinePromptEditor>[0]> = {},
) => ({
  ariaLabel: "提示词",
  placeholder: "描述你想生成的内容",
  parts: [] as GenerationPromptPart[],
  references: [] as GenerationPromptReferencePayload[],
  pendingReference: null,
  resetKey: 0,
  onChange: vi.fn(),
  onPendingReferenceDiscard: vi.fn(),
  onFocusIntent: vi.fn(),
  onKeyDown: vi.fn(),
  onMouseDown: vi.fn(),
  onKeyPressCapture: vi.fn(),
  onKeyUpCapture: vi.fn(),
  ...overrides,
});

const dispatchDesktopEditCommand = (
  editor: HTMLElement,
  command: "undo" | "redo",
) => {
  editor.dispatchEvent(
    new CustomEvent(DESKTOP_EDIT_COMMAND_EVENT, {
      bubbles: true,
      cancelable: true,
      detail: { command },
    }),
  );
};

describe("InlinePromptEditor", () => {
  it("renders mixed text and atomic references without inventing line breaks", async () => {
    const handle = createRef<InlinePromptEditorHandle>();
    render(
      <InlinePromptEditor
        ref={handle}
        {...createProps({
          parts: [
            { type: "reference", referenceId: "reference-1" },
            { type: "reference", referenceId: "reference-2" },
            { type: "text", text: "说明" },
          ],
          references: referencePayloads,
        })}
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByLabelText(/^[12] 图片$/)).toHaveLength(2);
    });
    expect(handle.current?.getParts()).toEqual([
      { type: "reference", referenceId: "reference-1" },
      { type: "reference", referenceId: "reference-2" },
      { type: "text", text: "说明" },
    ]);
    expect(screen.getByRole("textbox", { name: "提示词" })).toHaveTextContent(
      "说明",
    );
  });

  it("clears multiline text and inline references with one select-all deletion", async () => {
    const handle = createRef<InlinePromptEditorHandle>();
    const submit = vi.fn();
    render(
      <InlinePromptEditor
        ref={handle}
        {...createProps({
          parts: [...mixedPromptParts],
          references: referencePayloads,
          onKeyDown: (event) =>
            handleGenerateComposerPromptKeyDown(event, { submit }),
        })}
      />,
    );

    const editor = screen.getByRole("textbox", { name: "提示词" });
    await waitFor(() =>
      expect(screen.getAllByLabelText(/^[12] 图片$/)).toHaveLength(2),
    );

    fireEvent.keyDown(editor, { key: "a", metaKey: true });
    fireEvent.keyDown(editor, { key: "Backspace" });

    await waitFor(() => expect(handle.current?.getParts()).toEqual([]));
    expect(editor).toHaveTextContent("");
  });

  it("clears multiline text and inline references with one forward deletion", async () => {
    const handle = createRef<InlinePromptEditorHandle>();
    render(
      <InlinePromptEditor
        ref={handle}
        {...createProps({
          parts: mixedPromptParts,
          references: referencePayloads,
          onKeyDown: (event) =>
            handleGenerateComposerPromptKeyDown(event, { submit: vi.fn() }),
        })}
      />,
    );

    const editor = screen.getByRole("textbox", { name: "提示词" });
    await waitFor(() =>
      expect(screen.getAllByLabelText(/^[12] 图片$/)).toHaveLength(2),
    );

    fireEvent.keyDown(editor, { key: "a", ctrlKey: true });
    fireEvent.keyDown(editor, { key: "Delete" });

    await waitFor(() => expect(handle.current?.getParts()).toEqual([]));
  });

  it("replaces a selected mixed prompt through typing", async () => {
    const handle = createRef<InlinePromptEditorHandle>();
    render(
      <InlinePromptEditor
        ref={handle}
        {...createProps({
          parts: mixedPromptParts,
          references: referencePayloads,
          onKeyDown: (event) =>
            handleGenerateComposerPromptKeyDown(event, { submit: vi.fn() }),
        })}
      />,
    );

    const editor = screen.getByRole("textbox", { name: "提示词" });
    await waitFor(() => expect(handle.current).not.toBeNull());
    fireEvent.keyDown(editor, { key: "a", metaKey: true });
    const lexicalEditor = getNearestEditorFromDOMNode(editor);
    expect(lexicalEditor).not.toBeNull();
    act(() => {
      lexicalEditor?.dispatchCommand(
        CONTROLLED_TEXT_INSERTION_COMMAND,
        "替换内容",
      );
    });

    await waitFor(() =>
      expect(handle.current?.getParts()).toEqual([
        { type: "text", text: "替换内容" },
      ]),
    );
  });

  it("replaces a selected mixed prompt through plain-text paste and preserves history", async () => {
    const handle = createRef<InlinePromptEditorHandle>();
    render(
      <InlinePromptEditor
        ref={handle}
        {...createProps({
          parts: mixedPromptParts,
          references: referencePayloads,
          onKeyDown: (event) =>
            handleGenerateComposerPromptKeyDown(event, { submit: vi.fn() }),
        })}
      />,
    );

    const editor = screen.getByRole("textbox", { name: "提示词" });
    await waitFor(() => expect(handle.current).not.toBeNull());
    fireEvent.keyDown(editor, { key: "a", metaKey: true });
    const clipboardData = new DataTransfer();
    clipboardData.setData("text/plain", "替换内容\n第二行");
    fireEvent(
      editor,
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData,
      }),
    );

    await waitFor(() =>
      expect(handle.current?.getParts()).toEqual([
        { type: "text", text: "替换内容\n第二行" },
      ]),
    );

    dispatchDesktopEditCommand(editor, "undo");
    await waitFor(() =>
      expect(handle.current?.getParts()).toEqual(mixedPromptParts),
    );

    dispatchDesktopEditCommand(editor, "redo");
    await waitFor(() =>
      expect(handle.current?.getParts()).toEqual([
        { type: "text", text: "替换内容\n第二行" },
      ]),
    );
  });

  it("cuts a selected mixed prompt in one editor transaction", async () => {
    const handle = createRef<InlinePromptEditorHandle>();
    render(
      <InlinePromptEditor
        ref={handle}
        {...createProps({
          parts: mixedPromptParts,
          references: referencePayloads,
          onKeyDown: (event) =>
            handleGenerateComposerPromptKeyDown(event, { submit: vi.fn() }),
        })}
      />,
    );

    const editor = screen.getByRole("textbox", { name: "提示词" });
    await waitFor(() => expect(handle.current).not.toBeNull());
    fireEvent.keyDown(editor, { key: "a", metaKey: true });
    const clipboardData = new DataTransfer();
    fireEvent(
      editor,
      new ClipboardEvent("cut", {
        bubbles: true,
        cancelable: true,
        clipboardData,
      }),
    );

    await waitFor(() => expect(handle.current?.getParts()).toEqual([]));
  });

  it("discards external pending-reference state when editing removes its node", async () => {
    const handle = createRef<InlinePromptEditorHandle>();
    const onPendingReferenceDiscard = vi.fn();
    render(
      <InlinePromptEditor
        ref={handle}
        {...createProps({
          parts: mixedPromptParts,
          references: referencePayloads,
          pendingReference: {
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
          },
          onPendingReferenceDiscard,
          onKeyDown: (event) =>
            handleGenerateComposerPromptKeyDown(event, { submit: vi.fn() }),
        })}
      />,
    );

    const editor = screen.getByRole("textbox", { name: "提示词" });
    expect(await screen.findByLabelText("3 图片，待确认")).toBeInTheDocument();
    fireEvent.keyDown(editor, { key: "a", metaKey: true });
    fireEvent.keyDown(editor, { key: "Backspace" });

    await waitFor(() =>
      expect(screen.queryByLabelText("3 图片，待确认")).not.toBeInTheDocument(),
    );
    expect(onPendingReferenceDiscard).toHaveBeenCalledTimes(1);
  });

  it("does not restore a discarded pending reference through editor undo", async () => {
    const handle = createRef<InlinePromptEditorHandle>();
    const pendingReference = {
      enabled: true,
      elementCount: 1,
      textCount: 0,
      items: [
        {
          id: "pending",
          index: 1,
          kind: "image" as const,
          label: "图片",
        },
      ],
    };
    const StatefulEditor = () => {
      const [pending, setPending] = useState<typeof pendingReference | null>(
        pendingReference,
      );
      return (
        <InlinePromptEditor
          ref={handle}
          {...createProps({
            parts: mixedPromptParts,
            references: referencePayloads,
            pendingReference: pending,
            onPendingReferenceDiscard: () => setPending(null),
            onKeyDown: (event) =>
              handleGenerateComposerPromptKeyDown(event, { submit: vi.fn() }),
          })}
        />
      );
    };
    render(<StatefulEditor />);

    const editor = screen.getByRole("textbox", { name: "提示词" });
    expect(await screen.findByLabelText("3 图片，待确认")).toBeInTheDocument();
    fireEvent.keyDown(editor, { key: "a", metaKey: true });
    fireEvent.keyDown(editor, { key: "Backspace" });
    await waitFor(() => expect(handle.current?.getParts()).toEqual([]));

    dispatchDesktopEditCommand(editor, "undo");
    await waitFor(() =>
      expect(handle.current?.getParts()).toEqual(mixedPromptParts),
    );
    expect(screen.queryByLabelText("3 图片，待确认")).not.toBeInTheDocument();
  });

  it("does not report a confirmed pending reference as discarded", async () => {
    const handle = createRef<InlinePromptEditorHandle>();
    const onPendingReferenceDiscard = vi.fn();
    render(
      <InlinePromptEditor
        ref={handle}
        {...createProps({
          references: [referencePayloads[0]],
          pendingReference: {
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
          },
          onPendingReferenceDiscard,
        })}
      />,
    );

    await waitFor(() => expect(handle.current).not.toBeNull());
    act(() => {
      handle.current?.confirmPendingReference("reference-1");
    });

    expect(handle.current?.getParts()).toEqual([
      { type: "reference", referenceId: "reference-1" },
    ]);
    expect(onPendingReferenceDiscard).not.toHaveBeenCalled();
  });

  it("inserts a reference through one editor transaction", async () => {
    const handle = createRef<InlinePromptEditorHandle>();
    const onChange = vi.fn();
    render(
      <InlinePromptEditor
        ref={handle}
        {...createProps({
          parts: [{ type: "text", text: "描述" }],
          references: [referencePayloads[0]],
          onChange,
        })}
      />,
    );

    await waitFor(() => expect(handle.current).not.toBeNull());
    act(() => {
      handle.current?.insertReference("reference-1");
    });

    expect(handle.current?.getParts()).toEqual([
      { type: "text", text: "描述" },
      { type: "reference", referenceId: "reference-1" },
    ]);
    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith([
        { type: "text", text: "描述" },
        { type: "reference", referenceId: "reference-1" },
      ]);
    });
  });

  it("only replaces document content for an explicit reset", async () => {
    const initialProps = createProps({
      parts: [{ type: "text", text: "原始内容" }],
    });
    const { rerender } = render(<InlinePromptEditor {...initialProps} />);
    const editor = screen.getByRole("textbox", { name: "提示词" });

    await waitFor(() => expect(editor).toHaveTextContent("原始内容"));
    const originalParagraph = editor.firstChild;

    rerender(
      <InlinePromptEditor
        {...initialProps}
        parts={[{ type: "text", text: "仅外部回显" }]}
      />,
    );
    expect(editor).toHaveTextContent("原始内容");
    expect(editor.firstChild).toBe(originalParagraph);

    rerender(
      <InlinePromptEditor
        {...initialProps}
        parts={[{ type: "text", text: "明确重置" }]}
        resetKey={1}
      />,
    );
    await waitFor(() => expect(editor).toHaveTextContent("明确重置"));
  });

  it("does not dispatch a second undo command from the React key handler", async () => {
    const handle = createRef<InlinePromptEditorHandle>();
    const onKeyDown = vi.fn();
    render(
      <InlinePromptEditor
        ref={handle}
        {...createProps({
          parts: [{ type: "text", text: "描述" }],
          references: [referencePayloads[0]],
          onKeyDown,
        })}
      />,
    );

    const editor = screen.getByRole("textbox", { name: "提示词" });
    await waitFor(() => expect(handle.current).not.toBeNull());
    act(() => {
      handle.current?.insertReference("reference-1");
    });
    expect(handle.current?.getParts()).toEqual([
      { type: "text", text: "描述" },
      { type: "reference", referenceId: "reference-1" },
    ]);

    fireEvent.keyDown(editor, { key: "z", metaKey: true });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(handle.current?.getParts()).toEqual([
      { type: "text", text: "描述" },
      { type: "reference", referenceId: "reference-1" },
    ]);

    dispatchDesktopEditCommand(editor, "undo");
    await waitFor(() =>
      expect(handle.current?.getParts()).toEqual([
        { type: "text", text: "描述" },
      ]),
    );

    dispatchDesktopEditCommand(editor, "redo");
    await waitFor(() =>
      expect(handle.current?.getParts()).toEqual([
        { type: "text", text: "描述" },
        { type: "reference", referenceId: "reference-1" },
      ]),
    );
  });

  it("undoes consecutive programmatic reference insertions one at a time", async () => {
    const handle = createRef<InlinePromptEditorHandle>();
    render(
      <InlinePromptEditor
        ref={handle}
        {...createProps({
          references: referencePayloads,
        })}
      />,
    );

    const editor = screen.getByRole("textbox", { name: "提示词" });
    await waitFor(() => expect(handle.current).not.toBeNull());
    act(() => {
      handle.current?.insertReference("reference-1");
      handle.current?.insertReference("reference-2");
    });
    expect(handle.current?.getParts()).toEqual([
      { type: "reference", referenceId: "reference-1" },
      { type: "reference", referenceId: "reference-2" },
    ]);

    dispatchDesktopEditCommand(editor, "undo");
    await waitFor(() =>
      expect(handle.current?.getParts()).toEqual([
        { type: "reference", referenceId: "reference-1" },
      ]),
    );
  });

  it("handles a desktop menu edit command without relying on DOM focus", async () => {
    const handle = createRef<InlinePromptEditorHandle>();
    render(
      <InlinePromptEditor
        ref={handle}
        {...createProps({
          parts: [{ type: "text", text: "描述" }],
          references: [referencePayloads[0]],
        })}
      />,
    );

    const editor = screen.getByRole("textbox", { name: "提示词" });
    await waitFor(() => expect(handle.current).not.toBeNull());
    act(() => {
      handle.current?.insertReference("reference-1");
    });

    dispatchDesktopEditCommand(editor, "undo");

    await waitFor(() =>
      expect(handle.current?.getParts()).toEqual([
        { type: "text", text: "描述" },
      ]),
    );
  });

  it("records typed text in the same undo history", async () => {
    const handle = createRef<InlinePromptEditorHandle>();
    const onChange = vi.fn();
    render(
      <InlinePromptEditor
        ref={handle}
        {...createProps({
          onChange,
        })}
      />,
    );

    const editor = screen.getByRole("textbox", { name: "提示词" });
    act(() => {
      editor.textContent = "ABC";
      fireEvent.input(editor, {
        data: "ABC",
        inputType: "insertText",
      });
    });
    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith([
        { type: "text", text: "ABC" },
      ]);
    });

    dispatchDesktopEditCommand(editor, "undo");

    await waitFor(() => expect(handle.current?.getParts()).toEqual([]));
  });

  it("keeps a paste replacement separate from preceding typing history", async () => {
    const handle = createRef<InlinePromptEditorHandle>();
    render(
      <InlinePromptEditor
        ref={handle}
        {...createProps({
          parts: [],
        })}
      />,
    );

    const editor = screen.getByRole("textbox", { name: "提示词" });
    await waitFor(() => expect(handle.current).not.toBeNull());
    act(() => {
      editor.textContent = "ABC";
      fireEvent.input(editor, {
        data: "ABC",
        inputType: "insertText",
      });
    });
    await waitFor(() =>
      expect(handle.current?.getParts()).toEqual([
        { type: "text", text: "ABC" },
      ]),
    );

    const clipboardData = new DataTransfer();
    clipboardData.setData("text/plain", "粘贴内容");
    fireEvent(
      editor,
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData,
      }),
    );
    await waitFor(() =>
      expect(handle.current?.getParts()).toEqual([
        { type: "text", text: "ABC粘贴内容" },
      ]),
    );

    dispatchDesktopEditCommand(editor, "undo");
    await waitFor(() =>
      expect(handle.current?.getParts()).toEqual([
        { type: "text", text: "ABC" },
      ]),
    );
  });

  it("does not insert a line break when plain Enter is handled as submit", async () => {
    const handle = createRef<InlinePromptEditorHandle>();
    const onKeyDown = vi.fn((event) => {
      event.preventDefault();
    });
    render(
      <InlinePromptEditor
        ref={handle}
        {...createProps({
          parts: [{ type: "text", text: "描述" }],
          onKeyDown,
        })}
      />,
    );

    const editor = screen.getByRole("textbox", { name: "提示词" });
    await waitFor(() => expect(handle.current).not.toBeNull());
    fireEvent.keyDown(editor, { key: "Enter" });

    expect(onKeyDown).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(handle.current?.getParts()).toEqual([
        { type: "text", text: "描述" },
      ]),
    );
  });

  it("renders a pending reference as an editor node without submitting it", async () => {
    const handle = createRef<InlinePromptEditorHandle>();
    const pendingReference = {
      enabled: true,
      elementCount: 1,
      textCount: 0,
      items: [
        {
          id: "pending",
          index: 1,
          kind: "image" as const,
          label: "图片",
        },
      ],
    };
    render(
      <InlinePromptEditor
        ref={handle}
        {...createProps({
          parts: [{ type: "text", text: "已确认内容\n" }],
          pendingReference,
        })}
      />,
    );

    const editor = screen.getByRole("textbox", { name: "提示词" });
    const pendingChip = await screen.findByLabelText("1 图片，待确认");
    expect(editor.contains(pendingChip)).toBe(true);
    expect(handle.current?.getParts()).toEqual([
      { type: "text", text: "已确认内容\n" },
    ]);
    expect(pendingChip).not.toContainHTML(
      "generate-composer__reference-chip-thumbnail",
    );
  });

  it("removes the temporary editor node when the pending reference is discarded", async () => {
    const pendingReference = {
      enabled: true,
      elementCount: 1,
      textCount: 0,
      items: [
        {
          id: "pending",
          index: 1,
          kind: "image" as const,
          label: "图片",
        },
      ],
    };
    const props = createProps({
      parts: [{ type: "text", text: "已确认内容" }],
      pendingReference,
    });
    const { rerender } = render(<InlinePromptEditor {...props} />);

    expect(await screen.findByLabelText("1 图片，待确认")).toBeInTheDocument();
    rerender(<InlinePromptEditor {...props} pendingReference={null} />);

    await waitFor(() =>
      expect(screen.queryByLabelText("1 图片，待确认")).not.toBeInTheDocument(),
    );
  });

  it("falls back to a text-only reference chip when its thumbnail fails", async () => {
    render(
      <InlinePromptEditor
        {...createProps({
          parts: [{ type: "reference", referenceId: "reference-1" }],
          references: [referencePayloads[0]],
        })}
      />,
    );

    const reference = await screen.findByLabelText("1 图片");
    const image = reference.querySelector("img");
    expect(image).not.toBeNull();
    fireEvent.error(image!);
    expect(
      reference.querySelector(".generate-composer__reference-chip-thumbnail"),
    ).toBeNull();
    expect(reference).toHaveTextContent("1图片");
  });

  it("commits a pending reference after pointer selection can update", () => {
    const events: string[] = [];
    render(
      <InlinePromptEditor
        {...createProps({
          onMouseDown: () => events.push("pointer"),
          onFocusIntent: () => events.push("commit"),
        })}
      />,
    );

    const editor = screen.getByRole("textbox", { name: "提示词" });
    fireEvent.mouseDown(editor);
    expect(events).toEqual(["pointer"]);
    fireEvent.click(editor);
    expect(events).toEqual(["pointer", "commit"]);
  });
});
