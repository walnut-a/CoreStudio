export type DesktopEditCommand = "undo" | "redo";

export const DESKTOP_EDIT_COMMAND_EVENT = "corestudio:desktop-edit-command";

let registeredEditTarget: HTMLElement | null = null;

export const rememberDesktopEditCommandTarget = (target: HTMLElement) => {
  registeredEditTarget = target;
};

export const forgetDesktopEditCommandTarget = (target: HTMLElement) => {
  if (registeredEditTarget === target) {
    registeredEditTarget = null;
  }
};

const getEditCommandKeyboardInit = (
  command: DesktopEditCommand,
): KeyboardEventInit => {
  const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
  return {
    bubbles: true,
    cancelable: true,
    key: "z",
    metaKey: isMac,
    ctrlKey: !isMac,
    shiftKey: command === "redo",
  };
};

export const dispatchDesktopEditCommand = (
  command: DesktopEditCommand,
  lastFocusedElement?: HTMLElement | null,
): void => {
  const activeElement =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  const target =
    activeElement && activeElement !== document.body
      ? activeElement
      : lastFocusedElement?.isConnected
      ? lastFocusedElement
      : registeredEditTarget?.isConnected
      ? registeredEditTarget
      : document.body;
  const desktopEvent = new CustomEvent(DESKTOP_EDIT_COMMAND_EVENT, {
    bubbles: true,
    cancelable: true,
    detail: { command },
  });
  target.dispatchEvent(desktopEvent);
  if (desktopEvent.defaultPrevented) {
    return;
  }

  const event = new KeyboardEvent(
    "keydown",
    getEditCommandKeyboardInit(command),
  );

  target.dispatchEvent(event);
  if (!event.defaultPrevented) {
    document.execCommand?.(command);
  }
};
