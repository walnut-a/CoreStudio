import { afterEach, describe, expect, it, vi } from "vitest";

import {
  dispatchDesktopEditCommand,
  forgetDesktopEditCommandTarget,
  rememberDesktopEditCommandTarget,
} from "./desktopEditCommand";

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe("dispatchDesktopEditCommand", () => {
  it("dispatches undo and redo to the focused editor first", () => {
    const editor = document.createElement("div");
    editor.tabIndex = 0;
    document.body.append(editor);
    editor.focus();
    const received: Array<{
      key: string;
      metaKey: boolean;
      ctrlKey: boolean;
      shiftKey: boolean;
    }> = [];
    editor.addEventListener("keydown", (event) => {
      received.push({
        key: event.key,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
      });
      event.preventDefault();
    });
    const execCommand = vi.fn();
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });

    dispatchDesktopEditCommand("undo");
    dispatchDesktopEditCommand("redo");

    const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
    expect(received).toEqual([
      {
        key: "z",
        metaKey: isMac,
        ctrlKey: !isMac,
        shiftKey: false,
      },
      {
        key: "z",
        metaKey: isMac,
        ctrlKey: !isMac,
        shiftKey: true,
      },
    ]);
    expect(execCommand).not.toHaveBeenCalled();
  });

  it("falls back to the browser edit command when no editor handles it", () => {
    const input = document.createElement("input");
    document.body.append(input);
    input.focus();
    const execCommand = vi.fn();
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });

    dispatchDesktopEditCommand("undo");

    expect(execCommand).toHaveBeenCalledWith("undo");
  });

  it("uses the last focused editor when the native menu temporarily owns focus", () => {
    const editor = document.createElement("div");
    editor.tabIndex = 0;
    document.body.append(editor);
    editor.focus();
    const received = vi.fn((event: KeyboardEvent) => {
      event.preventDefault();
    });
    editor.addEventListener("keydown", received);
    editor.blur();
    const execCommand = vi.fn();
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });

    dispatchDesktopEditCommand("undo", editor);

    expect(received).toHaveBeenCalledOnce();
    expect(execCommand).not.toHaveBeenCalled();
  });

  it("uses the editor's registered target when AX focus events are unavailable", () => {
    const editor = document.createElement("div");
    document.body.append(editor);
    const received = vi.fn((event: KeyboardEvent) => {
      event.preventDefault();
    });
    editor.addEventListener("keydown", received);
    rememberDesktopEditCommandTarget(editor);

    dispatchDesktopEditCommand("undo");

    expect(received).toHaveBeenCalledOnce();
    forgetDesktopEditCommandTarget(editor);
  });
});
