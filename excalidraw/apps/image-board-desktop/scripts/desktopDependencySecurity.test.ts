import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { describe, expect, it } from "vitest";

const readJson = (filePath: string) =>
  JSON.parse(fs.readFileSync(filePath, "utf8")) as {
    name?: string;
    version?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    resolutions?: Record<string, string>;
    scripts?: Record<string, string>;
  };

const findPackageManifest = (entryPath: string, packageName: string) => {
  let directory = path.dirname(entryPath);

  while (directory !== path.dirname(directory)) {
    const manifestPath = path.join(directory, "package.json");
    if (fs.existsSync(manifestPath)) {
      const manifest = readJson(manifestPath);
      if (manifest.name === packageName) {
        return manifest;
      }
    }
    directory = path.dirname(directory);
  }

  throw new Error(`无法定位 ${packageName} 的 package.json`);
};

const resolvePackageEntry = (packageName: string, anchorFile: string) =>
  createRequire(anchorFile).resolve(packageName);

const resolveInstalledPackageVersion = (
  packageName: string,
  anchorFile: string,
) => {
  const manifest = findPackageManifest(
    resolvePackageEntry(packageName, anchorFile),
    packageName,
  );
  if (!manifest.version) {
    throw new Error(`${packageName} 的 package.json 缺少 version`);
  }
  return manifest.version;
};

const workspaceRoot = process.cwd();
const desktopManifestPath = path.resolve(
  workspaceRoot,
  "apps/image-board-desktop/package.json",
);
const excalidrawManifestPath = path.resolve(
  workspaceRoot,
  "packages/excalidraw/package.json",
);

describe("CoreStudio desktop dependency security", () => {
  it("pins vulnerable transitive dependencies to reviewed versions", () => {
    const rootPackage = readJson(
      path.resolve(workspaceRoot, "package.json"),
    );
    const excalidrawPackage = readJson(excalidrawManifestPath);

    expect(rootPackage.resolutions).toMatchObject({
      dompurify: "3.4.12",
      immutable: "5.1.9",
      "lodash-es": "4.18.1",
      mermaid: "11.16.0",
      protobufjs: "7.6.3",
      ws: "8.21.0",
    });
    expect(excalidrawPackage.dependencies).toMatchObject({
      "@excalidraw/mermaid-to-excalidraw": "2.2.2",
      nanoid: "3.3.8",
      sass: "1.85.1",
    });
  });

  it("resolves the reviewed versions from the actual desktop bundle chains", () => {
    const googleGenaiEntry = resolvePackageEntry(
      "@google/genai",
      desktopManifestPath,
    );
    expect(
      resolveInstalledPackageVersion("protobufjs", googleGenaiEntry),
    ).toBe("7.6.3");
    expect(resolveInstalledPackageVersion("ws", googleGenaiEntry)).toBe(
      "8.21.0",
    );

    const mermaidAdapterEntry = resolvePackageEntry(
      "@excalidraw/mermaid-to-excalidraw",
      desktopManifestPath,
    );
    const mermaidEntry = resolvePackageEntry("mermaid", mermaidAdapterEntry);
    expect(
      findPackageManifest(mermaidEntry, "mermaid").version,
    ).toBe("11.16.0");
    expect(resolveInstalledPackageVersion("dompurify", mermaidEntry)).toBe(
      "3.4.12",
    );
    expect(resolveInstalledPackageVersion("lodash-es", mermaidEntry)).toBe(
      "4.18.1",
    );
  });

  it("keeps Excalidraw direct build dependencies above their security floors", () => {
    expect(
      resolveInstalledPackageVersion("nanoid", excalidrawManifestPath),
    ).toBe("3.3.8");

    const sassEntry = resolvePackageEntry("sass", excalidrawManifestPath);
    expect(findPackageManifest(sassEntry, "sass").version).toBe("1.85.1");
    expect(resolveInstalledPackageVersion("immutable", sassEntry)).toBe(
      "5.1.9",
    );
  });

  it("keeps multipart tooling above its critical security floor", () => {
    const rootManifestPath = path.resolve(workspaceRoot, "package.json");
    const rootPackage = readJson(rootManifestPath);

    expect(rootPackage.resolutions).toMatchObject({
      "form-data": "4.0.6",
    });

    const jsdomEntry = resolvePackageEntry("jsdom", rootManifestPath);
    expect(resolveInstalledPackageVersion("form-data", jsdomEntry)).toBe(
      "4.0.6",
    );
  });

  it("does not expose the vulnerable Vitest UI server", () => {
    const rootPackage = readJson(path.resolve(workspaceRoot, "package.json"));

    expect(rootPackage.devDependencies).not.toHaveProperty("@vitest/ui");
    expect(rootPackage.scripts).not.toHaveProperty("test:ui");
  });

  it("keeps Vitest and App mocks on the supported security boundary", () => {
    const rootPackage = readJson(path.resolve(workspaceRoot, "package.json"));
    const appSetupPath = path.resolve(
      workspaceRoot,
      "apps/image-board-desktop/src/app/App.testSetup.tsx",
    );
    const appSupportPath = path.resolve(
      workspaceRoot,
      "apps/image-board-desktop/src/app/App.testSupport.tsx",
    );

    expect(rootPackage.devDependencies).toMatchObject({
      "@vitest/coverage-v8": "3.2.6",
      vitest: "3.2.6",
    });
    expect(fs.existsSync(appSetupPath), "App mock setup 必须存在").toBe(true);

    const vitestConfig = fs.readFileSync(
      path.resolve(workspaceRoot, "vitest.config.mts"),
      "utf8",
    );
    const appSetup = fs.readFileSync(appSetupPath, "utf8");
    const appSupport = fs.readFileSync(appSupportPath, "utf8");

    expect(vitestConfig).toContain('name: "core"');
    expect(vitestConfig).toContain('name: "corestudio-app"');
    expect(vitestConfig).toContain("App.testSetup.tsx");
    expect(appSetup.match(/vi\.mock\(/g)).toHaveLength(7);
    expect(appSupport).not.toMatch(/vi\.(?:mock|hoisted)\(/);
  });
});
