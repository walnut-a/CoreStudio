import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type CompositionEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

import { toDataUri } from "../../shared/promptReferences";

import type {
  GenerationPromptPart,
  GenerationPromptReferencePayload,
  GenerationReferencePayload,
} from "../../shared/providerTypes";

export interface InlinePromptEditorHandle {
  focus: () => void;
  getParts: () => GenerationPromptPart[];
  insertReference: (referenceId: string) => GenerationPromptPart[];
}

interface InlinePromptEditorProps {
  ariaLabel: string;
  placeholder: string;
  parts: GenerationPromptPart[];
  references: GenerationPromptReferencePayload[];
  pendingReference: GenerationReferencePayload | null;
  resetKey: number;
  onChange: (parts: GenerationPromptPart[]) => void;
  onFocusIntent: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onMouseDown: (event: MouseEvent<HTMLDivElement>) => void;
  onKeyPressCapture: (event: KeyboardEvent<HTMLDivElement>) => void;
  onKeyUpCapture: (event: KeyboardEvent<HTMLDivElement>) => void;
}

const CHIP_TEXT_LENGTH = 1;

const isReferenceElement = (node: Node): node is HTMLElement =>
  node instanceof HTMLElement && Boolean(node.dataset.referenceId);

const isPendingReferenceElement = (node: Node): node is HTMLElement =>
  node instanceof HTMLElement && Boolean(node.dataset.pendingReference);

const createTextNode = (text: string) => document.createTextNode(text);

const createReferenceChipNode = (
  reference: GenerationPromptReferencePayload,
  index: number,
) => {
  const chip = document.createElement("span");
  const thumbnail = reference.thumbnailDataUrl;
  chip.className = [
    "generate-composer__reference-chip",
    "generate-composer__reference-chip--image",
    thumbnail ? "generate-composer__reference-chip--with-thumbnail" : "",
  ]
    .filter(Boolean)
    .join(" ");
  chip.contentEditable = "false";
  chip.dataset.referenceId = reference.id;
  chip.title = getReferenceLabel(reference, index);

  if (thumbnail) {
    const thumbnailNode = document.createElement("span");
    thumbnailNode.className = "generate-composer__reference-chip-thumbnail";
    const image = document.createElement("img");
    image.src = thumbnail;
    image.alt = `${getReferenceLabel(reference, index)} 缩略图`;
    image.draggable = false;
    thumbnailNode.append(image);
    chip.append(thumbnailNode);
  }

  const indexNode = document.createElement("span");
  indexNode.className = "generate-composer__reference-chip-index";
  indexNode.textContent = String(index + 1);
  chip.append(indexNode);

  const labelNode = document.createElement("span");
  labelNode.className = "generate-composer__reference-chip-label";
  labelNode.textContent = reference.label;
  chip.append(labelNode);

  return chip;
};

const createPendingReferenceChipNode = (
  reference: GenerationReferencePayload,
  index: number,
) => {
  const chip = document.createElement("span");
  const thumbnail = getPendingThumbnail(reference);
  const label = getPendingReferenceLabel(reference);
  chip.className = [
    "generate-composer__reference-chip",
    "generate-composer__reference-chip--pending",
    "generate-composer__reference-chip--with-thumbnail",
  ]
    .filter(Boolean)
    .join(" ");
  chip.contentEditable = "false";
  chip.dataset.pendingReference = "true";
  chip.title = `${index + 1} ${label}，待确认`;
  chip.setAttribute("aria-label", `${index + 1} ${label}，待确认`);

  const thumbnailNode = document.createElement("span");
  thumbnailNode.className = "generate-composer__reference-chip-thumbnail";
  if (thumbnail) {
    const image = document.createElement("img");
    image.src = thumbnail;
    image.alt = `${index + 1} ${label}待确认缩略图`;
    image.draggable = false;
    thumbnailNode.append(image);
  }
  chip.append(thumbnailNode);

  const indexNode = document.createElement("span");
  indexNode.className = "generate-composer__reference-chip-index";
  indexNode.textContent = String(index + 1);
  chip.append(indexNode);

  const labelNode = document.createElement("span");
  labelNode.className = "generate-composer__reference-chip-label";
  labelNode.textContent = label;
  chip.append(labelNode);

  return chip;
};

