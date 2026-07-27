import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type CompositionEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

import { toDataUri } from "../../shared/promptReferences";
import { copy } from "../copy";

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

const appendReferenceThumbnail = ({
  chip,
  thumbnail,
  alt,
}: {
  chip: HTMLElement;
  thumbnail: string | null | undefined;
  alt: string;
}) => {
  if (!thumbnail) {
    return;
  }

  const thumbnailNode = document.createElement("span");
  thumbnailNode.className = "generate-composer__reference-chip-thumbnail";
  const image = document.createElement("img");
  image.addEventListener(
    "error",
    () => {
      thumbnailNode.remove();
      chip.classList.remove(
        "generate-composer__reference-chip--with-thumbnail",
      );
    },
    { once: true },
  );
  image.src = thumbnail;
  image.alt = alt;
  image.draggable = false;
  thumbnailNode.append(image);
  chip.append(thumbnailNode);
};

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
    appendReferenceThumbnail({
      chip,
      thumbnail,
      alt: copy.generateDialog.referenceThumbnail(
        getReferenceLabel(reference, index),
      ),
    });
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
    thumbnail ? "generate-composer__reference-chip--with-thumbnail" : "",
  ]
    .filter(Boolean)
    .join(" ");
  chip.contentEditable = "false";
  chip.dataset.pendingReference = "true";
  chip.title = copy.generateDialog.pendingReference(index + 1, label);
  chip.setAttribute(
    "aria-label",
    copy.generateDialog.pendingReference(index + 1, label),
  );

  if (thumbnail) {
    appendReferenceThumbnail({
      chip,
      thumbnail,
      alt: copy.generateDialog.pendingReferenceThumbnail(index + 1, label),
    });
  }

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

const BLOCK_ELEMENT_TAGS = new Set([
  "ADDRESS",
  "BLOCKQUOTE",
  "DIV",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "LI",
  "OL",
  "P",
  "PRE",
  "UL",
]);

const isBlockElement = (node: Node): node is HTMLElement =>
  node instanceof HTMLElement && BLOCK_ELEMENT_TAGS.has(node.tagName);

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

  const parts: GenerationPromptPart[] = [];
  const children = Array.from(node.childNodes);
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    const childParts = readPartsFromNode(child);
    const previousChild = children[index - 1];
    const previousPart = parts.at(-1);
    const firstChildPart = childParts[0];
    const needsBlockBoundary =
      index > 0 && (isBlockElement(previousChild) || isBlockElement(child));
    const boundaryAlreadyPresent =
      (previousPart?.type === "text" && previousPart.text.endsWith("\n")) ||
      (firstChildPart?.type === "text" && firstChildPart.text.startsWith("\n"));

    if (needsBlockBoundary && childParts.length && !boundaryAlreadyPresent) {
      parts.push({ type: "text", text: "\n" });
    }
    parts.push(...childParts);
  }
  return parts;
};

const readEditorParts = (editor: HTMLElement | null) => {
  if (!editor) {
    return [];
  }
  return stripBrowserFillerContent(mergeTextParts(readPartsFromNode(editor)));
};

const arePromptPartsEqual = (
  left: readonly GenerationPromptPart[],
  right: readonly GenerationPromptPart[],
) => {
  const normalizedLeft = stripBrowserFillerContent(mergeTextParts([...left]));
  const normalizedRight = stripBrowserFillerContent(mergeTextParts([...right]));

  return (
    normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((part, index) => {
      const other = normalizedRight[index];
      return part.type === "text"
        ? other?.type === "text" && other.text === part.text
        : other?.type === "reference" && other.referenceId === part.referenceId;
    })
  );
};

const getPromptUnits = (parts: readonly GenerationPromptPart[]) =>
  stripBrowserFillerContent(mergeTextParts([...parts])).flatMap((part) =>
    part.type === "text"
      ? part.text.split("").map((character) => `text:${character}`)
      : [`reference:${part.referenceId}`],
  );

const getReferencePartCount = (parts: readonly GenerationPromptPart[]) =>
  parts.reduce((count, part) => count + (part.type === "reference" ? 1 : 0), 0);

