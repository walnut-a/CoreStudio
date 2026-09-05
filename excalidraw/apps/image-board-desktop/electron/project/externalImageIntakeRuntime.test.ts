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
import { createExternalImageIntakeRuntime } from "./externalImageIntakeRuntime";
const cleanups: Array<() => Promise<unknown>> = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});
const setup = async (
  decode: () => Promise<{ width: number; height: number }>,
) => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "corestudio-intake-room-"),
  );
  cleanups.push(() => fs.rm(root, { recursive: true, force: true }));
  const runtime = createExternalImageIntakeRuntime({ decode, stableMs: 0 });
  const service = createProjectRoomService({
    readProjectBundle,
    writeProjectScene,
    onRoomOpened: (room) => {
      runtime.attach(room);
    },
    beforeRoomClosed: (room) => runtime.stop(room),
  });
  cleanups.push(async () => {
    for (const room of service.manager.list())
      await service.closeProject(room.identity.projectId, { force: true });
  });
  const project = await createProjectStructure(root, "Project");
  const room = await service.openProject(project.projectPath);
  return { project, room, runtime, service };
};
it("drains decoding before closing the Room and prevents late asset or scene writes", async () => {
  let entered!: () => void, release!: () => void;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const { project, room, runtime, service } = await setup(async () => {
    entered();
    await gate;
    return { width: 10, height: 10 };
  });
  await fs.writeFile(path.join(project.projectPath, "a.png"), "pixels");
  const scan = runtime.scan(room, { forceRetry: true });
  await started;
  let closed = false;
  const closing = service.closeProject(room.identity.projectId).then(() => {
    closed = true;
  });
  await Promise.resolve();
  expect(closed).toBe(false);
  release();
  await scan;
  await closing;
  expect(
    Object.keys((await readProjectBundle(project.projectPath)).imageRecords),
  ).toHaveLength(0);
  expect(service.manager.list()).toHaveLength(0);
  expect(() => runtime.attach(room)).toThrow();
});
it("reuses one intake per Room and isolates a newly opened Room generation", async () => {
  const { project, room, runtime, service } = await setup(async () => ({
    width: 10,
    height: 10,
  }));
  const first = runtime.attach(room);
  expect(runtime.attach(room)).toBe(first);
  await service.closeProject(room.identity.projectId);
  const reopened = await service.openProject(project.projectPath);
  expect(runtime.attach(reopened)).not.toBe(first);
  await fs.writeFile(
    path.join(project.projectPath, "after-reopen.png"),
    "pixels",
  );
  await runtime.scan(reopened);
  expect(reopened.getSnapshot().scene.elements).toHaveLength(1);
});
