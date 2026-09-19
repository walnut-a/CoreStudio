import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import {
  createProjectStructure,
  readProjectBundle,
  writeProjectScene,
} from "../projectFs";
import { createProjectRoomService } from "../room/projectRoomService";
import {
  previewStorageResolution,
  commitStorageResolution,
} from "./projectStorageResolution";
const roots: string[] = [];
const services: ReturnType<typeof createProjectRoomService>[] = [];
afterEach(async () => {
  for (const service of services.splice(0))
    for (const room of service.manager.list())
      await service.closeProject(room.identity.projectId, { force: true });
  await Promise.all(
    roots.splice(0).map((p) => fs.rm(p, { recursive: true, force: true })),
  );
});
const setup = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "storage-resolution-"));
  roots.push(root);
  const { projectPath } = await createProjectStructure(root, "Test");
  const service = createProjectRoomService({
    readProjectBundle,
    writeProjectScene,
    persistenceDebounceMs: 60000,
  });
  services.push(service);
  const room = await service.openProject(projectPath);
  const apply = (x: number) =>
    room.applyMaintenanceOperation({
      ...room.identity,
      operationId: String(Math.random()),
      baseSequence: room.sequence,
      elements: [
        {
          id: "a",
          type: "rectangle",
          x,
          y: 0,
          width: 100,
          height: 100,
          angle: 0,
          version: room.sequence + 1,
          versionNonce: room.sequence + 1,
          isDeleted: false,
        },
      ],
    });
  apply(0);
  await room.flushPersistence();
  apply(80);
  const file = path.join(projectPath, "project.json");
  const doc = JSON.parse(await fs.readFile(file, "utf8"));
  doc.layout.elements.a.x = 450;
  await fs.writeFile(file, JSON.stringify(doc, null, 2));
  return { room, projectPath, file, apply };
};
it.each(["current", "external"] as const)(
  "resolves %s only after preview and backs up both disk and unsaved canvas",
  async (choice) => {
    const { room, projectPath } = await setup();
    const preview = await previewStorageResolution(room);
    expect(preview.changes).toHaveLength(1);
    const backup = await commitStorageResolution(room, preview, choice);
    const x = choice === "current" ? 80 : 450;
    expect(room.getSnapshot().scene.elements[0].x).toBe(x);
    expect(
      JSON.parse((await readProjectBundle(projectPath)).sceneJson).elements[0]
        .x,
    ).toBe(x);
    expect(
      JSON.parse(
        await fs.readFile(path.join(backup, "scene-current.json"), "utf8"),
      ).elements[0].x,
    ).toBe(80);
    expect(room.lifecycle).toBe("active");
  },
);
it("rejects a stale preview without losing later disk or canvas edits", async () => {
  const { room, file, apply } = await setup();
  let preview = await previewStorageResolution(room);
  apply(90);
  await expect(
    commitStorageResolution(room, preview, "external"),
  ).rejects.toThrow(/变化/);
  preview = await previewStorageResolution(room);
  await fs.writeFile(file, "{external editing");
  await expect(
    commitStorageResolution(room, preview, "current"),
  ).rejects.toThrow(/变化/);
  expect(await fs.readFile(file, "utf8")).toBe("{external editing");
  expect(room.getSnapshot().scene.elements[0].x).toBe(90);
});
it("restores an active unsaved canvas after both files are lost instead of requiring it to close", async () => {
  const { room, projectPath, file } = await setup();
  await fs.unlink(file);
  await fs.unlink(path.join(projectPath, "scene.excalidraw.json"));
  const preview = await previewStorageResolution(room);
  expect(preview.external).toBeNull();
  await commitStorageResolution(room, preview, "current");
  expect((await readProjectBundle(projectPath)).project.projectId).toBe(
    room.identity.projectId,
  );
  expect(room.getSnapshot().scene.elements[0].x).toBe(80);
});
it("lets the user choose native coordinates when both external files disagree", async () => {
  const { room, projectPath } = await setup();
  const file = path.join(projectPath, "scene.excalidraw.json");
  const native = JSON.parse(await fs.readFile(file, "utf8"));
  native.elements[0].x = 300;
  await fs.writeFile(file, JSON.stringify(native, null, 2));
  const preview = await previewStorageResolution(room);
  expect(preview.nativeDiffers).toBe(true);
  await commitStorageResolution(room, preview, "native");
  expect(room.getSnapshot().scene.elements[0].x).toBe(300);
});
it("retains background intake changes without invalidating a canvas-only decision", async () => {
  const { room, file } = await setup();
  const preview = await previewStorageResolution(room);
  const doc = JSON.parse(await fs.readFile(file, "utf8"));
  doc.intake = { sources: { "bad.png": { attempts: 4 } } };
  doc.updatedAt = new Date().toISOString();
  await fs.writeFile(file, JSON.stringify(doc, null, 2));
  await commitStorageResolution(room, preview, "external");
  expect(JSON.parse(await fs.readFile(file, "utf8")).intake).toEqual(
    doc.intake,
  );
  expect(room.getSnapshot().scene.elements[0].x).toBe(450);
});
it("repairs incomplete metadata into a readable project while preserving extensions", async () => {
  const { room, file, projectPath } = await setup();
  await fs.writeFile(file, JSON.stringify({ customNote: "keep" }));
  const preview = await previewStorageResolution(room);
  await commitStorageResolution(room, preview, "current");
  expect((await readProjectBundle(projectPath)).project.projectId).toBe(
    room.identity.projectId,
  );
  expect(JSON.parse(await fs.readFile(file, "utf8"))).toMatchObject({
    formatVersion: 2,
    customNote: "keep",
  });
});
it("backs up and supersedes an unreadable pending save only with an explicit choice", async () => {
  const { room, projectPath } = await setup();
  const pending = path.join(projectPath, "cache/scene-commit.json");
  await fs.writeFile(pending, "unfinished old save");
  const preview = await previewStorageResolution(room);
  const backup = await commitStorageResolution(room, preview, "current");
  expect(
    await fs.readFile(path.join(backup, "scene-commit.json"), "utf8"),
  ).toBe("unfinished old save");
  await expect(fs.stat(pending)).rejects.toMatchObject({ code: "ENOENT" });
  expect(
    JSON.parse((await readProjectBundle(projectPath)).sceneJson).elements[0].x,
  ).toBe(80);
});
it("includes native-only differences in the decision preview", async () => {
  const { room, projectPath, file } = await setup();
  const doc = JSON.parse(await fs.readFile(file, "utf8"));
  doc.layout.elements.a.x = 80;
  await fs.writeFile(file, JSON.stringify(doc, null, 2));
  const nativeFile = path.join(projectPath, "scene.excalidraw.json");
  const scene = JSON.parse(await fs.readFile(nativeFile, "utf8"));
  scene.elements[0].x = 300;
  await fs.writeFile(nativeFile, JSON.stringify(scene));
  const preview = await previewStorageResolution(room);
  expect(preview.changes).toHaveLength(1);
  expect(preview.changes[0].native).toContain("x=300");
});
it.each(["negative-size", "duplicate-id"])(
  "does not offer malformed native elements as an adoptable version: %s",
  async (kind) => {
    const { room, projectPath } = await setup();
    const nativeFile = path.join(projectPath, "scene.excalidraw.json");
    const scene = JSON.parse(await fs.readFile(nativeFile, "utf8"));
    if (kind === "negative-size") scene.elements[0].width = -1;
    else scene.elements.push({ ...scene.elements[0] });
    await fs.writeFile(nativeFile, JSON.stringify(scene));
    const preview = await previewStorageResolution(room);
    expect(preview.external).toBeNull();
    await commitStorageResolution(room, preview, "current");
    expect(
      JSON.parse((await readProjectBundle(projectPath)).sceneJson).elements,
    ).toHaveLength(1);
  },
);
