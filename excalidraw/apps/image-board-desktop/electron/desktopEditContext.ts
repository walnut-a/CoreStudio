import type { WebContents } from "electron";

import type { DesktopMenuAction } from "../src/shared/desktopBridgeTypes";

type DesktopEditAction = Extract<
  DesktopMenuAction,
  "edit-undo" | "edit-redo" | "edit-select-all"
>;

type DesktopEditTarget = Pick<
  WebContents,
  "id" | "isDestroyed" | "redo" | "selectAll" | "undo"
>;

const isDesktopEditAction = (
  action: DesktopMenuAction | null,
): action is DesktopEditAction =>
  action === "edit-undo" ||
  action === "edit-redo" ||
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
    if (
      !nativeTextWebContentsIds.has(target.id) ||
      !isDesktopEditAction(action) ||
      target.isDestroyed()
    ) {
      return false;
    }
    if (action === "edit-undo") {
      target.undo();
    } else if (action === "edit-redo") {
      target.redo();
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
