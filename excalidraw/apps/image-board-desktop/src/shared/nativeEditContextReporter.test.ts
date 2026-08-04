import { afterEach, describe, expect, it, vi } from "vitest";

import { installNativeEditContextReporter } from "./nativeEditContextReporter";

afterEach(() => {
  document.body.replaceChildren();
});

describe("installNativeEditContextReporter", () => {
  it("reports text inputs and textareas as native edit contexts", () => {
    const report = vi.fn();
    const input = document.createElement("input");
    const textarea = document.createElement("textarea");
    document.body.append(input, textarea);
    const dispose = installNativeEditContextReporter(report);

    input.focus();
    expect(report).toHaveBeenLastCalledWith(true);

    textarea.focus();
    expect(report).toHaveBeenLastCalledWith(true);

    dispose();
    expect(report).toHaveBeenLastCalledWith(false);
  });

  it("keeps non-text inputs and contenteditable elements on the custom path", () => {
    const report = vi.fn();
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    const editor = document.createElement("div");
    editor.contentEditable = "true";
    editor.tabIndex = 0;
    document.body.append(checkbox, editor);
    const dispose = installNativeEditContextReporter(report);

    checkbox.focus();
    expect(report).toHaveBeenLastCalledWith(false);

    editor.focus();
    expect(report).toHaveBeenLastCalledWith(false);

    dispose();
  });
});
