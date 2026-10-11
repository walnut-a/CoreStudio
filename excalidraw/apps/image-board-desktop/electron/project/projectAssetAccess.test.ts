import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { createProjectStructure } from "../projectFs";
import { registerProjectOriginal } from "./projectImageWriteback";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots
      .splice(0)
      .map((root) => fs.rm(root, { recursive: true, force: true })),
  );
});
const setup = async () => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "corestudio-intake-original-"),
  );
  roots.push(root);
  const bundle = await createProjectStructure(root, "Project");
  const content = Buffer.from("original-image");
  await fs.writeFile(path.join(bundle.projectPath, "original.png"), content);
  const record = {
    fileId: "intake-original",
    assetPath: "original.png",
    contentHash: createHash("sha256").update(content).digest("hex"),
    sourceType: "imported" as const,
    width: 2400,
    height: 1600,
    createdAt: new Date().toISOString(),
    mimeType: "image/png",
  };
  return { bundle, content, record };
};
it("rejects inbox as a formal original and symbolic links or escaped paths", async () => {
  const { bundle, record } = await setup();
  await fs.mkdir(path.join(bundle.projectPath, "inbox"));
  await fs.writeFile(
    path.join(bundle.projectPath, "inbox/a.png"),
    "original-image",
  );
  await fs.symlink(
    path.join(bundle.projectPath, "original.png"),
    path.join(bundle.projectPath, "link.png"),
  );
  for (const assetPath of [
    "../original.png",
    "inbox/a.png",
    "link.png",
    "cache/original.png",
  ]) {
    await expect(
      registerProjectOriginal({
        projectPath: bundle.projectPath,
        record: { ...record, assetPath },
      }),
    ).rejects.toThrow();
  }
});
