import {
  createEditor,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
} from "lexical";
import { describe, expect, it } from "vitest";

import {
  $confirmPendingPromptReference,
  $getPromptParts,
  $insertPendingPromptReferenceAtSelection,
  $insertPromptReferenceAtSelection,
  $setPromptParts,
  PendingPromptReferenceNode,
  PromptReferenceNode,
} from "./promptEditorDocument";

describe("promptEditorDocument", () => {
  const createPromptEditor = () =>
    createEditor({
      namespace: "PromptEditorDocumentTest",
      nodes: [PromptReferenceNode, PendingPromptReferenceNode],
      onError: (error) => {
        throw error;
      },
    });

  it("round-trips mixed text, references and intentional line breaks", () => {
    const editor = createPromptEditor();
    const parts = [
      { type: "text" as const, text: "造型参考：" },
      { type: "reference" as const, referenceId: "shape" },
      { type: "text" as const, text: "\n风格参考：" },
      { type: "reference" as const, referenceId: "style" },
    ];

    editor.update(() => $setPromptParts(parts), { discrete: true });

    expect(editor.getEditorState().read($getPromptParts)).toEqual(parts);
  });

  it("inserts an atomic reference at the current text selection", () => {
    const editor = createPromptEditor();

    editor.update(
      () => {
        $setPromptParts([{ type: "text", text: "前后" }]);
        const text = $getRoot().getFirstDescendant();
        expect($isTextNode(text)).toBe(true);
        if (!$isTextNode(text)) {
          throw new Error("Expected a text node");
        }
        text.select(1, 1);
        $insertPromptReferenceAtSelection("reference");
      },
      { discrete: true },
    );

    expect(editor.getEditorState().read($getPromptParts)).toEqual([
      { type: "text", text: "前" },
      { type: "reference", referenceId: "reference" },
      { type: "text", text: "后" },
    ]);
  });

  it("does not invent a line break between adjacent inline references", () => {
    const editor = createPromptEditor();

    editor.update(
      () =>
        $setPromptParts([
          { type: "reference", referenceId: "one" },
          { type: "reference", referenceId: "two" },
          { type: "text", text: "说明" },
        ]),
      { discrete: true },
    );

    expect(editor.getEditorState().read($getPromptParts)).toEqual([
      { type: "reference", referenceId: "one" },
      { type: "reference", referenceId: "two" },
      { type: "text", text: "说明" },
    ]);
  });

  it("keeps a pending reference in document flow but out of prompt parts", () => {
    const editor = createPromptEditor();

    editor.update(
      () => {
        $setPromptParts([{ type: "text", text: "第一行\n" }]);
        $insertPendingPromptReferenceAtSelection();
      },
      { discrete: true },
    );

    expect(editor.getEditorState().read($getPromptParts)).toEqual([
      { type: "text", text: "第一行\n" },
    ]);

    editor.update(() => $confirmPendingPromptReference("reference"), {
      discrete: true,
    });

    expect(editor.getEditorState().read($getPromptParts)).toEqual([
      { type: "text", text: "第一行\n" },
      { type: "reference", referenceId: "reference" },
    ]);
  });

  it("keeps the caret after the remaining reference when deleting the last one", () => {
    const editor = createPromptEditor();
    let caretOffset = -1;

    editor.update(
      () => {
        $setPromptParts([
          { type: "reference", referenceId: "one" },
          { type: "reference", referenceId: "two" },
        ]);
        const paragraph = $getRoot().getFirstChildOrThrow();
        expect($isElementNode(paragraph)).toBe(true);
        if (!$isElementNode(paragraph)) {
          throw new Error("Expected a paragraph element");
        }
        const lastReference = paragraph.getLastChildOrThrow();
        lastReference.selectNext(0, 0);
        const selection = $getSelection();
        expect($isRangeSelection(selection)).toBe(true);
        if (!$isRangeSelection(selection)) {
          throw new Error("Expected a range selection");
        }
        selection.deleteCharacter(true);
        caretOffset = selection.anchor.offset;
      },
      { discrete: true },
    );

    expect(editor.getEditorState().read($getPromptParts)).toEqual([
      { type: "reference", referenceId: "one" },
    ]);
    expect(caretOffset).toBe(1);
  });

  it("normalizes browser filler characters without dropping real spaces", () => {
    const editor = createPromptEditor();

    editor.update(() => $setPromptParts([{ type: "text", text: "\n\u200b" }]), {
      discrete: true,
    });
    expect(editor.getEditorState().read($getPromptParts)).toEqual([]);

    editor.update(() => $setPromptParts([{ type: "text", text: " " }]), {
      discrete: true,
    });
    expect(editor.getEditorState().read($getPromptParts)).toEqual([
      { type: "text", text: " " },
    ]);
  });
});
