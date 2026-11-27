import fs from "fs/promises";
import os from "os";
import path from "path";
import { createRequire } from "module";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { collectSourceFiles, collectReleaseFiles, scanSecretFiles } =
  require("./check-secrets.cjs") as {
    collectReleaseFiles: (dir: string) => Promise<string[]>;
    collectSourceFiles: () => Promise<string[]>;
    scanSecretFiles: (files: string[]) => Promise<
      Array<{
        filePath: string;
        line: number;
        rule: string;
        excerpt: string;
      }>
    >;
  };

describe("check-secrets", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "image-board-secret-check-"),
    );
  });

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("flags real-looking provider keys", async () => {
    const sourcePath = path.join(tempDir, "settings.ts");
    await fs.writeFile(
      sourcePath,
      `const endpoint = "https://example.org"; export const apiKey = "sk-proj-${"A".repeat(
        48,
      )}";`,
      "utf8",
    );

    await expect(scanSecretFiles([sourcePath])).resolves.toEqual([
      expect.objectContaining({
        filePath: sourcePath,
        line: 1,
        rule: "openai-or-compatible-key",
        excerpt: "[REDACTED]",
      }),
    ]);
  });

  it("requires complete release inputs for each mac architecture", async () => {
    await expect(collectReleaseFiles(tempDir)).rejects.toThrow();
    for (const target of ["mac", "mac-arm64", "mac-universal"]) {
      const contents = path.join(tempDir, target, "CoreStudio.app", "Contents");
      await fs.mkdir(path.join(contents, "Resources"), { recursive: true });
      await fs.writeFile(path.join(contents, "Info.plist"), "");
      await expect(collectReleaseFiles(tempDir)).rejects.toThrow();
      await fs.writeFile(path.join(contents, "Resources", "app.asar"), "");
    }
    expect(await collectReleaseFiles(tempDir)).toHaveLength(6);
  });
});