const renderEditorContent = ({
  editor,
  parts,
  references,
  pendingReference,
}: {
  editor: HTMLElement | null;
  parts: readonly GenerationPromptPart[];
  references: readonly GenerationPromptReferencePayload[];
  pendingReference: GenerationReferencePayload | null;
}) => {
  if (!editor) {
    return;
  }

  const referenceMap = new Map(
    references.map((reference, index) => [reference.id, { reference, index }]),
  );
  const fragment = document.createDocumentFragment();
  const renderParts = stripBrowserFillerContent(mergeTextParts([...parts]), {
    hasVisualReference: Boolean(pendingReference),
  });

  for (const part of renderParts) {
    if (part.type === "text") {
      if (part.text) {
        fragment.append(createTextNode(part.text));
      }
      continue;
    }

    const entry = referenceMap.get(part.referenceId);
    if (entry) {
      fragment.append(createReferenceChipNode(entry.reference, entry.index));
    }
  }

  if (pendingReference) {
    fragment.append(
      createPendingReferenceChipNode(pendingReference, references.length),
    );
  }

  editor.replaceChildren(fragment);
};

const mergeTextParts = (parts: GenerationPromptPart[]) => {
  const merged: GenerationPromptPart[] = [];
  for (const part of parts) {
    if (part.type === "text") {
      if (!part.text) {
        continue;
      }
      const previous = merged[merged.length - 1];
      if (previous?.type === "text") {
        previous.text += part.text;
      } else {
        merged.push({ type: "text", text: part.text });
      }
      continue;
    }
    merged.push(part);
  }
  return merged;
};

const isBrowserFillerText = (text: string) =>
  !text.replace(/[\n\r\u200b\ufeff\u00a0]/g, "");

const stripBrowserFillerContent = (
  parts: GenerationPromptPart[],
  options: { hasVisualReference?: boolean } = {},
) => {
  const normalizedParts = [...parts];

  while (
    normalizedParts[0]?.type === "text" &&
    isBrowserFillerText(normalizedParts[0].text)
  ) {
    normalizedParts.shift();
  }

  while (
    normalizedParts.at(-1)?.type === "text" &&
    isBrowserFillerText(
      (
        normalizedParts.at(-1) as Extract<
          GenerationPromptPart,
          { type: "text" }
        >
      ).text,
    )
  ) {
    normalizedParts.pop();
  }

  const hasReference =
    options.hasVisualReference ||
    normalizedParts.some((part) => part.type === "reference");
  const text = normalizedParts
    .filter(
      (part): part is Extract<GenerationPromptPart, { type: "text" }> =>
        part.type === "text",
    )
    .map((part) => part.text)
    .join("");

  if (!text || isBrowserFillerText(text)) {
    return hasReference
      ? normalizedParts.filter((part) => part.type !== "text")
      : [];
  }

  return normalizedParts;
};

const readPartsFromNode = (node: Node): GenerationPromptPart[] => {
  if (node.nodeType === Node.TEXT_NODE) {
    return [{ type: "text", text: node.textContent || "" }];
  }

  if (isReferenceElement(node)) {
    return [{ type: "reference", referenceId: node.dataset.referenceId! }];
  }

  if (isPendingReferenceElement(node)) {
    return [];
  }

  if (!(node instanceof HTMLElement)) {
    return [];
  }

  if (node.tagName === "BR") {
    return [{ type: "text", text: "\n" }];
  }

  return Array.from(node.childNodes).flatMap(readPartsFromNode);
};

const readEditorParts = (editor: HTMLElement | null) => {
  if (!editor) {
    return [];
  }
  return stripBrowserFillerContent(
    mergeTextParts(Array.from(editor.childNodes).flatMap(readPartsFromNode)),
  );
};

const nodeTextLength = (node: Node): number => {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent?.length ?? 0;
  }
  if (isReferenceElement(node)) {
    return CHIP_TEXT_LENGTH;
  }
  if (isPendingReferenceElement(node)) {
    return 0;
  }
  if (node instanceof HTMLElement && node.tagName === "BR") {
    return 1;
  }
  return Array.from(node.childNodes).reduce(
    (sum, child) => sum + nodeTextLength(child),
    0,
  );
};

