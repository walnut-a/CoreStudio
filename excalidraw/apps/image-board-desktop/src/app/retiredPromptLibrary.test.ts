import { readdirSync, readFileSync } from "node:fs";
import { extname, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const productionRoots = [
  "apps/image-board-desktop/electron",
  "apps/image-board-desktop/src",
];

const retiredPromptLibraryMarkers = [
  /promptLibrary/i,
  /savedPrompt/i,
  /prompt-library/i,
  /常用 Prompt/i,
  /保存当前提示词/i,
];

const collectProductionFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      return collectProductionFiles(entryPath);
    }

    if (entry.name.includes(".test.")) {
      return [];
    }

    return [".ts", ".tsx", ".css"].includes(extname(entry.name))
      ? [entryPath]
      : [];
  });

describe("retired prompt library", () => {
  it("removes the feature from production source and filenames", () => {
    const matches = productionRoots.flatMap((root) =>
      collectProductionFiles(resolve(process.cwd(), root)).flatMap((filePath) => {
        const relativePath = relative(process.cwd(), filePath);
        const source = readFileSync(filePath, "utf8");

        return retiredPromptLibraryMarkers
          .filter(
            (marker) => marker.test(relativePath) || marker.test(source),
          )
          .map((marker) => `${relativePath}: ${marker.source}`);
      }),
    );

    expect(matches).toEqual([]);
  });
});
