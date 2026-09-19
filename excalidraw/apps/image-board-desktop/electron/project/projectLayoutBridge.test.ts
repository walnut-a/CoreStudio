import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import {
  createProjectStructure,
  readProjectBundle,
  writeProjectScene,
} from "../projectFs";
import { createProjectRoomService } from "../room/projectRoomService";
import { synchronizeProjectLayout } from "./projectLayoutBridge";
const roots: string[] = [];
const services: ReturnType<typeof createProjectRoomService>[] = [];
afterEach(async () => {
  for (const s of services.splice(0))
    for (const r of s.manager.list())
      await s.closeProject(r.identity.projectId, { force: true });
  await Promise.all(
    roots.splice(0).map((p) => fs.rm(p, { recursive: true, force: true })),
  );
});
const setup = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "layout-bridge-"));
  roots.push(root);
  const { projectPath } = await createProjectStructure(root, "Test");
  const service = createProjectRoomService({
    readProjectBundle,
    writeProjectScene,
    persistenceDebounceMs: 60000,
  });
  services.push(service);
  const room = await service.openProject(projectPath);
  room.applyMaintenanceOperation({
    ...room.identity,
    operationId: "seed",
    baseSequence: room.sequence,
    elements: [
      {
        id: "a",
        type: "rectangle",
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        angle: 0,
        version: 1,
        versionNonce: 1,
        isDeleted: false,
      },
    ],
  });
  await room.flushPersistence();
  const file = path.join(projectPath, "project.json");
  const edit = async (fn: (d: any) => void) => {
    const d = JSON.parse(await fs.readFile(file, "utf8"));
    fn(d);
    await fs.writeFile(file, JSON.stringify(d, null, 2));
  };
  return { projectPath, room, edit, file };
};
it("stores native scene and project data only, applies external positions and survives reopen", async () => {
  const { projectPath, room, edit } = await setup();
  expect(
    (await fs.readdir(projectPath)).filter((f) => f.endsWith(".json")).sort(),
  ).toEqual(["project.json", "scene.excalidraw.json"]);
  await edit((d) => {
    d.layout.elements.a.x = 450;
  });
  await synchronizeProjectLayout(projectPath, room);
  expect(room.getSnapshot().scene.elements[0].x).toBe(450);
  expect(
    JSON.parse((await readProjectBundle(projectPath)).sceneJson).elements[0].x,
  ).toBe(450);
  await synchronizeProjectLayout(projectPath);
});
it("keeps manual and external conflicting edits and resumes after the external conflict is corrected", async () => {
  const { projectPath, room, edit } = await setup();
  room.applyMaintenanceOperation({
    ...room.identity,
    operationId: "local",
    baseSequence: room.sequence,
    elements: [
      {
        ...room.getSnapshot().scene.elements[0],
        x: 80,
        version: 2,
        versionNonce: 2,
      },
    ],
  });
  await edit((d) => {
    d.layout.elements.a.x = 450;
  });
  await expect(room.flushPersistence()).rejects.toThrow(/冲突/);
  await expect(synchronizeProjectLayout(projectPath, room)).rejects.toThrow(
    /冲突/,
  );
  expect(room.getSnapshot().scene.elements[0].x).toBe(80);
  await edit((d) => {
    d.layout.elements.a.x = 80;
  });
  await synchronizeProjectLayout(projectPath, room);
  expect(room.lifecycle).toBe("active");
});
it("rebuilds missing layout from native without rearranging and preserves invalid external JSON", async () => {
  const { projectPath, edit, file } = await setup();
  await edit((d) => {
    delete d.layout;
  });
  await synchronizeProjectLayout(projectPath);
  expect(JSON.parse(await fs.readFile(file, "utf8")).layout.elements.a.x).toBe(
    0,
  );
  await fs.writeFile(file, "{editing");
  await expect(synchronizeProjectLayout(projectPath)).rejects.toThrow();
  expect(await fs.readFile(file, "utf8")).toBe("{editing");
});
it("backfills missing entries and empty layout in an open room without moving existing elements", async () => {
  const { projectPath, room, edit, file } = await setup();
  for (const empty of [false, true]) {
    await edit((d) => {
      if (empty) d.layout = {};
      else delete d.layout.elements.a;
    });
    await synchronizeProjectLayout(projectPath, room);
    expect(
      JSON.parse(await fs.readFile(file, "utf8")).layout.elements.a.x,
    ).toBe(0);
    expect(room.getSnapshot().scene.elements[0].x).toBe(0);
  }
});
it("follows a renamed directory while saving an unsaved room and preserves the project name", async () => {
  const { projectPath, room } = await setup();
  const next = path.join(path.dirname(projectPath), "Renamed directory");
  await fs.rename(projectPath, next);
  room.applyMaintenanceOperation({
    ...room.identity,
    operationId: "unsaved",
    baseSequence: room.sequence,
    elements: [
      {
        ...room.getSnapshot().scene.elements[0],
        y: 321,
        version: 2,
        versionNonce: 9,
      },
    ],
  });
  await room.flushPersistence();
  expect(room.identity.canonicalProjectPath).toBe(await fs.realpath(next));
  expect(
    JSON.parse((await readProjectBundle(next)).sceneJson).elements[0].y,
  ).toBe(321);
  expect((await readProjectBundle(next)).project.name).toBe("Test");
  await expect(fs.stat(projectPath)).rejects.toMatchObject({ code: "ENOENT" });
});
it("accepts images into the unified document without retaining duplicate element or record snapshots", async () => {
  const { projectPath, room } = await setup();
  const { createExternalImageIntake } = await import("./externalImageIntake");
  for (let i = 0; i < 12; i++)
    await fs.writeFile(path.join(projectPath, `${i}.png`), `pixels-${i}`);
  const intake = createExternalImageIntake({
    room,
    stableMs: 0,
    decode: async () => ({ width: 1200, height: 800 }),
  });
  await intake.scan({ forceRetry: true });
  await intake.scan({ forceRetry: true });
  const doc = JSON.parse(
    await fs.readFile(path.join(projectPath, "project.json"), "utf8"),
  );
  expect(Object.keys(doc.imageRecords)).toHaveLength(12);
  expect(Object.values(doc.intake.entries)).toHaveLength(12);
  for (const entry of Object.values(doc.intake.entries) as any[]) {
    expect(entry).not.toHaveProperty("record");
    expect(entry).not.toHaveProperty("element");
    expect(entry.fileId).toBeTruthy();
    expect(entry.elementId).toBeTruthy();
  }
  const before = await fs.stat(path.join(projectPath, "project.json"));
  await intake.scan({ forceRetry: true });
  expect((await fs.stat(path.join(projectPath, "project.json"))).mtimeMs).toBe(
    before.mtimeMs,
  );
  expect(
    (await fs.readdir(projectPath)).filter((f) => f.endsWith(".json")).sort(),
  ).toEqual(["project.json", "scene.excalidraw.json"]);
});
it("keeps a corrupted project readable from native links and original image facts", async () => {
  const { projectPath, room, file } = await setup();
  const { createExternalImageIntake } = await import("./externalImageIntake");
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWZkAAAAASUVORK5CYII=",
    "base64",
  );
  await fs.writeFile(path.join(projectPath, "real.png"), png);
  const intake = createExternalImageIntake({
    room,
    stableMs: 0,
    decode: async () => ({ width: 1, height: 1 }),
  });
  await intake.scan({ forceRetry: true });
  const original = (await readProjectBundle(projectPath)).project.projectId;
  await fs.writeFile(file, "{broken");
  const recovered = await readProjectBundle(projectPath);
  expect(recovered.project.projectId).toBe(original);
  expect(Object.values(recovered.imageRecords)[0]).toMatchObject({
    width: 1,
    height: 1,
    sourceType: "imported",
    assetPath: "real.png",
  });
  expect(await fs.readFile(file, "utf8")).toBe("{broken");
});
it("explicit repair rebuilds damaged project metadata from originals and retains the broken file in a maintenance backup", async () => {
  const { projectPath, room, file } = await setup();
  const { createExternalImageIntake } = await import("./externalImageIntake");
  const { rebuildProjectThumbnails } = await import("../projectFs");
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWZkAAAAASUVORK5CYII=",
    "base64",
  );
  await fs.writeFile(path.join(projectPath, "real.png"), png);
  await createExternalImageIntake({
    room,
    stableMs: 0,
    decode: async () => ({ width: 1, height: 1 }),
  }).scan({ forceRetry: true });
  const fileIds = Object.keys(
    (await readProjectBundle(projectPath)).imageRecords,
  );
  await fs.writeFile(file, "{broken");
  await rebuildProjectThumbnails({ projectPath, fileIds, createBackup: true });
  expect(
    Object.keys((await readProjectBundle(projectPath)).imageRecords),
  ).toEqual(fileIds);
  const backups = path.join(projectPath, "exports/maintenance-backups");
  const originals = await Promise.all(
    (
      await fs.readdir(backups)
    ).map((d) => fs.readFile(path.join(backups, d, "project.json"), "utf8")),
  );
  expect(originals).toContain("{broken");
});

