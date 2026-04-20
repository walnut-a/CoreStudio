import fs from "fs/promises";
import os from "os";
import path from "path";
import { createRequire } from "module";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { scanSecretFiles } = require("./check-secrets.cjs") as {
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
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "image-board-secret-check-"));
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
      `export const apiKey = "sk-proj-${"A".repeat(48)}";`,
      "utf8",
    );

    await expect(scanSecretFiles([sourcePath])).resolves.toEqual([
      expect.objectContaining({
        filePath: sourcePath,
        line: 1,
        rule: "openai-or-compatible-key",
      }),
    ]);
  });

  it("allows intentionally short fake test keys", async () => {
    const testPath = path.join(tempDir, "zenmux.test.ts");
    await fs.writeFile(
      testPath,
      `const apiKey = "sk-ai-v1-test";\nconst saved = "updated-key";`,
      "utf8",
    );

    await expect(scanSecretFiles([testPath])).resolves.toEqual([]);
  });

  it("scans release archives such as app.asar as text buffers", async () => {
    const asarPath = path.join(tempDir, "app.asar");
    await fs.writeFile(
      asarPath,
      Buffer.from(`Authorization: Bearer sk-or-v1-${"B".repeat(48)}`),
    );

    await expect(scanSecretFiles([asarPath])).resolves.toEqual([
      expect.objectContaining({
        filePath: asarPath,
        line: 1,
        rule: "openai-or-compatible-key",
      }),
    ]);
  });
});
