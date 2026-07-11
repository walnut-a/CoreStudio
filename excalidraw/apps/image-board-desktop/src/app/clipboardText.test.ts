import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createPlainTextClipboardRendererActions,
  copyPlainTextToClipboard,
  copyPlainTextWithFailureMessage,
} from "./clipboardText";

const originalClipboard = navigator.clipboard;
const originalExecCommand = document.execCommand;

const setClipboard = (clipboard: Partial<Clipboard> | undefined) => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: clipboard,
  });
};

const setExecCommand = (
  execCommand: typeof document.execCommand | undefined,
) => {
  Object.defineProperty(document, "execCommand", {
    configurable: true,
    value: execCommand,
  });
};

afterEach(() => {
  setClipboard(originalClipboard);
  setExecCommand(originalExecCommand);
  vi.restoreAllMocks();
});

describe("copyPlainTextToClipboard", () => {
  it("uses navigator clipboard when it is available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText } as Partial<Clipboard>);
    setExecCommand(vi.fn());

    await expect(copyPlainTextToClipboard("提示词")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("提示词");
    expect(document.execCommand).not.toHaveBeenCalled();
  });

  it("falls back to execCommand when navigator clipboard fails", async () => {
    setClipboard({
      writeText: vi.fn().mockRejectedValue(new Error("denied")),
    } as Partial<Clipboard>);
    const execCommand = vi.fn().mockReturnValue(true);
    setExecCommand(execCommand);

    await expect(copyPlainTextToClipboard("提示词")).resolves.toBe(true);
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("returns false when both clipboard paths fail", async () => {
    setClipboard({
      writeText: vi.fn().mockRejectedValue(new Error("denied")),
    } as Partial<Clipboard>);
    setExecCommand(vi.fn().mockReturnValue(false));

    await expect(copyPlainTextToClipboard("提示词")).resolves.toBe(false);
  });
});

describe("copyPlainTextWithFailureMessage", () => {
  it("returns true without reporting an error when copying succeeds", async () => {
    const onError = vi.fn();

    await expect(
      copyPlainTextWithFailureMessage({
        text: "Agent Board 链接",
        failureMessage: "复制失败",
        copyText: vi.fn().mockResolvedValue(true),
        onError,
      }),
    ).resolves.toBe(true);

    expect(onError).not.toHaveBeenCalled();
  });

  it("reports the failure message when copying fails", async () => {
    const onError = vi.fn();

    await expect(
      copyPlainTextWithFailureMessage({
        text: "Agent Board 链接",
        failureMessage: "复制失败",
        copyText: vi.fn().mockResolvedValue(false),
        onError,
      }),
    ).resolves.toBe(false);

    expect(onError).toHaveBeenCalledWith("复制失败");
  });
});

describe("createPlainTextClipboardRendererActions", () => {
  it("creates a reusable copy handler with shared failure reporting", async () => {
    const onError = vi.fn();
    const copyText = vi.fn().mockResolvedValue(false);
    const actions = createPlainTextClipboardRendererActions({
      failureMessage: "复制失败",
      copyText,
      onError,
    });

    await expect(actions.copy("Agent Board 链接")).resolves.toBe(false);

    expect(copyText).toHaveBeenCalledWith("Agent Board 链接");
    expect(onError).toHaveBeenCalledWith("复制失败");
  });
});
