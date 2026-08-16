import { describe, expect, it } from "vitest";

import { resolveDesktopEditShortcut } from "./desktopEditShortcut";

describe("resolveDesktopEditShortcut", () => {
  it("maps macOS Command-Z shortcuts to undo and redo", () => {
    expect(
      resolveDesktopEditShortcut(
        {
          type: "keyDown",
          key: "z",
          code: "KeyZ",
          meta: true,
          control: false,
          shift: false,
          alt: false,
        },
        "darwin",
      ),
    ).toBe("edit-undo");
    expect(
      resolveDesktopEditShortcut(
        {
          type: "keyDown",
          key: "z",
          code: "KeyZ",
          meta: true,
          control: false,
          shift: true,
          alt: false,
        },
        "darwin",
      ),
    ).toBe("edit-redo");
  });

  it("maps Control-Z and Control-Y outside macOS", () => {
    expect(
      resolveDesktopEditShortcut(
        {
          type: "keyDown",
          key: "z",
          code: "KeyZ",
          meta: false,
          control: true,
          shift: false,
          alt: false,
        },
        "win32",
      ),
    ).toBe("edit-undo");
    expect(
      resolveDesktopEditShortcut(
        {
          type: "keyDown",
          key: "y",
          code: "KeyY",
          meta: false,
          control: true,
          shift: false,
          alt: false,
        },
        "win32",
      ),
    ).toBe("edit-redo");
  });

  it("maps the platform select-all shortcut", () => {
    expect(
      resolveDesktopEditShortcut(
        {
          type: "keyDown",
          key: "a",
          code: "KeyA",
          meta: true,
          control: false,
          shift: false,
          alt: false,
        },
        "darwin",
      ),
    ).toBe("edit-select-all");
    expect(
      resolveDesktopEditShortcut(
        {
          type: "keyDown",
          key: "A",
          code: "KeyA",
          meta: false,
          control: true,
          shift: false,
          alt: false,
        },
        "win32",
      ),
    ).toBe("edit-select-all");
  });

  it.each([
    ["x", "KeyX", "edit-cut"],
    ["c", "KeyC", "edit-copy"],
    ["v", "KeyV", "edit-paste"],
  ] as const)("maps the platform %s shortcut", (key, code, action) => {
    expect(
      resolveDesktopEditShortcut(
        {
          type: "keyDown",
          key,
          code,
          meta: true,
          control: false,
          shift: false,
          alt: false,
        },
        "darwin",
      ),
    ).toBe(action);
  });

  it("falls back to the physical key code for non-Latin layouts", () => {
    expect(
      resolveDesktopEditShortcut(
        {
          type: "keyDown",
          key: "я",
          code: "KeyZ",
          meta: false,
          control: true,
          shift: false,
          alt: false,
        },
        "win32",
      ),
    ).toBe("edit-undo");
    expect(
      resolveDesktopEditShortcut(
        {
          type: "keyDown",
          key: "н",
          code: "KeyY",
          meta: false,
          control: true,
          shift: false,
          alt: false,
        },
        "linux",
      ),
    ).toBe("edit-redo");
    expect(
      resolveDesktopEditShortcut(
        {
          type: "keyDown",
          key: "ф",
          code: "KeyA",
          meta: false,
          control: true,
          shift: false,
          alt: false,
        },
        "linux",
      ),
    ).toBe("edit-select-all");
  });

  it("prefers a Latin key over its physical code on remapped layouts", () => {
    expect(
      resolveDesktopEditShortcut(
        {
          type: "keyDown",
          key: "z",
          code: "KeyY",
          meta: false,
          control: true,
          shift: false,
          alt: false,
        },
        "win32",
      ),
    ).toBe("edit-undo");
  });

  it("ignores unrelated and modified key events", () => {
    expect(
      resolveDesktopEditShortcut(
        {
          type: "keyUp",
          key: "z",
          code: "KeyZ",
          meta: true,
          control: false,
          shift: false,
          alt: false,
        },
        "darwin",
      ),
    ).toBeNull();
    expect(
      resolveDesktopEditShortcut(
        {
          type: "keyDown",
          key: "z",
          code: "KeyZ",
          meta: true,
          control: false,
          shift: false,
          alt: true,
        },
        "darwin",
      ),
    ).toBeNull();
    expect(
      resolveDesktopEditShortcut(
        {
          type: "keyDown",
          key: "a",
          code: "KeyA",
          meta: true,
          control: false,
          shift: true,
          alt: false,
        },
        "darwin",
      ),
    ).toBeNull();
  });
});
