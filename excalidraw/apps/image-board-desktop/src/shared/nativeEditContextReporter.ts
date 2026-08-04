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

const isNativeTextEditControl = (
  target: EventTarget | null,
): target is HTMLInputElement | HTMLTextAreaElement =>
  target instanceof HTMLTextAreaElement ||
  (target instanceof HTMLInputElement &&
    !NON_TEXT_INPUT_TYPES.has(target.type));

export const installNativeEditContextReporter = (
  report: (nativeTextContext: boolean) => void,
) => {
  const reportTarget = (target: EventTarget | null) => {
    report(isNativeTextEditControl(target));
  };
  const handleInteraction = (event: Event) => {
    reportTarget(event.target);
  };

  reportTarget(document.activeElement);
  document.addEventListener("focus", handleInteraction, true);
  document.addEventListener("pointerdown", handleInteraction, true);

  return () => {
    document.removeEventListener("focus", handleInteraction, true);
    document.removeEventListener("pointerdown", handleInteraction, true);
    report(false);
  };
};
