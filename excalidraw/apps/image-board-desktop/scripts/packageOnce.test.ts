import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { hasReusablePackage, removeLegacyZipArtifacts } =
  require("./package-once.cjs") as {
    hasReusablePackage: (options: {
      state: {
        fingerprint: string;
        version: string;
        platform: string;
        arch: string;
        artifacts: string[];
      } | null;
      fingerprint: string;
      version: string;
      platform: string;
      arch: string;
      releaseDir: string;
    }) => boolean;
    removeLegacyZipArtifacts: (options: {
      releaseDir: string;
      productName: string;
      version: string;
      arch: string;
    }) => void;
  };

const tempDirs: string[] = [];

const createTempDir = () => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "corestudio-package-once-"),
  );
  tempDirs.push(tempDir);
  return tempDir;
};

afterEach(() => {
  for (const tempDir of tempDirs.splice(0)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

describe("CoreStudio package-once guard", () => {
  it("reuses a completed package for the same source fingerprint", () => {
    const releaseDir = createTempDir();
    fs.writeFileSync(path.join(releaseDir, "CoreStudio.dmg"), "dmg");

    expect(
      hasReusablePackage({
        state: {
          fingerprint: "same-source",
          version: "1.2.3",
          platform: "darwin",
          arch: "arm64",
          artifacts: ["CoreStudio.dmg"],
        },
        fingerprint: "same-source",
        version: "1.2.3",
        platform: "darwin",
        arch: "arm64",
        releaseDir,
      }),
    ).toBe(true);
  });

  it("ignores legacy ZIP entries when reusing an existing DMG package", () => {
    const releaseDir = createTempDir();
    fs.writeFileSync(path.join(releaseDir, "CoreStudio.dmg"), "dmg");
    fs.mkdirSync(path.join(releaseDir, "mac-arm64", "CoreStudio.app"), {
      recursive: true,
    });

    expect(
      hasReusablePackage({
        state: {
          fingerprint: "same-source",
          version: "1.2.3",
          platform: "darwin",
          arch: "arm64",
          artifacts: [
            "CoreStudio.dmg",
            "CoreStudio-1.2.3-arm64-mac.zip",
            "mac-arm64/CoreStudio.app",
          ],
        },
        fingerprint: "same-source",
        version: "1.2.3",
        platform: "darwin",
        arch: "arm64",
        releaseDir,
      }),
    ).toBe(true);
  });

  it("packages again when source changes or a recorded artifact is missing", () => {
    const releaseDir = createTempDir();
    fs.writeFileSync(path.join(releaseDir, "CoreStudio.dmg"), "dmg");
    const state = {
      fingerprint: "old-source",
      version: "1.2.3",
      platform: "darwin",
      arch: "arm64",
      artifacts: ["CoreStudio.dmg", "CoreStudio.app"],
    };

    expect(
      hasReusablePackage({
        state,
        fingerprint: "new-source",
        version: "1.2.3",
        platform: "darwin",
        arch: "arm64",
        releaseDir,
      }),
    ).toBe(false);
    expect(
      hasReusablePackage({
        state: { ...state, fingerprint: "old-source" },
        fingerprint: "old-source",
        version: "1.2.3",
        platform: "darwin",
        arch: "arm64",
        releaseDir,
      }),
    ).toBe(false);
  });

  it("removes legacy ZIP artifacts for the packaged version", () => {
    const releaseDir = createTempDir();
    const zipName = "CoreStudio-1.2.3-arm64-mac.zip";
    fs.writeFileSync(path.join(releaseDir, zipName), "zip");
    fs.writeFileSync(path.join(releaseDir, `${zipName}.blockmap`), "blockmap");
    fs.writeFileSync(
      path.join(releaseDir, "CoreStudio-1.2.2-arm64-mac.zip"),
      "older",
    );

    removeLegacyZipArtifacts({
      releaseDir,
      productName: "CoreStudio",
      version: "1.2.3",
      arch: "arm64",
    });

    expect(fs.existsSync(path.join(releaseDir, zipName))).toBe(false);
    expect(fs.existsSync(path.join(releaseDir, `${zipName}.blockmap`))).toBe(
      false,
    );
    expect(
      fs.existsSync(path.join(releaseDir, "CoreStudio-1.2.2-arm64-mac.zip")),
    ).toBe(true);
  });
});
