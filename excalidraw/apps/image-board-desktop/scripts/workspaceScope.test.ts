import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

type RootManifest = {
  workspaces?: string[];
  scripts?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

type RootTsconfig = {
  include?: string[];
  exclude?: string[];
};

type UpstreamBaseline = {
  currentSha: string;
};

const readRootManifest = () =>
  JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf8"),
  ) as RootManifest;

describe("CoreStudio workspace scope", () => {
  it("keeps the documented current upstream SHA aligned with the baseline record", () => {
    const baseline = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), "upstream-baseline.json"),
        "utf8",
      ),
    ) as UpstreamBaseline;
    const maintenanceDoc = fs.readFileSync(
      path.resolve(
        process.cwd(),
        "..",
        "docs",
        "doc",
        "excalidraw-fork-maintenance.md",
      ),
      "utf8",
    );

    expect(maintenanceDoc).toContain(
      `| Excalidraw upstream 当前源码基线 | \`${baseline.currentSha}\` |`,
    );
  });

  it("installs only the desktop application and shared Excalidraw packages", () => {
    const rootPackage = readRootManifest();

    expect(rootPackage.workspaces).toEqual([
      "apps/image-board-desktop",
      "packages/*",
    ]);
  });

  it("does not advertise unsupported upstream web application commands", () => {
    const rootPackage = readRootManifest();

    expect(rootPackage.scripts).not.toHaveProperty("build:app");
    expect(rootPackage.scripts).not.toHaveProperty("build:app:docker");
    expect(rootPackage.scripts).not.toHaveProperty("build:preview");
    expect(rootPackage.scripts).not.toHaveProperty("build:version");
    expect(rootPackage.scripts).not.toHaveProperty("start");
    expect(rootPackage.scripts).not.toHaveProperty("start:example");
    expect(rootPackage.scripts).not.toHaveProperty("start:production");
  });

  it("typechecks only active application and package source", () => {
    const tsconfig = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), "tsconfig.json"), "utf8"),
    ) as RootTsconfig;

    expect(tsconfig.include).toEqual(["packages", "apps"]);
    expect(tsconfig.exclude).toContain("excalidraw-app");
    expect(tsconfig.exclude).toContain("examples");
  });

  it("does not expose the historical lint command without an ESLint runtime", () => {
    const rootPackage = readRootManifest();

    expect(rootPackage.scripts).not.toHaveProperty("test:code");
    expect(rootPackage.scripts).not.toHaveProperty("fix:code");
    expect(rootPackage.devDependencies).not.toHaveProperty(
      "eslint-config-react-app",
    );
    expect(rootPackage.devDependencies).not.toHaveProperty("lint-staged");
  });
});
