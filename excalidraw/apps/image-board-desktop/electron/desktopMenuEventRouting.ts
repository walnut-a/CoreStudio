import type {
  DesktopMenuAction,
  DesktopMenuEvent,
} from "../src/shared/desktopBridgeTypes";

export type DesktopMenuEventTarget =
  | "shell"
  | "active-project"
  | "active-project-or-shell";

const PROJECT_RENDERER_MENU_ACTIONS = new Set<DesktopMenuAction>([
  "inspect-project-health",
  "repair-project-thumbnails",
  "clean-project-cache",
  "import-images",
  "generate-image",
  "provider-settings",
  "set-agent-bridge-enabled",
  "reveal-project",
]);

const APP_GLOBAL_MENU_ACTIONS = new Set<DesktopMenuAction>([
  "app-settings",
  "show-about",
  "edit-undo",
  "edit-redo",
]);

export const resolveDesktopMenuEventTarget = (
  event: DesktopMenuEvent,
): DesktopMenuEventTarget => {
  if (PROJECT_RENDERER_MENU_ACTIONS.has(event.action)) {
    return "active-project";
  }
  if (APP_GLOBAL_MENU_ACTIONS.has(event.action)) {
    return "active-project-or-shell";
  }
  return "shell";
};