it("reads a future document through native recovery without downgrading it", async () => {
  const { projectPath, file, edit, room } = await setup();
  await edit((d) => {
    d.formatVersion = 99;
    d.future = { keep: true };
  });
  const before = await fs.readFile(file, "utf8");
  expect((await readProjectBundle(projectPath)).project.projectId).toBe(
    room.identity.projectId,
  );
  expect(await fs.readFile(file, "utf8")).toBe(before);
});
it("repairs a corrupt native scene without discarding other valid project sections", async () => {
  const { projectPath, room, file, edit } = await setup();
  const { createExternalImageIntake } = await import("./externalImageIntake");
  const { rebuildProjectThumbnails } = await import("../projectFs");
  await fs.writeFile(
    path.join(projectPath, "real.png"),
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWZkAAAAASUVORK5CYII=",
      "base64",
    ),
  );
  await createExternalImageIntake({
    room,
    stableMs: 0,
    decode: async () => ({ width: 1, height: 1 }),
  }).scan({ forceRetry: true });
  await edit((d) => {
    d.custom = { keep: true };
    d.layout.custom = "keep";
  });
  const before = JSON.parse(await fs.readFile(file, "utf8"));
  const native = path.join(projectPath, "scene.excalidraw.json");
  await fs.writeFile(native, "{broken-native");
  const recovered = await readProjectBundle(projectPath);
  expect(JSON.parse(recovered.sceneJson).elements).toHaveLength(1);
  expect(await fs.readFile(native, "utf8")).toBe("{broken-native");
  await rebuildProjectThumbnails({
    projectPath,
    fileIds: [],
    createBackup: true,
  });
  const repaired = JSON.parse(await fs.readFile(file, "utf8"));
  expect(repaired.intake).toEqual(before.intake);
  expect(repaired.custom).toEqual(before.custom);
  expect(repaired.layout.custom).toBe("keep");
});
it("does not replace corrupted metadata when its maintenance backup fails", async () => {
  const { projectPath, file } = await setup();
  const { rebuildProjectThumbnails } = await import("../projectFs");
  await fs.writeFile(file, "{broken");
  const copy = vi
    .spyOn(fs, "copyFile")
    .mockRejectedValueOnce(
      Object.assign(new Error("backup denied"), { code: "EACCES" }),
    );
  try {
    await expect(
      rebuildProjectThumbnails({
        projectPath,
        fileIds: [],
        createBackup: true,
      }),
    ).rejects.toThrow("backup denied");
    expect(await fs.readFile(file, "utf8")).toBe("{broken");
  } finally {
    copy.mockRestore();
  }
});

it("does not apply layout from a replaced project identity to the active room", async () => {
  const { projectPath, room, edit } = await setup();
  await edit((d) => {
    d.projectId = "another-project";
    d.layout.elements.a.x = 999;
  });
  await expect(synchronizeProjectLayout(projectPath, room)).rejects.toThrow(
    /身份/,
  );
  expect(room.getSnapshot().scene.elements[0].x).toBe(0);
});

it("adds native recovery identity when opening an older scene before the first edit", async () => {
  const { projectPath, file, edit, room } = await setup();
  const nativeFile = path.join(projectPath, "scene.excalidraw.json");
  const native = JSON.parse(await fs.readFile(nativeFile, "utf8"));
  delete native.corestudioProject;
  await fs.writeFile(nativeFile, JSON.stringify(native));
  await edit((d) => {
    delete d.layout.sceneHash;
  });
  await synchronizeProjectLayout(projectPath);
  await fs.writeFile(file, "{broken");
  expect((await readProjectBundle(projectPath)).project.projectId).toBe(
    room.identity.projectId,
  );
});
