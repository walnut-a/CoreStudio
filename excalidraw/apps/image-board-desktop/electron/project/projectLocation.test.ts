import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import {
  readProjectLocationIdentity,
  resolveRenamedProject,
} from "./projectLocation";
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((p) => fs.rm(p, { recursive: true, force: true })),
  );
});
it("follows a same-parent rename using project and directory identity without recreating the old path", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "project-location-"));
  roots.push(root);
  const old = path.join(root, "old"),
    next = path.join(root, "new");
  await fs.mkdir(old);
  await fs.writeFile(
    path.join(old, "project.json"),
    JSON.stringify({ projectId: "same" }),
  );
  const identity = await readProjectLocationIdentity(old);
  await fs.rename(old, next);
  expect(await resolveRenamedProject(old, identity)).toBe(
    await fs.realpath(next),
  );
  await expect(fs.stat(old)).rejects.toMatchObject({ code: "ENOENT" });
  await fs.mkdir(old);
  await fs.writeFile(
    path.join(old, "project.json"),
    JSON.stringify({ projectId: "same" }),
  );
  await expect(resolveRenamedProject(old, identity)).rejects.toThrow(/唯一/);
  await fs.rm(next, { recursive: true });
  await expect(resolveRenamedProject(next, identity)).rejects.toThrow(/唯一/);
});
