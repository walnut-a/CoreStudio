import type { ReactNode } from "react";
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isLineBreakNode,
  $isRangeSelection,
  $isTextNode,
  $nodesOfType,
  DecoratorNode,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";

import {
  PendingPromptReferenceNodeView,
  PromptReferenceNodeView,
} from "./PromptReferenceDecoration";

import type { GenerationPromptPart } from "../../shared/providerTypes";

type SerializedPromptReferenceNode = Spread<
  {
    referenceId: string;
    type: "prompt-reference";
    version: 1;
  },
  SerializedLexicalNode
>;

type SerializedPendingPromptReferenceNode = Spread<
  {
    type: "pending-prompt-reference";
    version: 1;
  },
  SerializedLexicalNode
>;

export class PromptReferenceNode extends DecoratorNode<ReactNode> {
  __referenceId: string;

  static getType() {
    return "prompt-reference";
  }

  static clone(node: PromptReferenceNode) {
    return new PromptReferenceNode(node.__referenceId, node.__key);
  }

  static importJSON(serializedNode: SerializedPromptReferenceNode) {
    return new PromptReferenceNode(serializedNode.referenceId);
  }

  constructor(referenceId: string, key?: NodeKey) {
    super(key);
    this.__referenceId = referenceId;
  }

  exportJSON(): SerializedPromptReferenceNode {
    return {
      ...super.exportJSON(),
      referenceId: this.__referenceId,
      type: "prompt-reference",
      version: 1,
    };
  }

  createDOM(_config: EditorConfig) {
    const element = document.createElement("span");
    element.className = "generate-composer__reference-node";
    return element;
  }

  updateDOM() {
    return false;
  }

  decorate() {
    return <PromptReferenceNodeView referenceId={this.__referenceId} />;
  }

  getReferenceId() {
    return this.getLatest().__referenceId;
  }

  getTextContent() {
    return "\uFFFC";
  }

  isInline() {
    return true;
  }
}

export class PendingPromptReferenceNode extends DecoratorNode<ReactNode> {
  static getType() {
    return "pending-prompt-reference";
  }

  static clone(node: PendingPromptReferenceNode) {
    return new PendingPromptReferenceNode(node.__key);
  }

