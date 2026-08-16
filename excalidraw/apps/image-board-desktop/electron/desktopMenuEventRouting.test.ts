import { describe, expect, it } from "vitest";

import { resolveDesktopMenuEventTarget } from "./desktopMenuEventRouting";

describe("desktop menu event routing", () => {
  it.each([
    "inspect-project-health",
    "repair-project-thumbnails",
    "clean-project-cache",
    "import-images",
    "generate-image",
    "provider-settings",
    "set-agent-bridge-enabled",
    "reveal-project",
  ] as const)("routes %s to the active project renderer", (action) => {
    expect(resolveDesktopMenuEventTarget({ action })).toBe("active-project");
  });

  it.each(["app-settings", "show-about"] as const)(
    "routes %s to the active project with a shell fallback",
    (action) => {
      expect(resolveDesktopMenuEventTarget({ action })).toBe(
        "active-project-or-shell",
      );
    },
  );

  it.each([
    "edit-undo",
    "edit-redo",
    "edit-select-all",
    "edit-cut",
    "edit-copy",
    "edit-paste",
  ] as const)(
    "routes %s to the active project with a shell fallback",
    (action) => {
      expect(resolveDesktopMenuEventTarget({ action })).toBe(
        "active-project-or-shell",
      );
    },
  );

  it.each(["project-opened", "project-open-failed"] as const)(
    "routes %s to the shell renderer",
    (action) => {
      expect(resolveDesktopMenuEventTarget({ action })).toBe("shell");
    },
  );
});
