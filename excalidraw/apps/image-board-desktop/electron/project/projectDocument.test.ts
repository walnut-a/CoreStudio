import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import {
  migrateProjectDocument,
  updateProjectDocument,
  recoverProjectSceneCommit,
  readProjectDataText,
  writeProjectDataJson,
} from "./projectDocument";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((p) => fs.rm(p, { recursive: true, force: true })),
  );
});
const setup = async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "project-document-"));
  roots.push(dir);
  await fs.writeFile(
    path.join(dir, "project.json"),
    JSON.stringify({
      formatVersion: 1,
      projectId: "p",
      name: "Example",
      custom: { keep: true },
    }),
  );
  await fs.writeFile(
    path.join(dir, "image-records.json"),
    JSON.stringify({ a: { fileId: "a", assetPath: "a.png", custom: 42 } }),
  );
  await fs.writeFile(
    path.join(dir, "scene.excalidraw.json"),
    JSON.stringify({ elements: [] }),
  );
  return dir;
};
it("migrates legacy files once, preserving unknown data without a second live index", async () => {
  const dir = await setup();
  await migrateProjectDocument(dir);
  const data = JSON.parse(
    await fs.readFile(path.join(dir, "project.json"), "utf8"),
  );
  expect(data.formatVersion).toBe(2);
  expect(data.imageRecords.a.custom).toBe(42);
  expect(data.custom).toEqual({ keep: true });
  expect(await fs.readdir(dir)).toEqual(
    expect.not.arrayContaining(["image-records.json", "image-intake.json"]),
  );
  await migrateProjectDocument(dir);
  expect(
    JSON.parse(await readProjectDataText(path.join(dir, "image-records.json"))),
  ).toEqual(data.imageRecords);
});
it("serializes independent section writes and does not let an old manifest overwrite records", async () => {
  const dir = await setup();
  await migrateProjectDocument(dir);
  const manifest = JSON.parse(
    await readProjectDataText(path.join(dir, "project.json")),
  );
  await Promise.all([
    writeProjectDataJson(path.join(dir, "image-records.json"), {
      b: { fileId: "b" },
    }),
    writeProjectDataJson(path.join(dir, "image-intake.json"), {
      schemaVersion: 1,
      projectId: "p",
      entries: {},
      sources: {},
    }),
  ]);
  await writeProjectDataJson(path.join(dir, "project.json"), {
    ...manifest,
    name: "Renamed",
  });
  const data = JSON.parse(
    await fs.readFile(path.join(dir, "project.json"), "utf8"),
  );
  expect(data.imageRecords).toEqual({ b: { fileId: "b" } });
  expect(data.intake.sources).toEqual({});
  expect(data.name).toBe("Renamed");
});
it("preserves malformed and future documents instead of replacing them", async () => {
  const dir = await setup();
  for (const raw of ["{unfinished", JSON.stringify({ formatVersion: 99 })]) {
    await fs.writeFile(path.join(dir, "project.json"), raw);
    await expect(migrateProjectDocument(dir)).rejects.toThrow();
    await expect(
      writeProjectDataJson(path.join(dir, "image-records.json"), {}),
    ).rejects.toThrow();
    expect(await fs.readFile(path.join(dir, "project.json"), "utf8")).toBe(raw);
  }
});
it("does not delete malformed legacy state on migration", async () => {
  const dir = await setup();
  await fs.writeFile(path.join(dir, "image-intake.json"), "{bad");
  await expect(migrateProjectDocument(dir)).rejects.toThrow();
  expect(
    JSON.parse(await fs.readFile(path.join(dir, "project.json"), "utf8"))
      .formatVersion,
  ).toBe(1);
  expect(await fs.readFile(path.join(dir, "image-intake.json"), "utf8")).toBe(
    "{bad",
  );
});
it("merges unrelated external record changes but does not overwrite a competing edit", async () => {
  const { withProjectSectionBaseline } = await import("./projectDocument");
  const dir = await setup();
  await migrateProjectDocument(dir);
  const file = path.join(dir, "image-records.json"),
    base = JSON.parse(await readProjectDataText(file));
  await writeProjectDataJson(file, {
    ...base,
    external: { fileId: "external" },
  });
  await writeProjectDataJson(
    file,
    withProjectSectionBaseline({ ...base, local: { fileId: "local" } }, base),
  );
  expect(JSON.parse(await readProjectDataText(file))).toHaveProperty(
    "external",
  );
  await expect(
    writeProjectDataJson(
      file,
      withProjectSectionBaseline(
        { ...base, external: { fileId: "changed" } },
        base,
      ),
    ),
  ).rejects.toThrow(/冲突/);
});

