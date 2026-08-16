import type { DesktopMenuAction } from "../src/shared/desktopBridgeTypes";

interface DesktopEditInput {
  type: string;
  key: string;
  code: string;
  meta: boolean;
  control: boolean;
  shift: boolean;
  alt: boolean;
}

const matchesEditKey = (input: DesktopEditInput, key: string, code: string) => {
  const normalizedKey = input.key.toLowerCase();
  if (normalizedKey === key) {
    return true;
  }
  return !/^[a-z]$/.test(normalizedKey) && input.code === code;
};

export const resolveDesktopEditShortcut = (
  input: DesktopEditInput,
  platform: NodeJS.Platform,
): DesktopMenuAction | null => {
  if (input.type !== "keyDown" || input.alt) {
    return null;
  }

  const hasCommandModifier = platform === "darwin" ? input.meta : input.control;
  if (!hasCommandModifier) {
    return null;
  }

  if (matchesEditKey(input, "z", "KeyZ")) {
    return input.shift ? "edit-redo" : "edit-undo";
  }
  if (matchesEditKey(input, "a", "KeyA") && !input.shift) {
    return "edit-select-all";
  }
  if (!input.shift) {
    if (matchesEditKey(input, "x", "KeyX")) {
      return "edit-cut";
    }
    if (matchesEditKey(input, "c", "KeyC")) {
      return "edit-copy";
    }
    if (matchesEditKey(input, "v", "KeyV")) {
      return "edit-paste";
    }
  }
  if (
    platform !== "darwin" &&
    matchesEditKey(input, "y", "KeyY") &&
    !input.shift
  ) {
    return "edit-redo";
  }
  return null;
};
