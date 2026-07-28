import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const appRoot = path.resolve(process.cwd(), "apps/image-board-desktop");
const packageJson = JSON.parse(
  fs.readFileSync(path.join(appRoot, "package.json"), "utf8"),
) as {
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
};

const tempDirs: string[] = [];

const createTempDir = () => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "corestudio-build-hermeticity-"),
  );
  tempDirs.push(tempDir);
  return tempDir;
};

afterEach(() => {
  for (const tempDir of tempDirs.splice(0)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

describe("CoreStudio Electron build hermeticity", () => {
  it("uses the workspace-local esbuild API with a fixed working directory", async () => {
    expect(packageJson.scripts["build:electron"]).toBe(
      "node scripts/build-electron.mjs",
    );

    const buildModule = (await import(
      pathToFileURL(path.join(appRoot, "scripts/build-electron.mjs")).href
    )) as {
      assertExpectedEsbuildVersion: (
        installedVersion: string,
        expectedVersion: string,
      ) => void;
      createElectronBuildOptions: () => {
        absWorkingDir: string;
        entryPoints: string[];
        external: string[];
        outdir: string;
        tsconfig: string;
      };
    };
    const options = buildModule.createElectronBuildOptions();

    expect(options.absWorkingDir).toBe(appRoot);
    expect(options.entryPoints).toEqual([
      "electron/main.ts",
      "electron/preload.ts",
      "electron/agent/cliRuntime.ts",
    ]);
    expect(options.external).toEqual(["electron"]);
    expect(options.outdir).toBe("dist-electron");
    expect(options.tsconfig).toBe("tsconfig.electron.json");
    expect(() =>
      buildModule.assertExpectedEsbuildVersion(
        packageJson.devDependencies.esbuild,
        packageJson.devDependencies.esbuild,
      ),
    ).not.toThrow();
    expect(() =>
      buildModule.assertExpectedEsbuildVersion(
        "0.19.10",
        packageJson.devDependencies.esbuild,
      ),
    ).toThrow(/esbuild version mismatch/i);
  });

  it("rejects macOS, Linux, and Windows user-directory paths in build output", () => {
    const { assertNoForbiddenBuildPaths } =
      require("./check-build-paths.cjs") as {
        assertNoForbiddenBuildPaths: (options: { roots: string[] }) => void;
      };
    const tempDir = createTempDir();
    const safePath = path.join(tempDir, "safe.js");
    fs.writeFileSync(
      safePath,
      'console.log("../../node_modules/ws/index.js");',
    );

    expect(() =>
      assertNoForbiddenBuildPaths({ roots: [tempDir] }),
    ).not.toThrow();

    const leakedPath = path.join(tempDir, "leaked.js");
    fs.writeFileSync(
      leakedPath,
      [
        '"/Users/developer/project/main.ts"',
        '"/home/builder/project/main.ts"',
        '"C:\\\\Users\\\\builder\\\\project\\\\main.ts"',
      ].join("\n"),
    );

    expect(() => assertNoForbiddenBuildPaths({ roots: [tempDir] })).toThrow(
      /developer-specific paths/i,
    );
  });
});
