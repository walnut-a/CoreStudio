import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const workflowPath = path.resolve(
  process.cwd(),
  "../.github/workflows/corestudio-desktop.yml",
);

describe("CoreStudio repository health contracts", () => {
  it("runs Husky installation from the Git root", () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf8"),
    );

    expect(packageJson.scripts.prepare).toBe(
      "cd .. && husky install excalidraw/.husky",
    );
  });

  it("checks every CoreStudio candidate branch", () => {
    const source = fs.readFileSync(workflowPath, "utf8");

    expect(source).toContain('- "walnut/**"');
  });

  it("builds the desktop application after tests", () => {
    const source = fs.readFileSync(workflowPath, "utf8");

    expect(source).toContain("- name: Build desktop");
    expect(source).toContain("run: corepack yarn build:desktop");
  });

  it("scans both source files and desktop package inputs", () => {
    const source = fs.readFileSync(workflowPath, "utf8");

    expect(source).toContain(
      "run: corepack yarn check:desktop-secrets --source --package-inputs",
    );
  });
});
