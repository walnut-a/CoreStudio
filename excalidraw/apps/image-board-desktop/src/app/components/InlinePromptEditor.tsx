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

const readPartsFromNode = (node: Node): GenerationPromptPart[] => {
  if (node.nodeType === Node.TEXT_NODE) {
    return [{ type: "text", text: node.textContent || "" }];
  }

  if (isReferenceElement(node)) {
    return [{ type: "reference", referenceId: node.dataset.referenceId! }];
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
  return mergeTextParts(
    Array.from(editor.childNodes).flatMap(readPartsFromNode),
  );
};

const nodeTextLength = (node: Node): number => {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent?.length ?? 0;
  }
  if (isReferenceElement(node)) {
    return CHIP_TEXT_LENGTH;
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

const getPendingThumbnail = (reference: GenerationReferencePayload | null) => {
  const imageItem = reference?.items?.find((item) => item.thumbnailDataUrl);
  return imageItem?.thumbnailDataUrl ?? null;
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
      restoreCaretOffset(editorRef.current, restoreOffsetRef.current);
      restoreOffsetRef.current = null;
    }, [localParts]);

    const referenceMap = new Map(
      references.map((reference, index) => [
        reference.id,
        { reference, index },
      ]),
    );

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
    };

    const handleCompositionStart = (
      _event: CompositionEvent<HTMLDivElement>,
    ) => {
      clearScheduledCompositionCommit();
      composingRef.current = true;
    };

    const handleCompositionEnd = (_event: CompositionEvent<HTMLDivElement>) => {
      composingRef.current = false;
      compositionCommitTimerRef.current = window.setTimeout(() => {
        compositionCommitTimerRef.current = null;
        commitDomChange();
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
      !pendingReference &&
      (!localParts.length ||
        localParts.every((part) => part.type !== "reference" && !part.text));
    const pendingThumbnail = getPendingThumbnail(pendingReference);

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
      >
        {localParts.map((part, index) => {
          if (part.type === "text") {
            return <span key={`text-${index}`}>{part.text}</span>;
          }

          const entry = referenceMap.get(part.referenceId);
          if (!entry) {
            return null;
          }

          const thumbnail = entry.reference.thumbnailDataUrl;
          return (
            <span
              key={`reference-${part.referenceId}-${index}`}
              className={[
                "generate-composer__reference-chip",
                "generate-composer__reference-chip--image",
                thumbnail
                  ? "generate-composer__reference-chip--with-thumbnail"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              contentEditable={false}
              data-reference-id={part.referenceId}
              title={getReferenceLabel(entry.reference, entry.index)}
            >
              {thumbnail ? (
                <span className="generate-composer__reference-chip-thumbnail">
                  <img
                    src={thumbnail}
                    alt={`${getReferenceLabel(
                      entry.reference,
                      entry.index,
                    )} 缩略图`}
                    draggable={false}
                  />
                </span>
              ) : null}
              <span className="generate-composer__reference-chip-index">
                {entry.index + 1}
              </span>
              <span className="generate-composer__reference-chip-label">
                {entry.reference.label}
              </span>
            </span>
          );
        })}
        {pendingReference ? (
          <span
            className={[
              "generate-composer__reference-chip",
              "generate-composer__reference-chip--pending",
              pendingThumbnail
                ? "generate-composer__reference-chip--with-thumbnail"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            contentEditable={false}
            data-pending-reference="true"
            title="待确认的参考图"
          >
            {pendingThumbnail ? (
              <span className="generate-composer__reference-chip-thumbnail">
                <img
                  src={pendingThumbnail}
                  alt="待确认参考图缩略图"
                  draggable={false}
                />
              </span>
            ) : null}
            <span className="generate-composer__reference-chip-index">+</span>
            <span className="generate-composer__reference-chip-label">
              图片
            </span>
          </span>
        ) : null}
      </div>
    );
  },
);

InlinePromptEditor.displayName = "InlinePromptEditor";
