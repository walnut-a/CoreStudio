import { describe, expect, it, vi } from "vitest";

import { createDesktopEditContextController } from "./desktopEditContext";

const createTarget = (id = 1) => ({
  id,
  isDestroyed: vi.fn(() => false),
  redo: vi.fn(),
  selectAll: vi.fn(),
  undo: vi.fn(),
});

describe("createDesktopEditContextController", () => {
  it("runs native editing on the focused WebContents", () => {
    const controller = createDesktopEditContextController();
    const target = createTarget();

    controller.setNativeTextContext(target, true);

    expect(controller.runAction(target, "edit-select-all")).toBe(true);
    expect(target.selectAll).toHaveBeenCalledOnce();

    controller.setNativeTextContext(target, false);
    expect(controller.runAction(target, "edit-undo")).toBe(false);
    expect(target.undo).not.toHaveBeenCalled();
  });

  it.each([
    ["edit-undo", "undo"],
    ["edit-redo", "redo"],
    ["edit-select-all", "selectAll"],
  ] as const)("runs %s from a menu click", (action, method) => {
    const controller = createDesktopEditContextController();
    const target = createTarget();
    controller.setNativeTextContext(target, true);

    expect(controller.runAction(target, action)).toBe(true);
    expect(target[method]).toHaveBeenCalledOnce();
  });

  it("keeps custom editors on the renderer command path", () => {
    const controller = createDesktopEditContextController();
    const target = createTarget();

    expect(controller.runAction(target, "edit-redo")).toBe(false);
    expect(target.redo).not.toHaveBeenCalled();
  });

  it("rejects malformed renderer context updates", () => {
    const controller = createDesktopEditContextController();
    const target = createTarget();

    expect(() => controller.setNativeTextContext(target, "yes")).toThrow(
      "Native edit context must be a boolean.",
    );
  });
});
