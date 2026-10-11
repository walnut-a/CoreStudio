import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { readProjectBundle, writeProjectScene } from "../projectFs";
import { createProjectRoomService } from "../room/projectRoomService";
import { createLegacyProjectStructure as createProjectStructure } from "../test/legacyProjectFixture";
import { createExternalImageIntake } from "./externalImageIntake";

const roots: string[] = [];
const services: ReturnType<typeof createProjectRoomService>[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  for (const service of services.splice(0))
    for (const room of service.manager.list())
      await service.closeProject(room.identity.projectId, { force: true });
  await Promise.all(
    roots
      .splice(0)
      .map((root) => fs.rm(root, { recursive: true, force: true })),
  );
});
const setup = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "corestudio-intake-"));
  roots.push(root);
  const project = await createProjectStructure(root, "Project");
  const service = createProjectRoomService({
    readProjectBundle,
    writeProjectScene,
    persistenceDebounceMs: 60_000,
  });
  services.push(service);
  const room = await service.openProject(project.projectPath);
  const make = (checkpoint?: (stage: string) => Promise<void>) =>
    createExternalImageIntake({
      room,
      decode: async () => ({ width: 2400, height: 1600 }),
      checkpoint,
      stableMs: 0,
    });
  const put = async (relative: string, data: string) => {
    const target = path.join(project.projectPath, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, data);
  };
  return { project, service, room, make, put };
};
it("accepts root originals in place and inbox copies in one deterministic appended batch", async () => {
  const { project, room, make, put } = await setup();
  room.applyMaintenanceOperation({
    ...room.identity,
    operationId: "existing",
    baseSequence: 0,
    elements: [
      {
        id: "old",
        type: "rectangle",
        x: 10,
        y: 20,
        width: 100,
        height: 100,
        version: 1,
        versionNonce: 1,
        isDeleted: false,
      },
    ],
  });
  await room.flushPersistence();
  await put("root.png", "root-pixels");
  await put("inbox/收件.png", "inbox-pixels");
  const intake = make();
  await intake.scan({ now: 1000 });
  await intake.scan({ now: 1100 });
  const bundle = await readProjectBundle(project.projectPath);
  const records = Object.values(bundle.imageRecords);
  expect(records).toHaveLength(2);
  expect(
    records.find((record) => record.sourceFileName === "root.png")?.assetPath,
  ).toBe("root.png");
  const copied = records.find(
    (record) => record.sourceFileName === "收件.png",
  )!;
  expect(copied.assetPath).toMatch(/^assets\//);
  expect(
    await fs.readFile(path.join(project.projectPath, copied.assetPath), "utf8"),
  ).toBe("inbox-pixels");
  expect(
    await fs.readFile(path.join(project.projectPath, "inbox/收件.png"), "utf8"),
  ).toBe("inbox-pixels");
  const scene = JSON.parse(bundle.sceneJson);
  expect(
    scene.elements.find((element: any) => element.id === "old"),
  ).toMatchObject({ x: 10, y: 20, width: 100 });
  expect(
    scene.elements
      .filter((element: any) => element.type === "image")
      .every((element: any) => element.x >= 230),
  ).toBe(true);
  expect(room.sequence).toBe(2);
});
it("deduplicates renamed content across scans and restarts without resurrecting deleted elements", async () => {
  const { project, room, make, put } = await setup();
  await put("a.png", "same");
  await put("inbox/b.png", "same");
  let intake = make();
  await intake.scan({ now: 1000 });
  await intake.scan({ now: 1100 });
  const element = room.getSnapshot().scene.elements[0];
  expect(room.getSnapshot().scene.elements).toHaveLength(1);
  room.applyMaintenanceOperation({
    ...room.identity,
    operationId: "delete",
    baseSequence: room.sequence,
    elements: [{ ...element, isDeleted: true, version: element.version + 1 }],
  });
  await room.flushPersistence();
  intake = make();
  await intake.scan({ now: 2000 });
  await intake.scan({ now: 2100 });
  expect(room.getSnapshot().scene.elements).toHaveLength(1);
  expect(room.getSnapshot().scene.elements[0].isDeleted).toBe(true);
  expect(
    Object.keys((await readProjectBundle(project.projectPath)).imageRecords),
  ).toHaveLength(1);
});

it("preserves the ledger and originals through cache cleanup and backed-up maintenance without resurrecting a deleted image", async () => {
  const { project, room, make, put } = await setup();
  const { cleanProjectCache, rebuildProjectThumbnails } = await import(
    "../projectFs"
  );
  await put("原图.png", "pixels");
  const intake = make();
  await intake.scan({ forceRetry: true });
  const element = room.getSnapshot().scene.elements[0];
  room.applyMaintenanceOperation({
    ...room.identity,
    operationId: "delete-before-repair",
    baseSequence: room.sequence,
    elements: [{ ...element, isDeleted: true, version: element.version + 1 }],
  });
  await room.flushPersistence();
  const ledgerPath = path.join(project.projectPath, "image-intake.json");
  const ledger = await fs.readFile(ledgerPath, "utf8");
  await put("cache/thumbnails/unused.png", "cache");
  await cleanProjectCache({ projectPath: project.projectPath });
  expect(await fs.readFile(ledgerPath, "utf8")).toBe(ledger);
  expect(
    await fs.readFile(path.join(project.projectPath, "原图.png"), "utf8"),
  ).toBe("pixels");
  const repaired = await rebuildProjectThumbnails({
    projectPath: project.projectPath,
    fileIds: [],
    createBackup: true,
  });
  expect(repaired.restoredBoardFileIds ?? []).toEqual([]);
  expect(
    await fs.readFile(
      path.join(repaired.backupPath!, "image-intake.json"),
      "utf8",
    ),
  ).toBe(ledger);
  await make().scan({ forceRetry: true });
  expect(room.getSnapshot().scene.elements).toHaveLength(1);
  expect(room.getSnapshot().scene.elements[0].isDeleted).toBe(true);
});