const getCaretOffsetAfterDomChange = (
  previousParts: readonly GenerationPromptPart[],
  nextParts: readonly GenerationPromptPart[],
  browserCaretOffset: number | null,
) => {
  const previousUnits = getPromptUnits(previousParts);
  const nextUnits = getPromptUnits(nextParts);

  if (
    nextUnits.length >= previousUnits.length ||
    (browserCaretOffset !== null && browserCaretOffset > 0)
  ) {
    return browserCaretOffset;
  }

  let commonPrefixLength = 0;
  while (
    commonPrefixLength < nextUnits.length &&
    previousUnits[commonPrefixLength] === nextUnits[commonPrefixLength]
  ) {
    commonPrefixLength += 1;
  }

  return commonPrefixLength || browserCaretOffset;
};

const areReferenceDecorationsEqual = (
  left: readonly GenerationPromptReferencePayload[],
  right: readonly GenerationPromptReferencePayload[],
) =>
  left.length === right.length &&
  left.every((reference, index) => {
    const other = right[index];
    return (
      other?.id === reference.id &&
      other.label === reference.label &&
      other.thumbnailDataUrl === reference.thumbnailDataUrl
    );
  });

const getReferenceDecorationsForParts = (
  parts: readonly GenerationPromptPart[],
  references: readonly GenerationPromptReferencePayload[],
) => {
  const referenceIds = new Set(
    parts.flatMap((part) =>
      part.type === "reference" ? [part.referenceId] : [],
    ),
  );
  return references.filter((reference) => referenceIds.has(reference.id));
};

