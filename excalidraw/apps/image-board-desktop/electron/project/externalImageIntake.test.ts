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
import { createExternalImageIntake } from "./externalImageIntake";

const roots: string[] = [];
const services: ReturnType<typeof createProjectRoomService>[] = [];
afterEach(async () => {
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
it.each(["journal-saved", "asset-saved", "scene-saved"])(
  "recovers a crash after %s without repeating asset or scene creation",
  async (stage) => {
    const { project, room, make, put } = await setup();
    await put("inbox/a.png", "pixels");
    let fail = true;
    let intake = make(async (point) => {
      if (point === stage && fail) {
        fail = false;
        throw new Error("interrupted");
      }
    });
    await intake.scan({ now: 1000 });
    await intake.scan({ now: 1100 });
    intake = make();
    await intake.scan({ now: 2000, forceRetry: true });
    await intake.scan({ now: 2100, forceRetry: true });
    const bundle = await readProjectBundle(project.projectPath);
    expect(Object.keys(bundle.imageRecords)).toHaveLength(1);
    expect(room.getSnapshot().scene.elements).toHaveLength(1);
    expect(
      await fs.readdir(path.join(project.projectPath, "assets")),
    ).toHaveLength(1);
    expect(
      Object.keys((await readProjectBundle(project.projectPath)).imageRecords),
    ).toHaveLength(1);
  },
);
it("reports replaced sources without changing the existing picture while accepting other new files", async () => {
  const { room, make, put } = await setup();
  await put("a.png", "old");
  let intake = make();
  await intake.scan({ now: 1000 });
  await intake.scan({ now: 1100 });
  await put("a.png", "new");
  await intake.scan({ now: 2000 });
  const status = await intake.scan({ now: 2100 });
  expect(status.issues.some((issue) => issue.kind === "changed")).toBe(true);
  expect(room.getSnapshot().scene.elements).toHaveLength(1);
  intake = make();
  await put("b.png", "other");
  await intake.scan({ now: 3000 });
  await intake.scan({ now: 4000 });
  await intake.scan({ now: 4100 });
  expect(room.getSnapshot().scene.elements).toHaveLength(2);
});
it("keeps health discovery read-only and requires confirmation for unknown managed assets", async () => {
  const { project, room, make, put } = await setup();
  await put("assets/legacy.png", "pixels");
  const intake = make();
  const before = await fs.readdir(project.projectPath);
  const { inspectExternalImageIntake } = await import(
    "./externalImageIntakeState"
  );
  const issues = await inspectExternalImageIntake(
    project.projectPath,
    room.identity.projectId,
    {},
  );
  expect(issues.some((issue) => issue.kind === "needs-confirmation")).toBe(
    true,
  );
  expect(await fs.readdir(project.projectPath)).toEqual(before);
  await intake.scan({ now: 1000 });
  await intake.scan({ now: 1100 });
  expect(room.getSnapshot().scene.elements).toHaveLength(0);
  await intake.confirm("assets/legacy.png");
  await intake.scan({ now: 2000, forceRetry: true });
  expect(room.getSnapshot().scene.elements).toHaveLength(1);
});
it("rejects confirmation of an already accepted managed image after deletion", async () => {
  const { room, make, put } = await setup();
  await put("assets/deleted.png", "pixels");
  const intake = make();
  await intake.confirm("assets/deleted.png");
  await intake.scan({ forceRetry: true });
  const element = room.getSnapshot().scene.elements[0];
  room.applyMaintenanceOperation({
    ...room.identity,
    operationId: "delete",
    baseSequence: room.sequence,
    elements: [{ ...element, isDeleted: true, version: element.version + 1 }],
  });
  await room.flushPersistence();
  await expect(intake.confirm("assets/deleted.png")).rejects.toThrow(
    "不需要来源确认",
  );
  await intake.scan({ forceRetry: true });
  expect(
    room.getSnapshot().scene.elements.filter((e) => !e.isDeleted),
  ).toHaveLength(0);
  expect(room.getSnapshot().scene.elements).toHaveLength(1);
});
it("does not read or decode accepted originals again when their file identity is unchanged", async () => {
  const { make, put } = await setup();
  await put("a.png", "pixels");
  const intake = make();
  await intake.scan({ forceRetry: true });
  const status = await intake.scan();
  expect(status.issues).toEqual([]);
});
it("reports pending external files through the standard read-only health inspection", async () => {
  const { project, put } = await setup();
  await put("new.png", "pending");
  const { inspectProjectHealth } = await import("../projectFs");
  const before = await fs.readdir(project.projectPath);
  const report = await inspectProjectHealth({
    projectPath: project.projectPath,
  });
  expect(
    report.issues.some((issue) => issue.code === "external-image-intake"),
  ).toBe(true);
  expect(await fs.readdir(project.projectPath)).toEqual(before);
});
it("reports changed originals in health inspection even when a cache exists", async () => {
  const { project, put, make } = await setup();
  await put("a.png", "old");
  await make().scan({ forceRetry: true });
  await put("a.png", "new");
  const { inspectProjectHealth } = await import("../projectFs");
  const report = await inspectProjectHealth({
    projectPath: project.projectPath,
  });
  expect(
    report.issues.some((issue) => issue.code === "changed-original-file"),
  ).toBe(true);
});
it("recovers a committed inbox copy after the source is removed", async () => {
  const { project, make, put, room } = await setup();
  await put("inbox/a.png", "pixels");
  const intake = make(async (stage) => {
    if (stage === "asset-saved") throw Error("interrupted");
  });
  await intake.scan({ forceRetry: true });
  await fs.rm(path.join(project.projectPath, "inbox/a.png"));
  await make().scan({ forceRetry: true });
  expect(room.getSnapshot().scene.elements).toHaveLength(1);
});
it("preserves unsupported intake state instead of overwriting it", async () => {
  const { project, make, put } = await setup();
  await put("image-intake.json", JSON.stringify({ schemaVersion: 99 }));
  const before = await fs.readFile(
    path.join(project.projectPath, "image-intake.json"),
    "utf8",
  );
  await expect(make().scan()).rejects.toThrow("版本");
  expect(
    await fs.readFile(
      path.join(project.projectPath, "image-intake.json"),
      "utf8",
    ),
  ).toBe(before);
});
it("retains accepted originals after cache failures and retries only the cache", async () => {
  const { project, room, put } = await setup();
  await put("a.png", "pixels");
  let failures = true,
    calls = 0;
  const intake = createExternalImageIntake({
    room,
    decode: async () => ({ width: 2000, height: 1000 }),
    stableMs: 0,
    warmCache: async () => {
      calls++;
      if (failures) throw Error("disk full");
    },
  });
  const first = await intake.scan({ forceRetry: true });
  expect(room.getSnapshot().scene.elements).toHaveLength(1);
  expect(first.issues.some((issue) => issue.kind === "cache")).toBe(true);
  failures = false;
  await intake.scan({ forceRetry: true });
  expect(calls).toBe(2);
  expect(room.getSnapshot().scene.elements).toHaveLength(1);
  expect(
    Object.keys((await readProjectBundle(project.projectPath)).imageRecords),
  ).toHaveLength(1);
});
it("does not force partially written files through the stability window on manual retry", async () => {
  const { room, put } = await setup();
  await put("a.png", "pixels");
  const intake = createExternalImageIntake({
    room,
    decode: async () => ({ width: 10, height: 10 }),
    stableMs: 1000,
  });
  await intake.scan({ now: 1000, forceRetry: true });
  expect(room.getSnapshot().scene.elements).toHaveLength(0);
  await intake.scan({ now: 2000, forceRetry: true });
  expect(room.getSnapshot().scene.elements).toHaveLength(1);
});
it("warms display caches before publishing new asset and scene events", async () => {
  const { room, put } = await setup();
  await put("a.webp", "pixels");
  let cacheReady = false;
  const observed: boolean[] = [];
  const unsubscribe = room.subscribe((event) => {
    if (event.type === "assets.updated" || event.type === "scene.update")
      observed.push(cacheReady);
  });
  try {
    await createExternalImageIntake({
      room,
      stableMs: 0,
      decode: async () => ({ width: 2000, height: 1200 }),
      warmCache: async () => {
        cacheReady = true;
      },
    }).scan();
    expect(observed).toEqual([true, true]);
  } finally {
    unsubscribe();
  }
});
it("merges a concurrent manual import and places the new batch after the latest Room content", async () => {
  const { project, room, put } = await setup();
  await put("a.png", "auto pixels");
  let entered!: () => void, release!: () => void;
  const started = new Promise<void>((r) => {
    entered = r;
  });
  const gate = new Promise<void>((r) => {
    release = r;
  });
  const intake = createExternalImageIntake({
    room,
    stableMs: 0,
    decode: async () => {
      entered();
      await gate;
      return { width: 100, height: 100 };
    },
  });
  const publishedIds: string[] = [];
  const unsubscribe = room.subscribe((event) => {
    if (event.type === "assets.updated")
      publishedIds.push(...Object.keys(event.imageRecords));
  });
  const scan = intake.scan();
  await started;
  const { persistImageAssets } = await import("../projectFs");
  await persistImageAssets({
    projectPath: project.projectPath,
    files: [
      {
        fileId: "manual",
        mimeType: "image/png",
        width: 100,
        height: 100,
        createdAt: new Date().toISOString(),
        sourceType: "imported",
        dataBase64: Buffer.from("manual pixels").toString("base64"),
      },
    ],
  });
  room.applyMaintenanceOperation({
    ...room.identity,
    operationId: "concurrent-edit",
    baseSequence: room.sequence,
    elements: [
      {
        id: "manual-rect",
        type: "rectangle",
        x: 0,
        y: 0,
        width: 500,
        height: 500,
        version: 1,
        versionNonce: 1,
        isDeleted: false,
      },
    ],
  });
  release();
  await scan;
  unsubscribe();
  expect(publishedIds).toHaveLength(1);
  expect(publishedIds[0]).toMatch(/^intake-/);
  const bundle = await readProjectBundle(project.projectPath);
  expect(Object.keys(bundle.imageRecords)).toHaveLength(2);
  expect(bundle.imageRecords.manual).toBeDefined();
  expect(
    room.getSnapshot().scene.elements.find((e) => e.type === "image")!.x,
  ).toBeGreaterThanOrEqual(620);
  expect(
    room.getSnapshot().scene.elements.find((e) => e.id === "manual-rect"),
  ).toMatchObject({ x: 0, width: 500 });
});
it("defers maintenance while an asset writeback is pending and leaves that transaction intact", async () => {
  const { project } = await setup();
  const { beginProjectImageWriteback, rollbackProjectImageWriteback } =
    await import("./projectImageWriteback");
  const { rebuildProjectThumbnails } = await import("../projectFs");
  const transaction = await beginProjectImageWriteback({
    projectPath: project.projectPath,
    files: [
      {
        fileId: "pending-manual",
        mimeType: "image/png",
        width: 100,
        height: 100,
        createdAt: new Date().toISOString(),
        sourceType: "imported",
        dataBase64: Buffer.from("manual").toString("base64"),
      },
    ],
  });
  try {
    await expect(
      rebuildProjectThumbnails({
        projectPath: project.projectPath,
        fileIds: [],
        createBackup: true,
      }),
    ).rejects.toThrow("写入");
  } finally {
    await rollbackProjectImageWriteback({
      projectPath: project.projectPath,
      transactionId: transaction.transactionId,
    });
  }
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

it("appends a bounded batch to a 5000-element Room without moving existing content", async () => {
  const { room, make, put } = await setup();
  const elements = Array.from({ length: 5000 }, (_, index) => ({
    id: `existing-${index}`,
    type: "rectangle",
    x: index * 10,
    y: 0,
    width: 10,
    height: 10,
    angle: 0,
    version: 1,
    versionNonce: index,
    isDeleted: false,
  }));
  room.applyMaintenanceOperation({
    ...room.identity,
    operationId: "large-scene",
    baseSequence: room.sequence,
    elements,
  });
  await room.flushPersistence();
  for (let index = 0; index < 12; index++)
    await put(`batch/${index}.png`, `pixels-${index}`);
  const intake = make();
  await intake.scan({ forceRetry: true });
  const first = room.getSnapshot().scene.elements;
  expect(first.filter((element) => element.type === "image")).toHaveLength(8);
  await intake.scan({ forceRetry: true });
  const final = room.getSnapshot().scene.elements;
  expect(final.filter((element) => element.type === "image")).toHaveLength(12);
  expect(
    final
      .filter((element) => element.type === "rectangle")
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(({ id, x, y, width, height }) => ({ id, x, y, width, height })),
  ).toEqual(
    [...elements]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(({ id, x, y, width, height }) => ({
        id,
        x,
        y,
        width,
        height,
      })),
  );
  expect(
    final
      .filter((element) => element.type === "image")
      .every((element) => Number(element.x) >= 50120),
  ).toBe(true);
});

it("automatically accepts files from a legacy paused project and retires its pause setting", async () => {
  const { project, room, make, put } = await setup();
  await put(
    "image-intake.json",
    JSON.stringify({
      schemaVersion: 1,
      projectId: room.identity.projectId,
      paused: true,
      entries: {},
      sources: {},
      lastBatch: null,
    }),
  );
  await put("new.png", "pixels");
  await make().scan();
  expect(room.getSnapshot().scene.elements).toHaveLength(1);
  const ledger = JSON.parse(
    await fs.readFile(
      path.join(project.projectPath, "image-intake.json"),
      "utf8",
    ),
  );
  expect(ledger).not.toHaveProperty("paused");
  await make().scan();
  expect(room.getSnapshot().scene.elements).toHaveLength(1);
});

it("automatically retries a repaired source after exhausted attempts and restart", async () => {
  const { project, room, put } = await setup();
  const decode = vi.fn(async ({ buffer }: { buffer: Buffer }) => {
    if (buffer.toString() === "broken") throw new Error("invalid image");
    return { width: 100, height: 100 };
  });
  const make = () => createExternalImageIntake({ room, stableMs: 0, decode });
  await put("repair.png", "broken");
  let intake = make();
  for (let i = 0; i < 7; i++) await intake.scan({ now: i * 100000 });
  expect(
    Object.keys((await readProjectBundle(project.projectPath)).imageRecords),
  ).toHaveLength(0);
  expect(decode).toHaveBeenCalledTimes(5);
  intake = make();
  await intake.scan({ now: 800000 });
  expect(decode).toHaveBeenCalledTimes(5);
  await put("repair.png", "repaired pixels");
  intake = make();
  await intake.scan({ now: 1000000 });
  await intake.scan({ now: 1001000 });
  expect(
    Object.keys((await readProjectBundle(project.projectPath)).imageRecords),
  ).toHaveLength(1);
});

it("does not replace the ledger when idle reconciliation changes nothing", async () => {
  const { project, make } = await setup();
  const intake = make();
  await intake.scan();
  const ledger = path.join(project.projectPath, "image-intake.json");
  const before = await fs.stat(ledger);
  await intake.scan();
  await intake.scan();
  const after = await fs.stat(ledger);
  expect(after.ino).toBe(before.ino);
  expect(after.mtimeMs).toBe(before.mtimeMs);
});
