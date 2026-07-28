#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const appRoot = path.resolve(path.dirname(scriptPath), "..");
const packageJson = JSON.parse(
  fs.readFileSync(path.join(appRoot, "package.json"), "utf8"),
);

export const assertExpectedEsbuildVersion = (
  installedVersion,
  expectedVersion,
) => {
  if (installedVersion !== expectedVersion) {
    throw new Error(
      `esbuild version mismatch: expected ${expectedVersion}, installed ${installedVersion}. Run the frozen workspace install before building.`,
    );
  }
};

export const createElectronBuildOptions = () => ({
  absPaths: [],
  absWorkingDir: appRoot,
  entryPoints: [
    "electron/main.ts",
    "electron/preload.ts",
    "electron/agent/cliRuntime.ts",
  ],
  bundle: true,
  platform: "node",
  format: "cjs",
  outdir: "dist-electron",
  external: ["electron"],
  tsconfig: "tsconfig.electron.json",
  logLevel: "info",
});

export const buildElectron = async ({ esbuildModule } = {}) => {
  const resolvedEsbuild = esbuildModule ?? (await import("esbuild"));
  assertExpectedEsbuildVersion(
    resolvedEsbuild.version,
    packageJson.devDependencies.esbuild,
  );
  await resolvedEsbuild.build(createElectronBuildOptions());
};

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  buildElectron().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