it("compacts migrated accepted intake and finishes interrupted legacy cleanup", async () => {
  const dir = await setup();
  const legacy = {
    schemaVersion: 1,
    projectId: "p",
    entries: {
      hash: {
        phase: "accepted",
        hash: "hash",
        record: { fileId: "a" },
        element: { id: "e", x: 0 },
      },
    },
    sources: {},
  };
  await fs.writeFile(
    path.join(dir, "image-intake.json"),
    JSON.stringify(legacy),
  );
  await migrateProjectDocument(dir);
  let doc = JSON.parse(
    await fs.readFile(path.join(dir, "project.json"), "utf8"),
  );
  expect(doc.intake.entries.hash).toEqual({
    phase: "accepted",
    hash: "hash",
    fileId: "a",
    elementId: "e",
  });
  await fs.writeFile(
    path.join(dir, "image-records.json"),
    JSON.stringify(doc.imageRecords),
  );
  await fs.writeFile(
    path.join(dir, "image-intake.json"),
    JSON.stringify(legacy),
  );
  await migrateProjectDocument(dir);
  expect(await fs.readdir(dir)).not.toContain("image-records.json");
  expect(await fs.readdir(dir)).not.toContain("image-intake.json");
});

it("recovers an interrupted native/document save and keeps competing external edits intact", async () => {
  const dir = await setup();
  await migrateProjectDocument(dir);
  const scene = path.join(dir, "scene.excalidraw.json"),
    project = path.join(dir, "project.json");
  const before = await fs.readFile(scene, "utf8"),
    after = JSON.stringify({ elements: [{ id: "new" }] });
  const rename = fs.rename.bind(fs);
  const fail = vi.spyOn(fs, "rename").mockImplementation(async (from, to) => {
    if (String(to) === project) throw new Error("interrupted project publish");
    return rename(from, to);
  });
  try {
    await expect(
      updateProjectDocument(
        dir,
        (d) => {
          d.name = "Saved";
        },
        { before, after },
      ),
    ).rejects.toThrow("interrupted");
  } finally {
    fail.mockRestore();
  }
  expect(await fs.readFile(scene, "utf8")).toBe(after);
  await recoverProjectSceneCommit(dir);
  expect(JSON.parse(await fs.readFile(project, "utf8")).name).toBe("Saved");
  expect(await fs.readdir(path.join(dir, "cache"))).not.toContain(
    "scene-commit.json",
  );
  const original = await fs.readFile(project, "utf8");
  await fs.writeFile(
    path.join(dir, "cache/scene-commit.json"),
    JSON.stringify({
      schemaVersion: 1,
      projectBefore: original,
      projectAfter: original,
      sceneBefore: after,
      sceneAfter: before,
    }),
  );
  await fs.writeFile(project, "{external editing");
  await expect(recoverProjectSceneCommit(dir)).rejects.toThrow(/冲突/);
  expect(await fs.readFile(project, "utf8")).toBe("{external editing");
  expect(await fs.readFile(scene, "utf8")).toBe(after);
});

it("does not replay malformed scene contents from an externally damaged pending save", async () => {
  const dir = await setup();
  await migrateProjectDocument(dir);
  const project = await fs.readFile(path.join(dir, "project.json"), "utf8"),
    scene = await fs.readFile(path.join(dir, "scene.excalidraw.json"), "utf8");
  await fs.mkdir(path.join(dir, "cache"));
  await fs.writeFile(
    path.join(dir, "cache/scene-commit.json"),
    JSON.stringify({
      schemaVersion: 1,
      projectBefore: project,
      projectAfter: project,
      sceneBefore: scene,
      sceneAfter: "{bad",
    }),
  );
  await expect(recoverProjectSceneCommit(dir)).rejects.toThrow(/保存记录/);
  expect(
    await fs.readFile(path.join(dir, "scene.excalidraw.json"), "utf8"),
  ).toBe(scene);
});
