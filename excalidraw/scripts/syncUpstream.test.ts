import { describe, expect, it } from "vitest";

import {
  analyzePatchCoverage,
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

  it("reports unregistered, stale, and unexplained shared patch paths", () => {
    const analysis = analyzePatchCoverage(
      [
        "src/active.ts",
        "src/shared.ts",
        "support/vite.ts",
        "orphan.ts",
        "apps/host/App.tsx",
      ],
      {
        ownedPaths: ["apps/host"],
        sharedPaths: [
          {
            path: "src/shared.ts",
            groups: ["feature-one", "feature-two"],
            reason: "The file exposes both host APIs.",
          },
        ],
        patchGroups: [
          {
            id: "feature-one",
            disposition: "keep-core-patch",
            corePaths: ["src/active.ts", "src/shared.ts", "src/stale.ts"],
            contractTests: [],
          },
          {
            id: "feature-two",
            disposition: "keep-core-patch",
            corePaths: ["src/shared.ts"],
            contractTests: [],
          },
          {
            id: "build-support",
            disposition: "keep-support",
            corePaths: [],
            contractTests: [],
            supportPaths: ["support/vite.ts"],
          },
        ],
      },
    );

    expect(analysis.unregisteredPaths).toEqual(["orphan.ts"]);
    expect(analysis.stalePaths).toEqual(["src/stale.ts"]);
    expect(analysis.unexplainedSharedPaths).toEqual([]);

    const withoutSharedPathReason = analyzePatchCoverage(["src/shared.ts"], {
      ownedPaths: [],
      patchGroups: [
        {
          id: "feature-one",
          disposition: "keep-core-patch",
          corePaths: ["src/shared.ts"],
          contractTests: [],
        },
        {
          id: "feature-two",
          disposition: "keep-core-patch",
          corePaths: ["src/shared.ts"],
          contractTests: [],
        },
      ],
    });

    expect(withoutSharedPathReason.unexplainedSharedPaths).toEqual([
      {
        path: "src/shared.ts",
        groups: ["feature-one", "feature-two"],
      },
    ]);
  });

  it("rejects duplicate patch group ids and unsupported dispositions", () => {
    const baseConfig = {
      repository: "https://github.com/excalidraw/excalidraw.git",
      managedRoot: "excalidraw",
      currentSha: "a".repeat(40),
      targetSha: "b".repeat(40),
      ownedPaths: [],
      patchGroups: [
        {
          id: "feature",
          disposition: "keep-core-patch",
          corePaths: [],
          contractTests: [],
        },
      ],
    };

    expect(() =>
      validateBaselineConfig({
        ...baseConfig,
        patchGroups: [...baseConfig.patchGroups, ...baseConfig.patchGroups],
      }),
    ).toThrow("Duplicate patch group id: feature");

    expect(() =>
      validateBaselineConfig({
        ...baseConfig,
        patchGroups: [
          {
            ...baseConfig.patchGroups[0],
            disposition: "keep-forever",
          },
        ],
      }),
    ).toThrow("Unsupported patch disposition");
  });
});
