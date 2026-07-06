import { describe, expect, it } from "vitest";

import { getGenerateComposerKeyboardAction } from "./generateComposerKeyboard";

describe("getGenerateComposerKeyboardAction", () => {
  it("maps primary select-all shortcuts to select-all without treating alt shortcuts as editor commands", () => {
    expect(
      getGenerateComposerKeyboardAction({
        key: "a",
        metaKey: true,
      }),
    ).toBe("select-all");

    expect(
      getGenerateComposerKeyboardAction({
        key: "A",
        ctrlKey: true,
      }),
    ).toBe("select-all");

    expect(
      getGenerateComposerKeyboardAction({
        key: "a",
        metaKey: true,
        altKey: true,
      }),
    ).toBe("none");
  });

  it("submits plain Enter and preserves composition or multiline input chords", () => {
    expect(
      getGenerateComposerKeyboardAction({
        key: "Enter",
      }),
    ).toBe("submit");

    expect(
      getGenerateComposerKeyboardAction({
        key: "Enter",
        isComposing: true,
      }),
    ).toBe("none");

    expect(
      getGenerateComposerKeyboardAction({
        key: "Enter",
        shiftKey: true,
      }),
    ).toBe("none");

    expect(
      getGenerateComposerKeyboardAction({
        key: "Enter",
        altKey: true,
      }),
    ).toBe("none");
  });
});
