import { describe, expect, it, vi } from "vitest";

import { createDesktopEditContextController } from "./desktopEditContext";

const createTarget = (id = 1) => ({
  copy: vi.fn(),
  cut: vi.fn(),
  id,
  isDestroyed: vi.fn(() => false),
  paste: vi.fn(),
  redo: vi.fn(),
  selectAll: vi.fn(),
  undo: vi.fn(),
});

describe("createDesktopEditContextController", () => {
  it("runs native editing only for a reported WebContents", () => {
    const controller = createDesktopEditContextController();
    const nativeTarget = createTarget(1);
    const customTarget = createTarget(2);

    controller.setNativeTextContext(nativeTarget, true);

    expect(controller.runAction(nativeTarget, "edit-select-all")).toBe(true);
    expect(nativeTarget.selectAll).toHaveBeenCalledOnce();
    expect(controller.runAction(customTarget, "edit-select-all")).toBe(false);
    expect(customTarget.selectAll).not.toHaveBeenCalled();
  });

  it.each([
    ["edit-undo", "undo"],
    ["edit-redo", "redo"],
    ["edit-select-all", "selectAll"],
    ["edit-cut", "cut"],
    ["edit-copy", "copy"],
    ["edit-paste", "paste"],
  ] as const)("runs %s through the native editing API", (action, method) => {
    const controller = createDesktopEditContextController();
    const target = createTarget();
    controller.setNativeTextContext(target, true);

    expect(controller.runAction(target, action)).toBe(true);
    expect(target[method]).toHaveBeenCalledOnce();
  });

  it("returns custom editors to the renderer command path", () => {
    const controller = createDesktopEditContextController();
    const target = createTarget();

    expect(controller.runAction(target, "edit-redo")).toBe(false);
    expect(target.redo).not.toHaveBeenCalled();
  });

  it("injects paste through WebContents for custom editors", () => {
    const controller = createDesktopEditContextController();
    const target = createTarget();

    expect(controller.runAction(target, "edit-paste")).toBe(true);
    expect(target.paste).toHaveBeenCalledOnce();
  });

  it("forgets native state on lifecycle reset and destruction", () => {
    const controller = createDesktopEditContextController();
    const target = createTarget();
    controller.setNativeTextContext(target, true);

    controller.setNativeTextContext(target, false);
    expect(controller.runAction(target, "edit-undo")).toBe(false);

    controller.setNativeTextContext(target, true);
    controller.forget(target);
    expect(controller.runAction(target, "edit-undo")).toBe(false);
  });

  it("does not edit destroyed WebContents", () => {
    const controller = createDesktopEditContextController();
    const target = createTarget();
    target.isDestroyed.mockReturnValue(true);
    controller.setNativeTextContext(target, true);

    expect(controller.runAction(target, "edit-undo")).toBe(false);
    expect(target.undo).not.toHaveBeenCalled();
  });

  it("rejects malformed renderer context updates", () => {
    const controller = createDesktopEditContextController();
    const target = createTarget();

    expect(() => controller.setNativeTextContext(target, "yes")).toThrow(
      "Native edit context must be a boolean.",
    );
  });
});
