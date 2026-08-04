import { describe, expect, it } from "vitest";

import { resolveDesktopEditShortcut } from "./desktopEditShortcut";

describe("resolveDesktopEditShortcut", () => {
  it("maps macOS Command-Z shortcuts to undo and redo", () => {
    expect(
      resolveDesktopEditShortcut(
        {
          type: "keyDown",
          key: "z",
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
          meta: false,
          control: true,
          shift: false,
          alt: false,
        },
        "win32",
      ),
    ).toBe("edit-select-all");
  });

  it("ignores unrelated and modified key events", () => {
    expect(
      resolveDesktopEditShortcut(
        {
          type: "keyUp",
          key: "z",
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
