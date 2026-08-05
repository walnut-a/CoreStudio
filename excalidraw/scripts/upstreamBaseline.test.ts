import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  analyzePatchCoverage,
  getWorkingTreePatchPaths,
  validateBaselineConfig,
} from "./syncUpstream.mjs";

type PatchGroup = {
  id: string;
  disposition: string;
  corePaths: string[];
  contractTests: string[];
  supportPaths?: string[];
};

const baseline = validateBaselineConfig(
  JSON.parse(
    fs.readFileSync(
      path.resolve(process.cwd(), "upstream-baseline.json"),
      "utf8",
    ),
  ),
) as {
  currentSha: string;
  managedRoot: string;
  ownedPaths: string[];
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

  it("assigns every current vendor diff to an explicit patch group", () => {
    const repositoryRoot = path.resolve(process.cwd(), "..");
    const localPatchPaths = getWorkingTreePatchPaths(repositoryRoot, baseline);

    const analysis = analyzePatchCoverage(localPatchPaths, baseline);

    expect(analysis.unregisteredPaths).toEqual([]);
    expect(analysis.unexplainedSharedPaths).toEqual([]);
  });
});
