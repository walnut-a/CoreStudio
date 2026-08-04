import type { DesktopMenuAction } from "../src/shared/desktopBridgeTypes";

interface DesktopEditInput {
  type: string;
  key: string;
  meta: boolean;
  control: boolean;
  shift: boolean;
  alt: boolean;
}

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

  const key = input.key.toLowerCase();
  if (key === "z") {
    return input.shift ? "edit-redo" : "edit-undo";
  }
  if (key === "a" && !input.shift) {
    return "edit-select-all";
  }
  if (platform !== "darwin" && key === "y" && !input.shift) {
    return "edit-redo";
  }
  return null;
};
