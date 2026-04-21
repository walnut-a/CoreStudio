import { useEffect } from "react";
import type { RefObject } from "react";

const getSelectedTextInside = (container: HTMLElement) => {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return "";
  }

  const range = selection.getRangeAt(0);
  if (
    !container.contains(range.startContainer) ||
    !container.contains(range.endContainer)
  ) {
    return "";
  }

  return selection.toString();
};

export const usePlainTextCopyWithin = (
  containerRef: RefObject<HTMLElement | null>,
) => {
  useEffect(() => {
    const handleDocumentCopy = (event: ClipboardEvent) => {
      const container = containerRef.current;
      if (!container || !event.clipboardData) {
        return;
      }

      const selectedText = getSelectedTextInside(container);
      if (!selectedText.trim()) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      event.clipboardData.setData("text/plain", selectedText);
    };

    document.addEventListener("copy", handleDocumentCopy, true);
    return () => {
      document.removeEventListener("copy", handleDocumentCopy, true);
    };
  }, [containerRef]);
};