const getOffsetWithin = (
  root: Node,
  target: Node,
  targetOffset: number,
): { offset: number; found: boolean } => {
  if (root === target) {
    if (root.nodeType === Node.TEXT_NODE) {
      return { offset: targetOffset, found: true };
    }

    const children = Array.from(root.childNodes);
    return {
      offset: children
        .slice(0, targetOffset)
        .reduce((sum, child) => sum + nodeTextLength(child), 0),
      found: true,
    };
  }

  let offset = 0;
  for (const child of Array.from(root.childNodes)) {
    const result = getOffsetWithin(child, target, targetOffset);
    if (result.found) {
      return { offset: offset + result.offset, found: true };
    }
    offset += nodeTextLength(child);
  }

  return { offset, found: false };
};

const getCaretOffset = (editor: HTMLElement | null) => {
  const selection = window.getSelection();
  if (!editor || !selection?.rangeCount) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (!editor.contains(range.startContainer)) {
    return null;
  }

  return getOffsetWithin(editor, range.startContainer, range.startOffset)
    .offset;
};

const findNodeAtOffset = (
  root: Node,
  targetOffset: number,
): { node: Node; offset: number } => {
  if (root.nodeType === Node.TEXT_NODE) {
    return {
      node: root,
      offset: Math.min(targetOffset, root.textContent?.length ?? 0),
    };
  }

  let remaining = targetOffset;
  for (const child of Array.from(root.childNodes)) {
    const length = nodeTextLength(child);
    if (remaining <= length && !isReferenceElement(child)) {
      return findNodeAtOffset(child, remaining);
    }
    if (remaining <= length) {
      const parent = child.parentNode || root;
      return {
        node: parent,
        offset: Array.from(parent.childNodes).indexOf(child) + 1,
      };
    }
    remaining -= length;
  }

  return {
    node: root,
    offset: root.childNodes.length,
  };
};

const restoreCaretOffset = (
  editor: HTMLElement | null,
  offset: number | null,
) => {
  if (!editor || offset === null) {
    return;
  }

  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  const target = findNodeAtOffset(editor, offset);
  const range = document.createRange();
  range.setStart(target.node, target.offset);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
};

const insertReferencePart = (
  parts: GenerationPromptPart[],
  referenceId: string,
  offset: number | null,
) => {
  if (offset === null) {
    return [...parts, { type: "reference" as const, referenceId }];
  }

  const nextParts: GenerationPromptPart[] = [];
  let remaining = offset;
  let inserted = false;

  for (const part of parts) {
    if (inserted) {
      nextParts.push(part);
      continue;
    }

    const length = part.type === "text" ? part.text.length : CHIP_TEXT_LENGTH;
    if (remaining > length) {
      nextParts.push(part);
      remaining -= length;
      continue;
    }

    if (part.type === "text") {
      const before = part.text.slice(0, remaining);
      const after = part.text.slice(remaining);
      if (before) {
        nextParts.push({ type: "text", text: before });
      }
      nextParts.push({ type: "reference", referenceId });
      if (after) {
        nextParts.push({ type: "text", text: after });
      }
    } else {
      nextParts.push(part);
      nextParts.push({ type: "reference", referenceId });
    }
    inserted = true;
  }

  if (!inserted) {
    nextParts.push({ type: "reference", referenceId });
  }

  return mergeTextParts(nextParts);
};

const getReferenceLabel = (
  reference: GenerationPromptReferencePayload,
  index: number,
) => `${index + 1} ${reference.label}`;

const getPendingReferenceLabel = (reference: GenerationReferencePayload) => {
  const items = reference.items || [];
  if (items.length === 1 && items[0]?.kind === "image") {
    return "图片";
  }
  return "标注图";
};

const getPendingThumbnail = (reference: GenerationReferencePayload | null) => {
  if (reference?.image) {
    return toDataUri(reference.image.mimeType, reference.image.dataBase64);
  }

  const items = reference?.items || [];
  if (items.length !== 1 || items[0]?.kind !== "image") {
    return null;
  }

  return items[0].thumbnailDataUrl ?? null;
};

