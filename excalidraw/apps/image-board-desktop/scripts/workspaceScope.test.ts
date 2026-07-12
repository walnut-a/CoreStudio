import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

type RootManifest = {
  workspaces?: string[];
  scripts?: Record<string, string>;
};

type RootTsconfig = {
  include?: string[];
  exclude?: string[];
};

const readRootManifest = () =>
  JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf8"),
  ) as RootManifest;

describe("CoreStudio workspace scope", () => {
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
});
