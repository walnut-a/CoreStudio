import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import {
  previewProjectReconstruction,
  commitProjectReconstruction,
} from "./projectReconstruction";
import { readProjectBundle } from "../projectFs";
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((p) => fs.rm(p, { recursive: true, force: true })),
  );
});
const setup = async () => {
  const p = await fs.mkdtemp(path.join(os.tmpdir(), "reconstruct-"));
  roots.push(p);
  await fs.mkdir(path.join(p, "assets"));
  await fs.writeFile(
    path.join(p, "assets/a.svg"),
    '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="20"/>',
  );
  return p;
};
const decode = async () => ({ width: 30, height: 20 });
it("previews without writing and rebuilds from original images with a new identity and backup", async () => {
  const root = await setup();
  await fs.writeFile(path.join(root, "project.json"), "{broken");
  const preview = await previewProjectReconstruction(root, decode);
  expect(preview?.records).toHaveLength(1);
  expect(await fs.readFile(path.join(root, "project.json"), "utf8")).toBe(
    "{broken",
  );
  const result = await commitProjectReconstruction(preview!);
  expect(
    await fs.readFile(path.join(result.backupPath, "project.json"), "utf8"),
  ).toBe("{broken");
  const bundle = await readProjectBundle(root);
  expect(Object.values(bundle.imageRecords)[0]).toMatchObject({
    assetPath: "assets/a.svg",
    sourceType: "imported",
  });
  expect(JSON.parse(bundle.sceneJson).elements).toHaveLength(1);
  expect(
    (await fs.readdir(root)).filter((f) => f.endsWith(".json")).sort(),
  ).toEqual(["project.json", "scene.excalidraw.json"]);
});