const arePendingReferenceDecorationsEqual = (
  left: GenerationReferencePayload | null,
  right: GenerationReferencePayload | null,
) => {
  if (!left || !right) {
    return left === right;
  }

  return (
    getPendingReferenceLabel(left) === getPendingReferenceLabel(right) &&
    getPendingThumbnail(left) === getPendingThumbnail(right)
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

const insertPlainTextAtSelection = (editor: HTMLElement, text: string) => {
  const selection = window.getSelection();
  const currentRange =
    selection?.rangeCount &&
    editor.contains(selection.getRangeAt(0).startContainer)
      ? selection.getRangeAt(0)
      : null;
  const range = currentRange?.cloneRange() ?? document.createRange();

  if (!currentRange) {
    range.selectNodeContents(editor);
    range.collapse(false);
  }

  range.deleteContents();
  const textNode = document.createTextNode(text);
  range.insertNode(textNode);
  range.setStartAfter(textNode);
  range.collapse(true);
  selection?.removeAllRanges();
  selection?.addRange(range);
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
    return copy.generateDialog.pendingImage;
  }
  return copy.generateDialog.pendingAnnotatedImage;
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
    const compositionCommitPendingRef = useRef(false);
    const caretRestoreFrameRef = useRef<number | null>(null);
    const deferredExternalPartsRef = useRef<GenerationPromptPart[] | null>(
      null,
    );
    const observedResetKeyRef = useRef(resetKey);
    const renderedReferencesRef = useRef<
      GenerationPromptReferencePayload[] | null
    >(null);
    const renderedPendingReferenceRef =
      useRef<GenerationReferencePayload | null>(null);

    const clearScheduledCaretRestore = () => {
      if (caretRestoreFrameRef.current === null) {
        return;
      }

      window.cancelAnimationFrame(caretRestoreFrameRef.current);
      caretRestoreFrameRef.current = null;
    };

    useEffect(() => {
      const resetChanged = observedResetKeyRef.current !== resetKey;
      observedResetKeyRef.current = resetKey;
      if (composingRef.current || compositionCommitPendingRef.current) {
        if (resetChanged) {
          deferredExternalPartsRef.current = parts;
        }
        return;
      }

      deferredExternalPartsRef.current = null;
      setLocalParts(parts);
    }, [parts, resetKey]);

    useEffect(
      () => () => {
        if (compositionCommitTimerRef.current !== null) {
          window.clearTimeout(compositionCommitTimerRef.current);
        }
        if (caretRestoreFrameRef.current !== null) {
          window.cancelAnimationFrame(caretRestoreFrameRef.current);
        }
      },
      [],
    );

    useLayoutEffect(() => {
      const editor = editorRef.current;
      if (composingRef.current || compositionCommitPendingRef.current) {
        return;
      }
      const contentMatches = arePromptPartsEqual(
        readEditorParts(editor),
        localParts,
      );
      const decorationCaretOffset = contentMatches
        ? getCaretOffset(editor)
        : null;
      const currentReferenceDecorations = getReferenceDecorationsForParts(
        localParts,
        references,
      );
      const decorationsMatch =
        renderedReferencesRef.current !== null &&
        areReferenceDecorationsEqual(
          renderedReferencesRef.current,
          currentReferenceDecorations,
        ) &&
        arePendingReferenceDecorationsEqual(
          renderedPendingReferenceRef.current,
          pendingReference,
        );
      if (contentMatches && decorationsMatch) {
        restoreCaretOffset(editor, restoreOffsetRef.current);
        restoreOffsetRef.current = null;
        return;
      }

      renderEditorContent({
        editor,
        parts: localParts,
        references,
        pendingReference,
      });
      renderedReferencesRef.current = currentReferenceDecorations;
      renderedPendingReferenceRef.current = pendingReference;
      restoreCaretOffset(
        editor,
        restoreOffsetRef.current ?? decorationCaretOffset,
      );
      restoreOffsetRef.current = null;
    }, [localParts, pendingReference, references, resetKey]);

    const commitDomChange = () => {
      clearScheduledCaretRestore();
      if (composingRef.current) {
        return;
      }

      const caretOffset = getCaretOffset(editorRef.current);
      const nextParts = readEditorParts(editorRef.current);
      const nextCaretOffset = getCaretOffsetAfterDomChange(
        localParts,
        nextParts,
        caretOffset,
      );
      const referenceWasDeleted =
        getReferencePartCount(nextParts) < getReferencePartCount(localParts);
      renderedReferencesRef.current = getReferenceDecorationsForParts(
        nextParts,
        references,
      );
      restoreOffsetRef.current = nextCaretOffset;
      if (nextCaretOffset !== null && referenceWasDeleted) {
        caretRestoreFrameRef.current = window.requestAnimationFrame(() => {
          caretRestoreFrameRef.current = null;
          restoreCaretOffset(editorRef.current, nextCaretOffset);
        });
      }
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

    const finishCompositionCommit = () => {
      compositionCommitPendingRef.current = false;
      const deferredExternalParts = deferredExternalPartsRef.current;
      deferredExternalPartsRef.current = null;
      if (deferredExternalParts) {
        setLocalParts(deferredExternalParts);
      } else {
        commitDomChange();
      }
      setIsComposing(false);
    };

    const handleInput = () => {
      clearScheduledCompositionCommit();
      if (!composingRef.current && compositionCommitPendingRef.current) {
        finishCompositionCommit();
        return;
      }
      commitDomChange();
      if (!composingRef.current) {
        setIsComposing(false);
      }
    };

    const handleCompositionStart = (
      _event: CompositionEvent<HTMLDivElement>,
    ) => {
      clearScheduledCompositionCommit();
      clearScheduledCaretRestore();
      compositionCommitPendingRef.current = false;
      deferredExternalPartsRef.current = null;
      composingRef.current = true;
      setIsComposing(true);
    };

    const handleCompositionEnd = (_event: CompositionEvent<HTMLDivElement>) => {
      composingRef.current = false;
      compositionCommitPendingRef.current = true;
      compositionCommitTimerRef.current = window.setTimeout(() => {
        compositionCommitTimerRef.current = null;
        finishCompositionCommit();
      }, 0);
    };

    const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      event.nativeEvent.stopImmediatePropagation?.();
      const editor = editorRef.current;
      if (!editor) {
        return;
      }

      const plainText = event.clipboardData
        .getData("text/plain")
        .replace(/\r\n?/g, "\n");
      const insertedWithNativeHistory =
        typeof document.execCommand === "function" &&
        document.execCommand("insertText", false, plainText);
      if (!insertedWithNativeHistory) {
        insertPlainTextAtSelection(editor, plainText);
        commitDomChange();
      }
    };

    useImperativeHandle(ref, () => ({
      focus: () => editorRef.current?.focus(),
      getParts: () => readEditorParts(editorRef.current),
      insertReference: (referenceId: string) => {
        clearScheduledCaretRestore();
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
        aria-placeholder={placeholder}
        aria-multiline="true"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={handleInput}
        onPaste={handlePaste}
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
