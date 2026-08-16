import type { WebContents } from "electron";

import type { DesktopMenuAction } from "../src/shared/desktopBridgeTypes";

type DesktopEditAction = Extract<
  DesktopMenuAction,
  | "edit-undo"
  | "edit-redo"
  | "edit-cut"
  | "edit-copy"
  | "edit-paste"
  | "edit-select-all"
>;

type DesktopEditTarget = Pick<
  WebContents,
  | "copy"
  | "cut"
  | "id"
  | "isDestroyed"
  | "paste"
  | "redo"
  | "selectAll"
  | "undo"
>;

const isDesktopEditAction = (
  action: DesktopMenuAction | null,
): action is DesktopEditAction =>
  action === "edit-undo" ||
  action === "edit-redo" ||
  action === "edit-cut" ||
  action === "edit-copy" ||
  action === "edit-paste" ||
  action === "edit-select-all";

export const createDesktopEditContextController = () => {
  const nativeTextWebContentsIds = new Set<number>();

  const setNativeTextContext = (
    target: DesktopEditTarget,
    nativeTextContext: unknown,
  ) => {
    if (typeof nativeTextContext !== "boolean") {
      throw new Error("Native edit context must be a boolean.");
    }
    if (nativeTextContext) {
      nativeTextWebContentsIds.add(target.id);
      return;
    }
    nativeTextWebContentsIds.delete(target.id);
  };

  const runAction = (
    target: DesktopEditTarget,
    action: DesktopMenuAction | null,
  ) => {
    if (!isDesktopEditAction(action) || target.isDestroyed()) {
      return false;
    }
    if (action === "edit-paste") {
      target.paste();
      return true;
    }
    if (!nativeTextWebContentsIds.has(target.id)) {
      return false;
    }
    if (action === "edit-undo") {
      target.undo();
    } else if (action === "edit-redo") {
      target.redo();
    } else if (action === "edit-cut") {
      target.cut();
    } else if (action === "edit-copy") {
      target.copy();
    } else {
      target.selectAll();
    }
    return true;
  };

  const forget = (target: DesktopEditTarget) => {
    nativeTextWebContentsIds.delete(target.id);
  };

  return {
    forget,
    runAction,
    setNativeTextContext,
  };
};
