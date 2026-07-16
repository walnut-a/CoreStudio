import { describe, expect, it } from "vitest";

import {
  isGeneratedJavaScriptArtifact,
  parseConflictPaths,
  validateBaselineConfig,
} from "./syncUpstream.mjs";

describe("syncUpstream", () => {
  it("parses conflict paths from git apply output", () => {
    expect(
      parseConflictPaths(`
Applied patch to 'excalidraw/package.json' with conflicts.
U excalidraw/package.json
U excalidraw/packages/excalidraw/components/App.tsx
`),
    ).toEqual([
      "excalidraw/package.json",
      "excalidraw/packages/excalidraw/components/App.tsx",
    ]);
  });

  it("validates the required baseline fields", () => {
    expect(() =>
      validateBaselineConfig({
        repository: "https://github.com/excalidraw/excalidraw.git",
        managedRoot: "excalidraw",
        currentSha: "a".repeat(40),
        targetSha: "b".repeat(40),
        ownedPaths: ["apps/image-board-desktop"],
        patchGroups: [],
      }),
    ).not.toThrow();

    expect(() =>
      validateBaselineConfig({
        repository: "https://github.com/excalidraw/excalidraw.git",
      }),
    ).toThrow("managedRoot");
  });

  it("identifies generated JavaScript siblings without hiding real scripts", () => {
    const trackedPaths = new Set([
      "packages/common/src/constants.js",
      "packages/common/src/constants.ts",
      "scripts/release.js",
    ]);

    expect(
      isGeneratedJavaScriptArtifact(
        "packages/common/src/constants.js",
        trackedPaths,
      ),
    ).toBe(true);
    expect(
      isGeneratedJavaScriptArtifact("scripts/release.js", trackedPaths),
    ).toBe(false);
  });
});
