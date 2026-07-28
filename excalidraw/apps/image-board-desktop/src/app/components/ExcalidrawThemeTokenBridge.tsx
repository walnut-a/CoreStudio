import { useLayoutEffect, useRef, type RefObject } from "react";

const EXCALIDRAW_THEME_TOKENS = [
  "--text-primary-color",
  "--island-bg-color",
  "--island-bg-color-alt",
  "--default-bg-color",
  "--default-border-color",
  "--dialog-border-color",
  "--input-bg-color",
  "--input-border-color",
  "--input-hover-bg-color",
  "--input-label-color",
  "--button-hover-bg",
  "--button-active-bg",
  "--button-active-border",
  "--shadow-island",
  "--shadow-island-stronger",
  "--modal-shadow",
  "--color-primary",
  "--color-primary-hover",
  "--color-primary-darkest",
  "--color-icon-white",
  "--color-surface-high",
  "--color-surface-low",
  "--color-surface-lowest",
  "--color-surface-mid",
  "--color-surface-primary-container",
  "--color-on-surface",
  "--color-on-primary-container",
  "--color-brand-active",
  "--color-gray-60",
  "--color-gray-70",
  "--color-border-outline-variant",
  "--color-danger-background",
  "--color-danger-darker",
  "--color-danger-color",
  "--color-warning-background",
  "--color-warning-dark",
  "--color-warning-color",
] as const;

interface ExcalidrawThemeTokenBridgeProps {
  targetRef: RefObject<HTMLElement | null>;
}

export const ExcalidrawThemeTokenBridge = ({
  targetRef,
}: ExcalidrawThemeTokenBridgeProps) => {
  const markerRef = useRef<HTMLSpanElement | null>(null);

  useLayoutEffect(() => {
    const source = markerRef.current?.closest<HTMLElement>(".excalidraw");
    const target = targetRef.current;
    if (!source || !target) {
      return;
    }

    const syncTokens = () => {
      const computedStyle = window.getComputedStyle(source);
      for (const token of EXCALIDRAW_THEME_TOKENS) {
        const value = computedStyle.getPropertyValue(token);
        if (value) {
          target.style.setProperty(token, value);
        }
      }
    };

    syncTokens();
    const observer = new MutationObserver(syncTokens);
    observer.observe(source, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    return () => {
      observer.disconnect();
      for (const token of EXCALIDRAW_THEME_TOKENS) {
        target.style.removeProperty(token);
      }
    };
  }, [targetRef]);

  return (
    <span
      ref={markerRef}
      data-testid="excalidraw-theme-token-bridge"
      aria-hidden="true"
      hidden
    />
  );
};
