import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const getFocusableElements = (container: HTMLElement) =>
  Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((element) => !element.hasAttribute("hidden"));

const isTopModal = (container: HTMLElement) => {
  const modals = Array.from(
    document.querySelectorAll<HTMLElement>('[data-corestudio-modal="true"]'),
  );
  return modals.at(-1) === container;
};

export const useModalFocus = <T extends HTMLElement>({
  open,
  onEscape,
}: {
  open: boolean;
  onEscape: () => void;
}): RefObject<T | null> => {
  const modalRef = useRef<T>(null);
  const onEscapeRef = useRef(onEscape);

  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!open || !modalRef.current) {
      return;
    }

    const container = modalRef.current;
    const returnFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const focusableElements = getFocusableElements(container);
    const initialFocus =
      container.querySelector<HTMLElement>("[data-modal-autofocus]") ??
      focusableElements[0] ??
      container;

    if (isTopModal(container)) {
      initialFocus.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTopModal(container)) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onEscapeRef.current();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const currentFocusableElements = getFocusableElements(container);
      if (currentFocusableElements.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = currentFocusableElements[0]!;
      const last = currentFocusableElements.at(-1)!;
      const activeElement = document.activeElement;

      if (!container.contains(activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      if (returnFocus?.isConnected) {
        returnFocus.focus();
      }
    };
  }, [open]);

  return modalRef;
};
