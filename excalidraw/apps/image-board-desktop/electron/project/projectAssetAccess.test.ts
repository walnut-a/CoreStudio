import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { afterEach, expect, it } from "vitest";
import { createProjectStructure, readProjectAssetPayloads } from "../projectFs";
import { registerProjectOriginal } from "./projectImageWriteback";
import { readRegisteredProjectAsset } from "./projectAssetAccess";

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
it("registers an original in place and reads it through the normal project asset API", async () => {
  const { bundle, content, record } = await setup();
  await registerProjectOriginal({ projectPath: bundle.projectPath, record });
  expect(await fs.readdir(path.join(bundle.projectPath, "assets"))).toEqual([]);
  const [asset] = await readProjectAssetPayloads({
    projectPath: bundle.projectPath,
    fileIds: [record.fileId],
  });
  expect(asset?.dataBase64).toBe(content.toString("base64"));
  expect(
    await fs.readFile(path.join(bundle.projectPath, "original.png")),
  ).toEqual(content);
});
it("does not silently return replaced originals, even for a thumbnail request", async () => {
  const { bundle, record } = await setup();
  await registerProjectOriginal({ projectPath: bundle.projectPath, record });
  await fs.writeFile(
    path.join(bundle.projectPath, "original.png"),
    "replacement",
  );
  await expect(
    readRegisteredProjectAsset(bundle.projectPath, record),
  ).rejects.toThrow("内容");
  expect(
    await readProjectAssetPayloads({
      projectPath: bundle.projectPath,
      fileIds: [record.fileId],
      rendition: "thumbnail",
    }),
  ).toEqual([]);
});
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
it("preserves other records and rejects conflicting reuse of a file identity", async () => {
  const { bundle, record } = await setup();
  await registerProjectOriginal({ projectPath: bundle.projectPath, record });
  await fs.writeFile(
    path.join(bundle.projectPath, "another.png"),
    "original-image",
  );
  await registerProjectOriginal({
    projectPath: bundle.projectPath,
    record: { ...record, fileId: "second", assetPath: "another.png" },
  });
  await expect(
    registerProjectOriginal({
      projectPath: bundle.projectPath,
      record: { ...record, assetPath: "another.png" },
    }),
  ).rejects.toThrow("冲突");
  const records = JSON.parse(
    await fs.readFile(
      path.join(bundle.projectPath, "image-records.json"),
      "utf8",
    ),
  );
  expect(Object.keys(records).sort()).toEqual(["intake-original", "second"]);
});