export const InlinePromptEditor = forwardRef<
  InlinePromptEditorHandle,
  InlinePromptEditorProps
>(
  (
    {
      ariaLabel,
      placeholder,
      parts,
      references,
      pendingReference,
      resetKey,
      onChange,
      onFocusIntent,
      onKeyDown,
      onMouseDown,
      onKeyPressCapture,
      onKeyUpCapture,
    },
    ref,
  ) => {
    const editorRef = useRef<HTMLDivElement | null>(null);
    const [localParts, setLocalParts] = useState(parts);
    const [isComposing, setIsComposing] = useState(false);
    const restoreOffsetRef = useRef<number | null>(null);
    const composingRef = useRef(false);
    const compositionCommitTimerRef = useRef<number | null>(null);

    useEffect(() => {
      if (composingRef.current) {
        return;
      }

      setLocalParts(parts);
    }, [parts, resetKey]);

    useEffect(
      () => () => {
        if (compositionCommitTimerRef.current !== null) {
          window.clearTimeout(compositionCommitTimerRef.current);
        }
      },
      [],
    );

    useLayoutEffect(() => {
      renderEditorContent({
        editor: editorRef.current,
        parts: localParts,
        references,
        pendingReference,
      });
      restoreCaretOffset(editorRef.current, restoreOffsetRef.current);
      restoreOffsetRef.current = null;
    }, [localParts, pendingReference, references]);

    const commitDomChange = () => {
      if (composingRef.current) {
        return;
      }

      const caretOffset = getCaretOffset(editorRef.current);
      const nextParts = readEditorParts(editorRef.current);
      restoreOffsetRef.current = caretOffset;
      setLocalParts(nextParts);
      onChange(nextParts);
    };

    const clearScheduledCompositionCommit = () => {
      if (compositionCommitTimerRef.current === null) {
        return;
      }

      window.clearTimeout(compositionCommitTimerRef.current);
      compositionCommitTimerRef.current = null;
    };

    const handleInput = () => {
      clearScheduledCompositionCommit();
      commitDomChange();
      if (!composingRef.current) {
        setIsComposing(false);
      }
    };

    const handleCompositionStart = (
      _event: CompositionEvent<HTMLDivElement>,
    ) => {
      clearScheduledCompositionCommit();
      composingRef.current = true;
      setIsComposing(true);
    };

    const handleCompositionEnd = (_event: CompositionEvent<HTMLDivElement>) => {
      composingRef.current = false;
      compositionCommitTimerRef.current = window.setTimeout(() => {
        compositionCommitTimerRef.current = null;
        commitDomChange();
        setIsComposing(false);
      }, 0);
    };

    useImperativeHandle(ref, () => ({
      focus: () => editorRef.current?.focus(),
      getParts: () => readEditorParts(editorRef.current),
      insertReference: (referenceId: string) => {
        const caretOffset = getCaretOffset(editorRef.current);
        const currentParts = readEditorParts(editorRef.current);
        const nextParts = insertReferencePart(
          currentParts,
          referenceId,
          caretOffset,
        );
        restoreOffsetRef.current =
          (caretOffset ??
            nodeTextLength(editorRef.current || document.createTextNode(""))) +
          CHIP_TEXT_LENGTH;
        setLocalParts(nextParts);
        onChange(nextParts);
        return nextParts;
      },
    }));

    const isEmpty =
      !isComposing &&
      !pendingReference &&
      (!localParts.length ||
        localParts.every((part) => part.type !== "reference" && !part.text));

    return (
      <div
        ref={editorRef}
        className={[
          "generate-composer__prompt-editor",
          isEmpty ? "generate-composer__prompt-editor--empty" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        role="textbox"
        aria-label={ariaLabel}
        aria-multiline="true"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={handleInput}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onFocus={onFocusIntent}
        onMouseDown={onMouseDown}
        onKeyPressCapture={onKeyPressCapture}
        onKeyUpCapture={onKeyUpCapture}
        onKeyDown={onKeyDown}
      />
    );
  },
);

InlinePromptEditor.displayName = "InlinePromptEditor";
