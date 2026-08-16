const NON_TEXT_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

export const isNativeTextEditControl = (
  target: EventTarget | null,
): target is HTMLInputElement | HTMLTextAreaElement =>
  target instanceof HTMLTextAreaElement ||
  (target instanceof HTMLInputElement &&
    !NON_TEXT_INPUT_TYPES.has(target.type));

export const installNativeEditContextReporter = (
  report: (nativeTextContext: boolean) => void,
) => {
  let activeNativeControl: HTMLInputElement | HTMLTextAreaElement | null = null;
  let lastReportedContext: boolean | undefined;

  const activeControlObserver = new MutationObserver(() => {
    if (
      activeNativeControl &&
      (!activeNativeControl.isConnected ||
        document.activeElement !== activeNativeControl)
    ) {
      syncFromActiveElement();
    }
  });

  const syncFromActiveElement = () => {
    const nextNativeControl = isNativeTextEditControl(document.activeElement)
      ? document.activeElement
      : null;

    if (activeNativeControl !== nextNativeControl) {
      activeNativeControl = nextNativeControl;
      activeControlObserver.disconnect();
      if (activeNativeControl) {
        activeControlObserver.observe(document, {
          childList: true,
          subtree: true,
        });
      }
    }

    const nextContext = activeNativeControl !== null;
    if (lastReportedContext !== nextContext) {
      lastReportedContext = nextContext;
      report(nextContext);
    }
  };

  syncFromActiveElement();
  document.addEventListener("focus", syncFromActiveElement, true);
  document.addEventListener("blur", syncFromActiveElement, true);

  return () => {
    document.removeEventListener("focus", syncFromActiveElement, true);
    document.removeEventListener("blur", syncFromActiveElement, true);
    activeControlObserver.disconnect();
    activeNativeControl = null;
    report(false);
  };
};
