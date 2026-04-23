import { afterEach, describe, expect, it, vi } from "vitest";

import { copyPlainTextToClipboard } from "./clipboardText";

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