  static importJSON(_serializedNode: SerializedPendingPromptReferenceNode) {
    return new PendingPromptReferenceNode();
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  exportJSON(): SerializedPendingPromptReferenceNode {
    return {
      ...super.exportJSON(),
      type: "pending-prompt-reference",
      version: 1,
    };
  }

  createDOM(_config: EditorConfig) {
    const element = document.createElement("span");
    element.className =
      "generate-composer__reference-node generate-composer__reference-node--pending";
    return element;
  }

  updateDOM() {
    return false;
  }

  decorate() {
    return <PendingPromptReferenceNodeView />;
  }

  getTextContent() {
    return "\uFFFC";
  }

  isInline() {
    return true;
  }
}

export const $createPromptReferenceNode = (referenceId: string) =>
  new PromptReferenceNode(referenceId);

export const $createPendingPromptReferenceNode = () =>
  new PendingPromptReferenceNode();

export const $isPromptReferenceNode = (
  node: LexicalNode | null | undefined,
): node is PromptReferenceNode => node instanceof PromptReferenceNode;

export const $isPendingPromptReferenceNode = (
  node: LexicalNode | null | undefined,
): node is PendingPromptReferenceNode =>
  node instanceof PendingPromptReferenceNode;

const appendTextPart = (parts: GenerationPromptPart[], text: string): void => {
  if (!text) {
    return;
  }

  const previous = parts.at(-1);
  if (previous?.type === "text") {
    previous.text += text;
  } else {
    parts.push({ type: "text", text });
  }
};

const isBrowserFillerText = (text: string) =>
  !text.replace(/[\n\r\u200b\ufeff\u00a0]/g, "");

const normalizePromptParts = (
  parts: GenerationPromptPart[],
): GenerationPromptPart[] => {
  const hasReference = parts.some((part) => part.type === "reference");
  const text = parts
    .filter(
      (part): part is Extract<GenerationPromptPart, { type: "text" }> =>
        part.type === "text",
    )
    .map((part) => part.text)
    .join("");

  if (!text || isBrowserFillerText(text)) {
    return hasReference
      ? parts.filter((part) => part.type === "reference")
      : [];
  }

  return parts;
};

const appendNodeParts = (
  node: LexicalNode,
  parts: GenerationPromptPart[],
): void => {
  if ($isTextNode(node)) {
    appendTextPart(parts, node.getTextContent());
    return;
  }

  if ($isLineBreakNode(node)) {
    appendTextPart(parts, "\n");
    return;
  }

  if ($isPromptReferenceNode(node)) {
    parts.push({
      type: "reference",
      referenceId: node.getReferenceId(),
    });
    return;
  }

  if ($isPendingPromptReferenceNode(node)) {
    return;
  }

  if ($isElementNode(node)) {
    for (const child of node.getChildren()) {
      appendNodeParts(child, parts);
    }
  }
};

export const $getPromptParts = (): GenerationPromptPart[] => {
  const parts: GenerationPromptPart[] = [];
  const topLevelNodes = $getRoot().getChildren();

  for (let index = 0; index < topLevelNodes.length; index += 1) {
    if (index > 0) {
      appendTextPart(parts, "\n");
    }
    appendNodeParts(topLevelNodes[index], parts);
  }

  return normalizePromptParts(parts);
};

const appendTextWithLineBreaks = (
  paragraph: ReturnType<typeof $createParagraphNode>,
  text: string,
) => {
  const lines = text.split("\n");
  lines.forEach((line, index) => {
    if (index > 0) {
      paragraph.append($createLineBreakNode());
    }
    if (line) {
      paragraph.append($createTextNode(line));
    }
  });
};

export const $setPromptParts = (parts: readonly GenerationPromptPart[]) => {
  const root = $getRoot();
  const paragraph = $createParagraphNode();
  const normalizedParts = normalizePromptParts([...parts]);

  for (const part of normalizedParts) {
    if (part.type === "text") {
      appendTextWithLineBreaks(paragraph, part.text);
    } else if (part.referenceId) {
      paragraph.append($createPromptReferenceNode(part.referenceId));
    }
  }

  root.clear();
  root.append(paragraph);
  paragraph.selectEnd();
};

export const $insertPromptReferenceAtSelection = (referenceId: string) => {
  const referenceNode = $createPromptReferenceNode(referenceId);
  const selection = $getSelection();

  if ($isRangeSelection(selection)) {
    selection.insertNodes([referenceNode]);
    referenceNode.selectNext(0, 0);
    return;
  }

  const root = $getRoot();
  const target = root.getLastChild();
  if ($isElementNode(target)) {
    target.append(referenceNode);
    referenceNode.selectNext(0, 0);
    return;
  }

  const paragraph = $createParagraphNode();
  paragraph.append(referenceNode);
  root.append(paragraph);
  referenceNode.selectNext(0, 0);
};

export const $insertPendingPromptReferenceAtSelection = () => {
  if ($nodesOfType(PendingPromptReferenceNode).length > 0) {
    return;
  }

  const pendingNode = $createPendingPromptReferenceNode();
  const selection = $getSelection();

  if ($isRangeSelection(selection)) {
    selection.insertNodes([pendingNode]);
    pendingNode.selectNext(0, 0);
    return;
  }

  const root = $getRoot();
  const target = root.getLastChild();
  if ($isElementNode(target)) {
    target.append(pendingNode);
    pendingNode.selectNext(0, 0);
    return;
  }

  const paragraph = $createParagraphNode();
  paragraph.append(pendingNode);
  root.append(paragraph);
  pendingNode.selectNext(0, 0);
};

export const $removePendingPromptReference = () => {
  for (const pendingNode of $nodesOfType(PendingPromptReferenceNode)) {
    pendingNode.remove();
  }
};

export const $confirmPendingPromptReference = (referenceId: string) => {
  const pendingNode = $nodesOfType(PendingPromptReferenceNode)[0];
  if (!pendingNode) {
    $insertPromptReferenceAtSelection(referenceId);
    return;
  }

  const referenceNode = $createPromptReferenceNode(referenceId);
  pendingNode.replace(referenceNode);
  referenceNode.selectNext(0, 0);
};
