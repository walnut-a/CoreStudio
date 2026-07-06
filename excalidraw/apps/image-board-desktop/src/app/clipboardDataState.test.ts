import { describe, expect, it } from "vitest";

import type { ClipboardData } from "@excalidraw/excalidraw/clipboard";

import { hasClipboardFiles, isEmptyClipboardData } from "./clipboardDataState";

const createClipboardData = (
  patch: Partial<ClipboardData> = {},
): ClipboardData =>
  ({
    elements: [],
    files: {},
    mixedContent: [],
    text: "",
    errorMessage: null,
    ...patch,
  }) as ClipboardData;

describe("hasClipboardFiles", () => {
  it("detects whether clipboard binary files exist", () => {
    expect(hasClipboardFiles(undefined)).toBe(false);
    expect(hasClipboardFiles({})).toBe(false);
    expect(
      hasClipboardFiles({
        "file-1": {
          id: "file-1",
        },
      } as never),
    ).toBe(true);
  });
});

describe("isEmptyClipboardData", () => {
  it("treats blank clipboard data as empty", () => {
    expect(isEmptyClipboardData(createClipboardData())).toBe(true);
    expect(isEmptyClipboardData(createClipboardData({ text: "   " }))).toBe(
      true,
    );
  });

  it("treats every Excalidraw clipboard payload channel as non-empty", () => {
    expect(
      isEmptyClipboardData(createClipboardData({ elements: [{} as never] })),
    ).toBe(false);
    expect(
      isEmptyClipboardData(
        createClipboardData({
          files: {
            "file-1": {
              id: "file-1",
            },
          } as never,
        }),
      ),
    ).toBe(false);
    expect(
      isEmptyClipboardData(
        createClipboardData({ mixedContent: [{ type: "text" } as never] }),
      ),
    ).toBe(false);
    expect(
      isEmptyClipboardData(createClipboardData({ text: "copied text" })),
    ).toBe(false);
    expect(
      isEmptyClipboardData(createClipboardData({ errorMessage: "failed" })),
    ).toBe(false);
  });
});
