import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

type PatchGroup = {
  id: string;
  corePaths: string[];
};

const baseline = JSON.parse(
  fs.readFileSync(
    path.resolve(process.cwd(), "upstream-baseline.json"),
    "utf8",
  ),
) as {
  patchGroups: PatchGroup[];
};

describe("Excalidraw upstream baseline", () => {
  it("tracks every Arrange Into Grid integration path", () => {
    const arrangeGrid = baseline.patchGroups.find(
      (group) => group.id === "arrange-grid",
    );

    expect(arrangeGrid?.corePaths).toEqual(
      expect.arrayContaining([
        "packages/excalidraw/components/CommandPalette/CommandPalette.tsx",
        "packages/excalidraw/components/HelpDialog.tsx",
        "packages/excalidraw/locales/en.json",
        "packages/excalidraw/locales/zh-CN.json",
      ]),
    );
  });
});
